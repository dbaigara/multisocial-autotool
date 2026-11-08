import React from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Zap,
  Calendar,
  MessageSquare,
  ShieldCheck,
  Check,
  Instagram,
  Youtube,
  Send,
  Layers,
} from "lucide-react";
import { PLANS } from "@/lib/stripe";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-[#0c101c]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              MultiSocial
              <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30">
                AutoTool
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition"
            >
              Вход
            </Link>
            <Link
              href="/register"
              className="text-xs font-semibold px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5"
            >
              <span>Попробовать бесплатно</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-20 px-6 max-w-7xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Аналог PostMesa & ManyChat нового поколения</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight max-w-4xl mx-auto leading-tight">
          Кросс-постинг и{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Comment-to-DM
          </span>{" "}
          воронки в одном месте
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Планируйте публикации в Instagram и YouTube, автоматически отправляйте личные сообщения в Direct при комментариях с ключевыми словами («цена», «ссылка») и платите фиксированную цену за воркспейс.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Link
            href="/register"
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white text-sm font-semibold rounded-2xl shadow-xl shadow-indigo-600/30 transition flex items-center gap-2"
          >
            <span>Начать бесплатно</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-2xl border border-slate-700 transition"
          >
            Демо-панель
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 text-left">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
              <Instagram className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Instagram Comment-to-DM</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Пользователь пишет «цена» под вашим Reel — бот мгновенно отвечает в ветку и отправляет ссылку на оплату в Direct Message с кликабельной кнопкой.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center">
              <Youtube className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">YouTube Shorts & Автоответы</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Отложенная публикация видео и Shorts через официальный YouTube Data API v3 с автоматической публикацией публичных ответов в комментариях.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Фоновый планировщик BullMQ</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Надежная фоновая очередь Redis + BullMQ для точной публикации по расписанию и мгновенной обработки входящих вебхуков без задержек.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-6 border-t border-slate-800/80 bg-slate-950/40">
        <div className="max-w-7xl mx-auto space-y-12 text-center">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Прозрачные тарифные планы
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Фиксированная ежемесячная подписка за воркспейс — никаких неожиданных счетов за объем базы контактов.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {(["CREATOR", "PRO", "AGENCY"] as const).map((tierKey) => {
              const plan = PLANS[tierKey];
              const isPopular = tierKey === "PRO";
              return (
                <div
                  key={tierKey}
                  className={`relative rounded-3xl p-6 flex flex-col justify-between ${
                    isPopular
                      ? "bg-slate-900 border-2 border-indigo-500 shadow-2xl shadow-indigo-500/10"
                      : "bg-slate-900/50 border border-slate-800"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-[11px] font-bold uppercase tracking-wider">
                      Популярный
                    </div>
                  )}

                  <div>
                    <div className="text-base font-semibold text-white">{plan.name}</div>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-white">${plan.priceMonthly}</span>
                      <span className="text-xs text-slate-400">/ месяц</span>
                    </div>

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
                    <Link
                      href="/register"
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                        isPopular
                          ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
                          : "bg-slate-800 hover:bg-slate-700 text-white"
                      }`}
                    >
                      Начать с {plan.name}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 py-8 px-6 text-center text-xs text-slate-500">
        <p>© 2026 MultiSocial AutoTool (PostMesa Alternative). Все права защищены.</p>
      </footer>
    </div>
  );
}
