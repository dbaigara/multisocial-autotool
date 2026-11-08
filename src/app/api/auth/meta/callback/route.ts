import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { metaClient } from "@/lib/meta";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateStr = searchParams.get("state");
  const error = searchParams.get("error_description") || searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error) {
    console.error("Meta OAuth error:", error);
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

    // 1. Exchange code for short-lived token
    const tokenRes = await metaClient.exchangeCodeForToken(code);

    // 2. Exchange for long-lived token (60 days)
    const longLivedRes = await metaClient.getLongLivedToken(tokenRes.access_token);
    const longLivedToken = longLivedRes.access_token;
    const expiresAt = new Date(Date.now() + (longLivedRes.expires_in || 60 * 24 * 3600) * 1000);

    // 3. Discover Instagram Business Accounts via Facebook Pages
    const pages = await metaClient.getInstagramAccounts(longLivedToken);

    if (pages.length === 0) {
      return NextResponse.redirect(
        `${appUrl}/accounts?error=${encodeURIComponent(
          "Не найдено бизнес-аккаунтов Instagram, привязанных к страницам Facebook"
        )}`
      );
    }

    // 4. Save accounts to database
    for (const page of pages) {
      const ig = page.instagram_business_account;
      if (!ig) continue;

      await prisma.socialAccount.upsert({
        where: {
          workspaceId_platform_platformAccountId: {
            workspaceId,
            platform: "INSTAGRAM",
            platformAccountId: ig.id,
          },
        },
        create: {
          workspaceId,
          platform: "INSTAGRAM",
          platformAccountId: ig.id,
          accountName: ig.name || page.name,
          username: ig.username,
          profilePictureUrl: ig.profile_picture_url,
          accessToken: longLivedToken, // User access token with IG permissions or page token
          tokenExpiresAt: expiresAt,
          pageId: page.id,
        },
        update: {
          accountName: ig.name || page.name,
          username: ig.username,
          profilePictureUrl: ig.profile_picture_url,
          accessToken: longLivedToken,
          tokenExpiresAt: expiresAt,
          pageId: page.id,
        },
      });
    }

    return NextResponse.redirect(`${appUrl}/accounts?success=instagram_connected`);
  } catch (err: any) {
    console.error("Error in Meta OAuth callback:", err);
    return NextResponse.redirect(`${appUrl}/accounts?error=${encodeURIComponent(err.message || "Failed to connect Meta account")}`);
  }
}
