import { PATH_IDS } from "@/lib/catalog";
import { PathScreen } from "@/components/path-screens";

export function generateStaticParams() {
  return PATH_IDS.map((id) => ({ id }));
}

export default function Page({ params }: { params: { id: string } }) {
  return <PathScreen id={params.id} />;
}
