import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin";
import { generateReferralId } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RegistrationPayload = {
  email: string;
  displayName: string;
  inviteCode: string;
  idToken: string;
};

function isValidPayload(body: unknown): body is RegistrationPayload {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.email === "string" &&
    typeof b.displayName === "string" &&
    typeof b.inviteCode === "string" &&
    typeof b.idToken === "string"
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: "Missing required fields: email, displayName, inviteCode, idToken" },
      { status: 400 }
    );
  }

  const { email, displayName, inviteCode, idToken } = body;
  const trimmedCode = inviteCode.trim();

  if (!trimmedCode) {
    return NextResponse.json(
      { error: "Invite code is required" },
      { status: 400 }
    );
  }

  const auth = getAdminAuth();
  const db = getAdminFirestore();

  let uid: string;
  try {
    const decoded = await auth.verifyIdToken(idToken);

    if (decoded.email_verified !== true) {
      return NextResponse.json(
        { error: "Email not verified. Please verify your email first.", code: "EMAIL_NOT_VERIFIED" },
        { status: 401 }
      );
    }

    uid = decoded.uid;
  } catch (e) {
    console.error("Token verification failed:", e);
    return NextResponse.json(
      { error: "Invalid authentication token", code: "INVALID_TOKEN" },
      { status: 401 }
    );
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

  const userRef = db.collection("users").doc(uid);
  const affiliateProfilesRef = db.collection("affiliateProfiles").doc(uid);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const existingUser = await transaction.get(userRef);
      const existingInvite = await transaction.get(inviteDoc.ref);

      if (!existingInvite.exists) {
        throw new Error("INVITE_NOT_FOUND");
      }

      const inviteNow = existingInvite.data();
      if (inviteNow?.used === true) {
        throw new Error("INVITE_ALREADY_USED");
      }

      const affiliateData = {
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
      };

      transaction.set(affiliateProfilesRef, affiliateData);

      if (existingUser.exists) {
        transaction.update(userRef, {
          role: "affiliate",
          referralId,
          affiliateProfileId: uid,
        });
      } else {
        transaction.set(userRef, affiliateData);
      }

      transaction.update(inviteDoc.ref, {
        used: true,
        usedBy: uid,
        usedAt: FieldValue.serverTimestamp(),
      });

      return { referralId };
    });

    return NextResponse.json({
      success: true,
      referralId: result.referralId,
      message: "Partner registration complete",
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error("Registration transaction failed:", errMsg);

    if (errMsg === "INVITE_NOT_FOUND" || errMsg === "INVITE_ALREADY_USED") {
      return NextResponse.json(
        { error: "Invite code has already been used", code: "INVITE_USED" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to complete registration. Please contact support.",
        code: "REGISTRATION_FAILED",
      },
      { status: 500 }
    );
  }
}
