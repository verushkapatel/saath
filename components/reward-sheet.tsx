"use client";

import Link from "next/link";
import { Award } from "lucide-react";
import type { Reward } from "@/lib/rewards";
import { tap } from "@/lib/speech";
import { useApp } from "./app-state";
import { Character } from "./character";
import { useI18n } from "./providers";
import { Sheet } from "./ui";

/** The name of a reward and the line that says how it was earned. */
export function rewardName(reward: Reward, t: (key: string) => string): string {
  return t(`rewards.${reward.kind}.${reward.id}`);
}

function Preview({ reward }: { reward: Reward }) {
  const { progress, story } = useApp();
  if (reward.kind === "badge") {
    return (
      <span className="badge-art" aria-hidden>
        <Award size={30} strokeWidth={1.5} />
      </span>
    );
  }
  const look = { ...progress.look, [reward.kind === "outfit" ? "outfit" : reward.kind === "extra" ? "extra" : "place"]: reward.id };
  return <Character look={look} age={story?.age || 22} size={88} bare={reward.kind !== "place"} />;
}

/** Shown once after something new opens. Closing it marks the rewards as seen. */
export function RewardSheet() {
  const { t } = useI18n();
  const app = useApp();
  const rewards = app.fresh;
  const wearable = rewards.find((reward) => reward.kind !== "badge") ?? null;

  function close() {
    app.clearFresh();
  }

  return (
    <Sheet title={rewards.length > 1 ? t("rewards.titleMany", { count: rewards.length }) : t("rewards.title")} onClose={close}>
      <div className="stack">
        <ul className="reward-list">
          {rewards.map((reward) => (
            <li key={`${reward.kind}:${reward.id}`} className="reward">
              <Preview reward={reward} />
              <span className="stack-xs">
                <span className="kicker">{t(`rewards.kind.${reward.kind}`)}</span>
                <strong>{rewardName(reward, t)}</strong>
                {reward.kind === "badge" && <span className="faint">{t(`rewards.why.${reward.id}`)}</span>}
              </span>
            </li>
          ))}
        </ul>
        {wearable && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              tap();
              void app.saveLook({ [wearable.kind]: wearable.id });
              close();
            }}
          >
            {t("rewards.wear", { name: rewardName(wearable, t) })}
          </button>
        )}
        <Link href="/progress" className="btn btn-ghost" onClick={close}>{t("rewards.see")}</Link>
        <button type="button" className="btn btn-primary" onClick={() => { tap(); close(); }}>{t("common.done")}</button>
      </div>
    </Sheet>
  );
}
