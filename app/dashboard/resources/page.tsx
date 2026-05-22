"use client";

import { ExternalLink, MessageSquare, Image as ImageIcon, Video } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

const ASSETS = [
  {
    title: "Brand kit · cree.eco",
    body: "Logos, color tokens, and safe-space rules for light / dark placements.",
    icon: ImageIcon,
    href: "https://cree.eco",
  },
  {
    title: "Launch reel · 30s cut",
    body: "Vertical asset formatted for neon grids. Pair with your referral link.",
    icon: Video,
    href: "https://cree.eco",
  },
  {
    title: "Partner Discord",
    body: "Private corridor for top performers — request access via partner success.",
    icon: MessageSquare,
    href: "https://cree.eco",
  },
];

export default function ResourcesPage() {
  return (
    <div className="relative z-[1] mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">Growth kit</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Resources & community</h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">
          Curated assets mirror the Cyber-Noir system language: deep charcoal bases, cyan/violet
          glow accents, and razor-thin divider lines.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {ASSETS.map((a) => (
          <Card key={a.title} className="flex flex-col border-white/10">
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-500/10 text-cyan-200">
                <a.icon className="h-5 w-5" aria-hidden />
              </div>
              <CardTitle className="text-base">{a.title}</CardTitle>
              <CardDescription>{a.body}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto pt-0">
              <a
                href={a.href}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants("secondary", "w-full gap-2")}
              >
                Open <ExternalLink className="h-4 w-4" />
              </a>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-violet-500/20 bg-gradient-to-br from-violet-600/10 via-transparent to-cyan-500/10">
        <CardHeader>
          <CardTitle className="text-base">Co-marketing</CardTitle>
          <CardDescription>
            Need a bespoke drop or POA slot? Email <span className="text-zinc-300">partners@cree.eco</span>{" "}
            with your audience profile and projected reach.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
