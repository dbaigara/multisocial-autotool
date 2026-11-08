/**
 * Meta Graph API Client for Instagram Content Publishing & Comment Automation
 * Graph API v21.0
 */

const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface MetaPageInfo {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: {
    id: string;
    username?: string;
    name?: string;
    profile_picture_url?: string;
  };
}

export class MetaClient {
  private appId: string;
  private appSecret: string;
  private redirectUri: string;

  constructor() {
    this.appId = process.env.META_APP_ID || "";
    this.appSecret = process.env.META_APP_SECRET || "";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    this.redirectUri = `${appUrl}/api/auth/meta/callback`;
  }

  /**
   * Generates Facebook Login OAuth URL with permissions required for Instagram
   */
  getOAuthUrl(state: string): string {
    const scopes = [
      "instagram_basic",
      "instagram_content_publish",
      "instagram_manage_comments",
      "instagram_manage_messages",
      "pages_show_list",
      "pages_read_engagement",
      "business_management",
    ].join(",");

    return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?client_id=${this.appId}&redirect_uri=${encodeURIComponent(
      this.redirectUri
    )}&scope=${encodeURIComponent(scopes)}&response_type=code&state=${encodeURIComponent(state)}`;
  }

  /**
   * Exchanges authorization code for a short-lived user access token
   */
  async exchangeCodeForToken(code: string): Promise<{ access_token: string; expires_in?: number }> {
    const url = `${GRAPH_BASE_URL}/oauth/access_token?client_id=${this.appId}&redirect_uri=${encodeURIComponent(
      this.redirectUri
    )}&client_secret=${this.appSecret}&code=${code}`;

    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || "Failed to exchange Meta OAuth code");
    }
    return data;
  }

  /**
   * Exchanges short-lived token for long-lived (60 days) token
   */
  async getLongLivedToken(shortLivedToken: string): Promise<{ access_token: string; expires_in: number }> {
    const url = `${GRAPH_BASE_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${this.appId}&client_secret=${this.appSecret}&fb_exchange_token=${shortLivedToken}`;

    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || "Failed to exchange for long-lived Meta token");
    }
    return data;
  }

  /**
   * Fetches Facebook Pages and attached Instagram Business/Creator accounts
   */
  async getInstagramAccounts(userAccessToken: string): Promise<MetaPageInfo[]> {
    const url = `${GRAPH_BASE_URL}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}&access_token=${userAccessToken}`;

    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || "Failed to fetch Facebook Pages");
    }

    return (data.data || []).filter((page: MetaPageInfo) => page.instagram_business_account);
  }

  /**
   * Instagram Content Publishing: Step 1 & 2
   * Creates media container and publishes it to Instagram Business Account
   */
  async publishMedia(options: {
    igUserId: string;
    accessToken: string;
    caption: string;
    mediaUrl: string;
    isReel?: boolean;
  }): Promise<{ id: string }> {
    const { igUserId, accessToken, caption, mediaUrl, isReel } = options;

    // 1. Create Media Container
    const containerParams = new URLSearchParams({
      access_token: accessToken,
      caption,
    });

    if (isReel) {
      containerParams.append("media_type", "REELS");
      containerParams.append("video_url", mediaUrl);
    } else {
      containerParams.append("image_url", mediaUrl);
    }

    const containerRes = await fetch(`${GRAPH_BASE_URL}/${igUserId}/media?${containerParams.toString()}`, {
      method: "POST",
    });
    const containerData = await containerRes.json();
    if (!containerRes.ok || containerData.error) {
      throw new Error(containerData.error?.message || "Failed to create Instagram media container");
    }

    const containerId = containerData.id;

    // For video/reels, poll until container status is FINISHED
    if (isReel) {
      let isReady = false;
      let attempts = 0;
      while (!isReady && attempts < 20) {
        await new Promise((r) => setTimeout(r, 3000));
        attempts++;

        const statusRes = await fetch(
          `${GRAPH_BASE_URL}/${containerId}?fields=status_code&access_token=${accessToken}`
        );
        const statusData = await statusRes.json();
        if (statusData.status_code === "FINISHED") {
          isReady = true;
        } else if (statusData.status_code === "ERROR") {
          throw new Error("Instagram video processing failed");
        }
      }
    }

    // 2. Publish Media Container
    const publishRes = await fetch(`${GRAPH_BASE_URL}/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        creation_id: containerId,
        access_token: accessToken,
      }),
    });

    const publishData = await publishRes.json();
    if (!publishRes.ok || publishData.error) {
      throw new Error(publishData.error?.message || "Failed to publish Instagram media container");
    }

    return publishData; // Returns { id: published_post_id }
  }

  /**
   * Reply to a comment publicly on Instagram
   */
  async replyToComment(commentId: string, message: string, accessToken: string): Promise<{ id: string }> {
    const res = await fetch(`${GRAPH_BASE_URL}/${commentId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        message,
        access_token: accessToken,
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || "Failed to reply to Instagram comment");
    }
    return data;
  }

  /**
   * Send Instagram Direct Message (Comment-to-DM trigger or recipient reply)
   */
  async sendDirectMessage(options: {
    igUserId: string;
    recipientId?: string;
    commentId?: string;
    text: string;
    buttonText?: string;
    buttonUrl?: string;
    accessToken: string;
  }): Promise<any> {
    const { igUserId, recipientId, commentId, text, buttonText, buttonUrl, accessToken } = options;

    let payload: any = {
      recipient: recipientId ? { id: recipientId } : { comment_id: commentId },
      message: {},
    };

    if (buttonText && buttonUrl) {
      // Generic template with CTA button
      payload.message.attachment = {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [
            {
              title: text,
              buttons: [
                {
                  type: "web_url",
                  url: buttonUrl,
                  title: buttonText,
                },
              ],
            },
          ],
        },
      };
    } else {
      payload.message.text = text;
    }

    const res = await fetch(`${GRAPH_BASE_URL}/${igUserId}/messages?access_token=${accessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || "Failed to send Instagram Direct Message");
    }
    return data;
  }
}

export const metaClient = new MetaClient();
