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

const SYSTEM = `You are Saath AI, a warm and clear money tutor inside the Saath app, used in India by people of every age.
How to answer:
- Start with a direct answer in one or two plain sentences. Then, if it helps, give 2 to 4 short bullet points starting with "- ". End with one practical tip or a question the user can check, when useful.
- You may put a key term in **bold**. No headings, no tables, no long paragraphs. At most 170 words.
- Talk like a kind elder sibling: simple words, short sentences, no jargon without a quick explanation. Use the user's name only if given.
- Reply only in the language code given (en = English, hi = Hindi in Devanagari, mr = Marathi in Devanagari).
What you may use:
- Facts about Indian schemes, rules, limits, rates, fees, deadlines and documents must come from the PASSAGES or SCREEN text. If they are not there, say you do not have a checked figure and point to the official source or a Saath guide. Never guess a number.
- You may explain general ideas (what a budget, EMI, interest, insurance or inflation is, and how they work) in your own words.
- If you give an example with money, say it is an example and use simple round amounts.
Safety:
- Never tell the user what to buy, sell or invest in, and never predict returns. Explain how things work and what to check. You are not a licensed financial adviser; say so if asked for personal advice.
- If the user says money was stolen or an OTP was shared, tell them first to call 1930 and their bank immediately.
- Never ask for, repeat or store Aadhaar, PAN, account numbers, OTPs, PINs or passwords.`;

const TASKS = {
  answer: "Answer the user's question.",
  lesson: "Explain the lesson on screen more simply, with one everyday example.",
  form: "Explain in plain words what this form is for, what each important part asks, and what to check before signing.",
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
        const text = textOf(await env.AI.run(model, { messages, max_tokens: 520, temperature: 0.3 }));
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
      body: JSON.stringify({ model: env.AI_MODEL, messages, max_tokens: 520, temperature: 0.3 }),
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
    } catch (error) {
      // The app falls back to its on-device answers when it sees any error. The reason is only included for the
      // repository's own check (header x-saath-check), so a failure can be fixed without guessing.
      const body = { error: "unavailable" };
      if (request.headers.get("x-saath-check") === "1") body.reason = String(error && error.message ? error.message : error).slice(0, 800);
      return new Response(JSON.stringify(body), { status: 502, headers });
    }
  },
};
