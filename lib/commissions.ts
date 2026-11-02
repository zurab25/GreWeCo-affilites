import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  type Firestore,
} from "firebase/firestore";

export type CommissionType = "first_sale" | "carbon" | "timber";

export type CommissionStatus = "pending" | "approved" | "paid" | "cancelled";

export type Commission = {
  id: string;
  affiliateId: string;
  orderId: string | null;
  buyerId: string | null;
  orderAmountUsd: number;
  commissionType: CommissionType;
  commissionRate: number;
  commissionAmountUsd: number;
  status: CommissionStatus;
  createdAt: Date | null;
  paidAt: Date | null;
  note?: string;
};

export const COMMISSION_RATES = {
  first_sale: 0.1,
  carbon: 0.1,
  timber: 0.05,
} as const;

export const COMMISSION_TYPE_LABELS: Record<CommissionType, string> = {
  first_sale: "First Unit Sale (10%)",
  carbon: "Carbon Credit Proceeds (10%)",
  timber: "Timber Proceeds (5%)",
};

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  paid: "Paid",
  cancelled: "Cancelled",
};

function parseTimestamp(ts: unknown): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts === "object" && "toDate" in ts && typeof ts.toDate === "function") {
    return ts.toDate();
  }
  if (typeof ts === "number") return new Date(ts);
  if (typeof ts === "string") return new Date(ts);
  return null;
}

export async function fetchAffiliateCommissions(
  db: Firestore,
  affiliateId: string
): Promise<Commission[]> {
  const q = query(
    collection(db, "commissions"),
    where("affiliateId", "==", affiliateId),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);

  return snap.docs.map((doc) => {
    const d = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      affiliateId: String(d.affiliateId ?? ""),
      orderId: d.orderId ? String(d.orderId) : null,
      buyerId: d.buyerId ? String(d.buyerId) : null,
      orderAmountUsd: Number(d.orderAmountUsd ?? 0),
      commissionType: (d.commissionType as CommissionType) ?? "first_sale",
      commissionRate: Number(d.commissionRate ?? COMMISSION_RATES.first_sale),
      commissionAmountUsd: Number(d.commissionAmountUsd ?? 0),
      status: (d.status as CommissionStatus) ?? "pending",
      createdAt: parseTimestamp(d.createdAt),
      paidAt: parseTimestamp(d.paidAt),
      note: d.note ? String(d.note) : undefined,
    };
  });
}

export type EarningsSummary = {
  totalPending: number;
  totalPaid: number;
  pendingByType: Record<CommissionType, number>;
  commissionCount: number;
};

export function computeEarningsSummary(commissions: Commission[]): EarningsSummary {
  let totalPending = 0;
  let totalPaid = 0;
  const pendingByType: Record<CommissionType, number> = {
    first_sale: 0,
    carbon: 0,
    timber: 0,
  };
  let commissionCount = 0;

  for (const c of commissions) {
    if (c.status === "cancelled") continue;
    commissionCount++;

    if (c.status === "paid") {
      totalPaid += c.commissionAmountUsd;
    } else {
      totalPending += c.commissionAmountUsd;
      pendingByType[c.commissionType] += c.commissionAmountUsd;
    }
  }

  return {
    totalPending,
    totalPaid,
    pendingByType,
    commissionCount,
  };
}
