import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enqueueCommentTrigger } from "@/lib/redis";
import { getActiveWorkspace } from "@/lib/workspace-service";

export async function POST(req: Request) {
  try {
    const { workspaceId } = await getActiveWorkspace(req);
    const body = await req.json();
    const { platform, commentText, authorUsername, socialAccountId } = body;

    if (!commentText) {
      return NextResponse.json({ error: "Укажите текст комментария" }, { status: 400 });
    }

    const fakeCommentId = `test_comm_${Date.now()}`;
    const username = authorUsername || "test_user_ai";

    // Check matching rules
    const rules = await prisma.automationRule.findMany({
      where: {
        workspaceId,
        platform: platform || "INSTAGRAM",
        isActive: true,
      },
    });

    const normalized = commentText.trim().toLowerCase();
    const matchedRule = rules.find((r) => {
      const keys = r.keyword.split(",").map((k) => k.trim().toLowerCase());
      if (r.matchType === "EXACT") {
        return keys.some((k) => normalized === k);
      }
      return keys.some((k) => normalized.includes(k));
    });

    // Log the test execution
    const log = await prisma.automationLog.create({
      data: {
        workspaceId,
        ruleId: matchedRule?.id || null,
        platform: platform || "INSTAGRAM",
        postId: `simulated_post_${Date.now()}`,
        commentId: fakeCommentId,
        authorUsername: username,
        commentText,
        publicReplySent: Boolean(matchedRule?.publicReplyText),
        dmSent: platform === "INSTAGRAM" && Boolean(matchedRule?.dmText),
        status: matchedRule ? "SUCCESS" : "NO_MATCH",
        errorMessage: matchedRule
          ? null
          : "Ни одно активное правило не совпало с текстом комментария",
      },
    });

    try {
      await enqueueCommentTrigger({
        platform: platform || "INSTAGRAM",
        workspaceId,
        socialAccountId,
        commentId: fakeCommentId,
        commentText,
        authorUsername: username,
      });
    } catch {
      // ignore
    }

    return NextResponse.json({
      success: true,
      matched: Boolean(matchedRule),
      matchedRule,
      simulatedLog: log,
    });
  } catch (err: any) {
    console.error("[TestComment] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to run simulation" }, { status: 500 });
  }
}
