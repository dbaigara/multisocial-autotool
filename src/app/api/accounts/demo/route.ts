import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/workspace-service";

export async function POST(req: Request) {
  try {
    const { workspaceId } = await getActiveWorkspace(req);
    const body = await req.json();
    const { platform } = body;

    if (platform === "INSTAGRAM") {
      const account = await prisma.socialAccount.upsert({
        where: {
          workspaceId_platform_platformAccountId: {
            workspaceId,
            platform: "INSTAGRAM",
            platformAccountId: "demo_ig_business_123",
          },
        },
        create: {
          workspaceId,
          platform: "INSTAGRAM",
          platformAccountId: "demo_ig_business_123",
          accountName: "Demo Instagram Store",
          username: "demo_brand_official",
          profilePictureUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&h=120&fit=crop",
          accessToken: "EAAB_demo_instagram_long_lived_token",
          tokenExpiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000),
        },
        update: {
          accountName: "Demo Instagram Store",
          username: "demo_brand_official",
        },
      });

      return NextResponse.json(account);
    } else if (platform === "YOUTUBE") {
      const account = await prisma.socialAccount.upsert({
        where: {
          workspaceId_platform_platformAccountId: {
            workspaceId,
            platform: "YOUTUBE",
            platformAccountId: "demo_yt_channel_456",
          },
        },
        create: {
          workspaceId,
          platform: "YOUTUBE",
          platformAccountId: "demo_yt_channel_456",
          accountName: "Tech & Growth YouTube Channel",
          username: "tech_growth_shorts",
          profilePictureUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&h=120&fit=crop",
          accessToken: "ya29.demo_youtube_access_token",
          refreshToken: "1//demo_youtube_refresh_token",
          tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        },
        update: {
          accountName: "Tech & Growth YouTube Channel",
          username: "tech_growth_shorts",
        },
      });

      return NextResponse.json(account);
    } else if (platform === "TELEGRAM") {
      const account = await prisma.socialAccount.upsert({
        where: {
          workspaceId_platform_platformAccountId: {
            workspaceId,
            platform: "TELEGRAM",
            platformAccountId: "demo_tg_channel_789",
          },
        },
        create: {
          workspaceId,
          platform: "TELEGRAM",
          platformAccountId: "demo_tg_channel_789",
          accountName: "Demo Telegram Channel",
          username: "@demo_creator_channel",
          profilePictureUrl: "https://telegram.org/img/t_logo.png",
          accessToken: "demo_bot_token_123456:ABC-DEF",
          pageId: "-1001234567890",
        },
        update: {
          accountName: "Demo Telegram Channel",
          username: "@demo_creator_channel",
        },
      });

      return NextResponse.json(account);
    }

    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  } catch (err: any) {
    console.error("[API accounts demo POST] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to create demo account" }, { status: 500 });
  }
}
