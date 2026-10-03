"use client";

import { Delete } from "lucide-react";
import { tap } from "@/lib/speech";

/** A large number pad. Easier than a phone keyboard, and the same in every language. */
export function NumPad({
  onDigit,
  onDelete,
  onDot,
  deleteLabel,
  dotLabel,
}: {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onDot?: () => void;
  deleteLabel: string;
  dotLabel?: string;
}) {
  const press = (fn: () => void) => () => {
    tap();
    fn();
  };
  return (
    <div className="numpad">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
        <button key={digit} type="button" onClick={press(() => onDigit(digit))}>{digit}</button>
      ))}
      {onDot ? (
        <button type="button" className="quiet" aria-label={dotLabel} onClick={press(onDot)}>.</button>
      ) : (
        <span aria-hidden />
      )}
      <button type="button" onClick={press(() => onDigit("0"))}>0</button>
      <button type="button" className="quiet" aria-label={deleteLabel} onClick={press(onDelete)}>
        <Delete aria-hidden size={24} />
      </button>
    </div>
  );
}
