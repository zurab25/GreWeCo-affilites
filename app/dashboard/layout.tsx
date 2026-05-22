import type { ReactNode } from "react";

import { DashboardAuthGate } from "@/components/shared/auth-gate";
import { DashboardShell } from "@/components/shared/dashboard-shell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardAuthGate>
      <DashboardShell>{children}</DashboardShell>
    </DashboardAuthGate>
  );
}
