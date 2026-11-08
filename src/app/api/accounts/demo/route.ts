import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { platform, workspaceId } = await req.json();
  const targetWorkspaceId = workspaceId || (session.user as any).workspaceId;

  if (platform === "INSTAGRAM") {
    const account = await prisma.socialAccount.upsert({
      where: {
        workspaceId_platform_platformAccountId: {
          workspaceId: targetWorkspaceId,
          platform: "INSTAGRAM",
          platformAccountId: "demo_ig_business_123",
        },
      },
      create: {
        workspaceId: targetWorkspaceId,
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
          workspaceId: targetWorkspaceId,
          platform: "YOUTUBE",
          platformAccountId: "demo_yt_channel_456",
        },
      },
      create: {
        workspaceId: targetWorkspaceId,
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
  }

  return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
}
