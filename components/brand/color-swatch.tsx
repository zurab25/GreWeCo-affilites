"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export function ColorSwatch({ name, hex }: { name: string; hex: string }) {
  const [copied, setCopied] = useState(false);
  const isLight = hex.toUpperCase() === "#F2F5F8";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className={cn(
        "glass-card group flex w-full flex-col overflow-hidden rounded-xl text-left transition",
        "cursor-pointer hover:ring-2 hover:ring-cyan-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50",
        copied && "neon-border-cyan ring-2 ring-cyan-500/40"
      )}
      aria-label={`Copy ${name} color ${hex} to clipboard`}
    >
      <div
        className="relative h-28 border-b border-white/[0.06]"
        style={{ backgroundColor: hex }}
        aria-hidden
      >
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white opacity-0 transition-opacity",
            "group-hover:opacity-100",
            copied && "opacity-100"
          )}
        >
          {copied ? (
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" aria-hidden />
              Copied
            </span>
          ) : (
            "Click to copy"
          )}
        </span>
      </div>
      <div className="p-4">
        <p className="font-sans text-sm font-medium text-white">{name}</p>
        <p
          className={cn(
            "font-mono text-xs",
            isLight ? "text-zinc-400" : "text-zinc-500",
            copied && "text-cyan-400/90"
          )}
        >
          {copied ? "Copied to clipboard" : hex}
        </p>
      </div>
    </button>
  );
}
