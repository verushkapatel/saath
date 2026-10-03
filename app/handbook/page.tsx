"use client";

import { useEffect, useState } from "react";
import { HandbookScreen } from "@/components/handbook-screen";

export default function Page() {
  const [print, setPrint] = useState(false);
  useEffect(() => {
    setPrint(new URLSearchParams(window.location.search).get("print") === "1");
  }, []);
  return <HandbookScreen print={print} />;
}
