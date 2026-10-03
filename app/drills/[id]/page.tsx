import { DRILL_IDS } from "@/lib/catalog";
import { DrillScreen } from "@/components/drill-screens";

export function generateStaticParams() {
  return DRILL_IDS.map((id) => ({ id }));
}

export default function Page({ params }: { params: { id: string } }) {
  return <DrillScreen id={params.id} />;
}
