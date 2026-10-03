"use client";

import Link from "next/link";
import { ArtPath } from "@/components/illustrations";
import { useI18n } from "@/components/providers";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <section className="state">
      <ArtPath label={t("art.path")} />
      <h1>{t("state.missingTitle")}</h1>
      <p className="lead">{t("errors.missing")}</p>
      <Link href="/" className="btn btn-primary">{t("state.home")}</Link>
    </section>
  );
}
