import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin";
import { generateReferralId } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RegistrationPayload = {
  uid: string;
  email: string;
  displayName: string;
  inviteCode: string;
  idToken?: string;
};

function isValidPayload(body: unknown): body is RegistrationPayload {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.uid === "string" &&
    typeof b.email === "string" &&
    typeof b.displayName === "string" &&
    typeof b.inviteCode === "string"
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: "Missing required fields: uid, email, displayName, inviteCode" },
      { status: 400 }
    );
  }

  const { uid, email, displayName, inviteCode, idToken } = body;
  const trimmedCode = inviteCode.trim();

  if (!trimmedCode) {
    return NextResponse.json(
      { error: "Invite code is required" },
      { status: 400 }
    );
  }

  const auth = getAdminAuth();
  const db = getAdminFirestore();

  if (idToken) {
    try {
      const decoded = await auth.verifyIdToken(idToken);
      if (decoded.uid !== uid) {
        return NextResponse.json(
          { error: "Token UID mismatch" },
          { status: 403 }
        );
      }
    } catch (e) {
      console.error("Token verification failed:", e);
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }
  }

  const invitesRef = db.collection("invites");
  const inviteQuery = await invitesRef
    .where("id", "==", trimmedCode)
    .limit(1)
    .get();

  if (inviteQuery.empty) {
    return NextResponse.json(
      { error: "Invalid or expired invite code", code: "INVALID_INVITE" },
      { status: 400 }
    );
  }

  const inviteDoc = inviteQuery.docs[0];
  const inviteData = inviteDoc.data();

  if (inviteData.used === true) {
    return NextResponse.json(
      { error: "Invite code has already been used", code: "INVITE_USED" },
      { status: 400 }
    );
  }

  const referralId = generateReferralId();

  const batch = db.batch();

  const userRef = db.collection("users").doc(uid);
  batch.set(userRef, {
    role: "affiliate",
    displayName,
    email,
    referralId,
    createdAt: FieldValue.serverTimestamp(),
    earnings: {
      directBonus: 0,
      pendingFirstSale: 0,
      pendingCarbon: 0,
      pendingTimber: 0,
      paidOut: 0,
    },
    stats: {
      clicks: 0,
      conversions: 0,
      earningsUsd: 0,
    },
  });

  batch.update(inviteDoc.ref, {
    used: true,
    usedBy: uid,
    usedAt: FieldValue.serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (e) {
    console.error("Batch commit failed:", e);
    return NextResponse.json(
      {
        error: "Failed to complete registration. Please contact support.",
        code: "REGISTRATION_FAILED",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    referralId,
    message: "Partner registration complete",
  });
}
