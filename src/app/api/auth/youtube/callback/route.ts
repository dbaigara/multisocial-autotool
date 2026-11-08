import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { youtubeClient } from "@/lib/youtube";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateStr = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error) {
    console.error("YouTube OAuth error:", error);
    return NextResponse.redirect(`${appUrl}/accounts?error=${encodeURIComponent(error)}`);
  }

  if (!code || !stateStr) {
    return NextResponse.redirect(`${appUrl}/accounts?error=Missing+code+or+state`);
  }

  try {
    const state = JSON.parse(stateStr);
    const workspaceId = state.workspaceId;

    if (!workspaceId) {
      return NextResponse.redirect(`${appUrl}/accounts?error=Invalid+workspace+state`);
    }

    // 1. Exchange code for tokens
    const tokenRes = await youtubeClient.exchangeCodeForToken(code);
    const expiresAt = new Date(Date.now() + (tokenRes.expires_in || 3600) * 1000);

    // 2. Fetch Channel details
    const channel = await youtubeClient.getChannelInfo(tokenRes.access_token);

    // 3. Upsert into database
    await prisma.socialAccount.upsert({
      where: {
        workspaceId_platform_platformAccountId: {
          workspaceId,
          platform: "YOUTUBE",
          platformAccountId: channel.id,
        },
      },
      create: {
        workspaceId,
        platform: "YOUTUBE",
        platformAccountId: channel.id,
        accountName: channel.title,
        username: channel.customUrl || channel.title,
        profilePictureUrl: channel.thumbnailUrl,
        accessToken: tokenRes.access_token,
        refreshToken: tokenRes.refresh_token,
        tokenExpiresAt: expiresAt,
      },
      update: {
        accountName: channel.title,
        username: channel.customUrl || channel.title,
        profilePictureUrl: channel.thumbnailUrl,
        accessToken: tokenRes.access_token,
        refreshToken: tokenRes.refresh_token ?? undefined,
        tokenExpiresAt: expiresAt,
      },
    });

    return NextResponse.redirect(`${appUrl}/accounts?success=youtube_connected`);
  } catch (err: any) {
    console.error("Error in YouTube OAuth callback:", err);
    return NextResponse.redirect(
      `${appUrl}/accounts?error=${encodeURIComponent(err.message || "Failed to connect YouTube account")}`
    );
  }
}
