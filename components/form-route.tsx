"use client";

import { FormScreen } from "./forms-screens";

export function FormRoute({ id }: { id: string }) {
  return <FormScreen key={id} id={id} />;
}
