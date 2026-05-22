import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-cyan-500/90 to-violet-600/90 text-[#050508] font-semibold shadow-[0_0_24px_rgba(34,211,238,0.25)] hover:from-cyan-400 hover:to-violet-500 focus-visible:ring-cyan-400/60",
  secondary:
    "border border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10 focus-visible:ring-violet-500/40",
  ghost:
    "text-zinc-300 hover:bg-white/5 hover:text-white focus-visible:ring-white/20",
  danger:
    "bg-red-500/15 text-red-200 border border-red-500/30 hover:bg-red-500/25 focus-visible:ring-red-400/40",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050508] disabled:pointer-events-none disabled:opacity-40";

export function buttonVariants(
  variant: ButtonVariant = "primary",
  className?: string
) {
  return cn(base, variants[variant], className);
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
  }
>(function Button(
  { className, variant = "primary", disabled, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={buttonVariants(variant, className)}
      {...props}
    />
  );
});
