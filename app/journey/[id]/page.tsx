import { STAGE_IDS } from "@/lib/catalog";
import { EpisodeRoute } from "@/components/episode-route";

// Each episode is named after its life stage, so the stage list is the episode list.
export function generateStaticParams() {
  return STAGE_IDS.map((id) => ({ id }));
}

export default function Page({ params }: { params: { id: string } }) {
  return <EpisodeRoute id={params.id} />;
}
