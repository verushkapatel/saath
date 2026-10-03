import { soundOn } from "./prefs";

let context: AudioContext | null = null;

/**
 * A soft two-note chime for a finished task.
 * It plays through the normal media channel, so a phone on silent or at zero volume stays quiet.
 */
export function chime(): void {
  if (typeof window === "undefined" || !soundOn()) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    context ??= new Ctor();
    if (context.state === "suspended") void context.resume();
    const now = context.currentTime;
    [660, 880].forEach((frequency, index) => {
      const oscillator = context!.createOscillator();
      const gain = context!.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      const start = now + index * 0.11;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.06, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);
      oscillator.connect(gain).connect(context!.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.45);
    });
  } catch {
    // Sound is a nicety. Silence is fine.
  }
}
