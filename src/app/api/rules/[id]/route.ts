import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const updated = await prisma.automationRule.update({
    where: { id },
    data: {
      keyword: body.keyword !== undefined ? body.keyword.trim() : undefined,
      matchType: body.matchType !== undefined ? body.matchType : undefined,
      publicReplyText: body.publicReplyText !== undefined ? body.publicReplyText.trim() : undefined,
      dmText: body.dmText !== undefined ? body.dmText.trim() : undefined,
      buttonText: body.buttonText !== undefined ? body.buttonText.trim() : undefined,
      buttonUrl: body.buttonUrl !== undefined ? body.buttonUrl.trim() : undefined,
      isActive: body.isActive !== undefined ? body.isActive : undefined,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.automationRule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
