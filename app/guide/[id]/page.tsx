import { LESSON_IDS } from "@/lib/catalog";
import { LessonRoute } from "@/components/lesson-route";

export function generateStaticParams() {
  return LESSON_IDS.map((id) => ({ id }));
}

export default function Page({ params }: { params: { id: string } }) {
  return <LessonRoute id={params.id} />;
}
