"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import {
  Users,
  Calendar,
  Zap,
  MessageSquare,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Instagram,
  Youtube,
  Send,
  Plus,
  FolderGit2,
  Sparkles,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    accountsCount: 0,
    scheduledPostsCount: 0,
    rulesCount: 0,
    triggeredLogsCount: 0,
    localFilesCount: 0,
  });
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [studioInfo, setStudioInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const [accountsRes, postsRes, rulesRes, logsRes, studioRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/posts"),
        fetch("/api/rules"),
        fetch("/api/logs"),
        fetch("/api/studio"),
      ]);

      const accounts = accountsRes.ok ? await accountsRes.json() : [];
      const posts = postsRes.ok ? await postsRes.json() : [];
      const rules = rulesRes.ok ? await rulesRes.json() : [];
      const logs = logsRes.ok ? await logsRes.json() : [];
      const studio = studioRes.ok ? await studioRes.json() : null;

      const scheduled = posts.filter((p: any) => p.status === "SCHEDULED");

      setStats({
        accountsCount: accounts.length,
        scheduledPostsCount: scheduled.length,
        rulesCount: rules.length,
        triggeredLogsCount: logs.length,
        localFilesCount: studio?.filesCount || 0,
      });

      setStudioInfo(studio);
      setRecentPosts(posts.slice(0, 5));
      setRecentLogs(logs.slice(0, 6));
    } catch (e) {
      console.error("Failed to load dashboard data", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 pb-12">
      <Header
        title="Панель управления"
        description="Кросс-платформенный постинг и автоматизация воронок комментариев"
        actionButton={{
          label: "Студия контента",
          href: "/studio",
        }}
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-medium">Файлы на компьютере</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <FolderGit2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{stats.localFilesCount}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>Папка проекта</span>
              <Link href="/studio" className="text-emerald-400 hover:underline ml-auto flex items-center">
                Студия <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-medium">В очереди постинга</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{stats.scheduledPostsCount}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>Запланировано</span>
              <Link href="/posts" className="text-amber-400 hover:underline ml-auto flex items-center">
                Календарь <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-medium">Правила автоответов</span>
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{stats.rulesCount}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>Comment-to-DM</span>
              <Link href="/automation" className="text-pink-400 hover:underline ml-auto flex items-center">
                Настроить <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-medium">Сработало триггеров</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{stats.triggeredLogsCount}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>Лиды и ответы</span>
              <Link href="/logs" className="text-indigo-400 hover:underline ml-auto flex items-center">
                Все логи <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Local Folder Pipeline Highlight Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/30 via-indigo-950/30 to-slate-900/50 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Локальный пайплайн публикации активен
              </span>
            </div>
            <h3 className="text-base font-semibold text-white">
              Экспортируйте видео прямо в папку <code className="text-emerald-300 font-mono text-sm">{studioInfo?.relativePath || "./content_studio"}</code>
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Приложение непрерывно отслеживает появление новых роликов и само распределяет их по ежедневным слотам публикаций ({studioInfo?.dailyPostingTime || "18:00"}) в Instagram и YouTube.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/studio"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5"
            >
              <FolderGit2 className="w-4 h-4" />
              Открыть Студию
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Scheduled Posts */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Очередь публикаций</h2>
                <p className="text-xs text-slate-400">Ближайшие посты и Shorts</p>
              </div>
              <Link href="/posts" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
                Все публикации <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {recentPosts.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
                <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Нет запланированных публикаций</p>
                <Link
                  href="/studio"
                  className="inline-block mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition"
                >
                  Перейти в студию контента
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-start gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                      {post.socialAccount?.platform === "INSTAGRAM" ? (
                        <Instagram className="w-4 h-4 text-pink-400" />
                      ) : (
                        <Youtube className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-slate-200 truncate">
                          @{post.socialAccount?.username || post.socialAccount?.accountName || "Account"}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            post.status === "PUBLISHED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : post.status === "SCHEDULED"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : post.status === "FAILED"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : "bg-slate-700/40 text-slate-300"
                          }`}
                        >
                          {post.status}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-auto flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(post.scheduledFor || post.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-2">{post.caption}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Automation Activity Logs */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Активность триггеров</h2>
                <p className="text-xs text-slate-400">Сработавшие воронки комментариев</p>
              </div>
              <Link href="/logs" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
                Журнал <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {recentLogs.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
                <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Пока нет сработавших триггеров</p>
                <Link
                  href="/automation"
                  className="inline-block mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition"
                >
                  Создать правило автоответа
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                      {log.platform === "INSTAGRAM" ? (
                        <Instagram className="w-4 h-4 text-pink-400" />
                      ) : (
                        <Youtube className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-white">@{log.authorUsername}</span>
                        <span className="text-[10px] text-slate-400">
                          {formatDate(log.createdAt)}
                        </span>
                        <span
                          className={`text-[10px] ml-auto px-1.5 py-0.2 rounded font-medium ${
                            log.status === "SUCCESS"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 italic mb-1.5">
                        «{log.commentText}»
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        {log.publicReplySent && (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Ответ в ветке
                          </span>
                        )}
                        {log.dmSent && (
                          <span className="text-indigo-400 flex items-center gap-1">
                            <Send className="w-3 h-3" /> DM отправлен
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
