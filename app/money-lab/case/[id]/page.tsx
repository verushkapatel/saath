import { CASE_IDS } from "@/lib/catalog";
import { CaseScreen } from "@/components/guide-screens";

export function generateStaticParams() {
  return CASE_IDS.map((id) => ({ id }));
}

export default function Page({ params }: { params: { id: string } }) {
  return <CaseScreen id={params.id} />;
}
