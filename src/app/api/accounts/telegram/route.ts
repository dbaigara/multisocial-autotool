import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { telegramClient } from "@/lib/telegram";
import { getActiveWorkspace } from "@/lib/workspace-service";

export async function POST(req: Request) {
  try {
    const { workspaceId } = await getActiveWorkspace(req);
    const body = await req.json();
    const { botToken, chatId } = body;

    if (!botToken || !chatId) {
      return NextResponse.json(
        { error: "Необходимо указать Bot Token и ID/юзернейм канала (@channel_name)" },
        { status: 400 }
      );
    }

    // 1. Verify Bot Token with Telegram API
    const botInfo = await telegramClient.getMe(botToken.trim());

    // 2. Verify Chat / Channel Access with Telegram API
    const chatInfo = await telegramClient.getChat(botToken.trim(), chatId.trim());

    const channelTitle = chatInfo.title || botInfo.first_name || "Telegram Channel";
    const channelUsername = chatInfo.username || botInfo.username;
    const platformAccountId = String(chatInfo.id);

    // 3. Upsert Social Account into active workspace
    const account = await prisma.socialAccount.upsert({
      where: {
        workspaceId_platform_platformAccountId: {
          workspaceId,
          platform: "TELEGRAM",
          platformAccountId,
        },
      },
      create: {
        workspaceId,
        platform: "TELEGRAM",
        platformAccountId,
        pageId: String(chatInfo.id),
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
      { error: err.message || "Не удалось подключить Telegram-канал. Проверьте токен и убедитесь, что бот добавлен администратором в канал." },
      { status: 400 }
    );
  }
}
