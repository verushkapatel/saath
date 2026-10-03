"use client";

import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { useI18n } from "./providers";
import { ListenButton } from "./ui";

/** The short page: eight plain sentences about where things are kept and what is shared. */
export function PrivacyScreen() {
  const { t } = useI18n();
  const points = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => t(`privacy.p${n}`));
  return (
    <article className="stack">
      <Link href="/" className="link"><ChevronLeft aria-hidden size={18} />{t("nav.home")}</Link>
      <div className="stack-sm">
        <div className="row-between">
          <span className="item-icon"><ShieldCheck aria-hidden size={22} /></span>
          <ListenButton text={points.join(" ")} />
        </div>
        <h1>{t("privacy.title")}</h1>
      </div>
      <ol className="points">
        {points.map((point, index) => (
          <li key={index}><span aria-hidden>{index + 1}</span><span>{point}</span></li>
        ))}
      </ol>
      <p className="faint">{t("result.disclaimer")}</p>
      <Link href="/privacy/partners" className="link">
        {t("privacy.partnersLink")}
        <ChevronRight aria-hidden size={18} />
      </Link>
      <hr className="rule-double" />
      <section className="stack-sm">
        <h2>{t("privacy.faq")}</h2>
        <div className="card tight">
          {[1, 2, 3, 4, 5].map((n) => (
            <details className="fold" key={n}>
              <summary>
                {t(`faq.q${n}`)}
                <ChevronDown aria-hidden size={20} />
              </summary>
              <p className="muted" style={{ paddingBottom: 12 }}>{t(`faq.a${n}`)}</p>
            </details>
          ))}
        </div>
      </section>
      <p className="muted">{t("privacy.made")}</p>
    </article>
  );
}

/** The longer page for teachers and partners: what exists, where it is, and what is shared. */
export function PartnerPrivacyScreen() {
  const { t } = useI18n();
  return (
    <article className="stack">
      <Link href="/privacy" className="link"><ChevronLeft aria-hidden size={18} />{t("privacy.title")}</Link>
      <h1>{t("partners.title")}</h1>
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <section key={n} className="stack-sm">
          <hr className="rule-double" />
          <h2>{t(`partners.h${n}`)}</h2>
          <p>{t(`partners.b${n}`)}</p>
        </section>
      ))}
    </article>
  );
}

export function AboutScreen() {
  const { t } = useI18n();
  const lines = [1, 2, 3, 4, 5, 6].map((n) => t(`about.${n}`));
  return (
    <article className="stack">
      <Link href="/" className="link"><ChevronLeft aria-hidden size={18} />{t("nav.home")}</Link>
      <div className="row-between">
        <h1>{t("about.title")}</h1>
        <ListenButton compact text={lines.join(" ")} />
      </div>
      <ol className="points">
        {lines.map((line, index) => (
          <li key={index}><span aria-hidden>{index + 1}</span><span>{line}</span></li>
        ))}
      </ol>
    </article>
  );
}
