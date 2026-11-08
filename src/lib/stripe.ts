import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy_key", {
  apiVersion: "2024-12-18.acacia" as any,
  typescript: true,
});

export interface PlanConfig {
  id: "FREE" | "CREATOR" | "PRO" | "AGENCY";
  name: string;
  priceMonthly: number;
  stripePriceId?: string;
  maxSocialAccounts: number;
  maxPostsPerMonth: number | "unlimited";
  maxRules: number | "unlimited";
  features: string[];
}

export const PLANS: Record<string, PlanConfig> = {
  FREE: {
    id: "FREE",
    name: "Free Trial",
    priceMonthly: 0,
    maxSocialAccounts: 1,
    maxPostsPerMonth: 10,
    maxRules: 2,
    features: [
      "1 социальный аккаунт",
      "До 10 запланированных постов",
      "2 правила автоответов",
      "Базовая аналитика",
    ],
  },
  CREATOR: {
    id: "CREATOR",
    name: "Creator",
    priceMonthly: 29,
    stripePriceId: process.env.STRIPE_PRICE_ID_CREATOR,
    maxSocialAccounts: 3,
    maxPostsPerMonth: "unlimited",
    maxRules: 10,
    features: [
      "3 социальных аккаунта (IG + YT)",
      "Неограниченный постинг (Reels & Shorts)",
      "10 правил Comment-to-DM & YouTube",
      "Мгновенные вебхуки",
      "Поддержка по email",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    priceMonthly: 79,
    stripePriceId: process.env.STRIPE_PRICE_ID_PRO,
    maxSocialAccounts: 10,
    maxPostsPerMonth: "unlimited",
    maxRules: "unlimited",
    features: [
      "До 10 социальных аккаунтов",
      "Неограниченный постинг",
      "Неограниченные правила Comment-to-DM",
      "До 5 участников в воркспейсе",
      "Приоритетная очередь фонового воркера",
      "Приоритетная поддержка 24/7",
    ],
  },
  AGENCY: {
    id: "AGENCY",
    name: "Agency",
    priceMonthly: 199,
    stripePriceId: process.env.STRIPE_PRICE_ID_AGENCY,
    maxSocialAccounts: 50,
    maxPostsPerMonth: "unlimited",
    maxRules: "unlimited",
    features: [
      "До 50 социальных аккаунтов",
      "Неограниченные воркспейсы и команды",
      "White-label отчеты",
      "Выделенный менеджер",
      "Кастомные вебхук-интеграции",
    ],
  },
};

export async function createCheckoutSession(options: {
  workspaceId: string;
  tier: "CREATOR" | "PRO" | "AGENCY";
  userEmail: string;
  customerId?: string | null;
}) {
  const { workspaceId, tier, userEmail, customerId } = options;
  const plan = PLANS[tier];
  if (!plan?.stripePriceId) {
    throw new Error(`Invalid plan or missing Stripe Price ID for ${tier}`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId || undefined,
    customer_email: customerId ? undefined : userEmail,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: plan.stripePriceId,
        quantity: 1,
      },
    ],
    metadata: {
      workspaceId,
      tier,
    },
    success_url: `${appUrl}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/billing?canceled=true`,
  });

  return session;
}

export async function createCustomerPortalSession(customerId: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/billing`,
  });
}
