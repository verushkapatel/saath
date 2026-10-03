import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getProvider, providerMode, withFallback, type AiRequest, type SaathAIProvider } from "@/lib/ai";
import { buildDocs } from "@/lib/ai/knowledge";
import { createLocalProvider } from "@/lib/ai/local-provider";
import { PHRASES } from "@/lib/ai/phrases";
import { buildMessages, inventedNumbers, SYSTEM } from "@/lib/ai/prompt";
import { createRuleProvider } from "@/lib/ai/rule-provider";
import type { Lang } from "@/lib/catalog";
import type { FormsFile, GlossaryTerm, Lesson, StoriesFile } from "@/lib/content-types";
import type { JourneyFile } from "@/lib/journey";

const read = <T,>(path: string) => JSON.parse(readFileSync(`${process.cwd()}/${path}`, "utf8")) as T;
const sources = {
  lessons: read<Lesson[]>("content/guide.json"),
  glossary: read<GlossaryTerm[]>("content/glossary.json"),
  forms: read<FormsFile>("content/forms.json"),
  journey: read<JourneyFile>("content/journey.json"),
  stories: read<StoriesFile>("content/stories.json"),
};
const cache = new Map<Lang, ReturnType<typeof buildDocs>>();
const docsFor = (lang: Lang) => {
  if (!cache.has(lang)) cache.set(lang, buildDocs(sources, lang));
  return cache.get(lang)!;
};
const request = (lang: Lang = "en", extra: Partial<AiRequest> = {}): AiRequest => ({ lang, context: null, progress: null, history: [], ...extra });
const rules = createRuleProvider(docsFor);

describe("on-device rule provider", () => {
  it("answers from a checked guide and names it as the source", async () => {
    const answer = await rules.answerQuestion("What is an EMI?", request());
    expect(answer.grounded).toBe(true);
    expect(answer.via).toBe("device");
    expect(answer.sources.length).toBeGreaterThan(0);
    expect(answer.sources[0].href).toMatch(/^\/(guide|forms|journey|stories)/);
  });

  it("refuses to quote today's rates, and says why", async () => {
    const answer = await rules.answerQuestion("What is the current FD interest rate today?", request());
    expect(answer.text.startsWith(PHRASES.en.noRates)).toBe(true);
    expect(answer.text).not.toMatch(/\d+(\.\d+)?\s*%/);
  });

  it("refuses to give personal investment advice", async () => {
    const answer = await rules.answerQuestion("Which stock should I buy?", request());
    expect(answer.text.startsWith(PHRASES.en.noAdvice)).toBe(true);
    const hindi = await rules.answerQuestion("क्या मुझे यह शेयर खरीदना चाहिए?", request("hi"));
    expect(hindi.text.startsWith(PHRASES.hi.noAdvice)).toBe(true);
  });

  it("admits when it does not know", async () => {
    const answer = await rules.answerQuestion("What colour is the moon on Tuesdays?", request());
    expect(answer.grounded).toBe(false);
    expect(answer.text.startsWith(PHRASES.en.unknown)).toBe(true);
    expect(answer.sources).toEqual([]);
  });

  it("puts the helpline first when money was just stolen, in every language", async () => {
    for (const [lang, question] of [["en", "I shared my OTP and money is gone"], ["hi", "मैंने ओटीपी बता दिया और पैसा कट गया"], ["mr", "मी ओटीपी सांगितला आणि पैसे गेले"]] as const) {
      const answer = await rules.answerQuestion(question, request(lang));
      expect(answer.text).toBe(PHRASES[lang].emergency);
      expect(answer.text).toContain("1930");
    }
  });

  it("finds the right guide for the way students actually ask", async () => {
    const top = async (lang: Lang, question: string) => (await rules.answerQuestion(question, request(lang))).sources[0]?.href;
    expect(await top("en", "how do i save money as a student")).toBe("/guide/pay-yourself");
    expect(await top("en", "what is a mutual fund")).toBe("/guide/what-sip");
    expect(await top("en", "buy now pay later is it a loan")).toBe("/guide/pay-later");
    expect(await top("mr", "बजेट कसे बनवायचे?")).toBe("/guide/budget");
    expect(await top("hi", "पैसे कैसे बचाएँ?")).toBe("/guide/pay-yourself");
    expect(await top("en", "is this job asking 5000 deposit real")).toBe("/guide/job-scams");
  });

  it("greets and thanks like a person, and treats a failed payment as a failed payment", async () => {
    expect((await rules.answerQuestion("hi", request())).text.startsWith(PHRASES.en.greet)).toBe(true);
    expect((await rules.answerQuestion("नमस्ते", request("hi"))).text.startsWith(PHRASES.hi.greet)).toBe(true);
    expect((await rules.answerQuestion("thanks", request())).text).toBe(PHRASES.en.thanks);
    const failed = await rules.answerQuestion("my upi money got debited but not received", request());
    expect(failed.text).not.toBe(PHRASES.en.emergency);
    // A scam where money is gone still starts with the helpline, even if a parcel is "stuck".
    expect((await rules.answerQuestion("caller said my parcel is stuck, I paid and money gone", request())).text).toBe(PHRASES.en.emergency);
  });

  it("explains what is on screen when asked to explain this", async () => {
    const context = { screen: "Learn", kind: "lesson" as const, id: "what-emi", title: "What is an EMI", text: "An EMI is the same amount paid every month." };
    const answer = await rules.answerQuestion("Explain this", request("en", { context }));
    expect(answer.text).toContain("An EMI is the same amount paid every month.");
  });

  it("never sees Money Lab amounts: the request has no place for them", () => {
    const progress: AiRequest["progress"] = { level: 1, xp: 0, streak: 0, lessonsDone: 0, lessonsTotal: 45, episodesDone: 0, episodesTotal: 14, stage: null, focus: [], weak: [], nextUp: [] };
    expect(Object.keys(progress!)).not.toContain("entries");
  });
});

describe("falling back", () => {
  const broken: SaathAIProvider = {
    id: "broken",
    answerQuestion: async () => { throw new Error("down"); },
    explainLesson: async () => { throw new Error("down"); },
    explainForm: async () => { throw new Error("down"); },
    explainMistake: async () => { throw new Error("down"); },
    recommendRevision: async () => { throw new Error("down"); },
    summarizeProgress: async () => { throw new Error("down"); },
  };

  it("answers from the rules when the first provider fails", async () => {
    const provider = withFallback(broken, rules);
    const answer = await provider.answerQuestion("What is an EMI?", request());
    expect(answer.via).toBe("device");
    expect(answer.grounded).toBe(true);
  });

  it("picks local, then online, then rules, by settings", () => {
    expect(providerMode({ allowLocal: true, allowOnline: true, online: true })).toBe("local");
    // No online server is configured in tests, so online is never chosen.
    expect(providerMode({ allowLocal: false, allowOnline: true, online: true })).toBe("device");
    expect(providerMode({ allowLocal: false, allowOnline: false })).toBe("device");
    expect(getProvider({ docsFor, allowOnline: false }).id).toBe("device");
    expect(getProvider({ docsFor, allowLocal: true, allowOnline: true, generate: async () => "x" }).id).toBe("local+device");
  });
});

describe("local model provider", () => {
  it("sends the model the same rules as the server, the passages, and the user's language", async () => {
    let seen: { role: string; content: string }[] = [];
    const local = createLocalProvider(docsFor, {
      fallback: rules,
      generate: async (messages) => {
        seen = messages;
        return "An EMI is a fixed amount you pay every month until the loan is repaid.";
      },
    });
    const answer = await local.answerQuestion("What is an EMI?", request("hi"));
    expect(answer.via).toBe("local");
    expect(seen[0]).toEqual({ role: "system", content: SYSTEM });
    expect(seen.at(-1)?.content).toContain("LANGUAGE: hi");
    expect(seen.at(-1)?.content).toContain("PASSAGES:");
    expect(answer.sources.length).toBeGreaterThan(0);
  });

  it("never lets the model answer rate, advice or emergency questions", async () => {
    let called = 0;
    const local = createLocalProvider(docsFor, { fallback: rules, generate: async () => { called += 1; return "8% is great"; } });
    expect((await local.answerQuestion("What is the best FD rate today?", request())).via).toBe("device");
    expect((await local.answerQuestion("Should I buy this stock?", request())).via).toBe("device");
    expect((await local.answerQuestion("Someone took my OTP and money is gone", request())).text).toContain("1930");
    expect(called).toBe(0);
  });

  it("does not let the model fill a gap: unknown questions get the rules' honest answer", async () => {
    let called = 0;
    const local = createLocalProvider(docsFor, { fallback: rules, generate: async () => { called += 1; return "Made up."; } });
    const answer = await local.answerQuestion("What colour is the moon on Tuesdays?", request());
    expect(answer.grounded).toBe(false);
    expect(called).toBe(0);
  });

  it("throws away an answer with a number the passages do not contain, and falls back to the rules", async () => {
    const local = createLocalProvider(docsFor, { fallback: rules, generate: async () => "Banks charge 7.25% on an EMI loan." });
    await expect(local.answerQuestion("What is an EMI?", request())).rejects.toThrow("ungrounded");
    const guarded = withFallback(local, rules);
    const answer = await guarded.answerQuestion("What is an EMI?", request());
    expect(answer.via).toBe("device");
    expect(answer.text).not.toContain("7.25");
  });

  it("falls back to the rules when generation fails, for example with no WebGPU or no model", async () => {
    const provider = getProvider({ docsFor, allowLocal: true, allowOnline: false, generate: async () => { throw new Error("no-webgpu"); } });
    const answer = await provider.answerQuestion("What is an EMI?", request());
    expect(answer.via).toBe("device");
    expect(answer.grounded).toBe(true);
  });

  it("spots invented numbers but allows ones it was given", () => {
    expect(inventedNumbers("Call 1930 now", "call 1930 and your bank")).toEqual([]);
    expect(inventedNumbers("The rate is 12.5%", "rates change")).toEqual(["12.5"]);
    expect(inventedNumbers("Step 1, then step 2", "")).toEqual([]);
  });

  it("removes identity numbers before the model sees them", () => {
    const messages = buildMessages({ task: "answer", input: "My PAN is ABCDE1234F", request: request(), passages: [] });
    expect(messages.at(-1)?.content).not.toContain("ABCDE1234F");
  });
});

describe("the Worker template", () => {
  it("uses exactly the same rules as the app", () => {
    const worker = readFileSync(`${process.cwd()}/server/saath-ai-worker/worker.js`, "utf8");
    expect(worker).toContain(SYSTEM);
  });

  it("keeps no model key anywhere in the app's code", () => {
    for (const path of ["lib/config.ts", "lib/ai/remote-provider.ts", "lib/ai/local-provider.ts", ".env.example"]) {
      const text = readFileSync(`${process.cwd()}/${path}`, "utf8");
      expect(text).not.toMatch(/sk-[A-Za-z0-9]{20,}|AI_API_KEY\s*=\s*\S+/);
    }
  });
});
