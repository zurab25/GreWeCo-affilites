import {
  collection,
  getDocs,
  query,
  where,
  type Firestore,
} from "firebase/firestore";

export type LeaderboardRow = {
  uid: string;
  displayName: string;
  directBonus: number;
};

export async function fetchAffiliateLeaderboard(
  db: Firestore
): Promise<LeaderboardRow[]> {
  const q = query(
    collection(db, "users"),
    where("role", "==", "affiliate")
  );
  const snap = await getDocs(q);

  const rows: LeaderboardRow[] = snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    const earnings = data.earnings as Record<string, unknown> | undefined;
    const direct = Number(earnings?.directBonus ?? 0);
    return {
      uid: d.id,
      displayName: String(data.displayName ?? data.email ?? "Partner"),
      directBonus: Number.isFinite(direct) ? direct : 0,
    };
  });

  rows.sort((a, b) => b.directBonus - a.directBonus);
  return rows;
}
