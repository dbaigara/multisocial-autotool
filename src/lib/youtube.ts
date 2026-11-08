import fs from "fs";

/**
 * YouTube Data API v3 Client
 */

export interface YouTubeChannelInfo {
  id: string;
  title: string;
  customUrl?: string;
  thumbnailUrl?: string;
}

export class YouTubeClient {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || "";
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    this.redirectUri = `${appUrl}/api/auth/youtube/callback`;
  }

  /**
   * Generates Google OAuth 2.0 URL
   */
  getOAuthUrl(state: string): string {
    const scopes = [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/youtube",
      "https://www.googleapis.com/auth/youtube.force-ssl",
      "https://www.googleapis.com/auth/youtube.upload",
    ].join(" ");

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: scopes,
      access_type: "offline",
      prompt: "select_account consent",
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for access_token and refresh_token
   */
  async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
  }> {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error_description || data.error || "Failed to exchange Google OAuth code");
    }
    return data;
  }

  /**
   * Refreshes expired access token using refresh_token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error_description || "Failed to refresh Google access token");
    }
    return data;
  }

  /**
   * Gets authenticated channel details
   */
  async getChannelInfo(accessToken: string): Promise<YouTubeChannelInfo> {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || "Failed to fetch YouTube channel details");
    }

    const item = data.items?.[0];
    if (!item) {
      throw new Error("No YouTube channel found for this Google account");
    }

    return {
      id: item.id,
      title: item.snippet.title,
      customUrl: item.snippet.customUrl,
      thumbnailUrl: item.snippet.thumbnails?.default?.url,
    };
  }

  /**
   * Publishes video / Shorts to YouTube. Supports both direct local file buffer and remote URL.
   */
  async uploadVideo(options: {
    accessToken: string;
    title: string;
    description: string;
    videoUrl?: string;
    localFilePath?: string;
    isShort?: boolean;
    tags?: string[];
  }): Promise<{ id: string }> {
    const { accessToken, title, description, videoUrl, localFilePath, isShort, tags } = options;

    let videoBuffer: Buffer | ArrayBuffer;

    if (localFilePath && fs.existsSync(localFilePath)) {
      videoBuffer = fs.readFileSync(localFilePath);
    } else if (videoUrl) {
      const videoFileRes = await fetch(videoUrl);
      if (!videoFileRes.ok) {
        throw new Error(`Failed to fetch video file from ${videoUrl}`);
      }
      videoBuffer = await videoFileRes.arrayBuffer();
    } else {
      throw new Error("Neither localFilePath nor videoUrl provided for YouTube upload");
    }

    const byteLength =
      videoBuffer instanceof Buffer ? videoBuffer.length : videoBuffer.byteLength;

    // 1. Initiate resumable upload session
    const finalDescription = isShort ? `${description}\n\n#Shorts` : description;
    const finalTitle = isShort && !title.includes("#Shorts") ? `${title} #Shorts` : title;

    const metadata = {
      snippet: {
        title: finalTitle,
        description: finalDescription,
        tags: tags || (isShort ? ["Shorts"] : []),
        categoryId: "22", // People & Blogs
      },
      status: {
        privacyStatus: "public",
        selfDeclaredMadeForKids: false,
      },
    };

    const sessionRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": byteLength.toString(),
          "X-Upload-Content-Type": "video/*",
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!sessionRes.ok) {
      const err = await sessionRes.text();
      throw new Error(`Failed to initiate YouTube upload: ${err}`);
    }

    const uploadUrl = sessionRes.headers.get("location");
    if (!uploadUrl) {
      throw new Error("Missing upload URL from YouTube resumable session");
    }

    // 2. Upload video bytes to resumable URL
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/*",
        "Content-Length": byteLength.toString(),
      },
      body: new Uint8Array(videoBuffer),
    });

    const uploadData = await uploadRes.json();
    if (!uploadRes.ok || uploadData.error) {
      throw new Error(uploadData.error?.message || "Failed to upload video bytes to YouTube");
    }

    return { id: uploadData.id };
  }

  /**
   * Posts a reply to a YouTube comment thread
   */
  async replyToComment(options: {
    accessToken: string;
    parentId: string; // The parent comment ID
    text: string;
  }): Promise<{ id: string }> {
    const { accessToken, parentId, text } = options;

    const res = await fetch("https://www.googleapis.com/youtube/v3/comments?part=snippet", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        snippet: {
          parentId,
          textOriginal: text,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || "Failed to reply to YouTube comment");
    }

    return { id: data.id };
  }
}

export const youtubeClient = new YouTubeClient();
