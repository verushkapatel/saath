"use client";

import Link from "next/link";
import { ChevronDown, ChevronLeft, ShieldCheck } from "lucide-react";
import { useI18n } from "./providers";
import { ListenButton } from "./ui";

export function PrivacyScreen() {
  const { t } = useI18n();
  const points = [1, 2, 3, 4, 5, 6].map((n) => t(`privacy.p${n}`));
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
