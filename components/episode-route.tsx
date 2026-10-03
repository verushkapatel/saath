"use client";

import { EpisodeScreen } from "./journey-screens";

export function EpisodeRoute({ id }: { id: string }) {
  return <EpisodeScreen key={id} id={id} />;
}
