# Arena Firestore Rules Additions

These rules and indexes must be added to the Arena repo's `firestore.rules` and `firestore.indexes.json`,
since Arena owns the shared Firebase project (`greweco-bf4e0`).

## Firestore Rules

Add these matches inside the existing `match /databases/{database}/documents { ... }` block:

```javascript
    // ============================================================
    // AFFILIATE PORTAL COLLECTIONS
    // ============================================================

    // Affiliate profiles - separate collection for affiliate-specific data
    // Avoids overwriting Arena user docs when registering affiliates
    // Server-only writes via Admin SDK
    match /affiliateProfiles/{profileId} {
      allow read: if request.auth != null && request.auth.uid == profileId;
      allow write: if false;
    }

    // Commission ledger - affiliates can read their own commissions
    // Server-only writes via Admin SDK from link-event conversions
    // Doc ID format: commission-{orderId} for idempotency
    match /commissions/{commissionId} {
      allow read: if request.auth != null && 
        resource.data.affiliateId == request.auth.uid;
      allow write: if false;
    }

    // Click analytics - affiliates can read their own events
    // Server-only writes via Admin SDK
    match /clicks_analytics/{eventId} {
      allow read: if request.auth != null && 
        resource.data.affiliateId == request.auth.uid;
      allow write: if false;
    }

    // Affiliate conversion outbox - server-only (used by Arena functions)
    // This is already in Arena rules as affiliateConversions
    // match /affiliateConversions/{orderId} {
    //   allow read, write: if false;
    // }
```

## Firestore Indexes

Add these to `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "commissions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "affiliateId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "clicks_analytics",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "affiliateId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Deployment

After adding to Arena repo:

```bash
# Deploy rules
firebase deploy --only firestore:rules --project greweco-bf4e0

# Deploy indexes
firebase deploy --only firestore:indexes --project greweco-bf4e0
```

## Notes

- These rules are read-only for authenticated users querying their own data
- All writes happen server-side via Firebase Admin SDK
- The `commissions` index is required for the `/dashboard/earnings` page query:
  `where("affiliateId", "==", uid).orderBy("createdAt", "desc")`
