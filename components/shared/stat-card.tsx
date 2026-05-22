import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  delta?: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-white/10 bg-[#080910]/90 p-5",
        "shadow-[0_0_40px_-12px_rgba(34,211,238,0.35)]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(600px_circle_at_0%_0%,rgba(34,211,238,0.12),transparent_55%)]" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-white">
            {value}
          </p>
          {delta ? (
            <p className="mt-1 text-xs text-cyan-400/90">{delta}</p>
          ) : null}
        </div>
        <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 p-2.5 text-cyan-300">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </div>
  );
}
