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
- `LINK_EVENT_HMAC_SECRET` — shared secret for server-to-server calls

### Setting up LINK_EVENT_HMAC_SECRET with Secret Manager

**Step 1: Create the secret in Secret Manager:**
```bash
# Generate a secure secret
openssl rand -hex 32 > /tmp/hmac-secret.txt

# Create the secret in Secret Manager
gcloud secrets create LINK_EVENT_HMAC_SECRET \
  --project=greweco-bf4e0 \
  --replication-policy="automatic"

# Add the secret value
gcloud secrets versions add LINK_EVENT_HMAC_SECRET \
  --project=greweco-bf4e0 \
  --data-file=/tmp/hmac-secret.txt

# Clean up
rm /tmp/hmac-secret.txt
```

**Step 2: Grant Cloud Run access to the secret:**
```bash
# Get the Cloud Run service account (usually the compute default)
SERVICE_ACCOUNT=$(gcloud run services describe affiliates-greweco \
  --region=us-central1 \
  --project=greweco-bf4e0 \
  --format='value(spec.template.spec.serviceAccountName)')

# If empty, it uses the default compute service account
if [ -z "$SERVICE_ACCOUNT" ]; then
  PROJECT_NUMBER=$(gcloud projects describe greweco-bf4e0 --format='value(projectNumber)')
  SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
fi

# Grant access
gcloud secrets add-iam-policy-binding LINK_EVENT_HMAC_SECRET \
  --project=greweco-bf4e0 \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

**Step 3: Mount the secret in Cloud Run:**
```bash
gcloud run services update affiliates-greweco \
  --region=us-central1 \
  --project=greweco-bf4e0 \
  --set-secrets="LINK_EVENT_HMAC_SECRET=LINK_EVENT_HMAC_SECRET:latest"
```

**Step 4: Share the same secret with Arena Functions:**
Arena's `affiliateConversion.js` uses `defineSecret("LINK_EVENT_HMAC_SECRET")`.
Ensure both services read from the same Secret Manager secret.

**Alternative: Plain environment variable (less secure):**
```bash
gcloud run services update affiliates-greweco \
  --region=us-central1 \
  --set-env-vars="LINK_EVENT_HMAC_SECRET=$(openssl rand -hex 32)" \
  --project=greweco-bf4e0
```

**Or via Console:**
1. Cloud Run → Select service → Edit & Deploy New Revision
2. Under **Variables & Secrets**, click **Reference a Secret**
3. Select `LINK_EVENT_HMAC_SECRET` and mount as environment variable

## Firestore Collections

The app uses these collections:
- `users` — shared with Arena; affiliates have `role: "affiliate"`, `referralId`, `stats`, `earnings`
- `affiliateProfiles` — separate affiliate-only collection (avoids overwriting Arena user docs)
- `invites` — invite codes with `id`, `used`, `usedBy`, `usedAt`
- `clicks_analytics` — click and conversion events
- `commissions` — commission ledger entries (doc ID = `commission-{orderId}` for idempotency)
- `affiliateConversions` — outbox for Arena-to-affiliates conversion delivery (server-only)
- `fiatOrders` — Arena order records (read by `/api/link-event` for conversion validation)
- `solanaOrders` — Solana payment records (read for cluster validation)

### Firestore Rules and Indexes

**Important:** Arena owns the shared Firebase project's rules and indexes.
The required rules and indexes are documented in `arena-rules-additions.md`.
The Arena team must add them to their `firestore.rules` and `firestore.indexes.json`.

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

3. **In order fulfillment** — Arena's `affiliateConversion.js` handles this automatically:
   - Triggers on `fiatOrders/{orderId}` transition to `status: "completed"`
   - Reads `affiliate.code` from the order (set by `resolveAffiliateForOrder`)
   - Validates: not testMode, mainnet cluster for Solana, not self-referral
   - Sends conversion with HMAC in **headers** (not body):
     ```javascript
     // Arena sends (affiliateConversion.js):
     const timestamp = Math.floor(Date.now() / 1000); // UNIX SECONDS
     const body = JSON.stringify({
       eventType: 'conversion',
       affiliateId: order.affiliate.code,
       orderId: orderId,
       buyerId: order.userId,
       timestamp: timestamp,
     });
     
     // Signature format: eventType|affiliateId|orderId|buyerId|timestamp
     const dataToSign = `conversion|${code}|${orderId}|${buyerId}|${timestamp}`;
     const signature = createHmac('sha256', secret).update(dataToSign).digest('hex');
     
     // Headers (signature in header, NOT in body):
     headers: {
       'Content-Type': 'application/json',
       'X-Grew-Timestamp': String(timestamp),  // UNIX seconds
       'X-Grew-Signature': signature,          // hex HMAC
     }
     ```
   - **Order amount** is read from `fiatOrders/{orderId}.totalAmountUsd`, not from request
   - **Affiliate code validation**: request `affiliateId` must match `order.affiliate.code`

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

#### Code Check Events (validate affiliate code)
```json
{
  "eventType": "code_check",
  "affiliateId": "REFERRAL_CODE"
}
```
Response: `{ "valid": true, "affiliateId": "REFERRAL_CODE" }`

#### Conversion Events (server-to-server only, requires authentication)

**Request body:**
```json
{
  "eventType": "conversion",
  "affiliateId": "REFERRAL_CODE",
  "orderId": "ORDER_ID",
  "buyerId": "BUYER_UID",
  "timestamp": 1730700000
}
```

**Required headers:**
- `X-Grew-Signature`: hex-encoded HMAC-SHA256 signature
- `X-Grew-Timestamp`: Unix timestamp in **seconds** (same as body `timestamp`)

**HMAC Signature Format:**
```
HMAC-SHA256(key=LINK_EVENT_HMAC_SECRET, data="eventType|affiliateId|orderId|buyerId|timestamp")
```

Example: `"conversion|ABC123|order-1|user-1|1730700000"`

**Authentication (conversions only):**
- Option 1: HMAC signature in `X-Grew-Signature` header with `X-Grew-Timestamp`
- Option 2: Firebase ID token in `Authorization: Bearer <token>` header (requires `email_verified: true`)

**Security Features:**
- CORS restricted to `arena.grew.eco` and `affiliates.grew.eco`
- CORS allows headers: `Content-Type`, `Authorization`, `X-Grew-Signature`, `X-Grew-Timestamp`
- Clicks: rate-limited to 10 per minute per IP+affiliate combination (see note below)
- Conversions: require HMAC (in headers) or ID token authentication
- ID token path requires `email_verified: true`
- Order amount is fetched from `fiatOrders/{orderId}.totalAmountUsd` only
- Solana cluster is fetched from `solanaOrders/{solanaOrderId}.cluster`
- Affiliate code validation: `affiliateId` must match `order.affiliate.code`
- Commission doc ID is deterministic (`commission-{orderId}`) to prevent duplicates
- Uses Firestore transaction to ensure at most one commission per order
- Self-referral blocked: rejects when `affiliateUid === orderUserId`
- Test orders rejected: orders with `testMode: true` are not eligible
- Devnet orders rejected: Solana orders must have `cluster: "mainnet-beta"` or `"mainnet"`
- Affiliate role required: only users with `role: "affiliate"` can receive commissions
- Order status must be exactly `"completed"` (not `fulfilled` or `paid`)

**Rate Limiter Limitation:**
The click rate limiter uses in-memory storage, which has these limitations:
- State is lost on server restart
- State is not shared across Cloud Run instances
- Under high load with multiple instances, each instance may allow up to 10 requests independently

For stricter rate limiting, consider a Firestore-backed or Redis-backed implementation.
The current implementation provides reasonable protection against casual abuse while
keeping latency low for legitimate traffic.

**Response (new commission):**
```json
{
  "success": true,
  "duplicate": false,
  "eventType": "conversion",
  "eventId": "analytics-doc-id",
  "affiliateId": "user-uid",
  "commissionId": "commission-ORDER_ID",
  "commissionAmountUsd": 6.50
}
```

**Response (duplicate/replay):**
```json
{
  "success": true,
  "duplicate": true,
  "alreadyExists": true,
  "eventId": "commission-ORDER_ID",
  "commissionId": "commission-ORDER_ID"
}
```

**Error Codes:**
- `RATE_LIMITED` (429) — click rate limit exceeded
- `AUTH_REQUIRED` (401) — conversion without valid authentication
- `EMAIL_NOT_VERIFIED` (401) — ID token email not verified
- `INVALID_TOKEN` (401) — ID token verification failed
- `NOT_AFFILIATE` (403) — user exists but does not have `role: "affiliate"`
- `AFFILIATE_NOT_FOUND` (404) — affiliate code not found
- `ORDER_NOT_FOUND` (404) — order doesn't exist in `fiatOrders`
- `SOLANA_ORDER_NOT_FOUND` (404) — Solana order record missing
- `ORDER_NOT_COMPLETED` (400) — order status is not `"completed"`
- `INVALID_ORDER_AMOUNT` (400) — order has no valid `totalAmountUsd` field
- `NO_AFFILIATE_ON_ORDER` (400) — order has no `affiliate.code`
- `AFFILIATE_MISMATCH` (400) — request `affiliateId` doesn't match order's code
- `TEST_ORDER` (400) — order has `testMode: true`
- `DEVNET_ORDER` (400) — Solana order is not on mainnet
- `SELF_REFERRAL` (400) — buyer is the same as the affiliate
