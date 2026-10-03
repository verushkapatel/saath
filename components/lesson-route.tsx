"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LessonScreen } from "./guide-screens";
import { PageSkeleton } from "./ui";

function Inner({ id }: { id: string }) {
  const params = useSearchParams();
  return <LessonScreen id={id} pathId={params.get("path") ?? undefined} />;
}

export function LessonRoute({ id }: { id: string }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Inner id={id} />
    </Suspense>
  );
}
