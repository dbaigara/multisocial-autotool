import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enqueueCommentTrigger } from "@/lib/redis";

/**
 * Meta Graph API Webhook endpoint for Instagram comments
 */

// 1. Webhook Verification (Meta Verification Challenge)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || "multisocial_verify_token_secret";

  if (mode === "subscribe" && token === expectedToken) {
    console.log("[InstagramWebhook] Webhook successfully verified by Meta");
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// 2. Incoming Comment Events
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.object !== "instagram") {
      return NextResponse.json({ status: "ignored" });
    }

    const entries = body.entry || [];
    for (const entry of entries) {
      const igAccountId = entry.id; // Instagram Business Account ID
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field === "comments") {
          const value = change.value;
          const commentId = value.id;
          const commentText = value.text;
          const from = value.from || {};
          const authorUsername = from.username || "unknown_user";
          const authorId = from.id;
          const postId = value.media?.id;

          // Find which workspace owns this Instagram account
          const account = await prisma.socialAccount.findFirst({
            where: {
              platform: "INSTAGRAM",
              platformAccountId: igAccountId,
            },
          });

          if (!account) {
            console.warn(`[InstagramWebhook] No connected account found for IG ID: ${igAccountId}`);
            continue;
          }

          console.log(
            `[InstagramWebhook] Incoming comment ${commentId} on post ${postId} from @${authorUsername}: "${commentText}"`
          );

          // Push to BullMQ comment queue for asynchronous processing
          try {
            await enqueueCommentTrigger({
              platform: "INSTAGRAM",
              workspaceId: account.workspaceId,
              socialAccountId: account.id,
              postId,
              commentId,
              commentText,
              authorUsername,
              authorId,
            });
          } catch (queueErr: any) {
            console.error("[InstagramWebhook] Failed to enqueue comment job:", queueErr.message);
          }
        }
      }
    }

    return NextResponse.json({ status: "EVENT_RECEIVED" });
  } catch (err: any) {
    console.error("[InstagramWebhook] Error processing webhook:", err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
