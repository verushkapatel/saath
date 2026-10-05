"use client";

import type { ReactNode } from "react";
import { Character } from "./character";
import type { VerenaLook } from "@/lib/verena";

/**
 * Scene illustrations for walkthroughs and the handbook. One drawing style everywhere: ink lines, two paper greys and
 * the navy of the logo, so every guide looks like it belongs to the same book, in light and dark.
 *
 * Scenes that show a screen or a paper (phone, form, payslip, receipt, ATM…) print the step's own words on it, so the
 * picture always shows exactly what the step is about.
 */
export const SCENES = [
  "branch", "counter", "queue", "form", "phone", "laptop", "sms", "call", "atm", "cards", "documents", "payslip",
  "receipt", "calculator", "calendar", "insurance", "hospital", "home", "family", "shop", "office", "growth", "jar",
  "alert", "police", "gold", "house", "school", "garden", "resume", "interview", "signature", "letter",
] as const;
export type SceneKind = (typeof SCENES)[number];

const SKIN = "#C98F65";
const INKC = "#1B1B1F";

/** A supporting person: a clerk, an agent, a doctor, a parent. Simple on purpose, so Verena stays the one you notice. */
function Person({ x, ground = 184, tint = "#3E5C76", scale = 1, hair = INKC, bun, glasses, flip }: { x: number; ground?: number; tint?: string; scale?: number; hair?: string; bun?: boolean; glasses?: boolean; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${ground}) scale(${flip ? -scale : scale} ${scale})`}>
      <path d="M-9 0v-30h7V0zM2 0v-30h7V0z" fill="#3A3F48" />
      <path d="M-15-28c0-18 6-26 15-26s15 8 15 26z" fill={tint} />
      <path d="M-15-46l-6 22 5 2 6-18M15-46l6 22-5 2-6-18" fill={tint} />
      <circle cx="0" cy="-64" r="10" fill={SKIN} />
      <path d="M-10-66c0-9 5-13 10-13s10 4 10 13c-3-5-6-7-10-7s-7 2-10 7z" fill={hair} />
      {bun && <circle cx="0" cy="-78" r="5" fill={hair} />}
      {glasses && <path d="M-8-64h6M2-64h6M-2-64h4" stroke={INKC} strokeWidth="1.4" />}
    </g>
  );
}

/** Someone seen from the waist up, behind a desk or counter. */
function Bust({ x, y, tint = "#3E5C76", hair = INKC, bun, glasses }: { x: number; y: number; tint?: string; hair?: string; bun?: boolean; glasses?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-18 0c0-20 8-28 18-28s18 8 18 28z" fill={tint} />
      <path d="M-5-29l5 7 5-7" fill="none" stroke="#F6F6F4" strokeWidth="2" />
      <circle cx="0" cy="-40" r="11" fill={SKIN} />
      <path d="M-11-42c0-10 5-14 11-14s11 4 11 14c-3-5-7-8-11-8s-8 3-11 8z" fill={hair} />
      {bun && <circle cx="0" cy="-56" r="5" fill={hair} />}
      {glasses && <path d="M-8-40h6M2-40h6M-2-40h4" stroke={INKC} strokeWidth="1.4" />}
    </g>
  );
}

/** Words on a screen or paper. Lines are cut short rather than wrapped, like a real display. */
function Screen({ x, y, w, h, lines = [], dark, size = 10.5, center, ink }: { x: number; y: number; w: number; h: number; lines?: string[]; dark?: boolean; size?: number; center?: boolean; ink?: boolean }) {
  return (
    <foreignObject x={x} y={y} width={w} height={h}>
      <div className={`sc-screen${dark ? " dark" : ""}${center ? " center" : ""}${ink ? " ink" : ""}`} style={{ fontSize: `${size}px` }}>
        {lines.slice(0, 8).map((line, index) => (
          <span key={index} className={index === 0 ? "sc-screen-head" : line.startsWith("!") ? "sc-screen-warn" : line.startsWith("✓") ? "sc-screen-ok" : undefined}>
            {line.replace(/^!/, "")}
          </span>
        ))}
      </div>
    </foreignObject>
  );
}

function Floor() {
  return <path className="sc-soft" d="M8 184h304" />;
}

function Plant({ x }: { x: number }) {
  return (
    <g>
      <path className="sc" d={`M${x - 8} 184h16l-3-16h-10z`} />
      <path className="sc" d={`M${x} 168c-2-12-10-16-14-26M${x} 168c0-14 4-22 12-30M${x} 168c-1-10 0-18-4-26`} />
    </g>
  );
}

function Desk({ x, w, y = 140 }: { x: number; w: number; y?: number }) {
  return (
    <g>
      <rect className="sc sc-f1" x={x} y={y} width={w} height="10" rx="2" />
      <path className="sc" d={`M${x + 6} ${y + 10}v34M${x + w - 6} ${y + 10}v34`} />
    </g>
  );
}

function scene(kind: SceneKind, lines: string[], verena: (x: number, y: number, s: number) => ReactNode): ReactNode {
  switch (kind) {
    case "branch":
      return (
        <g>
          <Floor />
          <path className="sc sc-f1" d="M18 70 74 42l56 28z" />
          <rect className="sc sc-paper" x="24" y="70" width="100" height="10" />
          <path className="sc" d="M34 80v92M54 80v92M94 80v92M114 80v92M24 172h100v12H24z" />
          <rect className="sc sc-navy" x="66" y="120" width="16" height="52" rx="2" />
          <Screen x={30} y={50} w={90} h={18} lines={[lines[0] ?? "BANK"]} size={8} center ink />
          {verena(150, 77, 0.5)}
          <Desk x={212} w={92} y={128} />
          <Bust x={258} y={128} tint="#3E5C76" bun />
          <Plant x={300} />
          <Screen x={196} y={22} w={116} h={56} lines={lines.slice(1)} />
        </g>
      );
    case "counter":
      return (
        <g>
          <Floor />
          <rect className="sc sc-f2" x="150" y="40" width="156" height="12" rx="2" />
          <Screen x={152} y={40} w={152} h={14} lines={[lines[0] ?? "ACCOUNTS"]} size={8} center dark />
          <Bust x={232} y={118} tint="#2F3B4C" glasses />
          <rect className="sc sc-paper" x="140" y="118" width="172" height="66" />
          <path className="sc sc-soft" d="M150 118v-56M300 118v-56" />
          <rect className="sc sc-f1" x="250" y="96" width="34" height="22" rx="2" />
          <Screen x={160} y={126} w={140} h={54} lines={lines.slice(1)} ink />
          {verena(36, 77, 0.5)}
        </g>
      );
    case "queue":
      return (
        <g>
          <Floor />
          <rect className="sc sc-f2" x="20" y="30" width="120" height="58" rx="6" />
          <Screen x={24} y={34} w={112} h={50} lines={lines.length ? lines : ["TOKEN", "A-27"]} dark center size={13} />
          <path className="sc" d="M180 150h120M186 150v34M294 150v34M180 128h120v22M210 128v-18h30v18" />
          <rect className="sc sc-f1" x="40" y="110" width="22" height="40" rx="3" />
          <rect className="sc sc-paper" x="45" y="118" width="12" height="8" />
          <path className="sc" d="M51 150v34" />
          <Person x={250} tint="#5B4B6B" scale={0.8} />
          {verena(80, 77, 0.5)}
        </g>
      );
    case "form":
      return (
        <g>
          <rect className="sc sc-f1" x="0" y="0" width="320" height="200" opacity="0.5" />
          <g transform="rotate(-3 160 100)">
            <rect className="sc sc-paper" x="46" y="14" width="200" height="176" rx="3" />
            <rect className="sc-navy-fill" x="46" y="14" width="200" height="6" />
            <Screen x={56} y={24} w={180} h={160} lines={lines} ink />
          </g>
          <path className="sc" d="M262 60l34 96-8 4-34-96z" />
          <path className="sc sc-ink" d="M288 160l2 12-8-8z" />
          {verena(262, 120, 0.3)}
        </g>
      );
    case "phone":
      return (
        <g>
          <rect className="sc sc-f1" x="0" y="0" width="320" height="200" opacity="0.4" />
          <rect className="sc sc-ink" x="104" y="6" width="112" height="190" rx="16" />
          <rect className="sc-paper-fill" x="110" y="16" width="100" height="170" rx="9" />
          <rect className="sc-navy-fill" x="110" y="16" width="100" height="22" rx="9" />
          <Screen x={113} y={20} w={94} h={160} lines={lines} size={9} ink />
          <path className="sc" d="M216 120c18 0 26 10 34 30l20 34M104 140c-14 4-22 14-26 44" />
          {verena(18, 112, 0.36)}
        </g>
      );
    case "laptop":
      return (
        <g>
          <Floor />
          <rect className="sc sc-ink" x="62" y="22" width="196" height="132" rx="8" />
          <rect className="sc-paper-fill" x="70" y="30" width="180" height="116" rx="3" />
          <rect className="sc-navy-fill" x="70" y="30" width="180" height="14" />
          <Screen x={74} y={32} w={172} h={112} lines={lines} size={10} ink />
          <path className="sc sc-f2" d="M40 154h240l-14 14H54z" />
          <path className="sc" d="M268 168h26l-4-24h-18z" />
          <path className="sc" d="M296 152c4 0 6 4 4 8" />
        </g>
      );
    case "sms":
      return (
        <g>
          <rect className="sc sc-ink" x="96" y="4" width="128" height="194" rx="16" />
          <rect className="sc-paper-fill" x="102" y="14" width="116" height="176" rx="9" />
          <foreignObject x="106" y="18" width="108" height="168">
            <div className="sc-chat">
              {lines.map((line, index) => (
                <span key={index} className={line.startsWith(">") ? "me" : line.startsWith("!") ? "warn" : "them"}>{line.replace(/^[>!]/, "")}</span>
              ))}
            </div>
          </foreignObject>
          {verena(14, 108, 0.36)}
        </g>
      );
    case "call":
      return (
        <g>
          <circle className="sc sc-f1" cx="214" cy="76" r="56" />
          <rect className="sc sc-ink" x="190" y="30" width="48" height="92" rx="8" />
          <rect className="sc-paper-fill" x="194" y="38" width="40" height="76" rx="3" />
          <Screen x={195} y={40} w={38} h={72} lines={lines.slice(0, 3)} size={6.5} center ink />
          <path className="sc sc-navy-s" d="M248 44c8 6 10 16 6 26M258 36c12 10 14 26 8 40M180 44c-8 6-10 16-6 26M170 36c-12 10-14 26-8 40" />
          <Screen x={20} y={130} w={160} h={60} lines={lines.slice(3)} />
          {verena(40, 20, 0.44)}
        </g>
      );
    case "atm":
      return (
        <g>
          <Floor />
          <rect className="sc sc-f2" x="150" y="20" width="120" height="164" rx="6" />
          <rect className="sc sc-ink" x="166" y="36" width="88" height="62" rx="3" />
          <Screen x={170} y={40} w={80} h={56} lines={lines} dark size={8.5} />
          <rect className="sc sc-paper" x="172" y="108" width="40" height="30" rx="2" />
          <path className="sc" d="M180 116h8M196 116h8M180 124h8M196 124h8M180 132h8M196 132h8M226 112h24M226 124h24M184 156h52" />
          {verena(52, 77, 0.5)}
        </g>
      );
    case "cards":
      return (
        <g>
          <g transform="rotate(-10 120 110)">
            <rect className="sc sc-f2" x="40" y="60" width="150" height="94" rx="10" />
            <rect className="sc sc-f1" x="54" y="82" width="22" height="16" rx="3" />
            <Screen x={52} y={104} w={130} h={44} lines={[lines[0] ?? "DEBIT", lines[1] ?? ""]} size={9} ink />
          </g>
          <g transform="rotate(6 220 110)">
            <rect className="sc-navy-fill sc" x="140" y="56" width="150" height="94" rx="10" />
            <rect className="sc sc-f1" x="154" y="78" width="22" height="16" rx="3" />
            <Screen x={152} y={100} w={130} h={44} lines={[lines[2] ?? "CREDIT", lines[3] ?? ""]} size={9} dark />
          </g>
          <Screen x={20} y={160} w={290} h={36} lines={lines.slice(4)} size={9.5} />
        </g>
      );
    case "documents":
      return (
        <g>
          <rect className="sc sc-f1" x="20" y="132" width="280" height="52" rx="4" />
          <g transform="rotate(-6 90 90)">
            <rect className="sc sc-paper" x="30" y="40" width="110" height="70" rx="6" />
            <rect className="sc sc-f2" x="40" y="54" width="28" height="34" rx="3" />
            <Screen x={74} y={50} w={62} h={56} lines={[lines[0] ?? "ID", lines[1] ?? ""]} size={8} ink />
          </g>
          <g transform="rotate(4 210 80)">
            <rect className="sc sc-paper" x="150" y="26" width="120" height="76" rx="6" />
            <Screen x={158} y={32} w={106} h={66} lines={lines.slice(2, 6)} size={8} ink />
          </g>
          <path className="sc sc-navy-fill" d="M120 110h80l10 24h-100z" />
          <Screen x={30} y={140} w={260} h={40} lines={lines.slice(6)} size={9} />
        </g>
      );
    case "payslip":
    case "receipt":
    case "letter":
      return (
        <g>
          <rect className="sc sc-f1" x="0" y="0" width="320" height="200" opacity="0.45" />
          <path className="sc sc-paper" d={kind === "receipt" ? "M96 8h128v176l-8-6-8 6-8-6-8 6-8-6-8 6-8-6-8 6-8-6-8 6-8-6-8 6-8-6-8 6-8-6-8 6z" : "M70 8h180v184H70z"} />
          {kind !== "receipt" && <rect className="sc-navy-fill" x="70" y="8" width="180" height="5" />}
          <Screen x={kind === "receipt" ? 104 : 80} y={16} w={kind === "receipt" ? 112 : 160} h={164} lines={lines} size={kind === "receipt" ? 8.5 : 9.5} ink />
          {kind === "letter" && <path className="sc" d="M262 150h44v34h-44zM262 150l22 18 22-18" />}
          {kind === "payslip" && verena(262, 112, 0.32)}
        </g>
      );
    case "calculator":
      return (
        <g>
          <rect className="sc sc-paper" x="20" y="20" width="150" height="164" rx="4" />
          <Screen x={30} y={28} w={132} h={150} lines={lines} size={9.5} ink />
          <rect className="sc sc-f2" x="196" y="30" width="100" height="150" rx="10" />
          <rect className="sc sc-ink" x="206" y="42" width="80" height="30" rx="3" />
          <Screen x={208} y={44} w={76} h={26} lines={[lines.at(-1) ?? "0"]} dark size={11} />
          {[0, 1, 2, 3].map((row) => [0, 1, 2].map((col) => (
            <rect key={`${row}-${col}`} className="sc sc-paper" x={208 + col * 26} y={84 + row * 23} width="20" height="16" rx="3" />
          )))}
        </g>
      );
    case "calendar":
      return (
        <g>
          <rect className="sc sc-paper" x="34" y="18" width="160" height="166" rx="6" />
          <rect className="sc-navy-fill" x="34" y="18" width="160" height="24" rx="6" />
          {Array.from({ length: 5 }, (_, row) => Array.from({ length: 7 }, (_, col) => (
            <rect key={`${row}-${col}`} className="sc sc-soft" x={42 + col * 21} y={50 + row * 26} width="17" height="20" rx="2" />
          )))}
          <circle className="sc sc-navy-s" cx="113" cy="86" r="13" strokeWidth="2.4" />
          <circle className="sc sc-navy-s" cx="155" cy="138" r="13" strokeWidth="2.4" />
          <Screen x={204} y={22} w={110} h={160} lines={lines} size={9.5} />
        </g>
      );
    case "insurance":
      return (
        <g>
          <Floor />
          <rect className="sc sc-f1" x="20" y="24" width="84" height="74" rx="4" />
          <path className="sc sc-navy-s" d="M62 36l22 8v16c0 14-10 24-22 28-12-4-22-14-22-28V44z" strokeWidth="2.2" />
          <path className="sc" d="M54 62l6 6 12-12" />
          <Desk x={170} w={136} y={124} />
          <Bust x={262} y={124} tint="#4F6B5A" glasses />
          <rect className="sc sc-paper" x="180" y="108" width="40" height="16" rx="1" />
          <Screen x={120} y={20} w={190} h={70} lines={lines} />
          {verena(118, 81, 0.48)}
        </g>
      );
    case "hospital":
      return (
        <g>
          <Floor />
          <rect className="sc sc-f2" x="16" y="22" width="110" height="26" rx="3" />
          <Screen x={18} y={24} w={106} h={22} lines={[lines[0] ?? "INSURANCE / TPA DESK"]} size={8} center />
          <path className="sc sc-navy-s" d="M146 28h12v12h12v12h-12v12h-12V52h-12V40h12z" strokeWidth="2" />
          <Desk x={16} w={110} y={120} />
          <Bust x={70} y={120} tint="#F6F6F4" hair="#5F6570" bun />
          <path className="sc" d="M196 150h108v12H196zM196 150v-20h28v20M200 162v22M300 162v22" />
          <Screen x={180} y={60} w={130} h={70} lines={lines.slice(1)} />
          {verena(118, 81, 0.48)}
        </g>
      );
    case "home":
      return (
        <g>
          <Floor />
          <rect className="sc sc-f1" x="20" y="22" width="70" height="56" rx="3" />
          <path className="sc" d="M55 22v56M20 50h70" />
          <circle className="sc sc-paper" cx="74" cy="36" r="6" />
          <Desk x={130} w={170} y={130} />
          <rect className="sc sc-ink" x="200" y="92" width="62" height="40" rx="3" />
          <rect className="sc-paper-fill" x="204" y="96" width="54" height="32" />
          <Screen x={205} y={97} w={52} h={30} lines={lines.slice(0, 3)} size={6} ink />
          <path className="sc" d="M150 122h14v8h-14zM164 124c4 0 4 4 0 4" />
          <Screen x={20} y={90} w={110} h={80} lines={lines.slice(3)} size={9} />
          {verena(118, 81, 0.48)}
        </g>
      );
    case "family":
      return (
        <g>
          <Floor />
          <path className="sc sc-f1" d="M70 140h180l-10 10H80z" />
          <path className="sc" d="M90 150v34M230 150v34" />
          <Person x={70} tint="#7A4E3A" scale={0.95} />
          <Person x={250} tint="#5B4B6B" scale={0.92} bun hair="#8C929C" glasses flip />
          <rect className="sc sc-paper" x="130" y="128" width="60" height="12" rx="1" />
          <Screen x={60} y={8} w={200} h={60} lines={lines} center />
          {verena(124, 90, 0.44)}
        </g>
      );
    case "shop":
      return (
        <g>
          <Floor />
          <path className="sc sc-f2" d="M14 30h140l-10 18H24z" />
          <path className="sc" d="M24 48v16M44 48v16M64 48v16M84 48v16M104 48v16M124 48v16M144 48v16" />
          <rect className="sc sc-f1" x="160" y="120" width="146" height="64" />
          <rect className="sc sc-ink" x="250" y="96" width="36" height="24" rx="3" />
          <Screen x={252} y={98} w={32} h={20} lines={[lines[0] ?? "₹"]} dark size={7} center />
          <Bust x={210} y={120} tint="#7A4E3A" />
          <Screen x={14} y={70} w={130} h={100} lines={lines.slice(1)} />
          {verena(130, 77, 0.5)}
        </g>
      );
    case "office":
      return (
        <g>
          <Floor />
          <rect className="sc sc-f1" x="18" y="24" width="96" height="60" rx="3" />
          <Screen x={22} y={28} w={88} h={52} lines={lines.slice(0, 4)} size={8.5} />
          <Desk x={160} w={146} y={128} />
          <rect className="sc sc-ink" x="240" y="94" width="48" height="34" rx="3" />
          <Bust x={206} y={128} tint="#2F3B4C" />
          <Screen x={18} y={96} w={130} h={80} lines={lines.slice(4)} size={9} />
          {verena(118, 81, 0.48)}
        </g>
      );
    case "growth":
      return (
        <g>
          <path className="sc sc-soft" d="M30 170h270M30 170V20" />
          <path className="sc sc-navy-s" d="M30 160l40-14 30 6 40-30 30 10 40-40 30 6 40-60" strokeWidth="2.6" />
          <path className="sc sc-soft" d="M30 160l40-4 30 2 40-4 30 2 40-4 30 2 40-4" strokeDasharray="4 5" />
          <Screen x={40} y={20} w={160} h={90} lines={lines} />
        </g>
      );
    case "jar":
      return (
        <g>
          <Floor />
          <path className="sc sc-paper" d="M60 60h80v10c10 6 14 16 14 30v70c0 8-6 14-14 14H60c-8 0-14-6-14-14v-70c0-14 4-24 14-30z" />
          <path className="sc sc-f2" d="M54 120h92v50c0 8-6 14-14 14H68c-8 0-14-6-14-14z" />
          <rect className="sc sc-f1" x="56" y="50" width="88" height="12" rx="3" />
          <circle className="sc sc-f1" cx="80" cy="140" r="9" /><circle className="sc sc-f1" cx="104" cy="150" r="9" /><circle className="sc sc-f1" cx="122" cy="134" r="9" />
          <Screen x={170} y={30} w={140} h={140} lines={lines} />
          {verena(190, 120, 0.3)}
        </g>
      );
    case "alert":
      return (
        <g>
          <path className="sc sc-f1" d="M90 20 160 150H20z" strokeWidth="2.4" />
          <path className="sc" d="M90 66v40M90 122v4" strokeWidth="5" />
          <Screen x={170} y={20} w={140} h={160} lines={lines} />
        </g>
      );
    case "police":
      return (
        <g>
          <Floor />
          <rect className="sc sc-navy-fill" x="18" y="22" width="120" height="44" rx="4" />
          <Screen x={22} y={26} w={112} h={36} lines={[lines[0] ?? "CYBER HELPLINE 1930"]} dark center size={10} />
          <Desk x={170} w={136} y={128} />
          <Bust x={240} y={128} tint="#5F6570" />
          <Screen x={18} y={80} w={120} h={90} lines={lines.slice(1)} size={9} />
          {verena(130, 81, 0.48)}
        </g>
      );
    case "gold":
      return (
        <g>
          <Floor />
          <rect className="sc sc-f1" x="150" y="120" width="156" height="64" />
          <path className="sc" d="M196 120v-30M176 90h40M176 90l-8 16h16zM216 90l-8 16h16z" />
          <circle className="sc sc-paper" cx="176" cy="110" r="5" />
          <path className="sc sc-navy-s" d="M270 110c-8-8-8-20 2-24 10 4 10 16 2 24z" strokeWidth="2" />
          <Bust x={258} y={86} tint="#7A4E3A" glasses />
          <Screen x={14} y={18} w={130} h={100} lines={lines} />
          {verena(100, 77, 0.5)}
        </g>
      );
    case "house":
      return (
        <g>
          <Floor />
          <path className="sc sc-f1" d="M150 90l70-56 70 56v94H150z" />
          <rect className="sc sc-navy-fill" x="204" y="130" width="32" height="54" />
          <rect className="sc sc-paper" x="166" y="104" width="26" height="22" />
          <rect className="sc sc-paper" x="248" y="104" width="26" height="22" />
          <rect className="sc sc-f2" x="20" y="146" width="44" height="38" />
          <rect className="sc sc-f2" x="30" y="114" width="34" height="32" />
          <Screen x={14} y={14} w={130} h={92} lines={lines} />
          {verena(70, 77, 0.5)}
        </g>
      );
    case "school":
      return (
        <g>
          <Floor />
          <path className="sc sc-f1" d="M170 70l70-36 70 36v114H170z" />
          <circle className="sc sc-paper" cx="240" cy="62" r="10" />
          <path className="sc" d="M240 56v6l4 3" />
          <rect className="sc sc-navy-fill" x="226" y="140" width="28" height="44" />
          <Screen x={14} y={14} w={150} h={90} lines={lines} />
          {verena(40, 94, 0.42)}
          <Person x={130} tint="#4F6B5A" scale={0.62} />
        </g>
      );
    case "garden":
      return (
        <g>
          <Floor />
          <path className="sc" d="M260 184V96" />
          <path className="sc sc-f1" d="M260 104c-34 0-40-36-14-48-6-28 32-40 42-16 26-8 40 26 18 42 8 20-16 30-46 22z" />
          <path className="sc" d="M150 150h80M156 150v34M224 150v34M150 140h80" />
          <circle className="sc sc-paper" cx="40" cy="36" r="14" />
          <Screen x={14} y={60} w={120} h={110} lines={lines} />
          {verena(146, 81, 0.48)}
        </g>
      );
    case "resume":
      return (
        <g>
          <rect className="sc sc-f1" x="0" y="0" width="320" height="200" opacity="0.4" />
          <rect className="sc sc-paper" x="60" y="8" width="170" height="186" rx="3" />
          <rect className="sc-navy-fill" x="60" y="8" width="170" height="34" />
          <rect className="sc sc-f2" x="70" y="14" width="22" height="22" rx="11" />
          <Screen x={98} y={13} w={128} h={26} lines={[lines[0] ?? "VERENA"]} dark size={10} />
          <Screen x={70} y={48} w={152} h={140} lines={lines.slice(1)} size={8.5} ink />
          {verena(240, 112, 0.34)}
        </g>
      );
    case "interview":
      return (
        <g>
          <Floor />
          <Desk x={110} w={150} y={130} />
          <Bust x={210} y={130} tint="#2F3B4C" glasses />
          <Bust x={250} y={130} tint="#5B4B6B" bun />
          <rect className="sc sc-paper" x="150" y="118" width="34" height="12" />
          <Screen x={14} y={14} w={180} h={70} lines={lines} />
          {verena(36, 77, 0.5)}
        </g>
      );
    case "signature":
      return (
        <g>
          <rect className="sc sc-f1" x="0" y="0" width="320" height="200" opacity="0.4" />
          <rect className="sc sc-paper" x="40" y="22" width="180" height="168" rx="3" transform="rotate(-4 130 106)" />
          <rect className="sc sc-paper" x="52" y="14" width="180" height="172" rx="3" />
          <Screen x={62} y={20} w={160} h={130} lines={lines} size={9} ink />
          <path className="sc" d="M70 168h120" />
          <path className="sc sc-navy-s" d="M76 164c10-16 16 6 24-6s12 8 22-2 10 4 18-2" strokeWidth="2" />
          <path className="sc" d="M250 70l28 90-8 4-28-90z" />
          {verena(250, 120, 0.3)}
        </g>
      );
    default:
      return null;
  }
}

/**
 * One illustration. `lines` are the words printed on the screen or paper in the picture. `look` is the Verena the
 * person has grown, so she appears in every scene as she is right now.
 */
export function SceneArt({ kind, lines = [], look, label }: { kind: SceneKind | string; lines?: string[]; look: VerenaLook; label?: string }) {
  const known = (SCENES as readonly string[]).includes(kind) ? (kind as SceneKind) : "home";
  const verena = (x: number, y: number, s: number) => (
    <g transform={`translate(${x} ${y}) scale(${s})`} className="sc-verena">
      <Character look={look} age={look.age} size={200} bare />
    </g>
  );
  return (
    <svg className={`scene scene-${known}`} viewBox="0 0 320 200" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {scene(known, lines, verena)}
    </svg>
  );
}
