import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCheckoutSession } from "@/lib/stripe";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tier, workspaceId } = await req.json();
  const targetWorkspaceId = workspaceId || (session.user as any).workspaceId;

  const workspace = await prisma.workspace.findUnique({
    where: { id: targetWorkspaceId },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  try {
    const checkoutSession = await createCheckoutSession({
      workspaceId: workspace.id,
      tier,
      userEmail: session.user.email!,
      customerId: workspace.stripeCustomerId,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: err.message || "Failed to create checkout session" }, { status: 500 });
  }
}
