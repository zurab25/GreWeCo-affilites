import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string }
>(function Input({ className, label, hint, error, id, ...props }, ref) {
  const autoId = id ?? props.name;
  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <label
          htmlFor={autoId}
          className="text-xs font-medium uppercase tracking-wider text-zinc-400"
        >
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={autoId}
        className={cn(
          "w-full rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20",
          error && "border-red-500/40 focus:border-red-500/50 focus:ring-red-500/20",
          className
        )}
        {...props}
      />
      {error ? (
        <p className="text-xs text-red-400/90">{error}</p>
      ) : hint ? (
        <p className="text-xs text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
});
