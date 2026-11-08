import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || (session.user as any).workspaceId;

  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
  }

  const rules = await prisma.automationRule.findMany({
    where: { workspaceId },
    include: {
      socialAccount: {
        select: {
          id: true,
          platform: true,
          accountName: true,
          username: true,
        },
      },
      _count: {
        select: { automationLogs: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(rules);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    workspaceId,
    socialAccountId,
    platform,
    keyword,
    matchType,
    publicReplyText,
    dmText,
    buttonText,
    buttonUrl,
    isActive,
  } = body;

  const targetWorkspaceId = workspaceId || (session.user as any).workspaceId;
  if (!targetWorkspaceId) {
    return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
  }

  if (!platform || !keyword?.trim()) {
    return NextResponse.json({ error: "Платформа и ключевые слова обязательны" }, { status: 400 });
  }

  if (!publicReplyText?.trim() && !dmText?.trim()) {
    return NextResponse.json(
      { error: "Необходимо указать хотя бы один ответ: публичный ответ или личное сообщение (DM)" },
      { status: 400 }
    );
  }

  const rule = await prisma.automationRule.create({
    data: {
      workspaceId: targetWorkspaceId,
      socialAccountId: socialAccountId || null,
      platform,
      keyword: keyword.trim(),
      matchType: matchType || "CONTAINS",
      publicReplyText: publicReplyText?.trim() || null,
      dmText: dmText?.trim() || null,
      buttonText: buttonText?.trim() || null,
      buttonUrl: buttonUrl?.trim() || null,
      isActive: isActive !== undefined ? isActive : true,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
