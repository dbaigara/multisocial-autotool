import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ingestLocalMediaFile, scanContentFolder } from "@/lib/local-pipeline";
import { getActiveWorkspace } from "@/lib/workspace-service";

export async function POST(req: Request) {
  try {
    const { workspaceId } = await getActiveWorkspace(req);
    const body = await req.json();
    const {
      filePath,
      preferredAccountId,
      customCaption,
      scheduledFor,
      publishNow,
    } = body;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const contentDir = workspace.localContentPath || "./content_studio";
    const files = await scanContentFolder(contentDir, workspaceId);
    const targetFile = files.find((f) => f.absolutePath === filePath);

    if (!targetFile) {
      return NextResponse.json({ error: "File not found in content studio" }, { status: 404 });
    }

    if (customCaption) targetFile.caption = customCaption;
    if (scheduledFor) targetFile.scheduledFor = new Date(scheduledFor);

    const post = await ingestLocalMediaFile({
      workspaceId,
      file: targetFile,
      preferredAccountId,
      autoSchedule: !publishNow && !scheduledFor,
      dailyPostingTime: workspace.dailyPostingTime || "18:00",
      publishNow,
    });

    return NextResponse.json({ success: true, post });
  } catch (err: any) {
    console.error("[StudioIngest] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to ingest file" }, { status: 500 });
  }
}
