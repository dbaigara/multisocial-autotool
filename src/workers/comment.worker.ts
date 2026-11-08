import { Worker, Job } from "bullmq";
import { redisConnection, COMMENT_QUEUE_NAME, CommentJobData } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { metaClient } from "../lib/meta";
import { youtubeClient } from "../lib/youtube";

export const commentWorker = new Worker<CommentJobData>(
  COMMENT_QUEUE_NAME,
  async (job: Job<CommentJobData>) => {
    const { platform, workspaceId, socialAccountId, postId, commentId, commentText, authorUsername, authorId } =
      job.data;

    console.log(`[CommentWorker] Received comment from @${authorUsername}: "${commentText}" on ${platform}`);

    // Fetch active rules for this workspace & platform
    const rules = await prisma.automationRule.findMany({
      where: {
        workspaceId,
        platform,
        isActive: true,
        OR: [
          { socialAccountId: null }, // applies to all accounts
          { socialAccountId: socialAccountId || undefined },
        ],
      },
    });

    if (rules.length === 0) {
      console.log(`[CommentWorker] No active rules found for workspace ${workspaceId} and platform ${platform}`);
      return;
    }

    const normalizedText = commentText.trim().toLowerCase();

    // Check each rule
    for (const rule of rules) {
      // Rule keywords can be comma-separated list e.g. "цена, стоимость, прайс, сколько"
      const keywords = rule.keyword
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);

      let isMatch = false;

      if (rule.matchType === "EXACT") {
        isMatch = keywords.some((k) => normalizedText === k);
      } else {
        // CONTAINS
        isMatch = keywords.some((k) => normalizedText.includes(k));
      }

      if (!isMatch) continue;

      console.log(`[CommentWorker] Rule matched: "${rule.keyword}" for comment "${commentText}"`);

      let publicReplySent = false;
      let dmSent = false;
      let errorMessage: string | null = null;

      try {
        // Find social account credentials
        const account = await prisma.socialAccount.findFirst({
          where: {
            workspaceId,
            platform,
            ...(socialAccountId ? { id: socialAccountId } : {}),
          },
        });

        if (!account) {
          throw new Error("No connected social account found to send response");
        }

        // 1. Instagram Action
        if (platform === "INSTAGRAM") {
          // Public Reply
          if (rule.publicReplyText) {
            try {
              await metaClient.replyToComment(commentId, rule.publicReplyText, account.accessToken);
              publicReplySent = true;
            } catch (replyErr: any) {
              console.error("[CommentWorker] Failed to post IG public reply:", replyErr);
              errorMessage = `Public Reply Error: ${replyErr.message}`;
            }
          }

          // Direct Message (Comment-to-DM)
          if (rule.dmText) {
            try {
              await metaClient.sendDirectMessage({
                igUserId: account.platformAccountId,
                recipientId: authorId,
                commentId,
                text: rule.dmText,
                buttonText: rule.buttonText || undefined,
                buttonUrl: rule.buttonUrl || undefined,
                accessToken: account.accessToken,
              });
              dmSent = true;
            } catch (dmErr: any) {
              console.error("[CommentWorker] Failed to send IG DM:", dmErr);
              errorMessage = errorMessage ? `${errorMessage}; DM Error: ${dmErr.message}` : `DM Error: ${dmErr.message}`;
            }
          }
        }

        // 2. YouTube Action
        if (platform === "YOUTUBE") {
          if (rule.publicReplyText) {
            let token = account.accessToken;
            // Token refresh check
            if (account.tokenExpiresAt && account.tokenExpiresAt < new Date() && account.refreshToken) {
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

            await youtubeClient.replyToComment({
              accessToken: token,
              parentId: commentId,
              text: rule.publicReplyText,
            });
            publicReplySent = true;
          }
        }

        // Log automation execution
        await prisma.automationLog.create({
          data: {
            workspaceId,
            ruleId: rule.id,
            platform,
            postId,
            commentId,
            authorUsername,
            authorId,
            commentText,
            publicReplySent,
            dmSent,
            status: errorMessage ? (publicReplySent || dmSent ? "PARTIAL" : "FAILED") : "SUCCESS",
            errorMessage,
          },
        });

        console.log(`[CommentWorker] Automation finished for rule ${rule.id} (Status: ${errorMessage ? "Partial/Fail" : "Success"})`);
      } catch (err: any) {
        console.error(`[CommentWorker] Error processing rule ${rule.id}:`, err);
        await prisma.automationLog.create({
          data: {
            workspaceId,
            ruleId: rule.id,
            platform,
            postId,
            commentId,
            authorUsername,
            authorId,
            commentText,
            publicReplySent,
            dmSent,
            status: "FAILED",
            errorMessage: err.message,
          },
        });
      }

      // Stop after first matching rule
      break;
    }
  },
  {
    connection: redisConnection,
    concurrency: 10,
  }
);
