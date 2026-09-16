import { getClientAuth } from "@/lib/firebase/client";

export class ClientApiError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
    public readonly code: string = "REQUEST_FAILED"
  ) {
    super(message);
    this.name = "ClientApiError";
  }
}

/**
 * Lightweight client-side API fetch wrapper.
 * Automatically attaches Firebase ID Token as Authorization header if available,
 * handles JSON request/response bodies, and returns parsed JSON or throws ClientApiError.
 */
export async function apiFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const headers = new Headers(options?.headers);

  // Set default JSON Content-Type if a body is present and no header is set
  if (options?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // If running in browser and user is signed in to Firebase, pass fresh ID token
  try {
    const auth = getClientAuth();
    if (auth?.currentUser && !headers.has("Authorization")) {
      const idToken = await auth.currentUser.getIdToken();
      if (idToken) {
        headers.set("Authorization", `Bearer ${idToken}`);
      }
    }
  } catch {
    // Ignore token acquisition errors and allow request to fall back to cookies
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let data: unknown = null;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errData = data as { error?: { message?: string; code?: string } } | null;
    const message =
      errData?.error?.message ??
      response.statusText ??
      `Request failed with status ${response.status}`;
    const code = errData?.error?.code ?? `HTTP_${response.status}`;
    throw new ClientApiError(message, response.status, code);
  }

  return data as T;
}
