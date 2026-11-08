import { prisma } from "./prisma";
import { metaClient } from "./meta";
import { youtubeClient } from "./youtube";
import { telegramClient } from "./telegram";

export interface PublishJobPayload {
  postId: string;
  workspaceId: string;
}

export async function executePublishJob(payload: PublishJobPayload): Promise<void> {
  const { postId } = payload;
  console.log(`[PublisherService] Executing publish job for post: ${postId}`);

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      socialAccount: true,
    },
  });

  if (!post) {
    console.warn(`[PublisherService] Post ${postId} not found in database`);
    return;
  }

  if (post.status === "PUBLISHED") {
    console.log(`[PublisherService] Post ${postId} already published, skipping.`);
    return;
  }

  try {
    const account = post.socialAccount;
    if (!account) {
      throw new Error("No social account connected to this post");
    }

    let platformPostId = "";

    // 1. DEMO Account simulation
    if (
      account.accessToken.startsWith("demo_") ||
      account.platformAccountId.startsWith("demo_") ||
      account.platform === "DEMO"
    ) {
      console.log(`[PublisherService] ✨ Simulating instant publish for Demo Account: ${account.accountName || account.username}`);
      platformPostId = `demo_published_${Date.now()}`;
    }
    // 2. TELEGRAM (Direct, zero-bureaucracy publishing)
    else if (account.platform === "TELEGRAM") {
      const chatId = account.pageId || account.platformAccountId;
      const botToken = account.accessToken;
      const isVideo = post.mediaType === "VIDEO" || post.mediaType === "REEL" || post.mediaType === "SHORT";

      console.log(`[PublisherService] 🚀 Publishing to Telegram channel ${chatId}...`);
      if (isVideo) {
        const result = await telegramClient.sendVideo(botToken, chatId, {
          videoUrl: post.mediaUrl || undefined,
          localFilePath: post.localFilePath || undefined,
          caption: post.caption,
        });
        platformPostId = String(result.message_id);
      } else if (post.mediaUrl || post.localFilePath) {
        const result = await telegramClient.sendPhoto(botToken, chatId, {
          photoUrl: post.mediaUrl || undefined,
          localFilePath: post.localFilePath || undefined,
          caption: post.caption,
        });
        platformPostId = String(result.message_id);
      } else {
        const result = await telegramClient.sendMessage(botToken, chatId, post.caption);
        platformPostId = String(result.message_id);
      }
    }
    // 3. INSTAGRAM
    else if (account.platform === "INSTAGRAM") {
      if (!post.mediaUrl) {
        throw new Error("Instagram requires a reachable public media URL (image or video)");
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
    }
    // 4. YOUTUBE
    else if (account.platform === "YOUTUBE") {
      let token = account.accessToken;
      if (account.tokenExpiresAt && account.tokenExpiresAt < new Date() && account.refreshToken) {
        console.log(`[PublisherService] Refreshing YouTube access token for ${account.id}...`);
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

    console.log(`[PublisherService] ✅ Successfully published post ${postId} (Platform ID: ${platformPostId})`);
  } catch (err: any) {
    console.error(`[PublisherService] ❌ Error publishing post ${postId}:`, err);
    await prisma.post.update({
      where: { id: post.id },
      data: {
        status: "FAILED",
        errorMessage: err.message || "Unknown error occurred during publication",
      },
    });
    throw err;
  }
}
