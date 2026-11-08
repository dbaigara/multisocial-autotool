"use client";

import React from "react";
import Link from "next/link";
import { Plus, Bell, Radio } from "lucide-react";

interface HeaderProps {
  title: string;
  description?: string;
  actionButton?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function Header({ title, description, actionButton }: HeaderProps) {
  return (
    <header className="h-16 border-b border-slate-800 bg-[#0c101c]/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      <div>
        <h1 className="text-lg font-semibold text-white tracking-tight">{title}</h1>
        {description && <p className="text-xs text-slate-400">{description}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Real-time worker status badge */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Воркер активен</span>
        </div>

        {actionButton && (
          actionButton.href ? (
            <Link
              href={actionButton.href}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/25 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              {actionButton.label}
            </Link>
          ) : (
            <button
              onClick={actionButton.onClick}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/25 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              {actionButton.label}
            </button>
          )
        )}
      </div>
    </header>
  );
}
