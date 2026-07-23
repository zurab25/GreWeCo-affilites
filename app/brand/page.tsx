import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ColorSwatch } from "@/components/brand/color-swatch";
import { BRAND_COLORS } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Brand kit",
  description: "GreWeCo official logo and color palette for affiliates.",
};

const OFFICIAL_PALETTE = [
  { name: "Forest Green", hex: BRAND_COLORS.forestGreen },
  { name: "Stone Gray", hex: BRAND_COLORS.stoneGray },
  { name: "Abyss Blue", hex: BRAND_COLORS.abyssBlue },
  { name: "Midnight Navy", hex: BRAND_COLORS.midnightNavy },
  { name: "Arctic White", hex: BRAND_COLORS.arcticWhite },
] as const;

export default function BrandPage() {
  return (
    <div className="relative z-[1] min-h-screen bg-[#050508] px-4 py-10 md:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-1/4 top-0 h-80 w-[min(90%,720px)] rounded-full bg-[#386337]/20 blur-3xl" />
        <div className="absolute -right-1/4 bottom-0 h-80 w-[min(90%,720px)] rounded-full bg-[#101628]/40 blur-3xl" />
      </div>

      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">
              GreWeCo
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">
              Brand kit
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">
              Official logo and color palette for affiliate creatives.
            </p>
          </div>
          <Link
            href="/dashboard"
            className={buttonVariants("secondary", "inline-flex shrink-0 gap-2")}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to dashboard
          </Link>
        </header>

        <Card className="glass-card neon-border-cyan border-cyan-500/10">
          <CardHeader>
            <CardTitle className="text-lg">Logo</CardTitle>
            <CardDescription>
              Primary GreWeCo mark. Use on dark backgrounds with adequate clear space.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <div className="glass-panel flex w-full max-w-md items-center justify-center rounded-xl border border-white/[0.08] bg-[#050508] p-10">
              <Image
                src="/main-logo.png"
                alt="GreWeCo main logo"
                width={280}
                height={280}
                className="h-auto w-full max-w-[220px] object-contain"
                priority
              />
            </div>
            <a
              href="/main-logo.png"
              download="greweco-main-logo.png"
              className={buttonVariants("primary", "inline-flex gap-2")}
            >
              <Download className="h-4 w-4" aria-hidden />
              Download Logo
            </a>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <h2 className="font-sans text-xl font-semibold text-white">Color palette</h2>
          <p className="text-sm text-zinc-500">
            Click any swatch to copy its hex code to your clipboard.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OFFICIAL_PALETTE.map((color) => (
              <ColorSwatch key={color.hex} name={color.name} hex={color.hex} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
