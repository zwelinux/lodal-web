"use client";
import { useState } from "react";

/** A small "Hidden (2)" link. Opens a short list where each hidden item can be shown again. */
export default function HiddenList({ label, items, onRestore, canRestore = true, onDelete }: { label: string; items: { id: number; name: string }[]; onRestore: (id: number) => void; canRestore?: boolean; onDelete?: (item: { id: number; name: string }) => void }) {
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
                <span className="rowIcons">
                  <button className="iconBtn" aria-label={`Show ${it.name} again`} title="Show again" onClick={() => onRestore(it.id)}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2.500 10C3.500 8.200 6 5 10 5s6.500 3.200 7.500 5c-1 1.800-3.500 5-7.500 5S3.500 11.800 2.500 10zM10 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                    </svg>
                  </button>
                  {onDelete && (
                    <button className="iconBtn danger" aria-label={`Delete ${it.name} for good`} title="Delete for good" onClick={() => onDelete(it)}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 6h12M8 6V4h4v2M5.500 6l.7 10h7.600l.7-10M8.500 9v4M11.500 9v4" />
                      </svg>
                    </button>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
