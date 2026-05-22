"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, LogOut, UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
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
          "sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-[#050508]/80 px-4 backdrop-blur-xl md:px-6",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-300 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-dashboard-nav"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">
              {title}
            </h1>
            <p className="hidden text-xs text-zinc-500 sm:block">
              GreWeCo Affiliate Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-zinc-400 sm:flex">
            <UserRound className="h-3.5 w-3.5 text-cyan-400/80" aria-hidden />
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
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(20rem,100%)] flex-col border-r border-white/10 bg-[#06060a] shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
              <span className="text-sm font-semibold text-white">Navigate</span>
              <button
                type="button"
                className="rounded-lg border border-white/10 p-2 text-zinc-400"
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
                    : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                      active
                        ? "bg-gradient-to-r from-cyan-500/15 to-violet-600/15 text-white"
                        : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
