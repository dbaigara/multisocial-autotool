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

  const accounts = await prisma.socialAccount.findMany({
    where: { workspaceId },
    select: {
      id: true,
      platform: true,
      platformAccountId: true,
      accountName: true,
      username: true,
      profilePictureUrl: true,
      tokenExpiresAt: true,
      createdAt: true,
      _count: {
        select: {
          posts: true,
          automationRules: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(accounts);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("id");

  if (!accountId) {
    return NextResponse.json({ error: "Account ID required" }, { status: 400 });
  }

  await prisma.socialAccount.delete({
    where: { id: accountId },
  });

  return NextResponse.json({ success: true });
}
