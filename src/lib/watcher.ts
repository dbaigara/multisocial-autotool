import chokidar, { FSWatcher } from "chokidar";
import path from "path";
import fs from "fs";
import { prisma } from "@/lib/prisma";
import { scanContentFolder, ingestLocalMediaFile } from "./local-pipeline";

let watcherInstance: FSWatcher | null = null;

export async function startFolderWatcher(baseDir: string = "./content_studio") {
  const resolvedDir = path.resolve(baseDir);
  if (!fs.existsSync(resolvedDir)) {
    fs.mkdirSync(resolvedDir, { recursive: true });
  }

  console.log(`[FolderWatcher] Initializing watcher for: ${resolvedDir}`);

  // Chokidar handles debouncing so newly rendered videos aren't parsed while exporting
  watcherInstance = chokidar.watch(resolvedDir, {
    ignored: /(^|[\/\\])\..|.*\/published\/.*/, // ignore dotfiles and published folder
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 2500, // wait 2.5s for file size to stop changing
      pollInterval: 300,
    },
  });

  watcherInstance.on("add", async (filePath: string) => {
    const ext = path.extname(filePath).toLowerCase();
    const isMedia = [".mp4", ".mov", ".webm", ".jpg", ".jpeg", ".png"].includes(ext);
    if (!isMedia) return;

    console.log(`[FolderWatcher] 🎥 New media file detected: ${path.basename(filePath)}`);

    try {
      // Find active workspace (first workspace or default)
      const workspace = await prisma.workspace.findFirst({
        where: { autoScheduleEnabled: true },
        include: { socialAccounts: true },
      });

      if (!workspace) {
        console.log("[FolderWatcher] No active workspace with auto-schedule enabled.");
        return;
      }

      // Re-scan folder to find paired captions & directives
      const files = await scanContentFolder(resolvedDir, workspace.id);
      const target = files.find((f) => f.absolutePath === filePath);

      if (target && !target.existingPost) {
        console.log(`[FolderWatcher] Auto-ingesting: ${target.filename}`);
        const post = await ingestLocalMediaFile({
          workspaceId: workspace.id,
          file: target,
          autoSchedule: true,
          dailyPostingTime: workspace.dailyPostingTime || "18:00",
        });

        console.log(
          `[FolderWatcher] ✅ Post created successfully: ${post.id} (Scheduled for: ${post.scheduledFor?.toISOString() || "Now"})`
        );
      }
    } catch (err: any) {
      console.error("[FolderWatcher] Error auto-ingesting file:", err.message);
    }
  });

  watcherInstance.on("error", (error: any) => {
    console.error("[FolderWatcher] Error:", error);
  });

  return watcherInstance;
}

export function stopFolderWatcher() {
  if (watcherInstance) {
    watcherInstance.close();
    watcherInstance = null;
    console.log("[FolderWatcher] Stopped.");
  }
}
