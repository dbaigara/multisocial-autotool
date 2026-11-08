import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { schedulePostPublishing } from "@/lib/redis";
import { getActiveWorkspace } from "@/lib/workspace-service";

export async function GET(req: Request) {
  try {
    const { workspaceId } = await getActiveWorkspace(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

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
  } catch (err: any) {
    console.error("[API posts GET] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to load posts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { workspaceId } = await getActiveWorkspace(req);
    const body = await req.json();
    const { socialAccountId, caption, mediaUrl, mediaType, scheduledFor, isPublishNow } = body;

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
        workspaceId,
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

    // Schedule post
    if (finalStatus === "SCHEDULED") {
      try {
        await schedulePostPublishing(post.id, workspaceId, finalScheduledFor);
      } catch (err: any) {
        console.warn("Could not enqueue publish job:", err.message);
      }
    }

    return NextResponse.json(post, { status: 201 });
  } catch (err: any) {
    console.error("[API posts POST] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to create post" }, { status: 500 });
  }
}
