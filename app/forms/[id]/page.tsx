import { FORM_IDS } from "@/lib/catalog";
import { FormRoute } from "@/components/form-route";

export function generateStaticParams() {
  return FORM_IDS.map((id) => ({ id }));
}

export default function Page({ params }: { params: { id: string } }) {
  return <FormRoute id={params.id} />;
}
