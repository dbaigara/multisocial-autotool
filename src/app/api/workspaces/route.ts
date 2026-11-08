import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

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
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
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
}
