import { NextResponse } from "next/server";
import { youtubeClient } from "@/lib/youtube";
import { getActiveWorkspace, getAppBaseUrl } from "@/lib/workspace-service";

export async function GET(req: Request) {
  try {
    const { workspaceId, userId } = await getActiveWorkspace(req);
    const appUrl = getAppBaseUrl(req);
    const redirectUri = `${appUrl}/api/auth/youtube/callback`;

    const state = JSON.stringify({
      workspaceId,
      userId,
      redirectUri,
      random: Math.random().toString(36).substring(7),
    });

    const url = youtubeClient.getOAuthUrl(state, redirectUri);
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error("[YouTube URL] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate YouTube URL" }, { status: 500 });
  }
}
