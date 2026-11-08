import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // In dev or without webhook secret configured
      event = JSON.parse(body);
    }
  } catch (err: any) {
    console.error(`[StripeWebhook] Signature verification failed:`, err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspaceId;
        const tier = (session.metadata?.tier as any) || "PRO";

        if (workspaceId) {
          await prisma.workspace.update({
            where: { id: workspaceId },
            data: {
              subscriptionTier: tier,
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
            },
          });
          console.log(`[StripeWebhook] Workspace ${workspaceId} upgraded to ${tier}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const workspace = await prisma.workspace.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (workspace && subscription.status === "active") {
          console.log(`[StripeWebhook] Subscription updated for workspace ${workspace.id}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const workspace = await prisma.workspace.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (workspace) {
          await prisma.workspace.update({
            where: { id: workspace.id },
            data: {
              subscriptionTier: "FREE",
              stripeSubscriptionId: null,
            },
          });
          console.log(`[StripeWebhook] Workspace ${workspace.id} downgraded to FREE`);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[StripeWebhook] Error handling event:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
