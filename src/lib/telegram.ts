import fs from "fs";
import path from "path";

export interface TelegramChatInfo {
  id: number | string;
  title?: string;
  username?: string;
  type: string;
}

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
}

export class TelegramClient {
  private baseUrl(token: string) {
    return `https://api.telegram.org/bot${token}`;
  }

  /**
   * Verify bot token and get bot details
   */
  async getMe(token: string): Promise<TelegramBotInfo> {
    const res = await fetch(`${this.baseUrl(token)}/getMe`);
    const data = await res.json();
    if (!data.ok) {
      throw new Error(data.description || "Invalid Telegram bot token");
    }
    return data.result;
  }

  /**
   * Get chat / channel details (verifies bot has access to channel)
   */
  async getChat(token: string, chatId: string | number): Promise<TelegramChatInfo> {
    const res = await fetch(`${this.baseUrl(token)}/getChat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId }),
    });
    const data = await res.json();
    if (!data.ok) {
      throw new Error(
        `Telegram chat not found or bot is not an admin: ${data.description || "Unknown error"}`
      );
    }
    return data.result;
  }

  /**
   * Send text message to channel or chat
   */
  async sendMessage(token: string, chatId: string | number, text: string) {
    const res = await fetch(`${this.baseUrl(token)}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      throw new Error(`Telegram error: ${data.description || "Failed to send message"}`);
    }
    return data.result;
  }

  /**
   * Send photo to channel or chat
   */
  async sendPhoto(
    token: string,
    chatId: string | number,
    options: { photoUrl?: string; localFilePath?: string; caption?: string }
  ) {
    const { photoUrl, localFilePath, caption } = options;

    if (localFilePath && fs.existsSync(localFilePath)) {
      const form = new FormData();
      form.append("chat_id", String(chatId));
      if (caption) form.append("caption", caption);
      form.append("parse_mode", "HTML");

      const fileBuffer = fs.readFileSync(localFilePath);
      const fileName = path.basename(localFilePath);
      const blob = new Blob([fileBuffer], { type: "image/jpeg" });
      form.append("photo", blob, fileName);

      const res = await fetch(`${this.baseUrl(token)}/sendPhoto`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Telegram error: ${data.description}`);
      return data.result;
    } else if (photoUrl) {
      const res = await fetch(`${this.baseUrl(token)}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          photo: photoUrl,
          caption: caption || "",
          parse_mode: "HTML",
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Telegram error: ${data.description}`);
      return data.result;
    } else {
      throw new Error("No photo provided (neither local file nor URL)");
    }
  }

  /**
   * Send video to channel or chat
   */
  async sendVideo(
    token: string,
    chatId: string | number,
    options: { videoUrl?: string; localFilePath?: string; caption?: string }
  ) {
    const { videoUrl, localFilePath, caption } = options;

    if (localFilePath && fs.existsSync(localFilePath)) {
      const form = new FormData();
      form.append("chat_id", String(chatId));
      if (caption) form.append("caption", caption);
      form.append("parse_mode", "HTML");
      form.append("supports_streaming", "true");

      const fileBuffer = fs.readFileSync(localFilePath);
      const fileName = path.basename(localFilePath);
      const blob = new Blob([fileBuffer], { type: "video/mp4" });
      form.append("video", blob, fileName);

      const res = await fetch(`${this.baseUrl(token)}/sendVideo`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Telegram error: ${data.description}`);
      return data.result;
    } else if (videoUrl) {
      const res = await fetch(`${this.baseUrl(token)}/sendVideo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          video: videoUrl,
          caption: caption || "",
          parse_mode: "HTML",
          supports_streaming: true,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Telegram error: ${data.description}`);
      return data.result;
    } else {
      throw new Error("No video provided (neither local file nor URL)");
    }
  }
}

export const telegramClient = new TelegramClient();
