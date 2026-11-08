import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { schedulePostPublishing } from "@/lib/redis";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    include: { socialAccount: true },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json(post);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { caption, mediaUrl, mediaType, scheduledFor, status } = body;

  const updated = await prisma.post.update({
    where: { id },
    data: {
      caption: caption !== undefined ? caption : undefined,
      mediaUrl: mediaUrl !== undefined ? mediaUrl : undefined,
      mediaType: mediaType !== undefined ? mediaType : undefined,
      scheduledFor: scheduledFor !== undefined ? (scheduledFor ? new Date(scheduledFor) : null) : undefined,
      status: status !== undefined ? status : undefined,
    },
    include: { socialAccount: true },
  });

  if (updated.status === "SCHEDULED" && updated.scheduledFor) {
    try {
      await schedulePostPublishing(updated.id, updated.workspaceId, updated.scheduledFor);
    } catch (e: any) {
      console.warn("Could not reschedule BullMQ job:", e.message);
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.post.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
