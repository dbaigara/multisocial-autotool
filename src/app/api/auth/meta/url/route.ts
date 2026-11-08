import { NextResponse } from "next/server";
import { metaClient } from "@/lib/meta";
import { getActiveWorkspace, getAppBaseUrl } from "@/lib/workspace-service";

export async function GET(req: Request) {
  try {
    const { workspaceId, userId } = await getActiveWorkspace(req);
    const appUrl = getAppBaseUrl(req);
    const redirectUri = `${appUrl}/api/auth/meta/callback`;

    const state = JSON.stringify({
      workspaceId,
      userId,
      redirectUri,
      random: Math.random().toString(36).substring(7),
    });

    const url = metaClient.getOAuthUrl(state, redirectUri);
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error("[Meta URL] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate Meta URL" }, { status: 500 });
  }
}
