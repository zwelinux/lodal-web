"use client";
import { useMemo } from "react";
import { LAND, MAP } from "@/lib/worldDots";
import type { PulseDot } from "@/lib/api";

const U = 5; // drawing units per map cell
const W = MAP.cols * U;
const H = MAP.rows * U;
const x = (lon: number) => ((lon + 180) / 360) * W;
const y = (lat: number) => ((MAP.latTop - lat) / (MAP.rows * MAP.step)) * H;

/** A dotted world. Every person who is here right now is a softly pulsing light. Lights with a name can be opened. */
export default function WorldMap({ dots, selected, onSelect }: { dots: PulseDot[]; selected: number | null; onSelect: (key: number | null) => void }) {
  const land = useMemo(() => {
    let d = "";
    for (let i = 0; i < LAND.length; i += 2) d += `M${LAND[i] * U + U / 2} ${LAND[i + 1] * U + U / 2}h0`;
    return d;
  }, []);

  return (
    <svg className="worldMap" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Map of people planning right now" onClick={() => onSelect(null)}>
      <path d={land} className="landDots" />
      {dots.map((d, i) => {
        const open = !!d.nickname;
        const cx = x(d.lon);
        const cy = y(d.lat);
        const label = d.mine ? "You" : open ? `${d.nickname}` : "Someone planning here";
        return (
          <g
            key={d.key}
            className={`light ${d.active ? "on" : "rest"} ${d.mine ? "me" : ""} ${open ? "open" : ""} ${selected === d.key ? "sel" : ""}`}
            transform={`translate(${cx} ${cy})`}
            style={{ animationDelay: `${(i * 0.37) % 2.4}s` }}
            onClick={(e) => {
              e.stopPropagation();
              if (open) onSelect(selected === d.key ? null : d.key);
            }}
            role={open ? "button" : undefined}
            tabIndex={open ? 0 : undefined}
            aria-label={label}
            onKeyDown={(e) => open && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(selected === d.key ? null : d.key))}
          >
            <title>{label}</title>
            {d.active && <circle className="ring" r="3" />}
            <circle className="core" r={d.mine ? 3.4 : 2.8} />
            {open && <circle className="hit" r="9" />}
          </g>
        );
      })}
    </svg>
  );
}

export const mapPos = { x, y, W, H };
