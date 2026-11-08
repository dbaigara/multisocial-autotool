import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scanContentFolder, ingestLocalMediaFile, initStarterContentStudio } from "@/lib/local-pipeline";
import path from "path";
import fs from "fs";

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

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const contentDir = workspace.localContentPath || "./content_studio";
  initStarterContentStudio(contentDir);

  const resolvedDir = path.resolve(contentDir);
  const files = await scanContentFolder(contentDir, workspaceId);

  return NextResponse.json({
    folderPath: resolvedDir,
    relativePath: contentDir,
    autoScheduleEnabled: workspace.autoScheduleEnabled,
    dailyPostingTime: workspace.dailyPostingTime || "18:00",
    filesCount: files.length,
    files,
  });
}

// Batch Ingest all unprocessed files
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId, autoSchedule } = await req.json();
  const targetWorkspaceId = workspaceId || (session.user as any).workspaceId;

  const workspace = await prisma.workspace.findUnique({
    where: { id: targetWorkspaceId },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const contentDir = workspace.localContentPath || "./content_studio";
  const files = await scanContentFolder(contentDir, targetWorkspaceId);

  const unprocessed = files.filter((f) => !f.existingPost);
  const ingested = [];

  for (const file of unprocessed) {
    try {
      const post = await ingestLocalMediaFile({
        workspaceId: targetWorkspaceId,
        file,
        autoSchedule: autoSchedule !== undefined ? autoSchedule : workspace.autoScheduleEnabled,
        dailyPostingTime: workspace.dailyPostingTime || "18:00",
      });
      ingested.push(post);
    } catch (err: any) {
      console.error(`[StudioAPI] Failed to ingest ${file.filename}:`, err);
    }
  }

  return NextResponse.json({
    success: true,
    totalScanned: files.length,
    ingestedCount: ingested.length,
    ingested,
  });
}

// Update workspace studio settings
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { workspaceId, localContentPath, autoScheduleEnabled, dailyPostingTime } = body;
  const targetWorkspaceId = workspaceId || (session.user as any).workspaceId;

  const updated = await prisma.workspace.update({
    where: { id: targetWorkspaceId },
    data: {
      localContentPath: localContentPath !== undefined ? localContentPath : undefined,
      autoScheduleEnabled: autoScheduleEnabled !== undefined ? autoScheduleEnabled : undefined,
      dailyPostingTime: dailyPostingTime !== undefined ? dailyPostingTime : undefined,
    },
  });

  return NextResponse.json(updated);
}
