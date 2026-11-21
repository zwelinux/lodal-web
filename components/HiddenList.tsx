"use client";
import { useState } from "react";

/** A small "Hidden (2)" link. Opens a short list where each hidden item can be shown again. */
export default function HiddenList({ label, items, onRestore, canRestore = true }: { label: string; items: { id: number; name: string }[]; onRestore: (id: number) => void; canRestore?: boolean }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <div className="hiddenList">
      <button className="linkBtn" aria-expanded={open} onClick={() => setOpen(!open)}>
        {label} ({items.length}) {open ? "▴" : "▾"}
      </button>
      {open && (
        <ul>
          {items.map((it) => (
            <li key={it.id}>
              <span>{it.name}</span>
              {canRestore && (
                <button className="btn" onClick={() => onRestore(it.id)}>
                  Show again
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
