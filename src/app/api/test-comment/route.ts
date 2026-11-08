import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enqueueCommentTrigger } from "@/lib/redis";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId, platform, commentText, authorUsername, socialAccountId } = await req.json();
  const targetWorkspaceId = workspaceId || (session.user as any).workspaceId;

  if (!targetWorkspaceId || !commentText) {
    return NextResponse.json({ error: "Укажите текст комментария и воркспейс" }, { status: 400 });
  }

  const fakeCommentId = `test_comm_${Date.now()}`;
  const username = authorUsername || "test_user_ai";

  // Check matching rules directly
  const rules = await prisma.automationRule.findMany({
    where: {
      workspaceId: targetWorkspaceId,
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
      workspaceId: targetWorkspaceId,
      ruleId: matchedRule?.id || null,
      platform: platform || "INSTAGRAM",
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

  // Try queueing to BullMQ if Redis is running
  try {
    await enqueueCommentTrigger({
      platform: platform || "INSTAGRAM",
      workspaceId: targetWorkspaceId,
      socialAccountId,
      commentId: fakeCommentId,
      commentText,
      authorUsername: username,
    });
  } catch (e: any) {
    // Redis might be offline in development, that's fine
  }

  return NextResponse.json({
    success: true,
    matched: Boolean(matchedRule),
    matchedRule,
    simulatedLog: log,
  });
}
