"use client";
import { useCallback, useState } from "react";
import { useDismiss } from "@/lib/useDismiss";

const svgProps = { viewBox: "0 0 20 20", width: 18, height: 18, "aria-hidden": true, fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** A "+" icon. Click it and a small box opens to type the new subject's name. */
export function AddSubjectButton({ onAdd }: { onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  useDismiss(open, useCallback(() => setOpen(false), []));
  return (
    <div className="menuWrap toolWrap">
      <button className="expandBtn" aria-label="Add subject" title="Add subject" aria-expanded={open} onClick={() => setOpen(!open)}>
        <svg {...svgProps}>
          <path d="M10 4v12M4 10h12" />
        </svg>
      </button>
      {open && (
        <form
          className="toolPop"
          onSubmit={(e) => {
            e.preventDefault();
            const n = name.trim();
            if (!n) return;
            onAdd(n);
            setName("");
            setOpen(false);
          }}
        >
          <label htmlFor="newSubjectName">New subject</label>
          <div className="toolRow">
            <input id="newSubjectName" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Family" maxLength={120} autoComplete="off" />
            <button className="btn primary">Add</button>
          </div>
        </form>
      )}
    </div>
  );
}

export type HiddenGroup = { label: string; items: { id: number; name: string }[]; onRestore: (id: number) => void; canRestore?: boolean };

/** An "eye with a line" icon with a count. It only shows up when something is hidden. */
export function HiddenButton({ groups }: { groups: HiddenGroup[] }) {
  const [open, setOpen] = useState(false);
  useDismiss(open, useCallback(() => setOpen(false), []));
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  if (total === 0) return null;
  return (
    <div className="menuWrap toolWrap">
      <button className="expandBtn" aria-label={`Hidden subjects, ${total}`} title="Hidden subjects" aria-expanded={open} onClick={() => setOpen(!open)}>
        <svg {...svgProps}>
          <path d="M3 3l14 14M8.4 5.2A8 8 0 0 1 10 5c4 0 6.500 3.200 7.500 5a12 12 0 0 1-2.300 2.900M6.100 6.600A12 12 0 0 0 2.500 10c1 1.800 3.500 5 7.500 5 1.200 0 2.200-.3 3.100-.7M8.300 8.300a2 2 0 0 0 2.800 2.800" />
        </svg>
        <span className="toolBadge">{total}</span>
      </button>
      {open && (
        <div className="toolPop" role="dialog" aria-label="Hidden subjects">
          {groups
            .filter((g) => g.items.length > 0)
            .map((g) => (
              <section key={g.label}>
                <h4>{g.label}</h4>
                <ul>
                  {g.items.map((it) => (
                    <li key={it.id}>
                      <span>{it.name}</span>
                      {g.canRestore !== false && (
                        <button className="btn" onClick={() => g.onRestore(it.id)}>
                          Show again
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
