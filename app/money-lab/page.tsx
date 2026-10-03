"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { MoneyScreen } from "@/components/money-screen";
import { PageSkeleton } from "@/components/ui";

function MoneyRoute() {
  const params = useSearchParams();
  return <MoneyScreen openLog={params.get("log") === "1"} />;
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MoneyRoute />
    </Suspense>
  );
}
