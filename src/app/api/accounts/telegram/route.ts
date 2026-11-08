import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { telegramClient } from "@/lib/telegram";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { botToken, chatId, workspaceId } = await req.json();
    const targetWorkspaceId = workspaceId || (session.user as any).workspaceId;

    if (!botToken || !chatId) {
      return NextResponse.json(
        { error: "Необходимо указать Bot Token и ID/юзернейм канала (@channel_name)" },
        { status: 400 }
      );
    }

    // 1. Verify Bot Token
    const botInfo = await telegramClient.getMe(botToken.trim());

    // 2. Verify Chat / Channel Access
    const chatInfo = await telegramClient.getChat(botToken.trim(), chatId.trim());

    const channelTitle = chatInfo.title || botInfo.first_name || "Telegram Channel";
    const channelUsername = chatInfo.username || botInfo.username;
    const platformAccountId = String(chatInfo.id);

    // 3. Upsert Social Account
    const account = await prisma.socialAccount.upsert({
      where: {
        workspaceId_platform_platformAccountId: {
          workspaceId: targetWorkspaceId,
          platform: "TELEGRAM",
          platformAccountId,
        },
      },
      create: {
        workspaceId: targetWorkspaceId,
        platform: "TELEGRAM",
        platformAccountId,
        pageId: String(chatInfo.id), // store channel chat_id
        accountName: channelTitle,
        username: channelUsername ? `@${channelUsername}` : `id_${chatInfo.id}`,
        profilePictureUrl: "https://telegram.org/img/t_logo.png",
        accessToken: botToken.trim(),
      },
      update: {
        accountName: channelTitle,
        username: channelUsername ? `@${channelUsername}` : `id_${chatInfo.id}`,
        accessToken: botToken.trim(),
        pageId: String(chatInfo.id),
      },
    });

    return NextResponse.json({
      success: true,
      account,
      message: `Канал «${channelTitle}» успешно подключен!`,
    });
  } catch (err: any) {
    console.error("[TelegramConnect] Error:", err);
    return NextResponse.json(
      { error: err.message || "Не удалось подключить Telegram-канал. Проверьте токен и права бота (бот должен быть админом канала)." },
      { status: 400 }
    );
  }
}
