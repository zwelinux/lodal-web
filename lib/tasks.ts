/**
 * A cell is plain text, one task per line. A finished task starts with "[x] ".
 * Older cells written as free text still work: every line is simply a task that is not done yet.
 */
export type Task = { text: string; done: boolean };

const DONE = /^\[x\]\s?/i;

export function parseTasks(value: string): Task[] {
  if (!value) return [];
  const lines = value.split("\n");
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  return lines.map((l) => (DONE.test(l) ? { text: l.replace(DONE, ""), done: true } : { text: l, done: false }));
}

export const serializeTasks = (tasks: Task[]) => tasks.map((t) => (t.done ? "[x] " : "") + t.text).join("\n");

export function countTasks(value: string): { total: number; done: number } {
  const tasks = parseTasks(value).filter((t) => t.text.trim());
  return { total: tasks.length, done: tasks.filter((t) => t.done).length };
}

/** What is carried along while dragging an unfinished task to another day. */
export const TASK_MIME = "application/x-lodal-task";
export type DragPayload = { sid: number; date: string; i: number; text: string };
