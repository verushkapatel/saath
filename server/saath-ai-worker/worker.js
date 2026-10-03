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

const SYSTEM = `You are Saath AI, a patient financial-literacy tutor inside the Saath app, used in India.
Rules you must follow:
- Answer ONLY from the PASSAGES and SCREEN text given to you. If they do not contain the answer, say you do not have a checked answer and suggest reading a Saath guide. Do not use outside knowledge for facts.
- Never state an interest rate, return, price, tax rate, scheme benefit, eligibility rule, deadline or legal requirement unless that exact fact appears in the passages.
- Never tell the user what to buy, sell or invest in, and never predict returns. Explain how things work and what to check.
- If the user says money was stolen or an OTP was shared, tell them first to call 1930 and their bank immediately.
- Never ask for, repeat or store Aadhaar, PAN, account numbers, OTPs, PINs or passwords.
- Reply in the language code given (en = English, hi = Hindi, mr = Marathi). Plain words, short sentences, at most 150 words. No markdown headings.
- You are not a licensed financial adviser. Say so if asked for personal advice.`;

const TASKS = {
  answer: "Answer the user's question.",
  lesson: "Explain the lesson on screen more simply, with one everyday example drawn from the passages.",
  form: "Explain what this form is for and what to check before signing, using only the passages.",
  mistake: "The user answered a practice question wrongly. Explain kindly why the correct answer is right.",
  revise: "From the PROGRESS data, suggest what the user should revise next and why, in three short lines.",
  progress: "Summarise the user's PROGRESS in three encouraging, honest lines and name one next step.",
};

function cors(env, request) {
  const allowed = env.ALLOWED_ORIGIN || "";
  const origin = request.headers.get("origin") || "";
  const ok = allowed && allowed.split(",").map((item) => item.trim()).includes(origin);
  return {
    "access-control-allow-origin": ok ? origin : "null",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    vary: "origin",
  };
}

const clip = (value, max) => (typeof value === "string" ? value.slice(0, max) : "");

function buildMessages(body) {
  const passages = Array.isArray(body.passages) ? body.passages.slice(0, 5) : [];
  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
  const parts = [
    `LANGUAGE: ${["en", "hi", "mr"].includes(body.lang) ? body.lang : "en"}`,
    `TASK: ${TASKS[body.task] || TASKS.answer}`,
  ];
  if (body.context) parts.push(`SCREEN: ${clip(body.context.screen, 80)} | ${clip(body.context.title, 160)}\n${clip(body.context.text, 1500)}`);
  if (body.progress) parts.push(`PROGRESS: ${clip(JSON.stringify(body.progress), 800)}`);
  parts.push(`PASSAGES:\n${passages.map((item, index) => `[${index + 1}] ${clip(item.title, 160)}: ${clip(item.text, 900)}`).join("\n") || "(none)"}`);
  if (body.input) parts.push(`USER: ${clip(body.input, 1200)}`);
  return [
    { role: "system", content: SYSTEM },
    ...history.map((turn) => ({ role: turn.role === "user" ? "user" : "assistant", content: clip(turn.text, 600) })),
    { role: "user", content: parts.join("\n\n") },
  ];
}

async function runModel(env, messages) {
  if (env.AI && typeof env.AI.run === "function") {
    const result = await env.AI.run(env.AI_MODEL || "@cf/meta/llama-3.1-8b-instruct", { messages, max_tokens: 400, temperature: 0.2 });
    return result.response || "";
  }
  if (env.AI_BASE_URL && env.AI_API_KEY) {
    const response = await fetch(`${env.AI_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${env.AI_API_KEY}` },
      body: JSON.stringify({ model: env.AI_MODEL, messages, max_tokens: 400, temperature: 0.2 }),
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
      const body = await request.json();
      const text = await runModel(env, buildMessages(body));
      if (!text) throw new Error("empty");
      return new Response(JSON.stringify({ text }), { status: 200, headers });
    } catch {
      // The app falls back to its on-device answers when it sees any error.
      return new Response(JSON.stringify({ error: "unavailable" }), { status: 502, headers });
    }
  },
};
