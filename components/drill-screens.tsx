"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpenText, Check, ChevronLeft, ChevronRight, FileWarning, MessageSquareWarning, Smartphone, Timer, X, type LucideIcon } from "lucide-react";
import { DRILL_IDS, DRILL_UNIT, type DrillId } from "@/lib/catalog";
import { loadJson, type Copy } from "@/lib/content-types";
import { emiFlat } from "@/lib/finance";
import { inr } from "@/lib/format";
import { tap } from "@/lib/speech";
import { useApp } from "./app-state";
import { CaseSimulations } from "./case-sim";
import { ArtDrill } from "./illustrations";
import { useI18n } from "./providers";
import { UnitBadge } from "./unit-badge";
import { ListenButton, PageSkeleton } from "./ui";

type Scam = { id: string; channel: string; from: string; fake: boolean; text: Copy; flags: Record<"en" | "hi" | "mr", string[]>; why: Copy };
type FormField = { id: string; label: Copy; value: Copy; wrong: boolean; note: Copy };
type Drills = {
  scams: Scam[];
  form: { idCard: Copy; fields: FormField[]; debrief: Copy };
  price: {
    phones: { id: string; name: Copy; price: number }[];
    offers: { id: string; months: number; rate: number }[];
    fees: { id: string; items: { label: Copy; amount: number }[] }[];
  };
};

const ICONS: Record<DrillId, LucideIcon> = { scam: MessageSquareWarning, form: FileWarning, price: Smartphone, stories: BookOpenText };
const ROUND = 5;

function useDrills() {
  const [data, setData] = useState<Drills | null>(null);
  useEffect(() => {
    loadJson<Drills>("/content/drills.json").then(setData).catch(() => undefined);
  }, []);
  return data;
}

export function DrillsHub() {
  const { t } = useI18n();
  return (
    <div className="stack rise">
      <div className="stack-xs">
        <p className="masthead">{t("home.masthead")}</p>
        <h1>{t("drills.title")}</h1>
        <p className="lead">{t("drills.intro")}</p>
      </div>
      <ArtDrill label={t("art.drill")} small />
      <ul className="stack-sm">
        {DRILL_IDS.map((id) => {
          const Icon = ICONS[id];
          return (
            <li key={id}>
              <Link href={`/drills/${id}`} className="card tight" onClick={tap}>
                <span className="item" style={{ padding: 0, minHeight: 0 }}>
                  <span className="item-icon"><Icon aria-hidden size={20} /></span>
                  <span className="item-body">
                    <UnitBadge unit={DRILL_UNIT[id]} />
                    <span className="item-title">{t(`drills.${id}.title`)}</span>
                    <span className="item-sub">{t(`drills.${id}.sub`)}</span>
                  </span>
                  <span className="item-end"><ChevronRight aria-hidden size={20} /></span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Frame({ id, spoken, children }: { id: DrillId; spoken: string; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="stack">
      <Link href="/drills" className="link"><ChevronLeft aria-hidden size={18} />{t("drills.all")}</Link>
      <div className="stack-sm">
        <div className="row-between">
          <UnitBadge unit={DRILL_UNIT[id]} />
          <ListenButton compact text={spoken} />
        </div>
        <h1>{t(`drills.${id}.title`)}</h1>
      </div>
      {children}
    </div>
  );
}

function Finish({ line, onAgain }: { line: string; onAgain: () => void }) {
  const { t } = useI18n();
  return (
    <section className="card hero stack-sm" role="status">
      <p className="kicker accent-text">{t("drills.done")}</p>
      <h2>{line}</h2>
      <button type="button" className="btn btn-secondary" onClick={() => { tap(); onAgain(); }}>{t("drills.again")}</button>
      <Link href="/drills" className="btn btn-ghost">{t("drills.all")}</Link>
    </section>
  );
}

/** Marks the warning words inside a message. */
function Flagged({ text, flags }: { text: string; flags: string[] }) {
  if (!flags.length) return <>{text}</>;
  const pattern = new RegExp(`(${flags.map((flag) => flag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  return <>{text.split(pattern).map((part, index) => (flags.includes(part) ? <mark key={index}>{part}</mark> : <span key={index}>{part}</span>))}</>;
}

function ScamDrill({ data }: { data: Drills }) {
  const { t, code } = useI18n();
  const app = useApp();
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [said, setSaid] = useState<boolean | null>(null);
  const [right, setRight] = useState(0);
  const [done, setDone] = useState(false);
  const [dx, setDx] = useState(0);
  const start = useRef<number | null>(null);

  useEffect(() => {
    try {
      setRound(Number(window.localStorage.getItem("saath-scam-round") ?? 0) || 0);
    } catch {
      setRound(0);
    }
  }, []);

  const set = useMemo(
    () => Array.from({ length: ROUND }, (_, at) => data.scams[(round * ROUND + at) % data.scams.length]),
    [data, round],
  );
  const message = set[index];

  function choose(saidFake: boolean) {
    if (said !== null) return;
    tap();
    setSaid(saidFake);
    setDx(0);
    if (saidFake === message.fake) setRight((count) => count + 1);
  }

  function next() {
    tap();
    if (index + 1 < ROUND) {
      setIndex(index + 1);
      setSaid(null);
      return;
    }
    setDone(true);
    try {
      window.localStorage.setItem("saath-scam-round", String(round + 1));
    } catch {
      // The same five come round again.
    }
    void app.finishTask("drill");
  }

  const spoken = `${t(`scam.channel.${message.channel}`)}. ${message.text[code]}`;

  if (done) {
    return (
      <Frame id="scam" spoken={t("scam.score", { right, total: ROUND })}>
        <Finish line={t("scam.score", { right, total: ROUND })} onAgain={() => { setRound(round + 1); setIndex(0); setSaid(null); setRight(0); setDone(false); }} />
      </Frame>
    );
  }

  const correct = said !== null && said === message.fake;
  return (
    <Frame id="scam" spoken={spoken}>
      <p className="faint num">{t("check.progress", { current: index + 1, total: ROUND })}</p>
      <div
        className={`msg${said !== null ? (message.fake ? " is-fake" : " is-real") : ""}`}
        style={said === null && dx ? { transform: `translateX(${dx}px) rotate(${dx / 30}deg)` } : undefined}
        onPointerDown={(event) => { if (said === null) start.current = event.clientX; }}
        onPointerMove={(event) => { if (start.current !== null) setDx(event.clientX - start.current); }}
        onPointerUp={() => {
          if (start.current === null) return;
          start.current = null;
          if (dx > 80) choose(false);
          else if (dx < -80) choose(true);
          else setDx(0);
        }}
        onPointerCancel={() => { start.current = null; setDx(0); }}
      >
        <p className="kicker">{t(`scam.channel.${message.channel}`)}</p>
        <p className="faint">{t("scam.from")}: {message.from}</p>
        <p className="msg-text">{said === null ? message.text[code] : <Flagged text={message.text[code]} flags={message.flags[code]} />}</p>
      </div>

      {said === null ? (
        <>
          <div className="pair">
            <button type="button" className="btn btn-secondary" onClick={() => choose(true)}>
              <X aria-hidden size={18} />
              {t("scam.fake")}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => choose(false)}>
              <Check aria-hidden size={18} />
              {t("scam.real")}
            </button>
          </div>
          <p className="faint center">{t("scam.howto")}</p>
        </>
      ) : (
        <div className="stack-sm" role="status">
          <p>
            <strong className={correct ? "accent-text" : undefined}>{message.fake ? t("scam.itIsFake") : t("scam.itIsReal")}</strong>{" "}
            {correct ? t("scam.youGotIt") : message.fake ? t("scam.lookAgain") : t("scam.lookAgainReal")}
          </p>
          <p className="muted">{message.why[code]}</p>
          <button type="button" className="btn btn-primary" onClick={next}>{t("common.next")}<ChevronRight aria-hidden size={18} /></button>
        </div>
      )}
    </Frame>
  );
}

function FormDrill({ data }: { data: Drills }) {
  const { t, code } = useI18n();
  const app = useApp();
  const { form } = data;
  const [marked, setMarked] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const problems = form.fields.filter((field) => field.wrong);
  const caught = problems.filter((field) => marked.includes(field.id)).length;
  const spoken = `${t("form.howto")} ${form.idCard[code]}. ${form.fields.map((field) => `${field.label[code]}: ${field.value[code]}`).join(". ")}`;

  return (
    <Frame id="form" spoken={spoken}>
      <p className="lead">{t("form.howto")}</p>
      <p className="clause" style={{ fontStyle: "normal" }}>{form.idCard[code]}</p>
      <ul className="paper-form">
        {form.fields.map((field) => {
          const on = marked.includes(field.id);
          const state = !checked ? null : field.wrong ? (on ? "caught" : "missed") : on ? "fine" : null;
          return (
            <li key={field.id}>
              <button
                type="button"
                className={`form-row${on ? " is-marked" : ""}${state ? ` is-${state}` : ""}`}
                aria-pressed={on}
                disabled={checked}
                onClick={() => { tap(); setMarked(on ? marked.filter((id) => id !== field.id) : [...marked, field.id]); }}
              >
                <span className="form-label">{field.label[code]}</span>
                <span className="form-value">{field.value[code]}</span>
                {on && !checked && <span className="faint">{t("form.marked")}</span>}
                {checked && (field.wrong || on) && (
                  <span className="form-note">
                    <strong>{state === "caught" ? t("form.caught") : state === "missed" ? t("form.missed") : t("form.fine")}.</strong> {field.note[code]}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {!checked ? (
        <button
          type="button"
          className="btn btn-primary"
          disabled={marked.length === 0}
          onClick={() => { tap(); setChecked(true); void app.finishTask("drill"); }}
        >
          {t("form.check")}
        </button>
      ) : (
        <>
          <p className="muted">{form.debrief[code]}</p>
          <Finish line={t("form.score", { right: caught, total: problems.length })} onAgain={() => { setMarked([]); setChecked(false); window.scrollTo({ top: 0 }); }} />
        </>
      )}
    </Frame>
  );
}

function PriceDrill({ data }: { data: Drills }) {
  const { t, code } = useI18n();
  const app = useApp();
  const { phones, offers, fees } = data.price;
  const [phone, setPhone] = useState(phones[0]);
  const [offer, setOffer] = useState(offers[1] ?? offers[0]);
  const [feeSet, setFeeSet] = useState(fees[1] ?? fees[0]);
  const [picked, setPicked] = useState<number | null>(null);
  const [timing, setTiming] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!timing || picked !== null) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [timing, picked]);

  // The same finance engine the scanner uses: a flat-rate EMI, then fees on top.
  const emi = Math.round(emiFlat(phone.price, offer.rate, offer.months));
  const paid = emi * offer.months;
  const feeTotal = feeSet.items.reduce((sum, item) => sum + item.amount, 0);
  const total = paid + feeTotal;
  const options = useMemo(() => {
    const list = [total, paid, phone.price];
    const turn = (phone.price / 1000 + offer.months + feeTotal + 1) % 3;
    return [...list.slice(turn), ...list.slice(0, turn)];
  }, [total, paid, phone.price, offer.months, feeTotal]);
  const money = (value: number) => inr(value, code);
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  function reset() {
    setPicked(null);
    setSeconds(0);
  }

  const spoken = `${t("price.howto")} ${phone.name[code]}, ${money(phone.price)}. ${t("price.emi", { emi: money(emi), months: offer.months })}. ${feeSet.items.map((item) => `${item.label[code]} ${money(item.amount)}`).join(", ")}. ${t("price.question")}`;

  return (
    <Frame id="price" spoken={spoken}>
      <p className="lead">{t("price.howto")}</p>

      <div>
        <p className="label">{t("price.phone")}</p>
        <div className="seg" role="group" aria-label={t("price.phone")}>
          {phones.map((item) => (
            <button key={item.id} type="button" aria-pressed={phone.id === item.id} onClick={() => { tap(); setPhone(item); reset(); }}>{money(item.price)}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="label">{t("price.offer")}</p>
        <div className="seg" role="group" aria-label={t("price.offer")}>
          {offers.map((item) => (
            <button key={item.id} type="button" aria-pressed={offer.id === item.id} onClick={() => { tap(); setOffer(item); reset(); }}>
              {item.months} · {item.rate}%
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="label">{t("price.fees")}</p>
        <div className="seg" role="group" aria-label={t("price.fees")}>
          {fees.map((item) => (
            <button key={item.id} type="button" aria-pressed={feeSet.id === item.id} onClick={() => { tap(); setFeeSet(item); reset(); }}>{t(`price.feeSet.${item.id}`)}</button>
          ))}
        </div>
      </div>

      <section className="card tight">
        <dl className="receipt">
          <div><dt>{phone.name[code]} · {t("price.cash")}</dt><dd>{money(phone.price)}</dd></div>
          <div><dt>{t("price.offerLine", { months: offer.months, rate: offer.rate })}</dt><dd>{money(emi)} × {offer.months}</dd></div>
          {feeSet.items.map((item) => (
            <div key={item.label.en}><dt>{item.label[code]}</dt><dd>{money(item.amount)}</dd></div>
          ))}
        </dl>
      </section>

      <div className="row-between">
        <h2>{t("price.question")}</h2>
        <button type="button" className="listen" aria-pressed={timing} onClick={() => { tap(); setTiming(!timing); setSeconds(0); }}>
          <Timer aria-hidden size={18} />
          {timing ? clock : t("price.timerOn")}
        </button>
      </div>
      <div className="stack-sm" role="group" aria-label={t("price.question")}>
        {options.map((value) => {
          const best = picked !== null && value === total;
          const mine = picked === value;
          return (
            <button
              key={value}
              type="button"
              className={`option${best ? " is-best" : ""}${mine && !best ? " is-mine" : ""}${picked !== null && !best && !mine ? " is-dim" : ""}`}
              disabled={picked !== null}
              onClick={() => { tap(); setPicked(value); void app.finishTask("drill"); }}
            >
              <span className="option-mark" aria-hidden>{best ? <Check className="draw" size={16} strokeWidth={3} /> : null}</span>
              <span className="num">{money(value)}</span>
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <div className="stack-sm" role="status">
          <p>
            <strong className={picked === total ? "accent-text" : undefined}>{picked === total ? t("home.right") : t("home.notQuite")}</strong>{" "}
            {t("price.working", { emi: money(emi), months: offer.months, paid: money(paid), fees: money(feeTotal), total: money(total) })}
          </p>
          <p className="muted">{t("price.extra", { extra: money(total - phone.price) })}{timing ? ` ${t("price.time", { time: clock })}` : ""}</p>
          <Finish line={money(total)} onAgain={reset} />
        </div>
      )}
    </Frame>
  );
}

function StoriesDrill() {
  const { t } = useI18n();
  return (
    <Frame id="stories" spoken={`${t("drills.stories.title")}. ${t("drills.stories.sub")} ${t("sim.intro")}`}>
      <p className="lead">{t("drills.stories.sub")}</p>
      <CaseSimulations />
    </Frame>
  );
}

export function DrillScreen({ id }: { id: string }) {
  const { t } = useI18n();
  const data = useDrills();
  if (!DRILL_IDS.includes(id as DrillId)) return <p className="lead">{t("errors.missing")}</p>;
  if (id === "stories") return <StoriesDrill />;
  if (!data) return <PageSkeleton />;
  if (id === "scam") return <ScamDrill data={data} />;
  if (id === "form") return <FormDrill data={data} />;
  return <PriceDrill data={data} />;
}
