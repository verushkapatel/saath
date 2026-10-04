import { EmailMessage } from "cloudflare:email";

/**
 * Saath AI server. A Cloudflare Worker that sits between the app and a language model.
 *
 * Why it exists: a model key must never be shipped to a browser. The app sends a question here,
 * this Worker adds the key (or uses Cloudflare's own Workers AI binding, which needs no key at all)
 * and returns the answer.
 *
 * Two ways to run it, picked by what you configure:
 *   1. Workers AI (free tier): add an [ai] binding named AI in wrangler.toml. No key anywhere.
 *   2. Any OpenAI-compatible API: set the secrets AI_BASE_URL, AI_MODEL and AI_API_KEY with `wrangler secret put`.
 *
 * Set ALLOWED_ORIGIN to the app's address so other sites cannot use your quota.
 * Nothing is logged or stored by this Worker.
 */

const SYSTEM = `You are Saath AI, the companion inside Saath, a financial-life learning app used in India by people of every age.
Voice: warm, calm and precise, like a thoughtful friend who happens to understand money well. Never robotic, never preachy.
How to answer:
- Lead with the direct answer in the first sentence. No preamble, no "Great question", no restating the question.
- Match the length to the question. A simple question gets two to four sentences. A bigger one gets a short explanation, then at most 4 bullets or numbered steps. Never more than 250 words.
- Use **bold** sparingly for the one or two ideas that matter most. Use bullets only when they genuinely help. No headings for short answers.
- Make it concrete: one everyday Indian example with simple round amounts, clearly called an example, when it helps understanding.
- Explain any technical word the first time you use it, in a few plain words.
- If the question is unclear, give the most likely helpful answer, then ask one short clarifying question.
- End with one useful next step or a short offer to go deeper, not a generic sign-off.
- Reply only in the language code given (en = English, hi = Hindi in Devanagari, mr = Marathi in Devanagari). Keep it natural, not a word-for-word translation.
- Remember the conversation so far and build on it instead of repeating yourself.
Accuracy:
- Facts about Indian schemes, rules, limits, rates, fees, deadlines, tax and documents must come from the PASSAGES or SCREEN text. If they are not there, say plainly that you do not have a checked figure and point to the official source or the closest Saath guide. Never guess a number or a rule.
- For forms: if the SCREEN has TEXT READ FROM THE FORM (from the user's photo), explain what the form is for, then each part in order in plain words (what it asks, why, what to write or attach), then what to check before signing. You may go up to 400 words for this. The text was read by a camera and may contain errors; say so when a part is unclear. Do not invent fields, requirements or documents that are not in the text.
- You may explain general ideas (budgets, EMIs, interest, insurance, inflation, diversification) in your own words.
Safety:
- You are educational, not a licensed financial adviser. Never tell the user what to buy, sell or invest in, never predict returns, and never encourage risky borrowing. If asked for personal advice, explain what to consider and say this is not individual advice.
- If the user says money was stolen or an OTP or PIN was shared, tell them first to call 1930 (cyber fraud helpline) and their bank immediately.
- Never ask for, repeat or store Aadhaar, PAN, account numbers, OTPs, PINs or passwords. Never claim to be a bank, government body or other institution.`;

const TASKS = {
  answer: "Answer the user's question.",
  lesson: "Explain the lesson on screen more simply, with one everyday example.",
  form: "Explain in plain words what this form is for and what each listed field asks for and why, then what to check before signing. Use only the fields given in SCREEN.",
  mistake: "The user answered a practice question wrongly. Kindly explain why the correct answer is right, in two or three lines, and give a way to remember it.",
  revise: "From the PROGRESS data, suggest what the user should revise next and why, in three short bullet points.",
  progress: "Summarise the user's PROGRESS in three encouraging, honest bullet points and name one next step.",
};

function cors(env, request) {
  const allowed = env.ALLOWED_ORIGIN || "";
  const origin = request.headers.get("origin") || "";
  const ok = allowed && allowed.split(",").map((item) => item.trim()).includes(origin);
  return {
    "access-control-allow-origin": ok ? origin : "null",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    vary: "origin",
  };
}

const clip = (value, max) => (typeof value === "string" ? value.slice(0, max) : "");
const FEEDBACK_TO = "verushkapatel4@gmail.com";
const SITE_ORIGIN = "https://verushkapatel.github.io";

function stateStub(env) {
  if (!env.SAATH_STATE) return null;
  return env.SAATH_STATE.get(env.SAATH_STATE.idFromName("saath-global"));
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers });
}

function cleanHeader(value) {
  return clip(value, 80).replace(/[\r\n:]/g, " ").trim();
}

function same(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

function ownerAuthorized(request, env) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Basic ") || !env.ADMIN_USERNAME || !env.ADMIN_PASSWORD) return false;
  try {
    const [username, ...rest] = atob(header.slice(6)).split(":");
    return same(username, env.ADMIN_USERNAME) && same(rest.join(":"), env.ADMIN_PASSWORD);
  } catch {
    return false;
  }
}

async function heartbeatRoute(body, env, headers) {
  const stub = stateStub(env);
  if (!stub) return json({ error: "not configured" }, 503, headers);
  const session = clip(body?.session, 64);
  if (!/^[a-f0-9]{24,64}$/.test(session)) return json({ error: "invalid" }, 400, headers);
  await stub.fetch("https://saath-state/heartbeat", { method: "POST", body: JSON.stringify({ session }) });
  return json({ active: true }, 200, headers);
}

async function liveRoute(request, env, headers) {
  if (!ownerAuthorized(request, env)) return json({ error: "unauthorized" }, 401, { ...headers, "www-authenticate": "Basic realm=Saath owner" });
  const stub = stateStub(env);
  if (!stub) return json({ error: "not configured" }, 503, headers);
  const response = await stub.fetch("https://saath-state/live", { method: "POST" });
  return new Response(response.body, { status: response.status, headers });
}

async function feedbackRoute(body, env, headers, checking = false) {
  const stub = stateStub(env);
  if (!stub) return json({ delivered: false, error: "not configured" }, 503, headers);
  const username = cleanHeader(body?.username);
  const feedback = clip(body?.feedback, 2000).trim();
  const requestId = clip(body?.requestId, 80);
  if (!/^[\p{L}\p{M}\p{N}._-]{3,20}$/u.test(username) || feedback.length < 5 || !/^[a-zA-Z0-9-]{12,80}$/.test(requestId)) return json({ delivered: false, error: "invalid" }, 400, headers);
  const checked = await stub.fetch("https://saath-state/feedback/check", { method: "POST", body: JSON.stringify({ requestId }) });
  if ((await checked.json()).duplicate) return json({ delivered: true, duplicate: true }, 200, headers);
  const subject = `Saath feedback from ${username}`;
  const raw = [
    `From: Saath Feedback <${env.FEEDBACK_FROM}>`,
    `To: ${FEEDBACK_TO}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    `Username: ${username}`,
    "",
    feedback,
  ].join("\r\n");
  if (env.FEEDBACK_EMAIL && env.FEEDBACK_FROM) {
    // Cloudflare Email Routing, when the account has a domain set up for it.
    await env.FEEDBACK_EMAIL.send(new EmailMessage(env.FEEDBACK_FROM, FEEDBACK_TO, raw));
  } else {
    // Otherwise FormSubmit, a free relay that needs no account or key. The address stays here on the server.
    // The very first message makes FormSubmit email an activation link to the owner; until it is clicked, nothing is
    // delivered and the app says so instead of claiming success.
    const relay = await fetch(`https://formsubmit.co/ajax/${FEEDBACK_TO}`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json", origin: SITE_ORIGIN, referer: `${SITE_ORIGIN}/saath/` },
      body: JSON.stringify({ name: username, message: feedback, _subject: subject, _template: "table", _captcha: "false" }),
    }).catch(() => null);
    const result = relay ? await relay.json().catch(() => ({})) : {};
    if (!relay || !relay.ok || String(result.success) !== "true") {
      const out = { delivered: false, error: "relay" };
      // Only the repository's own check sees why, so a failure can be fixed without guessing.
      if (checking) out.reason = `${relay ? relay.status : "no response"} ${String(result.message || "").slice(0, 300)}`;
      return json(out, 502, headers);
    }
  }
  await stub.fetch("https://saath-state/feedback/mark", { method: "POST", body: JSON.stringify({ requestId }) });
  return json({ delivered: true }, 200, headers);
}

function buildMessages(body) {
  const passages = Array.isArray(body.passages) ? body.passages.slice(0, 5) : [];
  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
  const parts = [
    `LANGUAGE: ${["en", "hi", "mr"].includes(body.lang) ? body.lang : "en"}`,
    `TASK: ${TASKS[body.task] || TASKS.answer}`,
  ];
  if (body.context) parts.push(`SCREEN: ${clip(body.context.screen, 80)} | ${clip(body.context.title, 160)}\n${clip(body.context.text, 2200)}`);
  if (body.progress) parts.push(`PROGRESS: ${clip(JSON.stringify(body.progress), 800)}`);
  parts.push(`PASSAGES:\n${passages.map((item, index) => `[${index + 1}] ${clip(item.title, 160)}: ${clip(item.text, 900)}`).join("\n") || "(none)"}`);
  if (body.input) parts.push(`USER: ${clip(body.input, 1200)}`);
  return [
    { role: "system", content: SYSTEM },
    ...history.map((turn) => ({ role: turn.role === "user" ? "user" : "assistant", content: clip(turn.text, 600) })),
    { role: "user", content: parts.join("\n\n") },
  ];
}

// Workers AI models are tried in order until one answers, so a model that is retired or not enabled on an
// account does not take Saath AI down. AI_MODEL in wrangler.toml, if set, is tried first.
const WORKERS_AI_MODELS = [
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-4-scout-17b-16e-instruct",
  "@cf/google/gemma-3-12b-it",
  "@cf/meta/llama-3.1-8b-instruct-fast",
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/meta/llama-3.2-3b-instruct",
  "@cf/mistral/mistral-7b-instruct-v0.2",
];

function textOf(result) {
  if (!result) return "";
  if (typeof result === "string") return result;
  if (typeof result.response === "string") return result.response;
  if (result.response && typeof result.response === "object") return JSON.stringify(result.response);
  return result.result?.response || result.choices?.[0]?.message?.content || "";
}

async function runModel(env, messages) {
  if (env.AI && typeof env.AI.run === "function") {
    const models = [...new Set([env.AI_MODEL, ...WORKERS_AI_MODELS].filter(Boolean))];
    const failures = [];
    for (const model of models) {
      try {
        const text = textOf(await env.AI.run(model, { messages, max_tokens: 1000, temperature: 0.35 }));
        if (text.trim()) return text;
        failures.push(`${model}: empty`);
      } catch (error) {
        failures.push(`${model}: ${String(error && error.message ? error.message : error).slice(0, 160)}`);
      }
    }
    throw new Error(failures.join(" | "));
  }
  if (env.AI_BASE_URL && env.AI_API_KEY) {
    const response = await fetch(`${env.AI_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${env.AI_API_KEY}` },
      body: JSON.stringify({ model: env.AI_MODEL, messages, max_tokens: 1000, temperature: 0.35 }),
    });
    if (!response.ok) throw new Error(`model ${response.status}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }
  throw new Error("no model configured");
}

export default {
  async fetch(request, env) {
    const headers = { ...cors(env, request), "content-type": "application/json", "cache-control": "no-store" };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return new Response(JSON.stringify({ error: "method" }), { status: 405, headers });
    if (headers["access-control-allow-origin"] === "null") return new Response(JSON.stringify({ error: "origin" }), { status: 403, headers });
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 20_000) return new Response(JSON.stringify({ error: "too large" }), { status: 413, headers });
    try {
      const path = new URL(request.url).pathname.replace(/\/$/, "") || "/";
      if (path === "/admin/live") return liveRoute(request, env, headers);
      const body = await request.json();
      if (path === "/heartbeat") return heartbeatRoute(body, env, headers);
      if (path === "/feedback") return feedbackRoute(body, env, headers, request.headers.get("x-saath-check") === "1");
      if (path !== "/") return json({ error: "not found" }, 404, headers);
      const text = await runModel(env, buildMessages(body));
      if (!text) throw new Error("empty");
      return new Response(JSON.stringify({ text }), { status: 200, headers });
    } catch (error) {
      // The app falls back to its on-device answers when it sees any error. The reason is only included for the
      // repository's own check (header x-saath-check), so a failure can be fixed without guessing.
      const body = { error: "unavailable" };
      if (request.headers.get("x-saath-check") === "1") body.reason = String(error && error.message ? error.message : error).slice(0, 800);
      return new Response(JSON.stringify(body), { status: 502, headers });
    }
  },
};

/** One privacy-minimal global state object: anonymous recent sessions and feedback delivery deduplication only. */
export class SaathState {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    const path = new URL(request.url).pathname;
    const now = Date.now();
    if (path === "/heartbeat") {
      const { session } = await request.json();
      await this.state.storage.put(`live:${session}`, now);
      await this.state.storage.setAlarm(now + 10 * 60_000);
      return Response.json({ active: true });
    }
    if (path === "/live") {
      const rows = await this.state.storage.list({ prefix: "live:" });
      const cutoff = now - 5 * 60_000;
      const activeNow = [...rows.values()].filter((lastSeen) => Number(lastSeen) >= cutoff).length;
      return Response.json({ activeNow, windowMinutes: 5, measuredAt: new Date(now).toISOString(), definition: "An anonymous browser session seen within the last five minutes." });
    }
    const body = await request.json();
    if (path === "/feedback/check") return Response.json({ duplicate: Boolean(await this.state.storage.get(`feedback:${body.requestId}`)) });
    if (path === "/feedback/mark") {
      await this.state.storage.put(`feedback:${body.requestId}`, now);
      await this.state.storage.setAlarm(now + 10 * 60_000);
      return Response.json({ stored: true });
    }
    return Response.json({ error: "not found" }, { status: 404 });
  }

  async alarm() {
    const now = Date.now();
    const rows = await this.state.storage.list();
    const expired = [];
    for (const [key, value] of rows) {
      if (key.startsWith("live:") && Number(value) < now - 10 * 60_000) expired.push(key);
      if (key.startsWith("feedback:") && Number(value) < now - 30 * 24 * 60 * 60_000) expired.push(key);
    }
    if (expired.length) await this.state.storage.delete(expired);
    if (rows.size > expired.length) await this.state.storage.setAlarm(now + 10 * 60_000);
  }
}
