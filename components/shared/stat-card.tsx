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
        "glass-card neon-border-cyan relative overflow-hidden rounded-xl p-5 text-zinc-100",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-45 [background:radial-gradient(520px_circle_at_-5%_-5%,rgba(34,211,238,0.14),transparent_58%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-35 [background:radial-gradient(420px_circle_at_110%_20%,rgba(168,85,247,0.1),transparent_55%)]" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
            {label}
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight text-white">
            {value}
          </p>
          {delta ? (
            <p className="font-sans mt-1 text-xs text-cyan-400/90">{delta}</p>
          ) : null}
        </div>
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/[0.12] p-2.5 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </div>
  );
}
