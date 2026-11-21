"use client";
import { useState } from "react";
import { dayNum, monthShort, weekdayShort } from "@/lib/dates";
import type { OverdueItem } from "@/lib/overdue";

const SHOW = 5;

/** Unfinished tasks from earlier days. One tap moves a task to today, or ticks it done. */
export default function OverdueCard({
  items,
  subjectName,
  onMove,
  onDone,
  onMoveAll,
}: {
  items: OverdueItem[];
  subjectName: (sid: number) => string;
  onMove: (item: OverdueItem) => void;
  onDone: (item: OverdueItem) => void;
  onMoveAll: () => void;
}) {
  const [all, setAll] = useState(false);
  if (items.length === 0) return null;
  const shown = all ? items : items.slice(0, SHOW);
  return (
    <section className="overdue" aria-label="Overdue tasks">
      <div className="overdueHead">
        <b>Overdue</b>
        <span className="overdueCount">{items.length}</span>
        <span className="grow" />
        <button className="btn" onClick={onMoveAll}>
          Move all to today
        </button>
      </div>
      <ul>
        {shown.map((it) => {
          const key = it.kind === "task" ? `t${it.sid}|${it.date}|${it.i}` : `k${it.id}`;
          const where = it.kind === "task" ? subjectName(it.sid) : it.project;
          return (
            <li key={key}>
              <button type="button" role="checkbox" aria-checked={false} aria-label="Mark as done" className="tick" onClick={() => onDone(it)}>
                <span />
              </button>
              <span className="overdueText">
                {it.text}
                <small>
                  {where} · from {weekdayShort(it.date)} {dayNum(it.date)} {monthShort(it.date)}
                </small>
              </span>
              <button className="btn overdueMove" onClick={() => onMove(it)} title="Move this task to today">
                Move to today
              </button>
            </li>
          );
        })}
      </ul>
      {items.length > SHOW && (
        <button className="linkBtn" onClick={() => setAll(!all)}>
          {all ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}
    </section>
  );
}
