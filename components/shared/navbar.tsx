"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, LogOut, MessageSquare, UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { DISCORD_COMMUNITY_URL } from "@/lib/branding";
import { DASHBOARD_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function DashboardNavbar({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header
        className={cn(
          "glass-panel sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.08] px-4 md:px-6",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="glass-panel inline-flex rounded-lg p-2 text-zinc-300 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-dashboard-nav"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-sans text-lg font-semibold tracking-tight text-white">
              {title}
            </h1>
            <p className="hidden text-xs font-medium text-zinc-500 sm:block">
              GreWeCo · Arena Affiliate
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="glass-panel hidden items-center gap-2 px-3 py-1.5 text-xs text-zinc-400 sm:flex">
            <UserRound className="h-3.5 w-3.5 text-cyan-400/85" aria-hidden />
            <span className="max-w-[180px] truncate">{user?.email ?? "—"}</span>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="px-3 py-2 text-xs"
            onClick={() => void logout()}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      {open ? (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          id="mobile-dashboard-nav"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#050508]/75 backdrop-blur-md"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <div className="glass-card absolute inset-y-0 left-0 flex w-[min(20rem,100%)] flex-col rounded-none border-y-0 border-l-0">
            <div className="flex h-16 items-center justify-between border-b border-white/[0.06] px-4">
              <span className="font-sans text-sm font-semibold text-white">Navigate</span>
              <button
                type="button"
                className="rounded-lg border border-white/[0.1] bg-white/[0.04] p-2 text-zinc-400"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Primary mobile">
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
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                      active
                        ? "neon-border-cyan bg-gradient-to-r from-cyan-500/15 to-violet-600/12 text-white"
                        : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-white/[0.06] p-3">
              <a
                href={DISCORD_COMMUNITY_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2.5 text-sm font-medium text-indigo-100"
                )}
              >
                <MessageSquare className="h-4 w-4 shrink-0" aria-hidden />
                Partner Discord
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
