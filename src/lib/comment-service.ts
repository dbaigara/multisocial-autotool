import { prisma } from "./prisma";
import { metaClient } from "./meta";
import { youtubeClient } from "./youtube";
import { telegramClient } from "./telegram";

export interface CommentJobPayload {
  platform: string;
  workspaceId: string;
  socialAccountId?: string;
  postId?: string;
  commentId: string;
  commentText: string;
  authorUsername: string;
  authorId?: string;
}

export async function executeCommentJob(payload: CommentJobPayload): Promise<void> {
  const {
    platform,
    workspaceId,
    socialAccountId,
    postId,
    commentId,
    commentText,
    authorUsername,
    authorId,
  } = payload;

  console.log(`[CommentService] Received comment from @${authorUsername}: "${commentText}" on ${platform}`);

  // Fetch active rules for this workspace & platform
  const rules = await prisma.automationRule.findMany({
    where: {
      workspaceId,
      platform,
      isActive: true,
      OR: [
        { socialAccountId: null },
        { socialAccountId: socialAccountId || undefined },
      ],
    },
  });

  if (rules.length === 0) {
    console.log(`[CommentService] No active rules found for workspace ${workspaceId} and platform ${platform}`);
    return;
  }

  const normalizedText = commentText.trim().toLowerCase();

  // Check each rule
  for (const rule of rules) {
    const keywords = rule.keyword
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    let isMatch = false;
    if (rule.matchType === "EXACT") {
      isMatch = keywords.some((k) => normalizedText === k);
    } else {
      isMatch = keywords.some((k) => normalizedText.includes(k));
    }

    if (!isMatch) continue;

    console.log(`[CommentService] 🎯 Rule matched: "${rule.keyword}" for comment "${commentText}"`);

    let publicReplySent = false;
    let dmSent = false;
    let errorMessage: string | null = null;

    try {
      // Find social account
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

      // 0. DEMO Account or simulation
      if (
        account.accessToken.startsWith("demo_") ||
        account.platformAccountId.startsWith("demo_") ||
        account.platform === "DEMO"
      ) {
        console.log(`[CommentService] ✨ Simulating instant automated reply for Demo Account`);
        if (rule.publicReplyText) publicReplySent = true;
        if (rule.dmText) dmSent = true;
      }
      // 1. INSTAGRAM
      else if (platform === "INSTAGRAM") {
        if (rule.publicReplyText) {
          try {
            await metaClient.replyToComment(commentId, rule.publicReplyText, account.accessToken);
            publicReplySent = true;
          } catch (replyErr: any) {
            console.error("[CommentService] Failed to post IG public reply:", replyErr);
            errorMessage = `Public Reply Error: ${replyErr.message}`;
          }
        }

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
            console.error("[CommentService] Failed to send IG DM:", dmErr);
            errorMessage = errorMessage
              ? `${errorMessage}; DM Error: ${dmErr.message}`
              : `DM Error: ${dmErr.message}`;
          }
        }
      }
      // 2. YOUTUBE
      else if (platform === "YOUTUBE") {
        if (rule.publicReplyText) {
          let token = account.accessToken;
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
      // 3. TELEGRAM
      else if (platform === "TELEGRAM") {
        if (rule.publicReplyText) {
          const chatId = account.pageId || account.platformAccountId;
          await telegramClient.sendMessage(account.accessToken, chatId, rule.publicReplyText);
          publicReplySent = true;
        }
      }

      // Log execution
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

      console.log(`[CommentService] ✅ Automation finished for rule ${rule.id} (Status: ${errorMessage ? "Partial/Fail" : "Success"})`);
    } catch (err: any) {
      console.error(`[CommentService] ❌ Error processing rule ${rule.id}:`, err);
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
}
