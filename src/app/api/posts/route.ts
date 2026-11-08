import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { schedulePostPublishing } from "@/lib/redis";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || (session.user as any).workspaceId;
  const status = searchParams.get("status");

  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
  }

  const whereClause: any = { workspaceId };
  if (status && status !== "ALL") {
    whereClause.status = status;
  }

  const posts = await prisma.post.findMany({
    where: whereClause,
    include: {
      socialAccount: {
        select: {
          id: true,
          platform: true,
          accountName: true,
          username: true,
          profilePictureUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(posts);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { workspaceId, socialAccountId, caption, mediaUrl, mediaType, scheduledFor, isPublishNow } = body;

  const targetWorkspaceId = workspaceId || (session.user as any).workspaceId;
  if (!targetWorkspaceId) {
    return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
  }

  if (!socialAccountId) {
    return NextResponse.json({ error: "Выберите аккаунт для публикации" }, { status: 400 });
  }

  if (!caption?.trim()) {
    return NextResponse.json({ error: "Текст публикации не может быть пустым" }, { status: 400 });
  }

  let finalStatus: "DRAFT" | "SCHEDULED" = "DRAFT";
  let finalScheduledFor: Date | null = null;

  if (isPublishNow) {
    finalStatus = "SCHEDULED";
    finalScheduledFor = new Date();
  } else if (scheduledFor) {
    finalStatus = "SCHEDULED";
    finalScheduledFor = new Date(scheduledFor);
  }

  const post = await prisma.post.create({
    data: {
      workspaceId: targetWorkspaceId,
      socialAccountId,
      caption: caption.trim(),
      mediaUrl: mediaUrl?.trim() || null,
      mediaType: mediaType || "IMAGE",
      scheduledFor: finalScheduledFor,
      status: finalStatus,
    },
    include: {
      socialAccount: true,
    },
  });

  // Schedule with BullMQ if scheduled or publish now
  if (finalStatus === "SCHEDULED") {
    try {
      await schedulePostPublishing(post.id, targetWorkspaceId, finalScheduledFor);
    } catch (err: any) {
      console.warn("Could not enqueue BullMQ publish job (Redis may be offline):", err.message);
    }
  }

  return NextResponse.json(post, { status: 201 });
}
