"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import {
  Calendar,
  Clock,
  Instagram,
  Youtube,
  Plus,
  Trash2,
  Send,
  Image as ImageIcon,
  Film,
  CheckCircle2,
  AlertTriangle,
  FileEdit,
  ExternalLink,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function PostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  // New post modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState("IMAGE");
  const [scheduledFor, setScheduledFor] = useState("");
  const [publishNow, setPublishNow] = useState(false);

  useEffect(() => {
    loadData();
  }, [filter]);

  async function loadData() {
    try {
      setLoading(true);
      const [pRes, aRes] = await Promise.all([
        fetch(`/api/posts?status=${filter}`),
        fetch("/api/accounts"),
      ]);

      if (pRes.ok) setPosts(await pRes.json());
      if (aRes.ok) {
        const accs = await aRes.json();
        setAccounts(accs);
        if (accs.length > 0 && !selectedAccountId) {
          setSelectedAccountId(accs[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccountId || !caption.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          socialAccountId: selectedAccountId,
          caption,
          mediaUrl,
          mediaType,
          scheduledFor: publishNow ? null : scheduledFor || null,
          isPublishNow: publishNow,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setCaption("");
        setMediaUrl("");
        setScheduledFor("");
        setPublishNow(false);
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Ошибка при создании публикации");
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeletePost(id: string) {
    if (!confirm("Удалить этот пост?")) return;
    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPosts(posts.filter((p) => p.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  }

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="flex-1 pb-16">
      <Header
        title="Планировщик и публикации"
        description="Кросс-платформенное расписание постов, Reels и YouTube Shorts"
        actionButton={{
          label: "Создать публикацию",
          onClick: () => setIsModalOpen(true),
        }}
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 border border-slate-800 rounded-xl text-xs font-medium">
            {["ALL", "SCHEDULED", "PUBLISHED", "DRAFT", "FAILED"].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filter === tab
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab === "ALL" && "Все"}
                {tab === "SCHEDULED" && "Запланированные"}
                {tab === "PUBLISHED" && "Опубликованные"}
                {tab === "DRAFT" && "Черновики"}
                {tab === "FAILED" && "Ошибки"}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-400">
            Всего записей: <span className="text-white font-semibold">{posts.length}</span>
          </div>
        </div>

        {/* Posts Grid */}
        {posts.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white">Публикаций не найдено</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Запланируйте свою первую кросс-платформенную публикацию для Instagram или YouTube.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl shadow transition"
            >
              Создать пост
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((post) => (
              <div
                key={post.id}
                className="rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col overflow-hidden hover:border-slate-700 transition"
              >
                {/* Media Preview Header */}
                <div className="relative aspect-video bg-slate-950 flex items-center justify-center border-b border-slate-800/80 overflow-hidden">
                  {post.mediaUrl ? (
                    post.mediaType === "VIDEO" || post.mediaType === "REEL" || post.mediaType === "SHORT" ? (
                      <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                        <Film className="w-10 h-10 text-indigo-400/60" />
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-white font-semibold">
                          {post.mediaType}
                        </span>
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.mediaUrl}
                        alt="Media preview"
                        className="w-full h-full object-cover"
                      />
                    )
                  ) : (
                    <div className="flex flex-col items-center text-slate-600 text-xs">
                      <ImageIcon className="w-8 h-8 mb-1" />
                      <span>Без медиа</span>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold backdrop-blur-md ${
                        post.status === "PUBLISHED"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : post.status === "SCHEDULED"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : post.status === "FAILED"
                          ? "bg-red-500/20 text-red-300 border border-red-500/30"
                          : "bg-slate-700/60 text-slate-300"
                      }`}
                    >
                      {post.status}
                    </span>
                  </div>

                  {/* Account Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-[11px] text-white">
                    {post.socialAccount?.platform === "TELEGRAM" ? (
                      <Send className="w-3.5 h-3.5 text-sky-400" />
                    ) : post.socialAccount?.platform === "INSTAGRAM" ? (
                      <Instagram className="w-3.5 h-3.5 text-pink-400" />
                    ) : (
                      <Youtube className="w-3.5 h-3.5 text-red-400" />
                    )}
                    <span>@{post.socialAccount?.username || post.socialAccount?.accountName || "account"}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <p className="text-xs text-slate-200 line-clamp-4 whitespace-pre-line leading-relaxed">
                    {post.caption}
                  </p>

                  {post.errorMessage && (
                    <div className="p-2 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-[11px] flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{post.errorMessage}</span>
                    </div>
                  )}

                  {post.platformPostId && (
                    <a
                      href={
                        post.socialAccount?.platform === "TELEGRAM"
                          ? `https://t.me/${(post.socialAccount?.username || "").replace("@", "")}`
                          : post.socialAccount?.platform === "YOUTUBE"
                          ? `https://www.youtube.com/shorts/${post.platformPostId}`
                          : `https://www.instagram.com/p/${post.platformPostId}/`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition self-start"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Открыть на {post.socialAccount?.platform === "TELEGRAM" ? "Telegram" : post.socialAccount?.platform === "YOUTUBE" ? "YouTube" : "Instagram"}</span>
                    </a>
                  )}

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDate(post.scheduledFor || post.publishedAt || post.createdAt)}</span>
                    </div>

                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-1.5 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      title="Удалить"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create Post */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-semibold text-white">Новая публикация</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4 pt-4">
              {/* Account Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Целевой аккаунт
                </label>
                {accounts.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                    Сначала подключите хотя бы один аккаунт в разделе «Соц. аккаунты»
                  </div>
                ) : (
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.platform === "TELEGRAM" ? "✈️ Telegram" : acc.platform === "INSTAGRAM" ? "📸 Instagram" : "▶️ YouTube"} — @{acc.username || acc.accountName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Media Type & Platform Mode */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Формат медиа
                  </label>
                  <select
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {selectedAccount?.platform === "YOUTUBE" ? (
                      <>
                        <option value="SHORT">YouTube Shorts</option>
                        <option value="VIDEO">Стандартное видео</option>
                      </>
                    ) : (
                      <>
                        <option value="IMAGE">Фото / Карусель</option>
                        <option value="REEL">Instagram Reels</option>
                        <option value="VIDEO">Видеопост</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    URL медиафайла
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/media.mp4"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Caption */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Текст публикации
                    {selectedAccount?.platform === "YOUTUBE" && " (1-я строка: заголовок видео)"}
                  </label>
                  <span className="text-[10px] text-slate-500">{caption.length} символов</span>
                </div>
                <textarea
                  rows={5}
                  placeholder={
                    selectedAccount?.platform === "YOUTUBE"
                      ? "Как создать SaaS за 1 день\nВ этом видео мы разберем архитектуру..."
                      : "Напишите слово «КУРС» в комментариях, и я вышлю вам ссылку в Direct! 👇"
                  }
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 resize-none"
                  required
                />
              </div>

              {/* Scheduling Options */}
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-200">Опубликовать немедленно</span>
                  <input
                    type="checkbox"
                    checked={publishNow}
                    onChange={(e) => setPublishNow(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-800 border-slate-600"
                  />
                </div>

                {!publishNow && (
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Запланировать на дату и время
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submitting || accounts.length === 0}
                  className="px-5 py-2 rounded-xl text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitting
                    ? "Сохранение..."
                    : publishNow
                    ? "Опубликовать сейчас"
                    : scheduledFor
                    ? "Запланировать"
                    : "Сохранить черновик"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
