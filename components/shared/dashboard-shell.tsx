"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { DashboardNavbar } from "@/components/shared/navbar";
import { DashboardSidebar } from "@/components/shared/sidebar";

const TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/links": "Links & Analytics",
  "/dashboard/leaderboard": "Leaderboard",
  "/dashboard/resources": "Resources & Assets",
};

function titleFromPath(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith("/dashboard/")) return "Dashboard";
  return "Dashboard";
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const title = titleFromPath(pathname);

  return (
    <div className="flex min-h-screen bg-[#050508]">
      <DashboardSidebar />
      <div className="relative z-[1] flex min-h-screen flex-1 flex-col">
        <DashboardNavbar title={title} />
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
