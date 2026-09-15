import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export type VerifiedFirebaseIdentity = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  emailVerified: boolean;
};

function getAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0 && existing[0]) {
    return existing[0];
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

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
