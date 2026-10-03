"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { FeatureGuide } from "@/components/intro";
import { useI18n } from "@/components/providers";

export default function Page() {
  const { t } = useI18n();
  return (
    <article className="stack">
      <Link href="/" className="link"><ChevronLeft aria-hidden size={18} />{t("nav.home")}</Link>
      <h1>{t("intro.does")}</h1>
      <FeatureGuide />
    </article>
  );
}
