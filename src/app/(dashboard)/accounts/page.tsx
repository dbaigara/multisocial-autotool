"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import {
  Users,
  Instagram,
  Youtube,
  Trash2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Plus,
  Sparkles,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    try {
      setLoading(true);
      const res = await fetch("/api/accounts");
      if (res.ok) setAccounts(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function connectMeta() {
    try {
      const res = await fetch("/api/auth/meta/url");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Не удалось сгенерировать ссылку авторизации Meta");
      }
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function connectYouTube() {
    try {
      const res = await fetch("/api/auth/youtube/url");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Не удалось сгенерировать ссылку авторизации Google");
      }
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function connectDemo(platform: "INSTAGRAM" | "YOUTUBE") {
    try {
      const res = await fetch("/api/accounts/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      if (res.ok) {
        loadAccounts();
      }
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Отключить этот аккаунт?")) return;
    try {
      const res = await fetch(`/api/accounts?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setAccounts(accounts.filter((a) => a.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  }

  function copyWebhookUrl() {
    const url = `${window.location.origin}/api/webhooks/instagram`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex-1 pb-16">
      <Header
        title="Подключение социальных сетей"
        description="Авторизация через официальные API Meta Graph и YouTube Data API v3"
      />

      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* Connect Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Instagram Connect Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-pink-950/20 via-purple-950/20 to-slate-900 border border-pink-500/30 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center mb-4">
                <Instagram className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Instagram Business / Creator</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Подключение через Facebook Login. Позволяет публиковать посты и Reels, отслеживать комментарии и автоматически отправлять Direct Messages (Comment-to-DM).
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
              <button
                onClick={connectMeta}
                className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white text-xs font-medium rounded-xl shadow-lg transition flex items-center gap-1.5"
              >
                <Instagram className="w-4 h-4" />
                Подключить через Facebook
              </button>
              <button
                onClick={() => connectDemo("INSTAGRAM")}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition flex items-center gap-1.5"
                title="Добавить тестовый аккаунт для быстрой демонстрации"
              >
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                Тестовый IG
              </button>
            </div>
          </div>

          {/* YouTube Connect Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-red-950/20 via-slate-900 to-slate-900 border border-red-500/30 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
                <Youtube className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">YouTube Channel</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Авторизация через Google OAuth. Позволяет публиковать видео и YouTube Shorts, а также автоматически публиковать ответы на комментарии зрителей.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
              <button
                onClick={connectYouTube}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-xl shadow-lg transition flex items-center gap-1.5"
              >
                <Youtube className="w-4 h-4" />
                Подключить через Google
              </button>
              <button
                onClick={() => connectDemo("YOUTUBE")}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition flex items-center gap-1.5"
                title="Добавить тестовый канал для быстрой демонстрации"
              >
                <Sparkles className="w-3.5 h-3.5 text-red-400" />
                Тестовый YT
              </button>
            </div>
          </div>
        </div>

        {/* Connected Accounts List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Подключенные аккаунты</h2>
            <span className="text-xs text-slate-400">
              Активных: <strong className="text-white">{accounts.length}</strong>
            </span>
          </div>

          {accounts.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-white">Нет подключенных аккаунтов</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Воспользуйтесь кнопками выше для авторизации или добавьте тестовый аккаунт в 1 клик.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {acc.profilePictureUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={acc.profilePictureUrl}
                            alt={acc.accountName}
                            className="w-11 h-11 rounded-full object-cover border border-slate-700"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                            {acc.accountName?.[0] || "A"}
                          </div>
                        )}
                        <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-slate-900 border border-slate-800">
                          {acc.platform === "INSTAGRAM" ? (
                            <Instagram className="w-3 h-3 text-pink-400" />
                          ) : (
                            <Youtube className="w-3 h-3 text-red-400" />
                          )}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {acc.accountName || "Account"}
                        </div>
                        <div className="text-xs text-slate-400 truncate">@{acc.username}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(acc.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      title="Отключить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Токен активен</span>
                    </div>

                    <span>Постов: {acc._count?.posts || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Webhooks Setup Info Box */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Настройка Meta Webhook для продакшена (Instagram)
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Для приема комментариев в реальном времени укажите эти данные в панели Meta for Developers (раздел Webhooks → Instagram → field: comments):
          </p>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Callback URL:</span>
                <code className="text-indigo-300">
                  {typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}
                  /api/webhooks/instagram
                </code>
              </div>
              <button
                onClick={copyWebhookUrl}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                {copied ? "Скопировано!" : "Копировать"}
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Verify Token:</span>
              <code className="text-slate-300">multisocial_verify_token_secret</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
