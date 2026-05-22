import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

export type FirebaseClients = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  analytics: Analytics | null;
};

function readFirebaseConfig(): Partial<FirebaseConfig> {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

export function isFirebaseConfigured(): boolean {
  const c = readFirebaseConfig();
  return Boolean(
    c.apiKey &&
      c.authDomain &&
      c.projectId &&
      c.storageBucket &&
      c.messagingSenderId &&
      c.appId
  );
}

let _clients: FirebaseClients | null = null;
let _analyticsInitStarted = false;

async function initAnalytics(app: FirebaseApp): Promise<Analytics | null> {
  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
  if (!measurementId) return null;

  try {
    const supported = await isSupported();
    if (!supported) return null;
    return getAnalytics(app);
  } catch {
    return null;
  }
}

/**
 * Client-only Firebase bootstrap (Auth, Firestore, Analytics).
 * Call from browser code after mount.
 */
export function getFirebaseClients(): FirebaseClients | null {
  if (typeof window === "undefined") return null;
  if (_clients) return _clients;

  if (!isFirebaseConfigured()) return null;

  const raw = readFirebaseConfig();
  const config: FirebaseConfig = {
    apiKey: raw.apiKey!,
    authDomain: raw.authDomain!,
    projectId: raw.projectId!,
    storageBucket: raw.storageBucket!,
    messagingSenderId: raw.messagingSenderId!,
    appId: raw.appId!,
    ...(raw.measurementId ? { measurementId: raw.measurementId } : {}),
  };

  const app = getApps().length > 0 ? getApp() : initializeApp(config);

  _clients = {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    analytics: null,
  };

  if (!_analyticsInitStarted && raw.measurementId) {
    _analyticsInitStarted = true;
    void initAnalytics(app).then((analytics) => {
      if (_clients && analytics) {
        _clients = { ..._clients, analytics };
      }
    });
  }

  return _clients;
}
