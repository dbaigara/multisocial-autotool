import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { youtubeClient } from "@/lib/youtube";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || (session.user as any).workspaceId;

  if (!workspaceId) {
    return NextResponse.json({ error: "Воркспейс не указан" }, { status: 400 });
  }

  const state = JSON.stringify({
    workspaceId,
    userId: (session.user as any).id,
    random: Math.random().toString(36).substring(7),
  });

  const url = youtubeClient.getOAuthUrl(state);
  return NextResponse.json({ url });
}
