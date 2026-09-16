import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export type VerifiedFirebaseIdentity = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  emailVerified: boolean;
};

export function formatFirebasePrivateKey(rawKey?: string): string | undefined {
  if (!rawKey) return undefined;
  let k = rawKey.trim();

  // If ends with comma (e.g. copied from serviceAccountKey.json with trailing comma)
  if (k.endsWith(",")) {
    k = k.slice(0, -1).trim();
  }

  // Strip surrounding double quotes or single quotes
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1);
  }

  // Handle escaped double quotes
  if (k.startsWith('\\"') && k.endsWith('\\"')) {
    k = k.slice(2, -2);
  }

  // Convert literal \r\n or \n string to actual newlines
  k = k.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n");

  return k.trim();
}

function cleanEnvString(val?: string): string | undefined {
  if (!val) return undefined;
  let s = val.trim();
  if (s.endsWith(",")) s = s.slice(0, -1).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1);
  }
  return s.trim();
}

function getAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0 && existing[0]) {
    return existing[0];
  }

  const projectId = cleanEnvString(
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
  const clientEmail = cleanEnvString(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKey = formatFirebasePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  }

  if (projectId) {
    return initializeApp({ projectId });
  }

  return initializeApp();
}

/**
 * Authoritative Firebase Admin SDK ID token verification.
 * Verifies signature, expiration, and project audience.
 */
export async function verifyFirebaseIdToken(
  idToken: string
): Promise<VerifiedFirebaseIdentity> {
  const app = getAdminApp();
  const auth = getAuth(app);
  const decoded = await auth.verifyIdToken(idToken);

  return {
    uid: decoded.uid,
    email: decoded.email ? decoded.email.toLowerCase() : null,
    displayName: (decoded.name as string) || null,
    photoUrl: (decoded.picture as string) || null,
    emailVerified: Boolean(decoded.email_verified),
  };
}
