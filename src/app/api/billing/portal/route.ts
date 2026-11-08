import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCustomerPortalSession } from "@/lib/stripe";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await req.json();
  const targetWorkspaceId = workspaceId || (session.user as any).workspaceId;

  const workspace = await prisma.workspace.findUnique({
    where: { id: targetWorkspaceId },
  });

  if (!workspace?.stripeCustomerId) {
    return NextResponse.json({ error: "У воркспейса нет активного клиента Stripe" }, { status: 400 });
  }

  try {
    const portalSession = await createCustomerPortalSession(workspace.stripeCustomerId);
    return NextResponse.json({ url: portalSession.url });
  } catch (err: any) {
    console.error("Stripe portal error:", err);
    return NextResponse.json({ error: err.message || "Failed to open billing portal" }, { status: 500 });
  }
}
