"use client";

import { ArtOffline } from "@/components/illustrations";
import { useI18n } from "@/components/providers";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  const { t } = useI18n();
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <section className="state">
      <ArtOffline label={t("art.offline")} />
      <h1>{offline ? t("state.offlineTitle") : t("state.errorTitle")}</h1>
      <p className="lead">{offline ? t("state.offlineBody") : t("errors.generic")}</p>
      <button type="button" className="btn btn-primary" onClick={reset}>{t("common.retry")}</button>
    </section>
  );
}
