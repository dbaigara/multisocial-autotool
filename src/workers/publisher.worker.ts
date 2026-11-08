import { Worker, Job } from "bullmq";
import { redisConnection, PUBLISH_QUEUE_NAME, PublishJobData } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { metaClient } from "../lib/meta";
import { youtubeClient } from "../lib/youtube";

export const publisherWorker = new Worker<PublishJobData>(
  PUBLISH_QUEUE_NAME,
  async (job: Job<PublishJobData>) => {
    const { postId } = job.data;
    console.log(`[PublisherWorker] Processing job ${job.id} for post: ${postId}`);

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        socialAccount: true,
      },
    });

    if (!post) {
      console.warn(`[PublisherWorker] Post ${postId} not found`);
      return;
    }

    if (post.status === "PUBLISHED") {
      console.log(`[PublisherWorker] Post ${postId} already published, skipping.`);
      return;
    }

    try {
      const account = post.socialAccount;
      if (!account) {
        throw new Error("No social account connected to this post");
      }

      let platformPostId = "";

      if (account.platform === "INSTAGRAM") {
        if (!post.mediaUrl) {
          throw new Error("Instagram requires a reachable media URL (image or video)");
        }

        const isReel = post.mediaType === "REEL" || post.mediaType === "VIDEO";
        const result = await metaClient.publishMedia({
          igUserId: account.platformAccountId,
          accessToken: account.accessToken,
          caption: post.caption,
          mediaUrl: post.mediaUrl,
          isReel,
        });
        platformPostId = result.id;
      } else if (account.platform === "YOUTUBE") {
        let token = account.accessToken;
        // Check if token expired and refresh if possible
        if (account.tokenExpiresAt && account.tokenExpiresAt < new Date() && account.refreshToken) {
          console.log(`[PublisherWorker] Refreshing YouTube access token for ${account.id}...`);
          const refreshed = await youtubeClient.refreshAccessToken(account.refreshToken);
          token = refreshed.access_token;
          await prisma.socialAccount.update({
            where: { id: account.id },
            data: {
              accessToken: token,
              tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
            },
          });
        }

        const isShort = post.mediaType === "SHORT";
        const lines = post.caption.split("\n");
        const title = lines[0] || "New Video";
        const description = lines.slice(1).join("\n") || "";

        const result = await youtubeClient.uploadVideo({
          accessToken: token,
          title,
          description,
          videoUrl: post.mediaUrl || undefined,
          localFilePath: post.localFilePath || undefined,
          isShort,
        });
        platformPostId = result.id;
      }

      // Mark post as PUBLISHED
      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: "PUBLISHED",
          platformPostId,
          publishedAt: new Date(),
          errorMessage: null,
        },
      });

      console.log(`[PublisherWorker] Successfully published post ${postId} (Platform ID: ${platformPostId})`);
    } catch (err: any) {
      console.error(`[PublisherWorker] Error publishing post ${postId}:`, err);
      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: "FAILED",
          errorMessage: err.message || "Unknown error occurred during publication",
        },
      });
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);
