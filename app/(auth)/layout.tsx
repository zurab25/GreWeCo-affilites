import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-[1] flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-1/4 top-0 h-72 w-[min(80%,720px)] rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute -right-1/4 bottom-0 h-72 w-[min(80%,720px)] rounded-full bg-violet-600/15 blur-3xl" />
      </div>
      {children}
    </div>
  );
}
