import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/workspace-service";

export async function GET(req: Request) {
  try {
    const { workspaceId } = await getActiveWorkspace(req);

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
  } catch (err: any) {
    console.error("[API rules GET] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to load rules" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { workspaceId } = await getActiveWorkspace(req);
    const body = await req.json();
    const {
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
        workspaceId,
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
  } catch (err: any) {
    console.error("[API rules POST] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to create rule" }, { status: 500 });
  }
}
