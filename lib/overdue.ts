import type { AssignedTicket } from "./api";
import { addDays } from "./dates";
import { parseTasks, serializeTasks } from "./tasks";

/** An unfinished task from an earlier day. Either a line in your own planner, or a project ticket given to you. */
export type OverdueItem =
  | { kind: "task"; sid: number; date: string; i: number; text: string }
  | { kind: "ticket"; id: number; project: string; date: string; text: string };

/** Everything unfinished from the last `lookBack` days before `today`, oldest first. */
export function findOverdue(cells: Record<string, string>, assigned: AssignedTicket[], today: string, lookBack = 14): OverdueItem[] {
  const from = addDays(today, -lookBack);
  const out: OverdueItem[] = [];
  for (const [key, value] of Object.entries(cells)) {
    const [sid, date] = key.split("|");
    if (date >= today || date < from) continue;
    parseTasks(value).forEach((t, i) => {
      if (!t.done && t.text.trim()) out.push({ kind: "task", sid: Number(sid), date, i, text: t.text });
    });
  }
  for (const a of assigned) {
    if (a.date >= today || a.date < from || a.done) continue;
    out.push({ kind: "ticket", id: a.id, project: a.project_name, date: a.date, text: a.title });
  }
  return out.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
}

/**
 * Work out the new text of every cell touched when these tasks move to today (same subject).
 * Returns { "subjectId|date": newText }.
 */
export function planRollover(cells: Record<string, string>, items: OverdueItem[], today: string): Record<string, string> {
  const remove = new Map<string, Set<number>>();
  const add = new Map<number, string[]>();
  for (const it of items) {
    if (it.kind !== "task") continue;
    const k = `${it.sid}|${it.date}`;
    if (!remove.has(k)) remove.set(k, new Set());
    remove.get(k)!.add(it.i);
    add.set(it.sid, [...(add.get(it.sid) ?? []), it.text]);
  }
  const out: Record<string, string> = {};
  for (const [k, idx] of remove) out[k] = serializeTasks(parseTasks(cells[k] ?? "").filter((_, i) => !idx.has(i)));
  for (const [sid, texts] of add) {
    const k = `${sid}|${today}`;
    const tasks = parseTasks(out[k] ?? cells[k] ?? "");
    for (const text of texts) tasks.push({ text, done: false });
    out[k] = serializeTasks(tasks);
  }
  return out;
}

/** Mark one line of a cell as done. */
export function completeTask(value: string, i: number): string {
  return serializeTasks(parseTasks(value).map((t, j) => (j === i ? { ...t, done: true } : t)));
}
