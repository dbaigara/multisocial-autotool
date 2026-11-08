"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import {
  CreditCard,
  Check,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { PLANS } from "@/lib/stripe";

export default function BillingPage() {
  const [currentTier, setCurrentTier] = useState<string>("FREE");
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [hasStripeCustomer, setHasStripeCustomer] = useState(false);

  useEffect(() => {
    loadWorkspace();
  }, []);

  async function loadWorkspace() {
    try {
      const res = await fetch("/api/workspaces");
      if (res.ok) {
        const list = await res.json();
        if (list.length > 0) {
          setCurrentTier(list[0].subscriptionTier || "FREE");
          setHasStripeCustomer(Boolean(list[0].stripeCustomerId));
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSubscribe(tier: string) {
    if (tier === "FREE") return;

    try {
      setLoadingTier(tier);
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Не удалось создать платежную сессию Stripe");
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoadingTier(null);
    }
  }

  async function handleOpenPortal() {
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Не удалось открыть портал Stripe");
      }
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <div className="flex-1 pb-16">
      <Header
        title="Тарифные планы и подписка"
        description="Фиксированная ежемесячная оплата за воркспейс без переплаты за объем контактов"
      />

      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* Current Plan Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900 border border-indigo-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-indigo-400 font-semibold uppercase tracking-wider mb-1">
              Текущий тариф воркспейса
            </div>
            <div className="text-2xl font-bold text-white flex items-center gap-2">
              <span>{PLANS[currentTier]?.name || currentTier}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                Активен
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Доступны кросс-постинг, воронки комментариев и фоновые очереди задач.
            </p>
          </div>

          {hasStripeCustomer && (
            <button
              onClick={handleOpenPortal}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-xl border border-slate-700 transition flex items-center gap-1.5 self-start md:self-auto"
            >
              <CreditCard className="w-4 h-4" />
              Управление подпиской в Stripe
            </button>
          )}
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(["CREATOR", "PRO", "AGENCY"] as const).map((tierKey) => {
            const plan = PLANS[tierKey];
            const isCurrent = currentTier === tierKey;
            const isPopular = tierKey === "PRO";

            return (
              <div
                key={tierKey}
                className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all ${
                  isPopular
                    ? "bg-slate-900/90 border-2 border-indigo-500 shadow-2xl shadow-indigo-500/10"
                    : "bg-slate-900/50 border border-slate-800 hover:border-slate-700"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[11px] font-bold uppercase tracking-wider shadow">
                    Популярный выбор
                  </div>
                )}

                <div>
                  <div className="text-base font-semibold text-white">{plan.name}</div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white">${plan.priceMonthly}</span>
                    <span className="text-xs text-slate-400">/ месяц</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Фиксированная подписка за воркспейс.
                  </p>

                  <ul className="mt-6 space-y-3 text-xs text-slate-300 border-t border-slate-800 pt-5">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-800">
                  <button
                    onClick={() => handleSubscribe(tierKey)}
                    disabled={isCurrent || loadingTier === tierKey}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                      isCurrent
                        ? "bg-slate-800 text-slate-400 cursor-default"
                        : isPopular
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
                        : "bg-slate-800 hover:bg-slate-700 text-white"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isCurrent
                      ? "Текущий тариф"
                      : loadingTier === tierKey
                      ? "Переход в Stripe..."
                      : `Перейти на ${plan.name}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
