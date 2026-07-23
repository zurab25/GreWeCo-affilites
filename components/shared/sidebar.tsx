"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hexagon, MessageSquare } from "lucide-react";

import { AFFILIATES_APP_HOST, DISCORD_COMMUNITY_URL } from "@/lib/branding";
import { cn } from "@/lib/utils";
import { DASHBOARD_NAV } from "@/lib/nav";

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="glass-panel hidden min-h-screen w-64 shrink-0 flex-col border-r border-white/[0.08] lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-white/[0.06] px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/35 bg-gradient-to-br from-cyan-500/15 to-violet-600/15 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.15)]">
          <Hexagon className="h-5 w-5" aria-hidden />
        </div>
        <div className="leading-tight">
          <p className="font-sans text-sm font-semibold tracking-wide text-white">GreWeCo</p>
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-zinc-500">
            Affiliates
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Primary">
        {DASHBOARD_NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : href === "/brand"
                ? pathname === "/brand"
                : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                active
                  ? "neon-border-cyan bg-gradient-to-r from-cyan-500/18 to-violet-600/12 text-white"
                  : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100"
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-white/[0.06] p-4">
        <a
          href={DISCORD_COMMUNITY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-3 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2.5 text-sm font-medium text-indigo-100 transition",
            "hover:border-indigo-400/40 hover:bg-indigo-500/15 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]"
          )}
        >
          <MessageSquare className="h-4 w-4 shrink-0" aria-hidden />
          Partner Discord
        </a>
        <p className="font-mono text-[10px] tracking-tight text-zinc-600">
          {AFFILIATES_APP_HOST} · Cyber-Noir
        </p>
      </div>
    </aside>
  );
}
