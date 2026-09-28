// The one place Firebase is started. Every module that needs the database or
// auth imports connectFirebase() from here; the connection promise is cached,
// so initializeApp() runs at most once per page no matter who asks.
//
// Pages that do not import this module never download the Firebase library.

import { firebaseConfig, OWNER_UID } from "./config.js";

export { OWNER_UID };

const FIREBASE_VERSION = "12.17.1";
const CDN_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;

/**
 * Thrown before Firebase is usable at all, so callers can tell "you never
 * pasted your keys" apart from "the network is down".
 * `reason` is "unconfigured" or "offline".
 */
export class FirebaseUnavailableError extends Error {
  constructor(reason, message) {
    super(message);
    this.name = "FirebaseUnavailableError";
    this.reason = reason;
  }
}

/** True once real credentials have been pasted into config.js. */
export function isConfigured() {
  const key = firebaseConfig && firebaseConfig.apiKey;
  return typeof key === "string" && key.length > 0 && !key.startsWith("PASTE");
}

let connection = null;

/**
 * Resolves to { app, db, auth, fb } where `fb` bundles the Firestore and Auth
 * functions together. Rejects with a FirebaseUnavailableError.
 */
export function connectFirebase() {
  if (!connection) connection = open();
  return connection;
}

async function open() {
  if (!isConfigured()) {
    throw new FirebaseUnavailableError(
      "unconfigured",
      "This board isn't connected yet. Paste your Firebase config into assets/js/config.js."
    );
  }

  let modules;
  try {
    modules = await Promise.all([
      import(`${CDN_BASE}/firebase-app.js`),
      import(`${CDN_BASE}/firebase-firestore.js`),
      import(`${CDN_BASE}/firebase-auth.js`)
    ]);
  } catch (cause) {
    connection = null; // let a later attempt retry after a network hiccup
    throw new FirebaseUnavailableError(
      "offline",
      "Couldn't load the Firebase library. Check your internet connection and reload the page."
    );
  }

  const [{ initializeApp }, firestore, authModule] = modules;

  let app;
  try {
    app = initializeApp(firebaseConfig);
  } catch (cause) {
    throw new FirebaseUnavailableError(
      "bad-config",
      "Firebase rejected the settings in assets/js/config.js. Check them against the Firebase console."
    );
  }

  return {
    app,
    db: firestore.getFirestore(app),
    auth: authModule.getAuth(app),
    fb: { ...firestore, ...authModule }
  };
}
