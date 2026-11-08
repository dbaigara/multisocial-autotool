"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import {
  FolderGit2,
  RefreshCw,
  Sparkles,
  Clock,
  Film,
  Image as ImageIcon,
  CheckCircle2,
  Calendar,
  Send,
  Copy,
  Settings,
  HelpCircle,
  ExternalLink,
  Instagram,
  Youtube,
  FolderOpen,
  ArrowRight,
  Plus,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function StudioPage() {
  const [data, setData] = useState<{
    folderPath: string;
    relativePath: string;
    autoScheduleEnabled: boolean;
    dailyPostingTime: string;
    filesCount: number;
    files: any[];
  } | null>(null);

  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  // Settings drawer/modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [folderPathInput, setFolderPathInput] = useState("");
  const [postingTimeInput, setPostingTimeInput] = useState("18:00");
  const [autoScheduleInput, setAutoScheduleInput] = useState(true);

  // Ingest modal
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [ingestAccount, setIngestAccount] = useState("");
  const [customCaption, setCustomCaption] = useState("");
  const [customSchedule, setCustomSchedule] = useState("");
  const [publishNow, setPublishNow] = useState(false);
  const [submittingIngest, setSubmittingIngest] = useState(false);

  useEffect(() => {
    loadStudioData();
    loadAccounts();
  }, []);

  async function loadStudioData() {
    try {
      setLoading(true);
      const res = await fetch("/api/studio");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setFolderPathInput(json.relativePath || "./content_studio");
        setPostingTimeInput(json.dailyPostingTime || "18:00");
        setAutoScheduleInput(json.autoScheduleEnabled);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadAccounts() {
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) {
        const list = await res.json();
        setAccounts(list);
        if (list.length > 0 && !ingestAccount) {
          setIngestAccount(list[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleBatchIngest() {
    try {
      setBatchLoading(true);
      const res = await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoSchedule: true }),
      });
      const resData = await res.json();
      if (res.ok) {
        alert(`Успешно добавлено в очередь публикаций: ${resData.ingestedCount} файлов`);
        loadStudioData();
      } else {
        alert(resData.error || "Ошибка автоимпорта");
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBatchLoading(false);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/studio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          localContentPath: folderPathInput,
          dailyPostingTime: postingTimeInput,
          autoScheduleEnabled: autoScheduleInput,
        }),
      });
      if (res.ok) {
        setIsSettingsOpen(false);
        loadStudioData();
      }
    } catch (e: any) {
      alert(e.message);
    }
  }

  function openIngestModal(file: any) {
    setSelectedFile(file);
    setCustomCaption(file.caption || "");
    setCustomSchedule(file.scheduledFor ? new Date(file.scheduledFor).toISOString().slice(0, 16) : "");
    setPublishNow(false);
  }

  async function handleSubmitIngest(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      setSubmittingIngest(true);
      const res = await fetch("/api/studio/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: selectedFile.absolutePath,
          preferredAccountId: ingestAccount,
          customCaption,
          scheduledFor: publishNow ? null : customSchedule || null,
          publishNow,
        }),
      });

      if (res.ok) {
        setSelectedFile(null);
        loadStudioData();
      } else {
        const err = await res.json();
        alert(err.error || "Ошибка добавления файла");
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmittingIngest(false);
    }
  }

  function copyFolderPath() {
    if (data?.folderPath) {
      navigator.clipboard.writeText(data.folderPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const unprocessedCount = data?.files.filter((f) => !f.existingPost).length || 0;

  return (
    <div className="flex-1 pb-16">
      <Header
        title="Студия контента (Локальная папка)"
        description="Экспортируйте видео в папку проекта на компьютере — система сама поставит их в расписание"
        actionButton={{
          label: "Сканировать папку",
          onClick: loadStudioData,
        }}
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Main Folder Status Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900 border border-indigo-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Мониторинг папки активен (Watch Mode)
              </span>
            </div>

            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Папка:</span>
              <code className="text-indigo-300 bg-slate-950/60 px-2.5 py-1 rounded-xl text-sm border border-indigo-500/20 font-mono">
                {data?.relativePath || "./content_studio"}
              </code>
            </h2>

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Абсолютный путь на вашем компьютере: <strong className="text-white">{data?.folderPath}</strong>. Любой готовый видеоролик или фото, сохраненный в эту папку, автоматически импортируется в очередь.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-400">
              <button
                onClick={copyFolderPath}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? "Путь скопирован!" : "Скопировать путь"}
              </button>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" />
                Настройки расписания (слоты: {data?.dailyPostingTime || "18:00"})
              </button>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shrink-0 space-y-3">
            <div className="text-xs">
              <span className="text-slate-400">Новых файлов без публикации: </span>
              <strong className="text-white text-sm">{unprocessedCount}</strong>
            </div>

            <button
              onClick={handleBatchIngest}
              disabled={batchLoading || unprocessedCount === 0}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {batchLoading ? "Импорт..." : `Импортировать все (${unprocessedCount}) в очередь`}
            </button>
          </div>
        </div>

        {/* How-it-works instruction box */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-xs text-slate-400 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 font-bold text-[11px]">
              1
            </div>
            <div>
              <strong className="text-white block mb-0.5">Сохраните видео в папку</strong>
              Экспортируйте ролик из монтажной программы (Premiere, CapCut, DaVinci) в <code className="text-indigo-300">./content_studio</code>.
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 font-bold text-[11px]">
              2
            </div>
            <div>
              <strong className="text-white block mb-0.5">Текст и директивы (опционально)</strong>
              Создайте рядом файл <code className="text-indigo-300">video.txt</code> с текстом поста, хештегами и триггерами для Direct Message.
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 font-bold text-[11px]">
              3
            </div>
            <div>
              <strong className="text-white block mb-0.5">Автоматическая публикация</strong>
              Воркер сам подхватит файл, распределит по слотам ({data?.dailyPostingTime}) и опубликует в Instagram и YouTube!
            </div>
          </div>
        </div>

        {/* Local Files Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Обнаруженные файлы в студии</h2>
            <span className="text-xs text-slate-400">
              Всего файлов: <strong className="text-white">{data?.filesCount || 0}</strong>
            </span>
          </div>

          {data?.files.length === 0 ? (
            <div className="py-20 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30">
              <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white">В папке пока нет медиафайлов</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Положите любой файл <code className="text-indigo-300">.mp4</code> или <code className="text-indigo-300">.jpg</code> в папку <code className="text-white">{data?.folderPath}</code> и нажмите «Сканировать папку».
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {data?.files.map((file, idx) => {
                const isScheduled = file.existingPost?.status === "SCHEDULED";
                const isPublished = file.existingPost?.status === "PUBLISHED";
                const isDraft = file.existingPost?.status === "DRAFT";
                const isUnprocessed = !file.existingPost;

                return (
                  <div
                    key={idx}
                    className="rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition flex flex-col overflow-hidden"
                  >
                    {/* Media Preview Header */}
                    <div className="relative aspect-video bg-slate-950 flex items-center justify-center border-b border-slate-800/80 overflow-hidden">
                      {file.mediaType === "IMAGE" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/media/${encodeURIComponent(file.relativePath)}`}
                          alt={file.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                          <Film className="w-10 h-10 text-indigo-400/70" />
                          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-white font-semibold">
                            {file.mediaType} • {file.sizeFormatted}
                          </span>
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className="absolute top-3 right-3">
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold backdrop-blur-md ${
                            isPublished
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : isScheduled
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : isDraft
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          }`}
                        >
                          {isPublished
                            ? "Опубликовано"
                            : isScheduled
                            ? "В расписании"
                            : isDraft
                            ? "Черновик"
                            : "Готов к импорту"}
                        </span>
                      </div>

                      <div className="absolute top-3 left-3 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900/80 text-slate-300 border border-slate-700">
                        {file.filename}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="text-xs font-semibold text-white line-clamp-1 mb-1">
                          {file.title || file.filename}
                        </div>
                        <p className="text-xs text-slate-300 line-clamp-3 whitespace-pre-line leading-relaxed">
                          {file.caption}
                        </p>
                      </div>

                      {/* Status / Scheduled Time */}
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {file.existingPost?.scheduledFor
                              ? formatDate(file.existingPost.scheduledFor)
                              : file.scheduledFor
                              ? formatDate(file.scheduledFor)
                              : `Слот: ${data?.dailyPostingTime || "18:00"}`}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        {isUnprocessed ? (
                          <button
                            onClick={() => openIngestModal(file)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium transition flex items-center gap-1 shadow"
                          >
                            <span>В очередь</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : file.existingPost?.status === "PUBLISHED" && file.existingPost?.platformPostId ? (
                          <div className="flex items-center gap-2">
                            <a
                              href={
                                file.existingPost.socialAccount?.platform === "TELEGRAM"
                                  ? `https://t.me/${(file.existingPost.socialAccount?.username || "").replace("@", "")}`
                                  : file.existingPost.socialAccount?.platform === "YOUTUBE"
                                  ? `https://www.youtube.com/shorts/${file.existingPost.platformPostId}`
                                  : `https://www.instagram.com/p/${file.existingPost.platformPostId}/`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/30 transition"
                            >
                              <span>Смотреть</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <button
                              onClick={() => openIngestModal(file)}
                              className="text-[11px] text-slate-500 hover:text-slate-300 transition"
                            >
                              Ред.
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => openIngestModal(file)}
                            className="text-[11px] text-slate-400 hover:text-indigo-400 transition"
                          >
                            Редактировать
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Ingest / Edit Schedule */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-semibold text-white">
                Публикация из локальной папки
              </h2>
              <button onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitIngest} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Файл на компьютере</label>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-300 truncate">
                  {selectedFile.absolutePath}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Целевой соц. аккаунт</label>
                <select
                  value={ingestAccount}
                  onChange={(e) => setIngestAccount(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.platform === "TELEGRAM" ? "✈️ Telegram" : acc.platform === "INSTAGRAM" ? "📸 Instagram" : "▶️ YouTube"} — @{acc.username || acc.accountName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Текст поста / описание видео
                </label>
                <textarea
                  rows={4}
                  value={customCaption}
                  onChange={(e) => setCustomCaption(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 resize-none"
                  required
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-200">Опубликовать прямо сейчас</span>
                  <input
                    type="checkbox"
                    checked={publishNow}
                    onChange={(e) => setPublishNow(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-600"
                  />
                </div>

                {!publishNow && (
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Точная дата и время (оставьте пустым для авто-слота {data?.dailyPostingTime || "18:00"})
                    </label>
                    <input
                      type="datetime-local"
                      value={customSchedule}
                      onChange={(e) => setCustomSchedule(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-slate-800 transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submittingIngest}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition shadow"
                >
                  {submittingIngest ? "Сохранение..." : publishNow ? "Опубликовать сейчас" : "Поставить в очередь"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Settings */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-semibold text-white">Настройки локальной студии</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Путь к папке проекта на компьютере
                </label>
                <input
                  type="text"
                  value={folderPathInput}
                  onChange={(e) => setFolderPathInput(e.target.value)}
                  placeholder="./content_studio"
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  required
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Относительный путь (например, <code>./content_studio</code>) или абсолютный (например, <code>/Users/name/Videos/Reels</code>)
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Время ежедневного слота постинга (HH:mm)
                </label>
                <input
                  type="time"
                  value={postingTimeInput}
                  onChange={(e) => setPostingTimeInput(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700">
                <span className="text-xs text-slate-200">Авто-расписание при добавлении файлов</span>
                <input
                  type="checkbox"
                  checked={autoScheduleInput}
                  onChange={(e) => setAutoScheduleInput(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-slate-800 transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
