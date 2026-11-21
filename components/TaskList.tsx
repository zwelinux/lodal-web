"use client";
import { api } from "@/lib/api";
import { useRef, useState } from "react";
import { parseTasks, serializeTasks, TASK_MIME, type DragPayload, type Task } from "@/lib/tasks";
import AutoTextarea from "./AutoTextarea";

/** One task per line. Tap the circle to mark a task done. Press Enter for the next task. */
export default function TaskList({ value, onChange, label, readOnly = false, drag }: { value: string; onChange: (v: string) => void; label: string; readOnly?: boolean; drag?: { sid: number; date: string } }) {
  const tasks = parseTasks(value);
  const root = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const [dragging, setDragging] = useState<number | null>(null);

  const commit = (next: Task[]) => onChange(serializeTasks(next));
  const focusRow = (i: number) =>
    requestAnimationFrame(() => root.current?.querySelector<HTMLTextAreaElement>(`textarea[data-i="${i}"]`)?.focus());
  const focusDraft = () => requestAnimationFrame(() => root.current?.querySelector<HTMLInputElement>("input.draft")?.focus());

  const edit = (i: number, text: string) => commit(tasks.map((t, j) => (j === i ? { ...t, text } : t)));
  const toggle = (i: number) => {
    if (!tasks[i].done) void api.pulseDone(); // tell Pulse someone finished a task (no text is sent)
    commit(tasks.map((t, j) => (j === i ? { ...t, done: !t.done } : t)));
  };
  const remove = (i: number) => commit(tasks.filter((_, j) => j !== i));

  function addDraft() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    commit([...tasks, { text, done: false }]);
  }

  return (
    <div className="tasks" ref={root} onClick={(e) => !readOnly && e.target === e.currentTarget && focusDraft()}>
      {tasks.map((t, i) => (
        <div key={i} className={`task ${t.done ? "done" : ""} ${drag && !t.done && t.text.trim() ? "hasGrip" : ""} ${dragging === i ? "dragging" : ""}`}>
          <button
            type="button"
            role="checkbox"
            aria-checked={t.done}
            aria-label={t.done ? "Mark as not done" : "Mark as done"}
            className="tick"
            onClick={() => toggle(i)}
          >
            <span>
              {t.done && (
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
          </button>
          {drag && !t.done && t.text.trim() && (
            <span
              className="grip"
              draggable
              title="Drag to another day"
              aria-hidden="true"
              onDragStart={(e) => {
                const payload: DragPayload = { sid: drag.sid, date: drag.date, i, text: t.text };
                e.dataTransfer.setData(TASK_MIME, JSON.stringify(payload));
                e.dataTransfer.effectAllowed = "move";
                const row = (e.currentTarget as HTMLElement).closest(".task");
                if (row) e.dataTransfer.setDragImage(row, 12, 14);
                setDragging(i);
              }}
              onDragEnd={() => setDragging(null)}
            >
              ⋮⋮
            </span>
          )}
          <AutoTextarea
            data-i={i}
            readOnly={readOnly}
            value={t.text}
            aria-label={`${label}, task ${i + 1}`}
            onChange={(e) => edit(i, e.target.value)}
            onKeyDown={(e) => {
              if (readOnly) return;
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (i === tasks.length - 1) focusDraft();
                else {
                  commit([...tasks.slice(0, i + 1), { text: "", done: false }, ...tasks.slice(i + 1)]);
                  focusRow(i + 1);
                }
              } else if (e.key === "Backspace" && !t.text) {
                e.preventDefault();
                remove(i);
                if (i > 0) focusRow(i - 1);
                else focusDraft();
              }
            }}
            onBlur={() => !readOnly && !t.text.trim() && remove(i)}
          />
        </div>
      ))}
      {!readOnly && <div className="task newTask">
        <span className="plus" aria-hidden="true">
          +
        </span>
        <input
          className="draft"
          value={draft}
          placeholder={tasks.length ? "Add another task" : "Add a task"}
          aria-label={`${label}, add a task`}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDraft())}
          onBlur={addDraft}
        />
      </div>}
    </div>
  );
}
