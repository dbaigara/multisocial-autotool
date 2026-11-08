import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scanContentFolder, ingestLocalMediaFile, initStarterContentStudio } from "@/lib/local-pipeline";
import { getActiveWorkspace } from "@/lib/workspace-service";
import path from "path";

export async function GET(req: Request) {
  try {
    const { workspaceId } = await getActiveWorkspace(req);

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
  } catch (err: any) {
    console.error("[Studio GET] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to load studio" }, { status: 500 });
  }
}

// Batch Ingest all unprocessed files
export async function POST(req: Request) {
  try {
    const { workspaceId } = await getActiveWorkspace(req);
    const body = await req.json().catch(() => ({}));
    const { autoSchedule } = body;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const contentDir = workspace.localContentPath || "./content_studio";
    const files = await scanContentFolder(contentDir, workspaceId);

    const unprocessed = files.filter((f) => !f.existingPost);
    const ingested = [];

    for (const file of unprocessed) {
      try {
        const post = await ingestLocalMediaFile({
          workspaceId,
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
  } catch (err: any) {
    console.error("[Studio POST] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to batch ingest" }, { status: 500 });
  }
}

// Update workspace studio settings
export async function PUT(req: Request) {
  try {
    const { workspaceId } = await getActiveWorkspace(req);
    const body = await req.json();
    const { localContentPath, autoScheduleEnabled, dailyPostingTime } = body;

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        localContentPath: localContentPath !== undefined ? localContentPath : undefined,
        autoScheduleEnabled: autoScheduleEnabled !== undefined ? autoScheduleEnabled : undefined,
        dailyPostingTime: dailyPostingTime !== undefined ? dailyPostingTime : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[Studio PUT] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to update studio settings" }, { status: 500 });
  }
}
