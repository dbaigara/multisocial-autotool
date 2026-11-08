"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Calendar,
  Zap,
  Users,
  ScrollText,
  CreditCard,
  LogOut,
  Sparkles,
  FolderGit2,
} from "lucide-react";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

const navItems = [
  { label: "Обзор", href: "/dashboard", icon: LayoutDashboard },
  { label: "Студия контента", href: "/studio", icon: FolderGit2 },
  { label: "Публикации", href: "/posts", icon: Calendar },
  { label: "Автоматизация", href: "/automation", icon: Zap },
  { label: "Соц. аккаунты", href: "/accounts", icon: Users },
  { label: "Журнал логов", href: "/logs", icon: ScrollText },
  { label: "Тарифы и биллинг", href: "/billing", icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="w-64 border-r border-slate-800 bg-[#0c101c] flex flex-col h-screen sticky top-0 shrink-0">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              MultiSocial
              <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30">
                PRO
              </span>
            </div>
            <div className="text-[11px] text-slate-400">AutoTool & Local Studio</div>
          </div>
        </Link>
      </div>

      {/* Workspace Switcher */}
      <div className="p-3 border-b border-slate-800/60">
        <WorkspaceSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 py-1.5">
          Меню управления
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
              <span className="truncate">{item.label}</span>
              {item.href === "/studio" && (
                <span className="ml-auto text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-semibold uppercase">
                  Folder
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">
              {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="truncate">
              <div className="text-xs font-medium text-slate-200 truncate">
                {session?.user?.name || "Пользователь"}
              </div>
              <div className="text-[10px] text-slate-400 truncate">{session?.user?.email}</div>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Выйти"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
