import { CHAPTER_IDS } from "@/lib/catalog";
import { EpisodeRoute } from "@/components/episode-route";

export function generateStaticParams() {
  return CHAPTER_IDS.map((id) => ({ id }));
}

export default function Page({ params }: { params: { id: string } }) {
  return <EpisodeRoute id={params.id} />;
}
