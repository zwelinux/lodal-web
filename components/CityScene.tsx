"use client";
import { CITY, SCENE, WIN, windowAt, type Building } from "@/lib/city";
import type { PulseLight } from "@/lib/api";

function windowsPath(b: Building): string {
  return b.wins.map((w) => `M${w.x} ${w.y}h${WIN.w}v${WIN.h}h-${WIN.w}z`).join("");
}

function Roof({ b }: { b: Building }) {
  const cx = b.x + b.w / 2;
  if (b.roof === "antenna") return <path d={`M${cx} ${b.y}v-14M${cx - 3} ${b.y - 8}h6`} className="cityLine" />;
  if (b.roof === "tank") return <path d={`M${b.x + 8} ${b.y}v-6h14v6M${b.x + 10} ${b.y - 6}l5-4 5 4`} className="cityLine" />;
  if (b.roof === "step") return <rect x={b.x + b.w * 0.25} y={b.y - 9} width={b.w * 0.5} height={9} className="cityBody" />;
  return null;
}

/** A night skyline. A lit window is a person who is here right now. Windows with a name can be opened. */
export default function CityScene({ lights, selected, onSelect }: { lights: PulseLight[]; selected: number | null; onSelect: (slot: number | null) => void }) {
  return (
    <svg className="cityScene" viewBox={`0 0 ${SCENE.w} ${SCENE.h}`} role="img" aria-label="A city at night. Each lit window is a person planning right now." onClick={() => onSelect(null)}>
      <defs>
        <linearGradient id="citySky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="skyTop" />
          <stop offset="1" className="skyLow" />
        </linearGradient>
      </defs>
      <rect width={SCENE.w} height={SCENE.h} fill="url(#citySky)" />
      {CITY.stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} className="cityStar" opacity={s.o} />
      ))}
      <circle cx="610" cy="48" r="16" className="cityMoon" />
      {CITY.back.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} className="cityBack" />
      ))}
      {CITY.front.map((b, i) => (
        <g key={i}>
          <Roof b={b} />
          <rect x={b.x} y={b.y} width={b.w} height={b.h} className="cityBody" />
          <path d={windowsPath(b)} className="winOff" />
        </g>
      ))}
      <rect x="0" y={SCENE.ground} width={SCENE.w} height={SCENE.h - SCENE.ground} className="cityGround" />
      {CITY.lamps.map((x, i) => (
        <g key={i}>
          <path d={`M${x} ${SCENE.ground}v-14`} className="cityLine" />
          <circle cx={x} cy={SCENE.ground - 15} r="2.2" className="winOn" />
        </g>
      ))}
      {lights.map((l, i) => {
        const w = windowAt(l.slot);
        const open = !!l.nickname;
        const label = l.mine ? "You" : open ? (l.nickname as string) : "Someone is planning here";
        const pick = () => onSelect(selected === l.slot ? null : l.slot);
        return (
          <g
            key={l.slot}
            className={`win ${l.active ? "on" : "off"} ${l.mine ? "me" : ""} ${open ? "open" : ""} ${selected === l.slot ? "sel" : ""}`}
            style={{ animationDelay: `${(i * 0.53) % 3}s` }}
            onClick={(e) => {
              e.stopPropagation();
              if (open) pick();
            }}
            role={open ? "button" : undefined}
            tabIndex={open ? 0 : undefined}
            aria-label={label}
            onKeyDown={(e) => open && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), pick())}
          >
            <title>{label}</title>
            {l.active && <rect className="glow" x={w.x - 3} y={w.y - 3} width={WIN.w + 6} height={WIN.h + 6} rx="2" />}
            <rect className="pane" x={w.x} y={w.y} width={WIN.w} height={WIN.h} rx="1" />
            {open && <rect className="hit" x={w.x - 5} y={w.y - 5} width={WIN.w + 10} height={WIN.h + 10} />}
          </g>
        );
      })}
    </svg>
  );
}

export const scenePos = (slot: number) => {
  const w = windowAt(slot);
  return { x: (w.x + WIN.w / 2) / SCENE.w, y: w.y / SCENE.h };
};
