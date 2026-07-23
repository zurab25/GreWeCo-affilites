"use client";

import Link from "next/link";
import { ExternalLink, MessageSquare, Image as ImageIcon, Video } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { CONTACT_EMAIL, DISCORD_COMMUNITY_URL, DOMAINS } from "@/lib/branding";
import { cn } from "@/lib/utils";

const EXTERNAL_ASSETS = [
  {
    title: "Arena preview",
    body: "Product surface at arena.grew.eco — align creatives with live UI.",
    icon: Video,
    href: DOMAINS.arena,
  },
] as const;

export default function ResourcesPage() {
  return (
    <div className="relative z-[1] mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">Growth kit</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Resources & community</h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">
          Curated assets mirror the Arena Cyber-Noir system language: #050508 charcoal bases,
          cyan/violet glow accents, and glass panels.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-500/10 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.12)]">
              <ImageIcon className="h-5 w-5" aria-hidden />
            </div>
            <CardTitle className="text-base">Brand kit</CardTitle>
            <CardDescription>
              Logos, color tokens, and typography — GreWeCo Arena basic brandbook.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto pt-0">
            <Link
              href="/brand"
              className={buttonVariants("secondary", "w-full gap-2 text-center")}
            >
              Open brandbook
            </Link>
          </CardContent>
        </Card>

        {EXTERNAL_ASSETS.map((a) => (
          <Card key={a.title} className="flex flex-col">
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-500/10 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.12)]">
                <a.icon className="h-5 w-5" aria-hidden />
              </div>
              <CardTitle className="text-base">{a.title}</CardTitle>
              <CardDescription>{a.body}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto pt-0">
              <a
                href={a.href}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants("secondary", "w-full gap-2")}
              >
                Open <ExternalLink className="h-4 w-4" />
              </a>
            </CardContent>
          </Card>
        ))}

        <Card className="flex flex-col">
          <CardHeader>
            <div
              className={cn(
                "mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-indigo-500/30",
                "bg-indigo-500/10 text-indigo-200"
              )}
            >
              <MessageSquare className="h-5 w-5" aria-hidden />
            </div>
            <CardTitle className="text-base">Partner Discord</CardTitle>
            <CardDescription>
              Private corridor for top performers — request access via partner success.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto pt-0">
            <a
              href={DISCORD_COMMUNITY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants("secondary", "w-full gap-2")}
            >
              Join Discord <ExternalLink className="h-4 w-4" />
            </a>
          </CardContent>
        </Card>
      </div>

      <Card className="neon-border-violet border-violet-500/15 bg-gradient-to-br from-violet-600/10 via-transparent to-cyan-500/10">
        <CardHeader>
          <CardTitle className="text-base">Co-marketing</CardTitle>
          <CardDescription>
            Need a bespoke drop or POA slot? Email{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-mono text-zinc-300 underline-offset-4 hover:text-cyan-300 hover:underline"
            >
              {CONTACT_EMAIL}
            </a>{" "}
            with your audience profile and projected reach.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
