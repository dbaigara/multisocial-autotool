import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || (session.user as any).workspaceId;

  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
  }

  const logs = await prisma.automationLog.findMany({
    where: { workspaceId },
    include: {
      rule: {
        select: {
          id: true,
          keyword: true,
          matchType: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(logs);
}
