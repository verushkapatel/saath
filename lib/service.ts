import { SERVICE_URL } from "./config";

export type LiveUsers = {
  activeNow: number;
  windowMinutes: number;
  measuredAt: string;
  definition: string;
};

const endpoint = (path: string) => `${SERVICE_URL.replace(/\/$/, "")}${path}`;

export function serviceConfigured(): boolean {
  return SERVICE_URL.length > 0;
}

function sessionId(): string | null {
  if (typeof window === "undefined" || !crypto?.getRandomValues) return null;
  const key = "saath-live-session-v1";
  try {
    const saved = window.sessionStorage.getItem(key);
    if (saved) return saved;
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    const id = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    window.sessionStorage.setItem(key, id);
    return id;
  } catch {
    return null;
  }
}

export async function heartbeat(): Promise<void> {
  const session = sessionId();
  if (!SERVICE_URL || !session) return;
  const response = await fetch(endpoint("/heartbeat"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ session }),
    keepalive: true,
  });
  if (!response.ok) throw new Error("heartbeat");
}

export async function sendFeedback(input: { username: string; feedback: string; requestId: string }): Promise<void> {
  if (!SERVICE_URL) throw new Error("offline");
  const response = await fetch(endpoint("/feedback"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("delivery");
  const result = await response.json() as { delivered?: boolean };
  if (!result.delivered) throw new Error("delivery");
}

export async function getLiveUsers(username: string, password: string): Promise<LiveUsers> {
  if (!SERVICE_URL) throw new Error("offline");
  const response = await fetch(endpoint("/admin/live"), {
    method: "POST",
    headers: { authorization: `Basic ${btoa(`${username}:${password}`)}` },
  });
  if (!response.ok) throw new Error(response.status === 401 ? "credentials" : "unavailable");
  return response.json() as Promise<LiveUsers>;
}