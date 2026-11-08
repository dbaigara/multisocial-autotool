import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ingestLocalMediaFile, scanContentFolder } from "@/lib/local-pipeline";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    workspaceId,
    filePath,
    preferredAccountId,
    customCaption,
    scheduledFor,
    publishNow,
  } = body;

  const targetWorkspaceId = workspaceId || (session.user as any).workspaceId;
  const workspace = await prisma.workspace.findUnique({
    where: { id: targetWorkspaceId },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const contentDir = workspace.localContentPath || "./content_studio";
  const files = await scanContentFolder(contentDir, targetWorkspaceId);
  const targetFile = files.find((f) => f.absolutePath === filePath);

  if (!targetFile) {
    return NextResponse.json({ error: "File not found in content studio" }, { status: 404 });
  }

  // Apply overrides if provided
  if (customCaption) targetFile.caption = customCaption;
  if (scheduledFor) targetFile.scheduledFor = new Date(scheduledFor);

  try {
    const post = await ingestLocalMediaFile({
      workspaceId: targetWorkspaceId,
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
