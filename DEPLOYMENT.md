# Affiliate Portal Deployment Guide

## 403 Error Root Cause & Fix

The 403 "Your client does not have permission" error from Google Frontend is caused by the Cloud Run service lacking public invoker access. When Firebase deploys the Next.js app with `frameworksBackend`, it creates a Cloud Run service that by default requires authentication.

### Required IAM Fix (Owner Must Do)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select project: `greweco-bf4e0`
3. Navigate to **Cloud Run** → Find the service (likely named `affiliates-greweco` or similar in `us-central1`)
4. Click on the service → Go to **Security** tab
5. Under **Authentication**, select:
   - ☑️ **Allow unauthenticated invocations**
6. Click **Save**

**Alternative via gcloud CLI:**
```bash
gcloud run services add-iam-policy-binding affiliates-greweco \
  --region=us-central1 \
  --member="allUsers" \
  --role="roles/run.invoker" \
  --project=greweco-bf4e0
```

> **Note:** The exact service name may differ. List services with:
> ```bash
> gcloud run services list --project=greweco-bf4e0 --region=us-central1
> ```

## Environment Variables Required

### Client-side (public, in Firebase Hosting)
These are already configured if the live site works:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional)

### Server-side (in Cloud Run environment)
Required for API routes (`/api/partner-registration`, `/api/link-event`):
- `FIREBASE_PROJECT_ID` — same as `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL` — service account email (e.g., `firebase-adminsdk-xxxxx@greweco-bf4e0.iam.gserviceaccount.com`)
- `FIREBASE_PRIVATE_KEY` — service account private key (with `\n` escaped)

**To set in Cloud Run:**
```bash
gcloud run services update affiliates-greweco \
  --region=us-central1 \
  --set-env-vars="FIREBASE_PROJECT_ID=greweco-bf4e0,FIREBASE_CLIENT_EMAIL=..." \
  --project=greweco-bf4e0
```

**Or via Console:**
1. Cloud Run → Select service → Edit & Deploy New Revision
2. Add environment variables under **Variables & Secrets**

## Firestore Collections

The app uses these collections:
- `users` — partner profiles with `role: "affiliate"`, `referralId`, `stats`, `earnings`
- `invites` — invite codes with `id`, `used`, `usedBy`, `usedAt`
- `clicks_analytics` — click and conversion events
- `commissions` — commission ledger entries

### Firestore Rules (Recommended)

Ensure these rules allow authenticated reads and server-side writes:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read their own profile
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Server-only
    }
    
    // Invites: users can read (to validate), server writes
    match /invites/{inviteId} {
      allow read: if request.auth != null;
      allow write: if false; // Server-only
    }
    
    // Analytics: users read their own, server writes
    match /clicks_analytics/{docId} {
      allow read: if request.auth != null && 
        resource.data.affiliateId == request.auth.uid;
      allow write: if false; // Server-only
    }
    
    // Commissions: users read their own, server writes
    match /commissions/{docId} {
      allow read: if request.auth != null && 
        resource.data.affiliateId == request.auth.uid;
      allow write: if false; // Server-only
    }
  }
}
```

## Deployment Steps

1. **Fix IAM** (see above)
2. **Set environment variables** in Cloud Run
3. **Deploy:**
   ```bash
   npm run build
   firebase deploy --only hosting:affiliates
   ```

## Commission Terms Implemented

- **First-sale commission:** 10% of unit sale price, computed immediately on attributed order
- **Carbon-credit proceeds:** 10% of GreWeCo's share (future, recorded but not computed)
- **Timber proceeds:** 5% of GreWeCo's share (future, after 8 years)

All payouts are manual and shown as "pending" until settled.

---

## Arena Integration Requirements

Arena must change its code to persist the affiliate attribution on orders. Currently:
- Arena reads `aff` from URL and stores in localStorage (`grew_partner_ref`)
- Arena posts click/conversion events to `affiliates.grew.eco/api/link-event`
- **BUT** Arena does NOT store the affiliate code on the actual order document

### Changes Arena Must Make

1. **In `/join` or signup flow:**
   - Already reads `aff` param ✓
   - Already stores in localStorage ✓
   - Already posts click event ✓

2. **In order creation (`createBogOrder`, `createKeepzCheckout`, `createSolanaCheckout`):**
   - Read `aff` from localStorage (`grew_partner_ref`)
   - Store `affiliateId` field on the order document in Firestore
   - Example:
     ```javascript
     const partnerRef = localStorage.getItem('grew_partner_ref');
     const orderData = {
       // ... existing fields
       affiliateId: partnerRef?.aff || null,
       affiliateSource: partnerRef?.source || null,
     };
     ```

3. **In order fulfillment (`fulfillVerifiedFiatOrder`, `fulfillSolanaPurchase`):**
   - After successful payment verification
   - Read `affiliateId` from the order document
   - If present, POST conversion event to `https://affiliates.grew.eco/api/link-event`:
     ```javascript
     if (order.affiliateId) {
       await fetch('https://affiliates.grew.eco/api/link-event', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           eventType: 'conversion',
           affiliateId: order.affiliateId,
           source: order.affiliateSource,
           orderId: order.id,
           buyerId: order.userId,
           orderAmountUsd: order.totalUsd,
         }),
       });
     }
     ```

4. **Referral URL format:**
   - Use `?aff=` parameter (not `?ref=`)
   - Full format: `https://arena.grew.eco/join?aff=<referralId>&source=<platform>`

### API Endpoint Reference

**POST `/api/link-event`**

Request body:
```json
{
  "eventType": "click" | "conversion",
  "affiliateId": "REFERRAL_CODE",
  "source": "instagram" | "facebook" | "x" | "youtube",
  "platform": "...",  // alias for source
  "buyerId": "...",   // optional, for conversions
  "orderId": "...",   // required for commission
  "orderAmountUsd": 65.00  // required for commission
}
```

Response:
```json
{
  "success": true,
  "eventId": "...",
  "eventType": "...",
  "affiliateId": "..."
}
```

The endpoint:
- Looks up affiliate by `referralId` or UID
- Records event to `clicks_analytics`
- Updates user stats (`stats.clicks` or `stats.conversions`)
- For conversions with `orderAmountUsd`, creates commission entry (10% of amount)
