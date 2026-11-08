import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * Streams local media files (MP4, MOV, JPG, PNG) with HTTP Range support.
 * This allows both browser playback and external Meta Graph API crawlers to fetch the video/photo.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  try {
    const { slug } = await params;
    const relativePath = slug.join("/");

    // Default base content directory
    const baseDir = path.resolve(process.env.LOCAL_CONTENT_DIR || "./content_studio");
    const filePath = path.resolve(baseDir, relativePath);

    // Security check: ensure path is within baseDir
    if (!filePath.startsWith(baseDir)) {
      return new NextResponse("Access denied", { status: 403 });
    }

    if (!fs.existsSync(filePath)) {
      return new NextResponse("File not found", { status: 404 });
    }

    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      return new NextResponse("Invalid file", { status: 400 });
    }

    const fileSize = stat.size;
    const ext = path.extname(filePath).toLowerCase();

    // Map MIME types
    const mimeMap: Record<string, string> = {
      ".mp4": "video/mp4",
      ".mov": "video/quicktime",
      ".webm": "video/webm",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
    };

    const contentType = mimeMap[ext] || "application/octet-stream";
    const range = req.headers.get("range");

    if (range) {
      // HTTP Range request for video streaming / resumable download
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const fileStream = fs.createReadStream(filePath, { start, end });
      const headers = new Headers({
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize.toString(),
        "Content-Type": contentType,
      });

      return new NextResponse(fileStream as any, {
        status: 206,
        headers,
      });
    }

    // Full file response
    const fileStream = fs.createReadStream(filePath);
    return new NextResponse(fileStream as any, {
      status: 200,
      headers: {
        "Content-Length": fileSize.toString(),
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
      },
    });
  } catch (err: any) {
    console.error("[MediaAPI] Error streaming file:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
