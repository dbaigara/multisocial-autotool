import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/workspace-service";

export async function GET(req: Request) {
  try {
    const { workspaceId } = await getActiveWorkspace(req);

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
  } catch (err: any) {
    console.error("[API logs GET] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to load logs" }, { status: 500 });
  }
}
