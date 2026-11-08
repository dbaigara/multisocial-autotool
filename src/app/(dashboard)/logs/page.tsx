"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import {
  ScrollText,
  Instagram,
  Youtube,
  Send,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    try {
      setLoading(true);
      const res = await fetch("/api/logs");
      if (res.ok) setLogs(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 pb-16">
      <Header
        title="Журнал логов и событий"
        description="История обработки входящих комментариев и отправки Direct сообщений"
        actionButton={{
          label: "Обновить",
          onClick: loadLogs,
        }}
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            Показаны последние <strong className="text-white">{logs.length}</strong> событий
          </span>
          <button
            onClick={loadLogs}
            className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Обновить данные
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30">
            <ScrollText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white">Логов пока нет</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Как только под вашими постами или видео появятся комментарии с ключевыми словами, события отобразятся здесь.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                    {log.platform === "TELEGRAM" ? (
                      <Send className="w-5 h-5 text-sky-400" />
                    ) : log.platform === "INSTAGRAM" ? (
                      <Instagram className="w-5 h-5 text-pink-400" />
                    ) : (
                      <Youtube className="w-5 h-5 text-red-400" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-white">@{log.authorUsername}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          log.status === "SUCCESS"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : log.status === "PARTIAL"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {log.status}
                      </span>
                      {log.rule && (
                        <span className="text-[11px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          Триггер: «{log.rule.keyword}»
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 italic">«{log.commentText}»</p>

                    {log.errorMessage && (
                      <p className="text-[11px] text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {log.errorMessage}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col md:items-end gap-1.5 shrink-0 text-xs">
                  <div className="flex items-center gap-2">
                    {log.publicReplySent && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Ответ отправлен
                      </span>
                    )}
                    {log.dmSent && (
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 text-[11px] flex items-center gap-1">
                        <Send className="w-3 h-3" /> DM доставлен
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(log.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
