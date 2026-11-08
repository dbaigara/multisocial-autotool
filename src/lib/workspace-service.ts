import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface ActiveContext {
  workspaceId: string;
  userId: string;
}

/**
 * Universally resolves the active workspace and user.
 * Supports NextAuth session when logged in, or automatically creates/provides
 * a default Local Creator workspace for seamless zero-login local usage.
 */
export async function getActiveWorkspace(req?: Request): Promise<ActiveContext> {
  // 1. Try NextAuth session
  try {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      const uId = (session.user as any).id;
      const wId = (session.user as any).workspaceId;
      if (wId && uId) {
        return { workspaceId: wId, userId: uId };
      }
    }
  } catch {
    // continue to local fallback
  }

  // 2. Query param or header check if explicitly provided
  if (req) {
    try {
      const { searchParams } = new URL(req.url);
      const qWorkspaceId = searchParams.get("workspaceId");
      if (qWorkspaceId) {
        const existing = await prisma.workspace.findUnique({
          where: { id: qWorkspaceId },
        });
        if (existing) {
          return { workspaceId: existing.id, userId: existing.ownerId };
        }
      }
    } catch {
      // ignore
    }
  }

  // 3. Fallback to existing or auto-created default local workspace
  let workspace = await prisma.workspace.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!workspace) {
    // Ensure default user exists
    let defaultUser = await prisma.user.findFirst();
    if (!defaultUser) {
      defaultUser = await prisma.user.create({
        data: {
          name: "Local Creator",
          email: "creator@local.studio",
          passwordHash: "local_dev_mode",
        },
      });
    }

    // Create default workspace
    workspace = await prisma.workspace.create({
      data: {
        name: "Моя Студия",
        ownerId: defaultUser.id,
        localContentPath: "./content_studio",
        autoScheduleEnabled: true,
        dailyPostingTime: "18:00",
        subscriptionTier: "FREE",
      },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: defaultUser.id,
        role: "OWNER",
      },
    });
  }

  return {
    workspaceId: workspace.id,
    userId: workspace.ownerId,
  };
}

/**
 * Returns the current application base URL dynamically from request headers or env.
 */
export function getAppBaseUrl(req?: Request): string {
  if (req) {
    const host =
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      "localhost:3000";
    const proto =
      req.headers.get("x-forwarded-proto") ||
      (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
