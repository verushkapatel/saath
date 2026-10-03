"use client";

import type { Unit } from "@/lib/catalog";
import { useI18n } from "./providers";

/** The small label that ties a lesson, path, task or drill to its Skyward unit. */
export function UnitBadge({ unit }: { unit: Unit | null | undefined }) {
  const { t } = useI18n();
  if (!unit) return null;
  return <span className="unit-badge" title={t(`unit.${unit}`)}>{t(`unitShort.${unit}`)}</span>;
}
