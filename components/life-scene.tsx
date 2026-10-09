"use client";

import { useEffect, useState, type CSSProperties } from "react";

/**
 * Verena's world, alive. A layered, animated setting for each place in her story: the sky outside follows the real
 * time of day, clouds drift, steam rises, a bank token display ticks over, the city lights come on at night.
 * Everything is drawn in code, so it stays sharp at any size and costs nothing to load. Motion stops when the
 * person asks for reduced motion.
 */

type Phase = "dawn" | "day" | "dusk" | "night";

const SKY: Record<Phase, [string, string, string]> = {
  dawn: ["#f6b38a", "#c8a6d8", "#6c86c9"],
  day: ["#bfe0ff", "#8cc2f5", "#4f8fe0"],
  dusk: ["#f39a6b", "#b15d8a", "#2d3a7a"],
  night: ["#1b2a5e", "#0f1a42", "#070d24"],
};

function phaseNow(): Phase {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night";
}

function useNow(every: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), every);
    return () => window.clearInterval(timer);
  }, [every]);
  return now;
}

/** A sky seen through a window or over the city: gradient, sun or moon, drifting clouds, stars at night. */
function Sky({ phase, x, y, w, h, id }: { phase: Phase; x: number; y: number; w: number; h: number; id: string }) {
  const [top, mid, low] = SKY[phase];
  const night = phase === "night";
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={low} /><stop offset="0.55" stopColor={mid} /><stop offset="1" stopColor={top} />
        </linearGradient>
        <clipPath id={`${id}-clip`}><rect x={x} y={y} width={w} height={h} rx="4" /></clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect x={x} y={y} width={w} height={h} fill={`url(#${id}-sky)`} />
        {night ? (
          <>
            {[0.12, 0.3, 0.55, 0.72, 0.88, 0.2, 0.64, 0.4].map((fx, i) => (
              <circle key={i} className="ls-twinkle" style={{ "--d": `${i * 0.6}s` } as CSSProperties} cx={x + fx * w} cy={y + ((i * 37) % 50) / 100 * h + 6} r={i % 3 === 0 ? 1.4 : 0.9} fill="#fff" />
            ))}
            <circle cx={x + w * 0.78} cy={y + h * 0.28} r="9" fill="#f4f1e0" />
            <circle cx={x + w * 0.78 + 4} cy={y + h * 0.28 - 3} r="8" fill={low} />
          </>
        ) : (
          <circle cx={x + w * 0.78} cy={y + h * (phase === "day" ? 0.25 : 0.62)} r={phase === "day" ? 11 : 14} fill={phase === "day" ? "#fff6c9" : "#ffd29a"} className="ls-sun" />
        )}
        {!night && [0, 1, 2].map((i) => (
          <g key={i} className="ls-cloud" style={{ "--d": `${-i * 14}s`, "--t": `${38 + i * 9}s` } as CSSProperties}>
            <ellipse cx={x + 20 + i * 70} cy={y + 18 + i * 9} rx="16" ry="6" fill="#fff" opacity={phase === "day" ? 0.85 : 0.5} />
            <ellipse cx={x + 30 + i * 70} cy={y + 14 + i * 9} rx="10" ry="6" fill="#fff" opacity={phase === "day" ? 0.85 : 0.5} />
          </g>
        ))}
      </g>
    </g>
  );
}

/** A wall clock that tells the real time. */
function Clock({ x, y, now }: { x: number; y: number; now: Date }) {
  const h = (now.getHours() % 12) * 30 + now.getMinutes() * 0.5;
  const m = now.getMinutes() * 6;
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="13" fill="#f7f4ec" stroke="#2a3150" strokeWidth="2" />
      <line x1="0" y1="0" x2="0" y2="-6.5" stroke="#2a3150" strokeWidth="2" strokeLinecap="round" transform={`rotate(${h})`} />
      <line x1="0" y1="0" x2="0" y2="-10" stroke="#2a3150" strokeWidth="1.4" strokeLinecap="round" transform={`rotate(${m})`} />
      <line className="ls-second" x1="0" y1="2" x2="0" y2="-10.5" stroke="#d6453d" strokeWidth="0.8" style={{ "--s": `${now.getSeconds() * 6}deg` } as CSSProperties} />
      <circle r="1.3" fill="#2a3150" />
    </g>
  );
}

function Steam({ x, y }: { x: number; y: number }) {
  return (
    <g fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.7">
      {[0, 1, 2].map((i) => <path key={i} className="ls-steam" style={{ "--d": `${i * 0.9}s` } as CSSProperties} d={`M${x + i * 4} ${y} q-3 -6 0 -11 q3 -5 0 -10`} />)}
    </g>
  );
}

function Plant({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="ls-sway" style={{ transformOrigin: "0px 0px" }}>
        <path d="M0 0 C-14 -10 -16 -26 -6 -34 C-4 -22 -2 -12 0 0Z" fill="#3f8a5a" />
        <path d="M0 0 C12 -12 18 -26 8 -36 C4 -24 2 -12 0 0Z" fill="#4fa36b" />
        <path d="M0 0 C-2 -16 0 -30 2 -42 C6 -30 4 -14 0 0Z" fill="#5bb377" />
      </g>
      <path d="M-9 0h18l-3 16h-12z" fill="#c4775a" />
    </g>
  );
}

function Lamp({ x, y, on }: { x: number; y: number; on: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {on && <ellipse cx="0" cy="40" rx="46" ry="26" fill="#ffd89a" opacity="0.18" className="ls-glow" />}
      <path d="M-12 0h24l-6 -16h-12z" fill={on ? "#ffd27a" : "#d9c9a8"} />
      <path d="M0 0v40M-10 40h20" stroke="#3a3f55" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  );
}

function Window({ phase, x, y, w, h, id }: { phase: Phase; x: number; y: number; w: number; h: number; id: string }) {
  return (
    <g>
      <rect x={x - 5} y={y - 5} width={w + 10} height={h + 10} rx="6" fill="#e9e4da" />
      <Sky phase={phase} x={x} y={y} w={w} h={h} id={id} />
      <path d={`M${x + w / 2} ${y}v${h}M${x} ${y + h / 2}h${w}`} stroke="#e9e4da" strokeWidth="4" />
      <rect x={x - 8} y={y + h + 3} width={w + 16} height="6" rx="2" fill="#d8d1c4" />
    </g>
  );
}

function City({ phase, y, w }: { phase: Phase; y: number; w: number }) {
  const lit = phase === "night" || phase === "dusk";
  const towers = [[10, 70], [44, 110], [80, 60], [112, 130], [150, 90], [190, 150], [232, 80], [266, 120], [304, 70], [336, 100], [372, 60]];
  return (
    <g>
      {towers.map(([tx, th], i) => (
        <g key={i}>
          <rect x={tx} y={y - th} width="30" height={th} fill={lit ? "#141c3d" : "#5c6f99"} opacity={lit ? 1 : 0.75} />
          {Array.from({ length: Math.floor(th / 16) }).map((_, row) => [0, 1, 2].map((col) => (
            <rect key={`${row}-${col}`} className={lit ? "ls-twinkle" : undefined} style={{ "--d": `${(i * 3 + row + col) % 7}s` } as CSSProperties} x={tx + 4 + col * 8} y={y - th + 6 + row * 16} width="5" height="7" fill={lit ? ((i + row + col) % 3 === 0 ? "#ffd27a" : "#2a355e") : "#9fb3d9"} />
          )))}
        </g>
      ))}
      <rect x="0" y={y} width={w} height="4" fill={lit ? "#0b1230" : "#4a5a80"} />
    </g>
  );
}

function BankToken({ x, y }: { x: number; y: number }) {
  const now = useNow(4000);
  const n = 40 + Math.floor(now.getTime() / 4000) % 50;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="70" height="30" rx="4" fill="#0d1226" stroke="#3a4670" />
      <text x="35" y="20" textAnchor="middle" fontFamily="ui-monospace, Menlo, monospace" fontSize="15" fontWeight="700" fill="#ff5a4e" className="ls-blink">A-{String(n).padStart(3, "0")}</text>
    </g>
  );
}

/** Each place, built from its own furniture and light. Floor line sits at y=210 of a 400x260 frame. */
function Interior({ place, phase, now, id }: { place: string; phase: Phase; now: Date; id: string }) {
  const dark = phase === "night";
  const wall = { room: ["#f1e7dc", "#e4d6c6"], office: ["#e8edf5", "#d6dfec"], bank: ["#efe9df", "#dcd2c2"], cafe: ["#f2e3d1", "#e1c9ad"], home: ["#efe5da", "#dfd0bf"] }[place] ?? ["#f1e7dc", "#e4d6c6"];
  const floor = { office: "#b9c3d4", bank: "#cdbfa8", cafe: "#a87b57", home: "#b98f6a", room: "#c69f7c" }[place] ?? "#c69f7c";
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={wall[0]} /><stop offset="1" stopColor={wall[1]} /></linearGradient>
        <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={floor} /><stop offset="1" stopColor="#5b4433" /></linearGradient>
      </defs>
      <rect width="400" height="210" fill={`url(#${id}-wall)`} />
      <rect y="210" width="400" height="50" fill={`url(#${id}-floor)`} />
      <rect y="206" width="400" height="5" fill="#00000018" />
      {place === "office" && (
        <>
          <rect x="16" y="20" width="368" height="118" rx="6" fill="#dbe3ef" />
          <Sky phase={phase} x={22} y={26} w={356} h={106} id={`${id}-o`} />
          <g transform="translate(0 -4)"><City phase={phase} y={136} w={400} /></g>
          <path d="M22 79h356M200 26v106" stroke="#dbe3ef" strokeWidth="5" />
          <rect x="20" y="166" width="120" height="8" rx="2" fill="#7c8aa6" />
          <rect x="46" y="128" width="58" height="38" rx="3" fill="#1d2440" />
          <rect x="50" y="132" width="50" height="30" rx="2" fill="#3a5ce0" className="ls-screen" />
          <path d="M54 140h30M54 146h40M54 152h24" stroke="#cfe0ff" strokeWidth="2" className="ls-type" />
          <rect x="300" y="170" width="80" height="8" rx="2" fill="#7c8aa6" />
          <Plant x={366} y={170} />
          <Clock x={200} y={156} now={now} />
        </>
      )}
      {place === "bank" && (
        <>
          <rect x="0" y="0" width="400" height="16" fill="#cfc2ac" />
          {[60, 200, 340].map((lx) => <g key={lx}><rect x={lx - 14} y="16" width="28" height="4" fill="#fff8e2" /><ellipse cx={lx} cy="30" rx="40" ry="14" fill="#fff6d6" opacity="0.25" /></g>)}
          <BankToken x={165} y={34} />
          <text x="200" y="84" textAnchor="middle" fontSize="9" fill="#6b5b45" fontWeight="700" letterSpacing="2">PLEASE WAIT FOR YOUR TOKEN</text>
          <rect x="20" y="140" width="360" height="70" fill="#8a6a4c" />
          <rect x="20" y="136" width="360" height="8" fill="#6f5238" />
          <rect x="40" y="96" width="320" height="40" fill="#cfe6f2" opacity="0.35" stroke="#b9cfdc" />
          {[120, 200, 280].map((gx) => <path key={gx} d={`M${gx} 96v40`} stroke="#b9cfdc" strokeWidth="2" />)}
          <rect x="300" y="100" width="40" height="30" rx="3" fill="#e9eef5" />
          <Clock x={60} y={60} now={now} />
          <rect x="330" y="40" width="44" height="34" rx="2" fill="#f7f1e3" stroke="#cdbfa8" />
          <path d="M336 50h32M336 57h26M336 64h30" stroke="#a8977a" strokeWidth="2" />
        </>
      )}
      {place === "cafe" && (
        <>
          <Window phase={phase} x={24} y={30} w={130} h={90} id={`${id}-w`} />
          {[220, 300, 370].map((hx, i) => (
            <g key={hx} className="ls-swing" style={{ transformOrigin: `${hx}px 0px`, "--d": `${i * 0.7}s` } as CSSProperties}>
              <path d={`M${hx} 0v34`} stroke="#3a2f2a" strokeWidth="1.5" />
              <path d={`M${hx - 12} 46h24l-5 -12h-14z`} fill="#2f3b5c" />
              <ellipse cx={hx} cy="58" rx="22" ry="12" fill="#ffd89a" opacity={dark ? 0.35 : 0.18} />
            </g>
          ))}
          <rect x="196" y="70" width="180" height="58" rx="4" fill="#2c2420" />
          <path d="M206 84h70M206 96h90M206 108h60M300 84h60M300 96h50" stroke="#f2e3d1" strokeWidth="2" opacity="0.8" />
          <rect x="180" y="160" width="220" height="50" fill="#6b4a36" />
          <rect x="180" y="154" width="220" height="8" rx="2" fill="#4f3627" />
          <rect x="300" y="122" width="44" height="32" rx="4" fill="#b8bec9" /><rect x="306" y="128" width="32" height="14" rx="2" fill="#2f3b5c" />
          <path d="M250 150h16v-12h-16zM266 142h4a3 3 0 0 1 0 6h-4" fill="#f7f4ec" stroke="#cfc6b5" />
          <Steam x={253} y={134} />
          <Plant x={176} y={194} />
        </>
      )}
      {(place === "room" || place === "home" || !["office", "bank", "cafe", "rooftop", "garden"].includes(place)) && (
        <>
          <Window phase={phase} x={place === "home" ? 260 : 36} y={34} w={104} h={84} id={`${id}-w`} />
          <Clock x={place === "home" ? 220 : 186} y={52} now={now} />
          {place === "home" ? (
            <>
              <rect x="20" y="40" width="40" height="30" rx="2" fill="#c9b79e" /><rect x="24" y="44" width="32" height="22" fill="#8fb0d8" />
              <rect x="70" y="48" width="30" height="24" rx="2" fill="#c9b79e" /><rect x="74" y="52" width="22" height="16" fill="#d8b38f" />
              <path d="M24 196v-34a12 12 0 0 1 12 -12h120a12 12 0 0 1 12 12v34" fill="#3b5a9a" />
              <rect x="16" y="176" width="160" height="26" rx="8" fill="#2f4a82" />
              <rect x="34" y="162" width="40" height="20" rx="6" fill="#e8b8a0" /><rect x="118" y="162" width="40" height="20" rx="6" fill="#f2d49b" />
              <Lamp x={208} y={150} on={dark || phase === "dusk"} />
              <Plant x={370} y={194} />
              <rect x="240" y="176" width="70" height="8" rx="2" fill="#7a5a40" /><path d="M248 184v20M302 184v20" stroke="#7a5a40" strokeWidth="4" />
              <path d="M262 176h14v-10h-14zM276 170h3a3 3 0 0 1 0 6h-3" fill="#f7f4ec" stroke="#cfc6b5" />
              <Steam x={265} y={160} />
            </>
          ) : (
            <>
              <rect x="20" y="150" width="140" height="10" rx="2" fill="#7a5a40" /><path d="M30 160v48M150 160v48" stroke="#7a5a40" strokeWidth="5" />
              <rect x="52" y="122" width="56" height="28" rx="3" fill="#1d2440" /><rect x="55" y="125" width="50" height="22" rx="2" fill="#3a5ce0" className="ls-screen" />
              <Lamp x={140} y={110} on={dark || phase === "dusk"} />
              <rect x="250" y="60" width="44" height="58" rx="2" fill="#e0a77f" /><path d="M256 72h32M256 82h24M256 92h28" stroke="#fff" strokeWidth="2" opacity="0.8" />
              <rect x="300" y="60" width="78" height="110" fill="#8a6a4c" />
              {[0, 1, 2].map((r) => <g key={r}><rect x="300" y={60 + r * 36} width="78" height="4" fill="#6f5238" />{[0, 1, 2, 3, 4].map((b) => <rect key={b} x={306 + b * 13} y={68 + r * 36} width="9" height="24" fill={["#3a5ce0", "#c4775a", "#4fa36b", "#f2d49b", "#8a6bd8"][(b + r) % 5]} />)}</g>)}
              <path d="M220 210v-30a10 10 0 0 1 10 -10h150a10 10 0 0 1 10 10v30" fill="#e6dccd" />
              <rect x="216" y="192" width="180" height="18" rx="4" fill="#3b5a9a" />
            </>
          )}
        </>
      )}
    </g>
  );
}

function Outdoors({ place, phase, id }: { place: string; phase: Phase; id: string }) {
  const night = phase === "night";
  return (
    <g>
      <Sky phase={phase} x={0} y={0} w={400} h={260} id={`${id}-s`} />
      {place === "rooftop" ? (
        <>
          <g opacity="0.55" transform="translate(0 -30) scale(1 0.8)"><City phase={phase} y={230} w={400} /></g>
          <City phase={phase} y={196} w={400} />
          <path d="M0 26 Q100 50 200 30 T400 34" fill="none" stroke="#2a2f45" strokeWidth="1" />
          {[30, 70, 110, 150, 190, 230, 270, 310, 350].map((bx, i) => <circle key={bx} className="ls-twinkle" style={{ "--d": `${i * 0.4}s` } as CSSProperties} cx={bx} cy={26 + Math.sin(i) * 6 + 8} r="3" fill={night ? "#ffd27a" : "#fff3c4"} />)}
          <rect y="200" width="400" height="60" fill={night ? "#1d2238" : "#7d8597"} />
          <rect y="196" width="400" height="6" fill={night ? "#2c3350" : "#9aa2b4"} />
          <rect x="320" y="150" width="50" height="46" rx="4" fill={night ? "#2c3350" : "#b8bfcc"} />
        </>
      ) : (
        <>
          <ellipse cx="200" cy="300" rx="320" ry="110" fill={night ? "#1f3a2c" : "#7fbf7a"} />
          <ellipse cx="60" cy="290" rx="200" ry="90" fill={night ? "#173024" : "#6cae6a"} />
          {[[60, 180, 1], [330, 170, 1.2], [250, 196, 0.7]].map(([tx, ty, s], i) => (
            <g key={i} transform={`translate(${tx} ${ty}) scale(${s})`}>
              <rect x="-4" y="-10" width="8" height="40" fill="#6b4a36" />
              <g className="ls-sway" style={{ transformOrigin: "0px 0px", "--d": `${i * 0.8}s` } as CSSProperties}>
                <circle cx="0" cy="-30" r="26" fill={night ? "#1f4a33" : "#4f9a5e"} /><circle cx="-16" cy="-18" r="18" fill={night ? "#1a3f2c" : "#448a52"} /><circle cx="16" cy="-20" r="18" fill={night ? "#245539" : "#5aab68"} />
              </g>
            </g>
          ))}
          <path d="M150 210h100M156 210v22M244 210v22M150 198h100" stroke="#6b4a36" strokeWidth="6" strokeLinecap="round" />
          {!night && [0, 1].map((i) => (
            <g key={i} className="ls-fly" style={{ "--d": `${i * 3}s` } as CSSProperties}>
              <path d={`M${120 + i * 140} ${120 - i * 20} q-6 -6 -8 0 q6 4 8 0 q2 -6 8 0 q-6 4 -8 0`} fill={i ? "#f2b84b" : "#e86a8a"} />
            </g>
          ))}
        </>
      )}
    </g>
  );
}

/** Soft motes of light drifting through the scene. */
function Motes() {
  return (
    <g fill="#fff">
      {Array.from({ length: 10 }).map((_, i) => (
        <circle key={i} className="ls-mote" style={{ "--d": `${(i * 1.7) % 9}s`, "--x": `${(i * 37) % 360 + 20}px` } as CSSProperties} cx="0" cy="250" r={i % 3 ? 1 : 1.6} opacity="0" />
      ))}
    </g>
  );
}

export function LifeScene({ place, beat = 0 }: { place: string; beat?: number }) {
  const [phase, setPhase] = useState<Phase>("day");
  useEffect(() => setPhase(phaseNow()), []);
  const now = useNow(30000);
  const id = `ls-${place}`;
  const outdoors = place === "rooftop" || place === "garden";
  return (
    <div className={`life-scene ${phase}`} aria-hidden>
      <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" className="ls-svg" style={{ "--beat": beat } as CSSProperties}>
        <g className="ls-world">{outdoors ? <Outdoors place={place} phase={phase} id={id} /> : <Interior place={place} phase={phase} now={now} id={id} />}</g>
        <Motes />
        {phase === "night" && !outdoors && <rect width="400" height="260" fill="#0a1030" opacity="0.38" />}
        {phase === "dusk" && <rect width="400" height="260" fill="#ff8a4c" opacity="0.08" />}
      </svg>
      <div className="ls-vignette" />
    </div>
  );
}
