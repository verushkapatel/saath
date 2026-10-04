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

/**
 * Where feedback goes. FormSubmit (formsubmit.co) is a free relay that only accepts submissions sent from a web page,
 * so the browser sends it directly. NEXT_PUBLIC_SAATH_FEEDBACK_ID can hold the private alias FormSubmit gives after
 * activation, so the address does not need to appear in the code at all.
 */
const FEEDBACK_ID = process.env.NEXT_PUBLIC_SAATH_FEEDBACK_ID || ["verushkapatel4", "gmail.com"].join("@");

async function sendThroughRelay(input: { username: string; feedback: string }): Promise<void> {
  const response = await fetch(`https://formsubmit.co/ajax/${FEEDBACK_ID}`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ name: input.username, message: input.feedback, _subject: `Saath feedback from ${input.username}`, _template: "table", _captcha: "false" }),
  });
  const result = (await response.json().catch(() => ({}))) as { success?: string | boolean };
  if (!response.ok || String(result.success) !== "true") throw new Error("delivery");
}

export async function sendFeedback(input: { username: string; feedback: string; requestId: string }): Promise<void> {
  // The Saath server first, when it has email set up; otherwise straight to the relay from this page.
  if (SERVICE_URL) {
    try {
      const response = await fetch(endpoint("/feedback"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const result = (await response.json().catch(() => ({}))) as { delivered?: boolean };
      if (response.ok && result.delivered) return;
    } catch {
      // Fall through to the relay.
    }
  }
  await sendThroughRelay(input);
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