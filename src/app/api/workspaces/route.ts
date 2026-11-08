import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/workspace-service";

export async function GET(req: Request) {
  try {
    const { userId } = await getActiveWorkspace(req);

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            _count: {
              select: {
                socialAccounts: true,
                posts: true,
                automationRules: true,
              },
            },
          },
        },
      },
    });

    const workspaces = memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
    }));

    return NextResponse.json(workspaces);
  } catch (err: any) {
    console.error("[Workspaces GET] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to load workspaces" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await getActiveWorkspace(req);
    const { name } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Название воркспейса обязательно" }, { status: 400 });
    }

    const workspace = await prisma.workspace.create({
      data: {
        name: name.trim(),
        ownerId: userId,
        subscriptionTier: "FREE",
        members: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch (err: any) {
    console.error("[Workspaces POST] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to create workspace" }, { status: 500 });
  }
}
