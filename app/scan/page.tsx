"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ScanScreen } from "@/components/scan-screen";
import { PageSkeleton } from "@/components/ui";

function ScanRoute() {
  const params = useSearchParams();
  return <ScanScreen initialSample={params.get("sample") ?? undefined} />;
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ScanRoute />
    </Suspense>
  );
}
