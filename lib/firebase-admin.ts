import { getApps, initializeApp, applicationDefault, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Server-side Firebase Admin singleton for the affiliates SSR backend.
 *
 * In production the SSR function runs inside its own Firebase/GCP project and
 * authenticates with that project's runtime service account via Application
 * Default Credentials. We deliberately do NOT hardcode a project id: the Admin
 * SDK infers it from the runtime credentials, so it always reads/writes the
 * project it is deployed in (greweco-bf4e0). This keeps client reads and server
 * writes in the same project with no cross-project configuration.
 *
 * Optional overrides (for non-GCP hosts or local development only):
 *  - FIREBASE_SERVICE_ACCOUNT_JSON : inline service-account JSON.
 *  - FIREBASE_ADMIN_PROJECT_ID     : explicit project id.
 *  - FIRESTORE_EMULATOR_HOST       : talk to a local emulator (no real creds).
 */

// Only used when an explicit override is supplied; unset in normal production.
const PROJECT_ID_OVERRIDE = process.env.FIREBASE_ADMIN_PROJECT_ID;

let _app: App | null = null;

function getAdminApp(): App {
  if (_app) return _app;
  const existing = getApps();
  if (existing.length > 0) {
    _app = existing[0];
    return _app;
  }

  const withProject = <T extends Record<string, unknown>>(opts: T) =>
    PROJECT_ID_OVERRIDE ? { ...opts, projectId: PROJECT_ID_OVERRIDE } : opts;

  const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  const inlineSa = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (usingEmulator) {
    // Emulator needs a project id but no real credentials.
    _app = initializeApp({ projectId: PROJECT_ID_OVERRIDE || "demo-affiliates" });
  } else if (inlineSa) {
    _app = initializeApp(
      withProject({ credential: cert(JSON.parse(inlineSa)) })
    );
  } else {
    // Production path: runtime service account infers the deploy project.
    _app = initializeApp(withProject({ credential: applicationDefault() }));
  }
  return _app;
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}
