"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { addDays, fromISO, toISO, today, weekStart } from "@/lib/dates";
import { useDismiss } from "@/lib/useDismiss";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const firstOfMonth = (iso: string) => iso.slice(0, 8) + "01";
function shiftMonth(first: string, by: number): string {
  const d = fromISO(first);
  d.setMonth(d.getMonth() + by, 1);
  return toISO(d);
}
const nice = (iso: string) => fromISO(iso).toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** Lodal's own calendar: same colours and fonts as the rest of the app, Monday first. */
export default function DatePicker({ value, onChange, label }: { value: string; onChange: (d: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(firstOfMonth(value)); // first day of the month being shown
  const [focus, setFocus] = useState(value); // the day the keyboard is on
  const root = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close);

  // put keyboard focus on the chosen day whenever the popup opens or the arrow keys move it
  useEffect(() => {
    if (open) root.current?.querySelector<HTMLButtonElement>(`button[data-d="${focus}"]`)?.focus();
  }, [open, focus, month]);

  const t = today();
  const start = weekStart(month);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const d0 = fromISO(month);

  function toggle() {
    if (!open) {
      setMonth(firstOfMonth(value));
      setFocus(value);
    }
    setOpen(!open);
  }
  function pick(d: string) {
    onChange(d);
    setOpen(false);
  }
  function move(d: string) {
    setFocus(d);
    if (firstOfMonth(d) !== month) setMonth(firstOfMonth(d));
  }
  function onKey(e: React.KeyboardEvent) {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key in step) {
      e.preventDefault();
      move(addDays(focus, step[e.key]));
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      const next = shiftMonth(month, e.key === "PageUp" ? -1 : 1);
      setMonth(next);
      setFocus(next);
    }
  }

  return (
    <div className="menuWrap datePickWrap" ref={root}>
      <button className="datePick" onClick={toggle} aria-haspopup="dialog" aria-expanded={open} title="Pick a date">
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <rect x="3" y="4.5" width="14" height="12.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3 8.5h14M7 2.8v3.2M13 2.8v3.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span>{label}</span>
        <i aria-hidden="true">▾</i>
      </button>
      {open && (
        <div className="calendar" role="dialog" aria-label="Choose a date" onKeyDown={onKey}>
          <div className="calHead">
            <button className="calNav" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>
              ‹
            </button>
            <b aria-live="polite">
              {MONTHS[d0.getMonth()]} {d0.getFullYear()}
            </b>
            <button className="calNav" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>
              ›
            </button>
          </div>
          <div className="calWeek" aria-hidden="true">
            {WEEKDAYS.map((w) => (
              <span key={w}>{w[0]}</span>
            ))}
          </div>
          <div className="calGrid" role="grid">
            {days.map((d) => {
              const inMonth = d.slice(0, 7) === month.slice(0, 7);
              return (
                <button
                  key={d}
                  data-d={d}
                  tabIndex={d === focus ? 0 : -1}
                  className={`calDay ${d === value ? "sel" : ""} ${d === t ? "now" : ""} ${inMonth ? "" : "out"}`}
                  aria-label={nice(d)}
                  aria-pressed={d === value}
                  onClick={() => pick(d)}
                >
                  {fromISO(d).getDate()}
                </button>
              );
            })}
          </div>
          <div className="calFoot">
            <button className="linkBtn" onClick={() => pick(t)}>
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
