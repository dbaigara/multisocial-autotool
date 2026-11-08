import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/workspace-service";

export async function GET(req: Request) {
  try {
    const { workspaceId } = await getActiveWorkspace(req);

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
  } catch (err: any) {
    console.error("[API accounts GET] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to load accounts" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { workspaceId } = await getActiveWorkspace(req);
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("id");

    if (!accountId) {
      return NextResponse.json({ error: "Account ID required" }, { status: 400 });
    }

    await prisma.socialAccount.deleteMany({
      where: { id: accountId, workspaceId },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[API accounts DELETE] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete account" }, { status: 500 });
  }
}
