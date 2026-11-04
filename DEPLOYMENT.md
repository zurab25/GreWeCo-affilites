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
- `LINK_EVENT_HMAC_SECRET` — shared secret for server-to-server calls (generate with `openssl rand -hex 32`)

**To set in Cloud Run:**
```bash
gcloud run services update affiliates-greweco \
  --region=us-central1 \
  --set-env-vars="FIREBASE_PROJECT_ID=greweco-bf4e0,FIREBASE_CLIENT_EMAIL=...,LINK_EVENT_HMAC_SECRET=..." \
  --project=greweco-bf4e0
```

**Or via Console:**
1. Cloud Run → Select service → Edit & Deploy New Revision
2. Add environment variables under **Variables & Secrets**

## Firestore Collections

The app uses these collections:
- `users` — shared with Arena; affiliates have `role: "affiliate"`, `referralId`, `stats`, `earnings`
- `affiliateProfiles` — separate affiliate-only collection (avoids overwriting Arena user docs)
- `invites` — invite codes with `id`, `used`, `usedBy`, `usedAt`
- `clicks_analytics` — click and conversion events
- `commissions` — commission ledger entries (doc ID = `commission-{orderId}` for idempotency)
- `affiliateConversions` — outbox for Arena-to-affiliates conversion delivery (server-only)

### Firestore Rules

The rules are in `firestore.rules`. Since both Arena and Affiliates share the same Firebase project (`greweco-bf4e0`), these rules must be **merged with Arena's rules** before deployment.

Key rules:
- Affiliates can read their own `commissions` and `clicks_analytics` (where `affiliateId == uid`)
- All writes are server-only via Admin SDK
- `affiliateConversions` is fully locked (server-side outbox)

### Firestore Indexes

Required composite index for the earnings dashboard (in `firestore.indexes.json`):

```json
{
  "collectionGroup": "commissions",
  "fields": [
    { "fieldPath": "affiliateId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

Deploy indexes:
```bash
firebase deploy --only firestore:indexes
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
   - If present, POST conversion event with HMAC authentication:
     ```javascript
     import { createHmac } from 'crypto';

     async function postConversion(order) {
       if (!order.affiliateId) return;

       const HMAC_SECRET = process.env.LINK_EVENT_HMAC_SECRET;
       const timestamp = Date.now();

       // Build signature: eventType|affiliateId|orderId|buyerId|timestamp
       const dataToSign = [
         'conversion',
         order.affiliateId,
         order.id,
         order.userId || '',
         timestamp.toString(),
       ].join('|');

       const hmacSignature = createHmac('sha256', HMAC_SECRET)
         .update(dataToSign)
         .digest('hex');

       await fetch('https://affiliates.grew.eco/api/link-event', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           eventType: 'conversion',
           affiliateId: order.affiliateId,
           source: order.affiliateSource,
           orderId: order.id,
           buyerId: order.userId,
           timestamp,
           hmacSignature,
         }),
       });
     }
     ```
   - **Important:** The `orderAmountUsd` is now read from the order document in Firestore, not from the request body. This prevents forged commission amounts.

4. **Referral URL format:**
   - Use `?aff=` parameter (not `?ref=`)
   - Full format: `https://arena.grew.eco/join?aff=<referralId>&source=<platform>`

### API Endpoint Reference

**POST `/api/link-event`**

#### Click Events (from browser, rate-limited)
```json
{
  "eventType": "click",
  "affiliateId": "REFERRAL_CODE",
  "source": "instagram" | "facebook" | "x" | "youtube"
}
```

#### Conversion Events (server-to-server only, requires authentication)
```json
{
  "eventType": "conversion",
  "affiliateId": "REFERRAL_CODE",
  "orderId": "ORDER_ID",
  "buyerId": "BUYER_UID",
  "timestamp": 1699000000000,
  "hmacSignature": "hex-encoded-sha256-hmac"
}
```

**Authentication (conversions only):**
- Option 1: Firebase ID token from a service account or `@grew.eco` email
- Option 2: HMAC signature with shared secret (`LINK_EVENT_HMAC_SECRET`)

**HMAC Signature Format:**
```
HMAC-SHA256(key=LINK_EVENT_HMAC_SECRET, data="eventType|affiliateId|orderId|buyerId|timestamp")
```

**Security Features:**
- CORS restricted to `arena.grew.eco` and `affiliates.grew.eco`
- Clicks: rate-limited to 10 per minute per IP+affiliate combination (see note below)
- Conversions: require HMAC or ID token authentication
- Order amount is fetched from Firestore (`orders`, `fiatOrders`, or `solanaOrders`)
- Commission doc ID is deterministic (`commission-{orderId}`) to prevent duplicates
- Uses Firestore transaction to ensure at most one commission per order
- Self-referral blocked: rejects when `affiliateUid === buyerId`
- Test orders rejected: orders with `testMode: true` are not eligible
- Devnet orders rejected: Solana orders must have `cluster: "mainnet-beta"` or `"mainnet"`
- Affiliate role required: only users with `role: "affiliate"` can receive commissions

**Rate Limiter Limitation:**
The click rate limiter uses in-memory storage, which has these limitations:
- State is lost on server restart
- State is not shared across Cloud Run instances
- Under high load with multiple instances, each instance may allow up to 10 requests independently

For stricter rate limiting, consider a Firestore-backed or Redis-backed implementation.
The current implementation provides reasonable protection against casual abuse while
keeping latency low for legitimate traffic.

**Response:**
```json
{
  "success": true,
  "eventType": "conversion",
  "affiliateId": "user-uid",
  "commissionId": "commission-ORDER_ID",
  "commissionAmountUsd": 6.50
}
```

**Error Codes:**
- `RATE_LIMITED` (429) — click rate limit exceeded
- `AUTH_REQUIRED` (401) — conversion without valid authentication
- `NOT_AFFILIATE` (403) — user exists but does not have `role: "affiliate"`
- `ORDER_NOT_FOUND` (404) — order doesn't exist in any orders collection
- `ORDER_NOT_COMPLETED` (400) — order status is not completed/fulfilled/paid
- `INVALID_ORDER_AMOUNT` (400) — order has no valid totalUsd/amountUsd field
- `TEST_ORDER` (400) — order has `testMode: true`
- `DEVNET_ORDER` (400) — Solana order is not on mainnet
- `SELF_REFERRAL` (400) — buyer is the same as the affiliate
