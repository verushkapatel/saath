"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Banknote, CalendarClock, Camera, Check, ChevronDown, ChevronRight, CircleAlert, HandCoins, ImagePlus, Info,
  MessageCircleQuestion, Percent, Plus, TriangleAlert, type LucideIcon,
} from "lucide-react";
import { answerFromDocument } from "@/lib/ask";
import { todayISO } from "@/lib/dates";
import { checklistIds, explainBlocks, planExplanation, type Block } from "@/lib/explain";
import { applyConfirmed, ruleExtract } from "@/lib/extract";
import type { Figures } from "@/lib/finance";
import { riskFlags, sortFlags, totalFees, type Severity } from "@/lib/flags";
import { groupAmount, inr, parseAmountInput } from "@/lib/format";
import { matchTerm, wrapTerms } from "@/lib/glossary";
import { photoQuality, preprocessImage } from "@/lib/image";
import { readPhoto } from "@/lib/ocr";
import { figuresFor } from "@/lib/pipeline";
import { SAMPLES } from "@/lib/samples";
import type { Extraction } from "@/lib/schema";
import { getSessionDoc, setSessionDoc } from "@/lib/session";
import { tap } from "@/lib/speech";
import { useApp } from "./app-state";
import { ArtDone, ArtOffline, ArtScan } from "./illustrations";
import { useI18n } from "./providers";
import { ShareButton } from "./share-button";
import { CountUp, GlossarySheet, ListenButton, Ring, Sheet, TermText, useGlossary } from "./ui";

type Phase = "idle" | "warn" | "work" | "confirm" | "result" | "error";

const TITLES = { "personal-loan": "scan.personal", "gold-loan": "scan.gold", "scheme-form": "scan.scheme" } as const;
const BLOCK_ICONS: Record<Block["id"], LucideIcon> = { get: HandCoins, payBack: Banknote, yearly: Percent, late: CalendarClock };
const SEV_ICONS: Record<Severity, LucideIcon> = { high: TriangleAlert, medium: CircleAlert, low: Info };
const SEV_KEYS: Record<Severity, string> = { high: "result.sevHigh", medium: "result.sevMedium", low: "result.sevLow" };

function isLoan(extraction: Extraction): boolean {
  return extraction.documentType === "personal_loan" || extraction.documentType === "gold_loan";
}

function AmountField({
  label,
  value,
  onChange,
  clause,
  unclear,
  prefix,
  suffix,
  money,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  clause?: string | null;
  unclear?: boolean;
  prefix?: string;
  suffix?: string;
  money?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div>
      <label>
        <span className="label">{label}</span>
        <span className={`field-wrap${unclear ? " unclear" : ""}`}>
          {prefix ? <span aria-hidden>{prefix}</span> : null}
          <input
            className="field"
            inputMode="decimal"
            autoComplete="off"
            value={money ? groupAmount(value) : value}
            aria-invalid={unclear || undefined}
            onChange={(event) => onChange(money ? event.target.value.replace(/,/g, "") : event.target.value)}
          />
          {suffix ? <span aria-hidden>{suffix}</span> : null}
        </span>
      </label>
      {unclear && <p className="note">{t("scan.notFound")}</p>}
      {clause ? <p className="clause"><span className="visually-hidden">{t("scan.fromPaper")}: </span>{clause}</p> : null}
    </div>
  );
}

export function ScanScreen({ initialSample }: { initialSample?: string }) {
  const { t, code } = useI18n();
  const app = useApp();
  const glossary = useGlossary();
  const [phase, setPhase] = useState<Phase>("idle");
  const [warn, setWarn] = useState<"blur" | "dark" | null>(null);
  const [pending, setPending] = useState<Blob | null>(null);
  const [ocrPhase, setOcrPhase] = useState<"download" | "read" | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [figures, setFigures] = useState<Figures | null>(null);
  const [titleKey, setTitleKey] = useState<string | null>(null);
  const [sampleId, setSampleId] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [added, setAdded] = useState(false);
  const [allFlags, setAllFlags] = useState(false);
  const [principalDraft, setPrincipalDraft] = useState("");
  const [rateDraft, setRateDraft] = useState("");
  const [monthsDraft, setMonthsDraft] = useState("");
  const [feeDraft, setFeeDraft] = useState("");
  const [otherDraft, setOtherDraft] = useState("");
  const [typeDraft, setTypeDraft] = useState<"flat" | "reducing" | null>(null);

  useEffect(() => {
    if (initialSample && SAMPLES.some((sample) => sample.id === initialSample)) {
      void runSample(initialSample, true);
      return;
    }
    const saved = getSessionDoc();
    if (saved?.extraction && saved.figures) {
      setExtraction(saved.extraction);
      setFigures(saved.figures);
      setTitleKey(saved.titleKey);
      setSampleId(saved.sampleId);
      setPhase("result");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSample]);

  const money = (amount: number) => inr(amount, code);
  const plan = useMemo(() => (extraction ? planExplanation(extraction, figures, (amount) => inr(amount, code)) : null), [extraction, figures, code]);
  const blocks = useMemo(
    () => (extraction && figures ? explainBlocks(extraction, figures, (amount) => inr(amount, code)) : []),
    [extraction, figures, code],
  );
  const flags = useMemo(
    () => (extraction ? sortFlags(riskFlags(extraction, figures?.effectiveAnnualRate)) : []),
    [extraction, figures],
  );

  function openConfirm(next: Extraction, nextTitle: string | null, nextSample: string | null) {
    setExtraction(next);
    setFigures(null);
    setSampleId(nextSample);
    setTitleKey(nextTitle);
    setSessionDoc({ extraction: next, figures: null, sampleId: nextSample, titleKey: nextTitle });
    setPrincipalDraft(next.principal.value != null ? String(next.principal.value) : "");
    setRateDraft(next.interestRate.value != null ? String(next.interestRate.value) : "");
    setMonthsDraft(next.tenureMonths.value != null ? String(next.tenureMonths.value) : "");
    setFeeDraft(next.processingFee.value != null ? String(next.processingFee.value) : "");
    const other = next.otherFees.reduce((sum, fee) => sum + fee.amount, 0);
    setOtherDraft(other ? String(other) : "");
    setTypeDraft(next.rateType.value);
    setAdded(false);
    setAnswer("");
    setQuestion("");
    setAllFlags(false);
    setPhase("confirm");
    window.scrollTo({ top: 0 });
  }

  function confirm() {
    if (!extraction) return;
    tap();
    const loan = isLoan(extraction);
    const next = applyConfirmed(extraction, {
      principal: parseAmountInput(principalDraft),
      interestRate: loan ? parseAmountInput(rateDraft) : extraction.interestRate.value,
      tenureMonths: loan ? parseAmountInput(monthsDraft) : extraction.tenureMonths.value,
      processingFee: loan ? parseAmountInput(feeDraft) ?? 0 : extraction.processingFee.value,
      otherFees: parseAmountInput(otherDraft) ?? 0,
      rateType: loan ? typeDraft : extraction.rateType.value,
    });
    const computed = figuresFor(next);
    setExtraction(next);
    setFigures(computed);
    setSessionDoc({ extraction: next, figures: computed, sampleId, titleKey });
    setPhase("result");
    window.scrollTo({ top: 0 });
    if (loan) void app.finishTask("fee");
    if (sampleId) void app.finishTask("sample");
  }

  async function runSample(id: string, quiet = false) {
    if (!quiet) tap();
    const sample = SAMPLES.find((item) => item.id === id);
    if (!sample) return;
    setPhase("work");
    setOcrPhase(null);
    const text = sample.text[code] || sample.text.en;
    const local = ruleExtract(text);
    openConfirm(local, TITLES[sample.id], sample.id);
  }

  async function runPhoto(blob: Blob) {
    setPhase("work");
    setOcrPhase("download");
    setOcrProgress(0);
    try {
      const text = await readPhoto(blob, code, (state) => {
        setOcrPhase(state.phase);
        setOcrProgress(state.progress);
      });
      if (!text.trim()) {
        setPhase("error");
        return;
      }
      const local = ruleExtract(text);
      openConfirm(local, null, null);
    } catch {
      setPhase("error");
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    tap();
    setPhase("work");
    setOcrPhase(null);
    try {
      const prepared = await preprocessImage(file);
      const quality = await photoQuality(prepared);
      if (quality.blurry || quality.dark) {
        setPending(prepared);
        setWarn(quality.dark ? "dark" : "blur");
        setPhase("warn");
        return;
      }
      await runPhoto(prepared);
    } catch {
      setPhase("error");
    }
  }

  function ask() {
    if (!extraction || !question.trim()) return;
    tap();
    const result = answerFromDocument(question, extraction);
    if (result.found) {
      setAnswer(t(result.key, result.vars));
      return;
    }
    const term = matchTerm(question, glossary.terms, code);
    setAnswer(term ? `${term.term[code]}: ${term.definition[code]}` : t("ask.unknown"));
  }

  async function track() {
    if (!extraction || !figures || added) return;
    tap();
    await app.addLoan({
      id: crypto.randomUUID(),
      lender: extraction.lender.value ?? t("result.fieldLender"),
      principal: extraction.principal.value ?? 0,
      annualRate: extraction.interestRate.value ?? 0,
      rateType: extraction.rateType.value ?? "reducing",
      tenureMonths: extraction.tenureMonths.value ?? figures.schedule.length,
      fee: totalFees(extraction),
      emi: figures.emi,
      startDate: todayISO(),
      schedule: figures.schedule,
    });
    setAdded(true);
  }

  const blockText = (block: Block) => block.lines.map((line) => t(line.key, line.vars)).join(" ");
  const flagReason = (flag: (typeof flags)[number]) =>
    flag.vars?.rate ? t(`flags.${flag.id}.reasonYearly`, flag.vars) : t(`flags.${flag.id}.reason`);

  const spoken = useMemo(() => {
    if (!plan || !extraction) return "";
    const hero = plan.heroAmount !== null ? `${t(plan.heroLabel)} ${inr(plan.heroAmount, code)}` : t(plan.heroLabel);
    const body = blocks.length
      ? blocks.map((block) => `${t(`result.${block.id}Title`)}. ${blockText(block)}`).join(" ")
      : plan.lines.map((line) => t(line.key, line.vars)).join(" ");
    const watch = flags.map((flag) => `${t(`flags.${flag.id}.title`)}. ${flagReason(flag)}`).join(" ");
    const checks = checklistIds(extraction).map((id) => t(`checklist.${id}`)).join(" ");
    return `${hero}. ${body} ${watch} ${t("result.checklist")}. ${checks} ${t("result.disclaimer")}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, extraction, blocks, flags, t, code]);

  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  const feeSum = (parseAmountInput(feeDraft) ?? 0) + (parseAmountInput(otherDraft) ?? 0);
  const otherClause = extraction?.otherFees.map((fee) => fee.clause).filter(Boolean).join(" · ") || null;
  const shownFlags = allFlags ? flags : flags.slice(0, 2);
  const borrowed = extraction?.principal.value ?? 0;
  const extra = figures ? Math.max(0, figures.totalRepayment - borrowed) : 0;

  return (
    <div className="stack">
      {phase === "idle" && (
        <>
          <div className="stack-xs">
            <h1>{t("scan.title")}</h1>
            <p className="lead">{t("scan.privacyLocal")}</p>
          </div>
          <div className="stack-sm">
            <label className="btn btn-primary">
              <Camera aria-hidden size={20} />
              {t("scan.camera")}
              <input className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={(event) => void onFile(event.target.files?.[0])} />
            </label>
            <label className="btn btn-secondary">
              <ImagePlus aria-hidden size={20} />
              {t("scan.gallery")}
              <input className="visually-hidden" type="file" accept="image/*" onChange={(event) => void onFile(event.target.files?.[0])} />
            </label>
          </div>
          <section className="stack-sm" aria-labelledby="samples-h">
            <h2 id="samples-h">{t("scan.samples")}</h2>
            <ul className="list card tight">
              {SAMPLES.map((sample) => (
                <li key={sample.id}>
                  <button type="button" className="item" onClick={() => void runSample(sample.id)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="thumb" src={sample.image} alt="" loading="lazy" width={44} height={56} />
                    <span className="item-body"><span className="item-title">{t(TITLES[sample.id])}</span></span>
                    <span className="item-end"><ChevronRight aria-hidden size={20} /></span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {phase === "warn" && (
        <section className="stack">
          <ArtScan label={t("art.scan")} small />
          <h1>{warn === "dark" ? t("scan.dark") : t("scan.blur")}</h1>
          <button type="button" className="btn btn-primary" onClick={() => { tap(); setPhase("idle"); setPending(null); }}>{t("scan.retake")}</button>
          <button type="button" className="btn btn-ghost" onClick={() => pending && void runPhoto(pending)}>{t("scan.useAnyway")}</button>
        </section>
      )}

      {phase === "work" && (
        <section className="work" aria-live="polite" aria-busy="true">
          <span>
            <Ring value={ocrPhase === "read" ? Math.max(0.06, ocrProgress) : 0.28} size={112} stroke={6} label={t("common.loading")} spin={ocrPhase !== "read"}>
              {ocrPhase === "read" ? `${Math.round(ocrProgress * 100)}%` : null}
            </Ring>
          </span>
          <ol className="work-steps">
            {(["stepPrepare", "stepRead", "stepFind"] as const).map((key, index) => {
              const at = ocrPhase === "download" ? 0 : ocrPhase === "read" ? 1 : 2;
              return (
                <li key={key} className={index === at ? "on" : index < at ? "was" : undefined}>
                  <span aria-hidden>{index < at ? <Check size={14} strokeWidth={3} /> : null}</span>
                  {t(`scan.${key}`)}
                </li>
              );
            })}
          </ol>
          {ocrPhase === "download" && <p className="note">{t("scan.ocrDownload")}</p>}
        </section>
      )}

      {phase === "error" && (
        <section className="state">
          {offline ? <ArtOffline label={t("art.offline")} /> : <ArtScan label={t("art.scan")} />}
          <h1>{offline ? t("state.offlineTitle") : t("state.errorTitle")}</h1>
          <p className="lead">{offline ? t("errors.offline") : t("scan.unreadable")}</p>
          <button type="button" className="btn btn-primary" onClick={() => setPhase("idle")}>{t("common.retry")}</button>
        </section>
      )}

      {phase === "confirm" && extraction && (
        <section className="stack">
          <div className="stack-xs">
            {titleKey && <p className="kicker">{t(titleKey)}</p>}
            <h1>{t("scan.confirmTitle")}</h1>
            <p className="lead">{t("scan.confirmHint")}</p>
          </div>
          <AmountField
            label={isLoan(extraction) ? t("scan.fieldAmount") : t("result.supportLabel")}
            value={principalDraft}
            onChange={setPrincipalDraft}
            unclear={extraction.principal.unclear}
            clause={extraction.principal.clause}
            prefix="₹"
            money
          />
          {isLoan(extraction) && (
            <>
              <div>
                <AmountField
                  label={t("scan.fieldRate")}
                  value={rateDraft}
                  onChange={setRateDraft}
                  unclear={extraction.interestRate.unclear}
                  suffix="%"
                />
                <div className="seg" role="group" aria-label={t("result.fieldType")}>
                  <button type="button" aria-pressed={typeDraft === "flat"} onClick={() => { tap(); setTypeDraft("flat"); }}>{t("result.flat")}</button>
                  <button type="button" aria-pressed={typeDraft === "reducing"} onClick={() => { tap(); setTypeDraft("reducing"); }}>{t("result.reducing")}</button>
                </div>
                {extraction.interestRate.clause && (
                  <p className="clause"><span className="visually-hidden">{t("scan.fromPaper")}: </span>{extraction.interestRate.clause}</p>
                )}
              </div>
              <AmountField
                label={t("scan.fieldMonths")}
                value={monthsDraft}
                onChange={setMonthsDraft}
                unclear={extraction.tenureMonths.unclear}
                clause={extraction.tenureMonths.clause}
              />
              <AmountField
                label={t("scan.fieldProcessing")}
                value={feeDraft}
                onChange={setFeeDraft}
                clause={extraction.processingFee.clause}
                prefix="₹"
                money
              />
              <AmountField
                label={t("scan.fieldOther")}
                value={otherDraft}
                onChange={setOtherDraft}
                clause={otherClause}
                prefix="₹"
                money
              />
              <p className="row-between">
                <strong>{t("scan.feesTotal", { total: money(feeSum) })}</strong>
              </p>
            </>
          )}
          <button type="button" className="btn btn-primary" onClick={confirm}>
            <Check aria-hidden size={20} strokeWidth={3} />
            {t("common.confirm")}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setPhase("idle")}>{t("common.back")}</button>
        </section>
      )}

      {phase === "result" && extraction && plan && (
        <article className="stack">
          <section className="card hero">
            <div className="stack">
              {!figures && <ArtDone label={t("art.done")} small />}
              <div className="stack-xs">
                {titleKey && <p className="kicker">{t(titleKey)}</p>}
                <p className="muted">{t(plan.heroLabel)}</p>
                {plan.heroAmount !== null
                  ? <p className="hero-num"><CountUp value={plan.heroAmount} format={money} /></p>
                  : <p className="hero-num md" style={{ whiteSpace: "normal" }}>{t("common.unclear")}</p>}
                {figures
                  ? <p className="muted">{t("result.borrowed", { amount: money(borrowed) })}</p>
                  : plan.heroNote && <p className="muted">{t(plan.heroNote)}</p>}
              </div>
              {figures && (
                <div className="stack-sm">
                  <div className="split-bar" aria-hidden>
                    <span className="part-a" style={{ flexBasis: `${(borrowed / figures.totalRepayment) * 100}%` }} />
                    <span className="part-b" style={{ flexBasis: `${(extra / figures.totalRepayment) * 100}%` }} />
                  </div>
                  <dl className="legend">
                    <div>
                      <dt><span className="swatch a" aria-hidden />{t("result.barBorrowed")}</dt>
                      <dd>{money(borrowed)}</dd>
                    </div>
                    <div>
                      <dt><span className="swatch b" aria-hidden />{t("result.barExtra")}</dt>
                      <dd>{money(extra)}</dd>
                    </div>
                  </dl>
                </div>
              )}
              <ListenButton text={spoken} label={t("result.listenAll")} primary />
            </div>
          </section>

          {figures ? (
            <section className="card">
              {blocks.map((block) => {
                const Icon = BLOCK_ICONS[block.id];
                const text = blockText(block);
                return (
                  <div className="block" key={block.id} style={block.id === "get" ? undefined : { marginTop: 24 }}>
                    <span className="item-icon"><Icon aria-hidden size={20} /></span>
                    <div className="block-body">
                      <h3 className="block-title">{t(`result.${block.id}Title`)}</h3>
                      <p><TermText text={wrapTerms(text, glossary.terms, code)} terms={glossary.terms} onTerm={glossary.show} /></p>
                    </div>
                    <ListenButton compact text={`${t(`result.${block.id}Title`)}. ${text}`} label={`${t("common.listen")}: ${t(`result.${block.id}Title`)}`} />
                  </div>
                );
              })}
            </section>
          ) : (
            <section className="card">
              <div className="prose">
                {plan.lines.map((line) => <p key={line.key}>{t(line.key, line.vars)}</p>)}
              </div>
            </section>
          )}

          {figures && plan.comparison && (
            <section className="stack-sm" aria-labelledby="compare-h">
              <h2 id="compare-h">{t("result.compareTitle")}</h2>
              <div className="compare">
                {(["flat", "reducing"] as const).map((method) => (
                  <div key={method} className={figures.method === method ? "is-this" : undefined}>
                    <span className="kicker">{t(`result.${method}`)}</span>
                    <strong>{money(figures.comparison[method].totalRepayment)}</strong>
                    {figures.method === method && <span className="faint accent-text">{t("result.thisPaper")}</span>}
                  </div>
                ))}
              </div>
              {figures.method === "flat" && (
                <p className="muted">
                  {t("result.compareSave", { amount: money(figures.comparison.flat.totalRepayment - figures.comparison.reducing.totalRepayment) })}
                </p>
              )}
            </section>
          )}

          {flags.length > 0 && (
            <section className="stack-sm" aria-labelledby="flags-h">
              <h2 id="flags-h">{t("result.flags")}</h2>
              {shownFlags.map((flag) => {
                const Icon = SEV_ICONS[flag.severity];
                return (
                  <div key={flag.id} className={`flag ${flag.severity}`}>
                    <span className="sev-tag"><Icon aria-hidden size={16} />{t(SEV_KEYS[flag.severity])}</span>
                    <strong>{t(`flags.${flag.id}.title`)}</strong>
                    <p className="muted">{flagReason(flag)}</p>
                    {flag.clause && <p className="clause"><span className="visually-hidden">{t("scan.fromPaper")}: </span>{flag.clause}</p>}
                  </div>
                );
              })}
              {flags.length > 2 && (
                <button type="button" className="link" aria-expanded={allFlags} onClick={() => { tap(); setAllFlags(!allFlags); }}>
                  {allFlags ? t("result.showFewer") : t("result.showAll", { count: flags.length })}
                  <ChevronDown aria-hidden size={18} style={{ transform: allFlags ? "rotate(180deg)" : undefined }} />
                </button>
              )}
            </section>
          )}

          <details className="fold card tight">
            <summary>
              {t("result.checklist")}
              <ChevronDown aria-hidden size={20} />
            </summary>
            <ul className="checks">
              {checklistIds(extraction).map((id) => (
                <li key={id}><Check aria-hidden size={18} /><span>{t(`checklist.${id}`)}</span></li>
              ))}
            </ul>
          </details>

          <div className="stack-sm">
            <button type="button" className="btn btn-secondary" onClick={() => { tap(); setAsking(true); }}>
              <MessageCircleQuestion aria-hidden size={20} />
              {t("result.ask")}
            </button>
            {figures && (added ? (
              <Link className="btn btn-secondary" href="/money-lab">
                <Check aria-hidden size={20} strokeWidth={3} />
                {t("result.seeMoney")}
              </Link>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={track}>
                <Plus aria-hidden size={20} />
                {t("result.add")}
              </button>
            ))}
            {added && <p role="status" className="note ok">{t("result.added")}</p>}
            <div className="row-between">
              <ShareButton title="Saath" text={spoken} label={t("result.share")} className="link" />
              <button type="button" className="link" onClick={() => { setPhase("idle"); window.scrollTo({ top: 0 }); }}>{t("scan.another")}</button>
            </div>
          </div>

          <p className="faint">{t("result.disclaimer")}</p>

          {asking && (
            <Sheet title={t("result.ask")} onClose={() => setAsking(false)}>
              <form className="stack" onSubmit={(event) => { event.preventDefault(); ask(); }}>
                <label>
                  <span className="visually-hidden">{t("result.ask")}</span>
                  <span className="field-wrap" style={{ marginTop: 0 }}>
                    <input
                      className="field text"
                      value={question}
                      placeholder={t("result.askPlaceholder")}
                      onChange={(event) => setQuestion(event.target.value)}
                    />
                  </span>
                </label>
                {answer && (
                  <div className="stack-sm">
                    <p role="status">{answer}</p>
                    <ListenButton text={answer} />
                  </div>
                )}
                <button type="submit" className="btn btn-primary">{t("result.askCta")}</button>
              </form>
            </Sheet>
          )}
          <GlossarySheet term={glossary.term} onClose={glossary.close} />
        </article>
      )}
    </div>
  );
}
