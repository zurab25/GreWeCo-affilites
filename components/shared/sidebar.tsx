"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hexagon } from "lucide-react";

import { cn } from "@/lib/utils";
import { DASHBOARD_NAV } from "@/lib/nav";

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#06060a]/95 backdrop-blur-xl lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
          <Hexagon className="h-5 w-5" aria-hidden />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-wide text-white">GreWeCo</p>
          <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
            Affiliates
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Primary">
        {DASHBOARD_NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                active
                  ? "bg-gradient-to-r from-cyan-500/15 to-violet-600/15 text-white shadow-[inset_0_0_0_1px_rgba(34,211,238,0.2)]"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <p className="text-[10px] text-zinc-600">
          affiliates.cree.eco · Cyber-Noir
        </p>
      </div>
    </aside>
  );
}
