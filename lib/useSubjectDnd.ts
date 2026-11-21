import { useState } from "react";
import type { DragEvent, KeyboardEvent } from "react";

const MIME = "application/x-lodal-subject";

/**
 * Drag a subject row to a new place. Also works from the keyboard: focus the grip and press the up or down arrow.
 * `ids` is the order on screen. `onReorder` gets the new order.
 */
export function useSubjectDnd(ids: number[], onReorder: (ids: number[]) => void) {
  const [dragId, setDragId] = useState<number | null>(null);
  const [over, setOver] = useState<{ id: number; after: boolean } | null>(null);
  const end = () => {
    setDragId(null);
    setOver(null);
  };

  return {
    dragId,
    over,
    /** Put these on the little grip handle. */
    handle: (id: number) => ({
      draggable: true,
      onDragStart: (e: DragEvent<HTMLElement>) => {
        e.dataTransfer.setData(MIME, String(id));
        e.dataTransfer.effectAllowed = "move";
        const cell = (e.currentTarget as HTMLElement).closest(".gSubj");
        if (cell) e.dataTransfer.setDragImage(cell, 16, 16);
        setDragId(id);
      },
      onDragEnd: end,
      onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
        const i = ids.indexOf(id);
        const j = e.key === "ArrowUp" ? i - 1 : e.key === "ArrowDown" ? i + 1 : -1;
        if (j < 0 || j >= ids.length || i < 0) return;
        e.preventDefault();
        const next = [...ids];
        [next[i], next[j]] = [next[j], next[i]];
        onReorder(next);
      },
    }),
    /** Put these on the whole row (any row can be dropped on). */
    row: (id: number) => ({
      onDragOver: (e: DragEvent<HTMLElement>) => {
        if (dragId === null || !e.dataTransfer.types.includes(MIME)) return;
        e.preventDefault();
        const head = (e.currentTarget as HTMLElement).querySelector(".gSubj") as HTMLElement | null;
        const r = head?.getBoundingClientRect();
        const after = r ? e.clientY > r.top + r.height / 2 : false;
        if (!over || over.id !== id || over.after !== after) setOver({ id, after });
      },
      onDrop: (e: DragEvent<HTMLElement>) => {
        if (dragId === null) return;
        e.preventDefault();
        const from = dragId;
        const after = over?.after ?? false;
        end();
        if (from === id) return;
        const rest = ids.filter((x) => x !== from);
        let at = rest.indexOf(id);
        if (after) at += 1;
        rest.splice(at, 0, from);
        if (rest.join() !== ids.join()) onReorder(rest);
      },
    }),
    /** Class names for the label cell so you can see where it will land. */
    cls: (id: number) =>
      `${dragId === id ? "dragging" : ""} ${over && over.id === id && dragId !== id ? (over.after ? "dropAfter" : "dropBefore") : ""}`,
  };
}
