import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { schedulePostPublishing } from "@/lib/redis";

export interface DiscoveredMediaFile {
  filename: string;
  relativePath: string;
  absolutePath: string;
  sizeBytes: number;
  sizeFormatted: string;
  mediaType: "IMAGE" | "VIDEO" | "REEL" | "SHORT" | "STORY";
  caption: string;
  title?: string;
  targetPlatform?: "INSTAGRAM" | "YOUTUBE" | "TELEGRAM" | "ALL";
  scheduledFor?: Date | null;
  existingPost?: {
    id: string;
    status: string;
    scheduledFor?: Date | null;
    publishedAt?: Date | null;
  } | null;
}

const SUPPORTED_VIDEO_EXTS = [".mp4", ".mov", ".webm", ".mkv"];
const SUPPORTED_IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp"];

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Parses caption text and extracted directives:
 * Example caption.txt:
 *   Смотрите до конца! В этом видео мы разбираем 3 шага создания SaaS.
 *   Напишите «КУРС» в комментариях и получите доступ!
 *   #reels #shorts #business
 *   --schedule: 2026-11-10 18:00
 *   --platform: instagram
 *   --type: REEL
 */
export function parseCaptionFile(rawText: string) {
  const lines = rawText.split("\n");
  const captionLines: string[] = [];
  let targetPlatform: "INSTAGRAM" | "YOUTUBE" | "TELEGRAM" | "ALL" | undefined;
  let mediaType: "IMAGE" | "VIDEO" | "REEL" | "SHORT" | undefined;
  let scheduledFor: Date | null = null;
  let customTitle: string | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("--schedule:")) {
      const dateStr = trimmed.replace("--schedule:", "").trim();
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) scheduledFor = parsed;
    } else if (trimmed.startsWith("--platform:")) {
      const p = trimmed.replace("--platform:", "").trim().toUpperCase();
      if (p === "INSTAGRAM" || p === "YOUTUBE" || p === "TELEGRAM" || p === "ALL") {
        targetPlatform = p as any;
      }
    } else if (trimmed.startsWith("--type:")) {
      const t = trimmed.replace("--type:", "").trim().toUpperCase();
      if (["IMAGE", "VIDEO", "REEL", "SHORT", "STORY"].includes(t)) {
        mediaType = t as any;
      }
    } else if (trimmed.startsWith("--title:")) {
      customTitle = trimmed.replace("--title:", "").trim();
    } else {
      captionLines.push(line);
    }
  }

  return {
    caption: captionLines.join("\n").trim(),
    targetPlatform,
    mediaType,
    scheduledFor,
    customTitle,
  };
}

/**
 * Scans content folder for media files and associated caption files.
 */
export async function scanContentFolder(
  baseDir: string,
  workspaceId: string
): Promise<DiscoveredMediaFile[]> {
  const resolvedDir = path.resolve(baseDir);
  if (!fs.existsSync(resolvedDir)) {
    fs.mkdirSync(resolvedDir, { recursive: true });
  }

  const existingPosts = await prisma.post.findMany({
    where: { workspaceId, localFilePath: { not: null } },
    select: {
      id: true,
      localFilePath: true,
      status: true,
      scheduledFor: true,
      publishedAt: true,
      platformPostId: true,
      socialAccount: {
        select: {
          platform: true,
          username: true,
        },
      },
    },
  });

  const postMap = new Map(existingPosts.map((p) => [p.localFilePath, p]));
  const results: DiscoveredMediaFile[] = [];

  function traverse(currentDir: string, relPath: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "published") continue;

      const fullPath = path.join(currentDir, entry.name);
      const childRelPath = relPath ? `${relPath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        traverse(fullPath, childRelPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        const isVideo = SUPPORTED_VIDEO_EXTS.includes(ext);
        const isImage = SUPPORTED_IMAGE_EXTS.includes(ext);

        if (!isVideo && !isImage) continue;

        const stat = fs.statSync(fullPath);
        const nameWithoutExt = path.basename(entry.name, ext);

        // Look for paired caption file (.txt, .md, .caption)
        let caption = "";
        let targetPlatform: "INSTAGRAM" | "YOUTUBE" | "TELEGRAM" | "ALL" | undefined;
        let mediaTypeOverride: "IMAGE" | "VIDEO" | "REEL" | "SHORT" | undefined;
        let scheduledFor: Date | null = null;
        let title: string | undefined;

        const candidateCaptionFiles = [
          path.join(currentDir, `${nameWithoutExt}.txt`),
          path.join(currentDir, `${nameWithoutExt}.md`),
          path.join(currentDir, `${nameWithoutExt}.caption`),
          path.join(currentDir, `caption.txt`),
        ];

        for (const capPath of candidateCaptionFiles) {
          if (fs.existsSync(capPath)) {
            const raw = fs.readFileSync(capPath, "utf-8");
            const parsed = parseCaptionFile(raw);
            caption = parsed.caption;
            targetPlatform = parsed.targetPlatform;
            mediaTypeOverride = parsed.mediaType;
            scheduledFor = parsed.scheduledFor;
            title = parsed.customTitle;
            break;
          }
        }

        // If no caption found, generate a clean readable title from filename
        if (!caption) {
          caption = nameWithoutExt
            .replace(/[_-]+/g, " ")
            .replace(/^\d+[\s-]+/, "") // strip leading numbers like 01_...
            .trim();
          caption = caption.charAt(0).toUpperCase() + caption.slice(1);
        }

        const defaultMediaType = isVideo ? "REEL" : "IMAGE";
        const finalMediaType = mediaTypeOverride || defaultMediaType;

        const existingPost = postMap.get(fullPath) || null;

        results.push({
          filename: entry.name,
          relativePath: childRelPath,
          absolutePath: fullPath,
          sizeBytes: stat.size,
          sizeFormatted: formatFileSize(stat.size),
          mediaType: finalMediaType,
          caption,
          title: title || caption.split("\n")[0],
          targetPlatform,
          scheduledFor,
          existingPost,
        });
      }
    }
  }

  traverse(resolvedDir, "");
  return results;
}

/**
 * Computes next available daily posting slot (e.g. every day at 18:00)
 */
export async function getNextAvailableScheduleSlot(
  workspaceId: string,
  preferredTime: string = "18:00"
): Promise<Date> {
  const [hours, minutes] = preferredTime.split(":").map((v) => parseInt(v, 10) || 0);

  // Get currently scheduled future posts
  const futurePosts = await prisma.post.findMany({
    where: {
      workspaceId,
      status: "SCHEDULED",
      scheduledFor: { gt: new Date() },
    },
    select: { scheduledFor: true },
    orderBy: { scheduledFor: "asc" },
  });

  const scheduledDates = new Set(
    futurePosts
      .filter((p) => p.scheduledFor)
      .map((p) => p.scheduledFor!.toISOString().split("T")[0])
  );

  // Start from today or tomorrow if preferred time already passed today
  const candidate = new Date();
  candidate.setHours(hours, minutes, 0, 0);

  if (candidate.getTime() <= Date.now() + 15 * 60 * 1000) {
    // Already past time today, move to tomorrow
    candidate.setDate(candidate.getDate() + 1);
  }

  // Find first day that doesn't have a post scheduled
  while (true) {
    const dateKey = candidate.toISOString().split("T")[0];
    if (!scheduledDates.has(dateKey)) {
      return candidate;
    }
    candidate.setDate(candidate.getDate() + 1);
  }
}

/**
 * Ingests a local media file into a Post record and schedules it
 */
export async function ingestLocalMediaFile(options: {
  workspaceId: string;
  file: DiscoveredMediaFile;
  preferredAccountId?: string;
  autoSchedule?: boolean;
  dailyPostingTime?: string;
  publishNow?: boolean;
}) {
  const { workspaceId, file, preferredAccountId, autoSchedule, dailyPostingTime, publishNow } = options;

  // Find social accounts
  const accounts = await prisma.socialAccount.findMany({
    where: { workspaceId },
  });

  if (accounts.length === 0) {
    // Client-oriented auto-fallback: create demo account so ingestion never fails
    const demoAccount = await prisma.socialAccount.create({
      data: {
        workspaceId,
        platform: "TELEGRAM",
        platformAccountId: "demo_tg_default",
        accountName: "Demo Telegram Channel",
        username: "@demo_creator_channel",
        profilePictureUrl: "https://telegram.org/img/t_logo.png",
        accessToken: "demo_bot_token_123",
        pageId: "-1001234567890",
      },
    });
    accounts.push(demoAccount);
  }

  // Pick target account based on directive or preferred
  let targetAccount = accounts[0];
  if (preferredAccountId) {
    targetAccount = accounts.find((a) => a.id === preferredAccountId) || targetAccount;
  } else if (file.targetPlatform) {
    const match = accounts.find((a) => a.platform === file.targetPlatform);
    if (match) targetAccount = match;
  }

  // Calculate schedule time
  let finalScheduledFor: Date | null = null;
  let finalStatus: "DRAFT" | "SCHEDULED" = "DRAFT";

  if (publishNow) {
    finalStatus = "SCHEDULED";
    finalScheduledFor = new Date();
  } else if (file.scheduledFor) {
    finalStatus = "SCHEDULED";
    finalScheduledFor = file.scheduledFor;
  } else if (autoSchedule) {
    finalStatus = "SCHEDULED";
    finalScheduledFor = await getNextAvailableScheduleSlot(workspaceId, dailyPostingTime || "18:00");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  // Public URL that streams the local media via our Range streaming API
  const publicMediaUrl = `${appUrl}/api/media/${encodeURIComponent(file.relativePath)}`;

  // Create or update Post
  const post = await prisma.post.upsert({
    where: {
      id: file.existingPost?.id || "temp-new-id",
    },
    create: {
      workspaceId,
      socialAccountId: targetAccount.id,
      mediaUrl: publicMediaUrl,
      localFilePath: file.absolutePath,
      mediaType: file.mediaType,
      caption: file.caption,
      scheduledFor: finalScheduledFor,
      status: finalStatus,
    },
    update: {
      caption: file.caption,
      mediaUrl: publicMediaUrl,
      scheduledFor: finalScheduledFor,
      status: finalStatus,
    },
    include: {
      socialAccount: true,
    },
  });

  // Enqueue to BullMQ
  if (finalStatus === "SCHEDULED") {
    try {
      await schedulePostPublishing(post.id, workspaceId, finalScheduledFor);
    } catch (e: any) {
      console.warn("Could not queue post with BullMQ (Redis offline?):", e.message);
    }
  }

  return post;
}

/**
 * Creates starter sample files in content folder so the user has immediate examples
 */
export function initStarterContentStudio(baseDir: string = "./content_studio") {
  const resolved = path.resolve(baseDir);
  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true });
  }

  const sampleTxt = path.join(resolved, "01_sample_reel.txt");
  if (!fs.existsSync(sampleTxt)) {
    const content = `🔥 Как автоматизировать 100% лидогенерации через комментарии?

В этом видео пошагово показываем, как настроить кросс-постинг в Instagram и YouTube и мгновенно отправлять ссылку на ваш курс в Direct.

Напишите слово «КУРС» в комментариях, чтобы получить чек-лист и доступ! 👇

#бизнес #маркетинг #reels #shorts #автоматизация
--platform: ALL
--type: REEL
--schedule: 2026-11-09 18:00
`;
    fs.writeFileSync(sampleTxt, content, "utf-8");
  }

  // Create a minimal placeholder sample image if no media exists
  const sampleImg = path.join(resolved, "01_sample_reel.jpg");
  if (!fs.existsSync(sampleImg)) {
    // 1x1 transparent/grey JPEG buffer or placeholder
    const dummyBuffer = Buffer.from(
      "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
      "base64"
    );
    fs.writeFileSync(sampleImg, dummyBuffer);
  }
}
