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
  Send,
  Zap,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Telegram modal state
  const [showTgModal, setShowTgModal] = useState(false);
  const [tgBotToken, setTgBotToken] = useState("");
  const [tgChatId, setTgChatId] = useState("");
  const [tgConnecting, setTgConnecting] = useState(false);
  const [tgError, setTgError] = useState("");

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

  async function connectTelegramSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTgError("");
    setTgConnecting(true);
    try {
      const res = await fetch("/api/accounts/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: tgBotToken,
          chatId: tgChatId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowTgModal(false);
        setTgBotToken("");
        setTgChatId("");
        loadAccounts();
      } else {
        setTgError(data.error || "Ошибка подключения Telegram");
      }
    } catch (err: any) {
      setTgError(err.message || "Сетевая ошибка при подключении");
    } finally {
      setTgConnecting(false);
    }
  }

  async function connectDemo(platform: "INSTAGRAM" | "YOUTUBE" | "TELEGRAM") {
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
        description="Подключайте Telegram-каналы за 30 секунд или используйте официальные API Meta & YouTube"
      />

      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* Connect Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Telegram Connect Card - Fast Dopamine */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-sky-950/30 via-slate-900 to-slate-900 border border-sky-500/40 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-3 right-3">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                ⚡️ 30 СЕКУНД
              </span>
            </div>
            <div>
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-4">
                <Send className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Telegram Канал / Группа</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Без верификаций Meta и Google. Бот публикует фото, видео и текст сразу в ваш канал прямо из папки монтажа!
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowTgModal(true)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-sky-600/20 transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Подключить бота
              </button>
              <button
                onClick={() => connectDemo("TELEGRAM")}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition flex items-center gap-1.5"
                title="Добавить тестовый Telegram-канал"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                Тестовый TG
              </button>
            </div>
          </div>

          {/* Instagram Connect Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-pink-950/20 via-purple-950/20 to-slate-900 border border-pink-500/30 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center mb-4">
                <Instagram className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Instagram Business / Creator</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Официальный Meta Graph API. Позволяет публиковать Reels и авто-отвечать в Direct при получении кодового слова в комментариях.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
              <button
                onClick={connectMeta}
                className="px-3.5 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white text-xs font-medium rounded-xl shadow-lg transition flex items-center gap-1.5"
              >
                <Instagram className="w-4 h-4" />
                Через Facebook
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
              <h3 className="text-base font-semibold text-white">YouTube Shorts & Video</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Авторизация через Google OAuth. Загрузка видео и Shorts напрямую с жесткого диска через Resumable Upload API.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
              <button
                onClick={connectYouTube}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-xl shadow-lg transition flex items-center gap-1.5"
              >
                <Youtube className="w-4 h-4" />
                Через Google
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

        {/* Telegram Connect Modal */}
        {showTgModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-semibold text-white">Подключение Telegram канала</h3>
                </div>
                <button
                  onClick={() => setShowTgModal(false)}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-500/20 text-xs text-slate-300 space-y-1.5">
                <p className="font-semibold text-sky-300">Инструкция за 30 секунд:</p>
                <p>1. Откройте в Telegram бота <strong className="text-white">@BotFather</strong> и отправьте команду <code className="text-sky-300">/newbot</code>.</p>
                <p>2. Скопируйте выданный API токен.</p>
                <p>3. Добавьте созданного бота администратором в ваш канал (с правом публиковать сообщения).</p>
              </div>

              {tgError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  {tgError}
                </div>
              )}

              <form onSubmit={connectTelegramSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">
                    Bot API Token:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="123456789:ABCDefGhIJKlmNoPQRsTUVwxyZ..."
                    value={tgBotToken}
                    onChange={(e) => setTgBotToken(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">
                    ID или Юзернейм канала:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="@my_channel_name или -100123456789"
                    value={tgChatId}
                    onChange={(e) => setTgChatId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTgModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={tgConnecting}
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {tgConnecting ? "Проверка..." : "Подключить канал"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Connected Accounts List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Подключенные каналы и соцсети</h2>
            <span className="text-xs text-slate-400">
              Активных: <strong className="text-white">{accounts.length}</strong>
            </span>
          </div>

          {accounts.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-white">Нет подключенных аккаунтов</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Подключите Telegram-канал за 30 секунд или добавьте тестовые аккаунты для мгновенного ознакомления.
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
                          {acc.platform === "TELEGRAM" ? (
                            <Send className="w-3 h-3 text-sky-400" />
                          ) : acc.platform === "INSTAGRAM" ? (
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
                        <div className="text-xs text-slate-400 truncate">
                          {acc.username || acc.platformAccountId}
                        </div>
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
                      <span>{acc.platform} активен</span>
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
            Для приема комментариев Instagram в реальном времени укажите эти данные в панели Meta for Developers (раздел Webhooks → Instagram → field: comments):
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
