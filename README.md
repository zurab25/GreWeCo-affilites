# GreWeCo Affiliate Platform

Production-oriented affiliate workspace for **affiliates.cree.eco**: invite-only auth, partner profiles in Firestore, arena link generation, analytics, and leaderboards.

## Stack

- **Next.js** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **Firebase** v10+ (Auth + Firestore)
- **Lucide** icons

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables (Windows: copy `.env.local.example` to `.env.local`):

   ```bash
   cp .env.local.example .env.local
   ```

   Paste your Firebase web app config (Console → Project settings → Your apps).

3. Enable **Email/Password** authentication in Firebase, and create a **Firestore** database.

4. Deploy Firestore security rules (see below).

5. Run the dev server:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Firestore data model

### `invites` (invite-only signup)

Each invite is one document. The app queries `where("id", "==", "<user’s code>")`.

Suggested fields:

- `id` (string) — invite code; must match what you issue to partners.
- `used` (boolean) — `false` until consumed.
- `usedBy` (string) — UID after registration (written by the app).
- `usedAt` (timestamp) — optional.

**Registration reads this collection before the user is authenticated.** For a pure client-side flow you must allow read access to invites (at minimum for queries used during signup). Tighten this in production using a Callable Cloud Function for atomic signup.

### `users`

Document ID = Firebase Auth UID.

- `role`: `"affiliate"` for dashboard access.
- `displayName`, `email`, `referralId`, `createdAt`.
- `earnings.directBonus` (number) — monthly direct sales volume for leaderboard sorting.
- `stats.clicks`, `stats.conversions`, `stats.earningsUsd` — optional aggregates for the overview.

Legacy `affiliates/{uid}` documents are copied once into `users/{uid}` on first login if present.

### `clicks_analytics`

Documents associated to an affiliate via `affiliateId` (the Auth UID).

Supported shapes:

- **Aggregate:** `clicks` / `conversions` numbers plus `platform` or `source` (`instagram` | `facebook` | `x` | `youtube`).
- **Events:** `eventType` or `type` = `click` | `conversion` (and optional synonyms), with `platform` / `source`.

## Security rules (example)

Adjust for your environment. Invites need special care because validation runs before Auth.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /invites/{inviteDoc} {
      allow read: if true;
      allow update: if request.auth != null
        && resource.data.used != true
        && request.resource.data.used == true
        && request.resource.data.usedBy == request.auth.uid;
      allow create, delete: if false;
    }

    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }

    match /clicks_analytics/{id} {
      allow read: if request.auth != null
        && resource.data.affiliateId == request.auth.uid;
      allow write: if false;
    }
  }
}
```

Writes to `clicks_analytics` should come from **Cloud Functions** or a trusted backend so affiliates cannot fake metrics.

## API routes

- `GET /api/health` — JSON health payload for probes.

## Cloud Functions

Server-side attribution, payouts, and webhook ingestion can land in the same Firebase project and write to `clicks_analytics` and `users/{uid}.earnings` / `stats` according to your accounting rules.

## Deploy

```bash
npm run build
npm start
```

Expose `NEXT_PUBLIC_*` vars in your host’s project settings.

## Domain

Canonical marketing URL: **https://affiliates.cree.eco** (`metadataBase` in `app/layout.tsx`).
