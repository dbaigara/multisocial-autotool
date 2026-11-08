"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import {
  Zap,
  Instagram,
  Youtube,
  Plus,
  Trash2,
  Send,
  MessageSquare,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Play,
} from "lucide-react";

export default function AutomationPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal create rule
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [platform, setPlatform] = useState<"INSTAGRAM" | "YOUTUBE" | "TELEGRAM">("INSTAGRAM");
  const [keyword, setKeyword] = useState("");
  const [matchType, setMatchType] = useState<"CONTAINS" | "EXACT">("CONTAINS");
  const [publicReplyText, setPublicReplyText] = useState("");
  const [dmText, setDmText] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [socialAccountId, setSocialAccountId] = useState("");

  // Live Simulator state
  const [simText, setSimText] = useState("Здравствуйте! Какая цена курса?");
  const [simPlatform, setSimPlatform] = useState<"INSTAGRAM" | "YOUTUBE" | "TELEGRAM">("INSTAGRAM");
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [rRes, aRes] = await Promise.all([fetch("/api/rules"), fetch("/api/accounts")]);
      if (rRes.ok) setRules(await rRes.json());
      if (aRes.ok) setAccounts(await aRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          keyword,
          matchType,
          publicReplyText,
          dmText: platform === "INSTAGRAM" ? dmText : null,
          buttonText: platform === "INSTAGRAM" ? buttonText : null,
          buttonUrl: platform === "INSTAGRAM" ? buttonUrl : null,
          socialAccountId: socialAccountId || null,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setKeyword("");
        setPublicReplyText("");
        setDmText("");
        setButtonText("");
        setButtonUrl("");
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Ошибка при сохранении правила");
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleRuleActive(rule: any) {
    try {
      const res = await fetch(`/api/rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      if (res.ok) {
        setRules(rules.map((r) => (r.id === rule.id ? { ...r, isActive: !r.isActive } : r)));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDeleteRule(id: string) {
    if (!confirm("Удалить это правило автоответа?")) return;
    try {
      const res = await fetch(`/api/rules/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRules(rules.filter((r) => r.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleRunSimulation(e: React.FormEvent) {
    e.preventDefault();
    if (!simText.trim()) return;

    try {
      setSimLoading(true);
      setSimResult(null);
      const res = await fetch("/api/test-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: simPlatform,
          commentText: simText,
          authorUsername: "alex_content_creator",
        }),
      });
      const data = await res.json();
      setSimResult(data);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSimLoading(false);
    }
  }

  return (
    <div className="flex-1 pb-16">
      <Header
        title="Автоматизация комментариев"
        description="Comment-to-DM воронки для Instagram и публичные автоответы для YouTube"
        actionButton={{
          label: "Создать правило",
          onClick: () => setIsModalOpen(true),
        }}
      />

      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* Simulator Banner */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900 border border-indigo-500/30">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-white">Интерактивный симулятор триггеров</h2>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
              Live Test
            </span>
          </div>

          <form onSubmit={handleRunSimulation} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Платформа</label>
              <select
                value={simPlatform}
                onChange={(e) => setSimPlatform(e.target.value as any)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="TELEGRAM">Telegram (Auto-Reply)</option>
                <option value="INSTAGRAM">Instagram (Comment-to-DM)</option>
                <option value="YOUTUBE">YouTube (Public Reply)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] text-slate-400 mb-1">
                Тестовый комментарий пользователя
              </label>
              <input
                type="text"
                value={simText}
                onChange={(e) => setSimText(e.target.value)}
                placeholder="Например: какая цена или скиньте ссылку"
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={simLoading}
                className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition flex items-center justify-center gap-1.5 shadow"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {simLoading ? "Проверка..." : "Тестировать"}
              </button>
            </div>
          </form>

          {/* Simulation Output */}
          {simResult && (
            <div className="mt-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800 animate-in fade-in">
              {simResult.matched ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Триггер сработал! Правило: «{simResult.matchedRule?.keyword}»</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {simResult.matchedRule?.publicReplyText && (
                      <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60">
                        <div className="text-[11px] text-slate-400 font-medium mb-1">
                          Публичный ответ в ветку:
                        </div>
                        <div className="text-white">«{simResult.matchedRule.publicReplyText}»</div>
                      </div>
                    )}

                    {simPlatform === "INSTAGRAM" && simResult.matchedRule?.dmText && (
                      <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/30">
                        <div className="text-[11px] text-indigo-300 font-medium mb-1 flex items-center gap-1">
                          <Send className="w-3 h-3" /> Личное сообщение в Direct (DM):
                        </div>
                        <div className="text-white mb-2">«{simResult.matchedRule.dmText}»</div>
                        {simResult.matchedRule.buttonText && simResult.matchedRule.buttonUrl && (
                          <a
                            href={simResult.matchedRule.buttonUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] rounded-lg transition"
                          >
                            <span>{simResult.matchedRule.buttonText}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-400 text-xs">
                  <AlertCircle className="w-4 h-4" />
                  <span>
                    Ни одно правило не совпало с комментарием «{simText}». Добавьте это ключевое слово в список!
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rules Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Список активных правил</h2>
            <span className="text-xs text-slate-400">
              Всего правил: <strong className="text-white">{rules.length}</strong>
            </span>
          </div>

          {rules.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30">
              <Zap className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-white">Правил автоответов пока нет</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Создайте автоворонку: при слове «цена» в Instagram бот мгновенно отправит ссылку в Direct.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition shadow"
              >
                Создать первое правило
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {rules.map((rule) => {
                const keywords = rule.keyword.split(",").map((k: string) => k.trim());
                return (
                  <div
                    key={rule.id}
                    className={`p-5 rounded-2xl border transition ${
                      rule.isActive
                        ? "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                        : "bg-slate-950/40 border-slate-900 opacity-60"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Platform & Keywords */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-[11px] font-semibold text-white border border-slate-700">
                            {rule.platform === "TELEGRAM" ? (
                              <Send className="w-3.5 h-3.5 text-sky-400" />
                            ) : rule.platform === "INSTAGRAM" ? (
                              <Instagram className="w-3.5 h-3.5 text-pink-400" />
                            ) : (
                              <Youtube className="w-3.5 h-3.5 text-red-400" />
                            )}
                            <span>{rule.platform}</span>
                          </span>

                          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {rule.matchType === "EXACT" ? "Точное совпадение" : "Содержит фразу"}
                          </span>

                          {rule.socialAccount && (
                            <span className="text-[11px] text-slate-400">
                              @{rule.socialAccount.username || rule.socialAccount.accountName}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-slate-400 font-medium mr-1">Триггеры:</span>
                          {keywords.map((kw: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2.5 py-0.5 rounded-lg bg-indigo-950/40 text-indigo-300 border border-indigo-500/30 text-xs font-medium"
                            >
                              «{kw}»
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-3 self-end md:self-center">
                        <button
                          onClick={() => toggleRuleActive(rule)}
                          className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition"
                        >
                          {rule.isActive ? (
                            <ToggleRight className="w-6 h-6 text-emerald-400" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-slate-600" />
                          )}
                          <span className="text-[11px]">{rule.isActive ? "Активно" : "Выключено"}</span>
                        </button>

                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                          title="Удалить правило"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Responses preview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs">
                      {rule.publicReplyText && (
                        <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">
                            Публичный ответ:
                          </span>
                          <p className="text-slate-200 line-clamp-2">«{rule.publicReplyText}»</p>
                        </div>
                      )}

                      {rule.platform === "INSTAGRAM" && rule.dmText && (
                        <div className="p-2.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20">
                          <span className="text-[10px] text-indigo-400 font-semibold uppercase block mb-1">
                            Direct Message (DM):
                          </span>
                          <p className="text-indigo-200 line-clamp-2">«{rule.dmText}»</p>
                          {rule.buttonText && (
                            <div className="mt-1 text-[10px] text-indigo-400 flex items-center gap-1">
                              Кнопка: <strong>{rule.buttonText}</strong> ({rule.buttonUrl})
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Automation Rule */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-semibold text-white">Новое правило автоматизации</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4 pt-4">
              {/* Platform */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPlatform("TELEGRAM")}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    platform === "TELEGRAM"
                      ? "bg-sky-600/20 border-sky-500 text-white"
                      : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                >
                  <Send className="w-3.5 h-3.5 text-sky-400" />
                  Telegram
                </button>

                <button
                  type="button"
                  onClick={() => setPlatform("INSTAGRAM")}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    platform === "INSTAGRAM"
                      ? "bg-gradient-to-r from-pink-600/20 to-purple-600/20 border-pink-500 text-white"
                      : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                >
                  <Instagram className="w-3.5 h-3.5 text-pink-400" />
                  Instagram
                </button>

                <button
                  type="button"
                  onClick={() => setPlatform("YOUTUBE")}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    platform === "YOUTUBE"
                      ? "bg-red-600/20 border-red-500 text-white"
                      : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                >
                  <Youtube className="w-3.5 h-3.5 text-red-400" />
                  YouTube
                </button>
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Ключевые слова триггера (через запятую)
                </label>
                <input
                  type="text"
                  placeholder="цена, стоимость, ссылка, курс, как купить"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Match Type */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Тип соответствия</label>
                <select
                  value={matchType}
                  onChange={(e) => setMatchType(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="CONTAINS">Содержит ключевое слово (например: «Какая цена?»)</option>
                  <option value="EXACT">Точное совпадение (только «цена»)</option>
                </select>
              </div>

              {/* Public reply */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Публичный ответ в ветку комментария
                </label>
                <input
                  type="text"
                  placeholder="Ответил вам в Direct! Проверьте запросы на переписку 📩"
                  value={publicReplyText}
                  onChange={(e) => setPublicReplyText(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Instagram DM fields */}
              {platform === "INSTAGRAM" && (
                <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                    <Send className="w-3.5 h-3.5" />
                    <span>Автоматическое личное сообщение (Direct Message)</span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">Текст сообщения в Direct</label>
                    <textarea
                      rows={3}
                      placeholder="Привет! Вы интересовались нашим курсом. Вот прямая ссылка со скидкой 20%:"
                      value={dmText}
                      onChange={(e) => setDmText(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">Текст CTA-кнопки</label>
                      <input
                        type="text"
                        placeholder="Перейти к сайту"
                        value={buttonText}
                        onChange={(e) => setButtonText(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">URL ссылки</label>
                      <input
                        type="url"
                        placeholder="https://mysite.com/offer"
                        value={buttonUrl}
                        onChange={(e) => setButtonUrl(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-slate-800 transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition shadow"
                >
                  {submitting ? "Сохранение..." : "Создать правило"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
