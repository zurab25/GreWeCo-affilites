import {
  LayoutDashboard,
  Link2,
  Trophy,
  FolderOpen,
  Palette,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export const DASHBOARD_NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/links", label: "Links", icon: Link2 },
  { href: "/dashboard/earnings", label: "Earnings", icon: Wallet },
  { href: "/dashboard/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/dashboard/resources", label: "Resources", icon: FolderOpen },
  { href: "/brand", label: "Brand kit", icon: Palette },
] as const satisfies ReadonlyArray<{
  href: string;
  label: string;
  icon: LucideIcon;
}>;
