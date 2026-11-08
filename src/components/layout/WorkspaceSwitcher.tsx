"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Layers, ChevronDown, Plus, Check } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  subscriptionTier: string;
  role: string;
}

export function WorkspaceSwitcher() {
  const { data: session, update } = useSession();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newWsName, setNewWsName] = useState("");

  const activeWorkspaceId = (session?.user as any)?.workspaceId;
  const currentWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  useEffect(() => {
    fetchWorkspaces();
  }, [session]);

  async function fetchWorkspaces() {
    try {
      const res = await fetch("/api/workspaces");
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data);
      }
    } catch (e) {
      console.error("Failed to load workspaces", e);
    }
  }

  async function switchWorkspace(wsId: string) {
    await update({ workspaceId: wsId });
    setIsOpen(false);
    window.location.reload();
  }

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!newWsName.trim()) return;

    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWsName }),
      });
      if (res.ok) {
        const created = await res.json();
        setNewWsName("");
        setIsCreating(false);
        await switchWorkspace(created.id);
      }
    } catch (e) {
      console.error("Failed to create workspace", e);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition text-left"
      >
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-sm shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="truncate">
            <div className="text-sm font-medium text-slate-200 truncate">
              {currentWorkspace ? currentWorkspace.name : "Воркспейс"}
            </div>
            <div className="text-xs text-indigo-400 font-medium">
              {currentWorkspace?.subscriptionTier || "FREE"}
            </div>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-1">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
            Воркспейсы
          </div>

          <div className="space-y-1 my-1 max-h-48 overflow-y-auto">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => switchWorkspace(ws.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm text-left transition ${
                  ws.id === activeWorkspaceId
                    ? "bg-indigo-600/20 text-indigo-300 font-medium"
                    : "text-slate-300 hover:bg-slate-800/60"
                }`}
              >
                <span className="truncate">{ws.name}</span>
                {ws.id === activeWorkspaceId && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-800/80">
            {isCreating ? (
              <form onSubmit={createWorkspace} className="space-y-2">
                <input
                  type="text"
                  placeholder="Название нового воркспейса"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
                <div className="flex gap-1.5">
                  <button
                    type="submit"
                    className="flex-1 text-xs py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium"
                  >
                    Создать
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/30 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Новый воркспейс
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
