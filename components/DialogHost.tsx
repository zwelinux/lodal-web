"use client";
import { useEffect, useRef, useState } from "react";

type Ask = { kind: "confirm"; text: string; label?: string; resolve: (ok: boolean) => void } | { kind: "prompt"; text: string; hint?: string; value?: string; resolve: (v: string | null) => void };
type Listener = (a: Ask) => void;
let listener: Listener | null = null;

/** Lodal's own box in place of the browser's confirm(). First paragraph is the heading, the rest is the explanation. */
export function ask(text: string, label?: string): Promise<boolean> {
  if (!listener) return Promise.resolve(typeof window !== "undefined" && window.confirm(text));
  return new Promise((resolve) => listener!({ kind: "confirm", text, label, resolve }));
}

/** Lodal's own box in place of the browser's prompt(). Resolves to the typed text, or null if cancelled. */
export function askText(text: string, opts: { hint?: string; value?: string } = {}): Promise<string | null> {
  if (!listener) return Promise.resolve(typeof window !== "undefined" ? window.prompt(text, opts.value) : null);
  return new Promise((resolve) => listener!({ kind: "prompt", text, ...opts, resolve }));
}

const labelFor = (t: string) => (/^(delete|remove|block|leave|stop)/i.test(t) ? t.match(/^\w+/)![0].replace(/^\w/, (c) => c.toUpperCase()) : "OK");
const danger = (t: string) => /^(delete|remove|block|leave|stop)/i.test(t);

/** Mount once, near the top of the page. */
export default function DialogHost() {
  const [cur, setCur] = useState<Ask | null>(null);
  const [text, setText] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listener = (a) => {
      setText(a.kind === "prompt" ? (a.value ?? "") : "");
      setCur(a);
    };
    return () => {
      listener = null;
    };
  }, []);

  function close(result: boolean | string | null) {
    if (!cur) return;
    if (cur.kind === "confirm") cur.resolve(result === true);
    else cur.resolve(typeof result === "string" ? result : null);
    setCur(null);
  }

  useEffect(() => {
    if (!cur) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(cur.kind === "confirm" ? false : null);
    };
    window.addEventListener("keydown", key);
    box.current?.querySelector<HTMLElement>("input, .primary")?.focus();
    return () => window.removeEventListener("keydown", key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur]);

  if (!cur) return null;
  const parts = cur.text.includes("\n\n") ? cur.text.split("\n\n") : cur.text.split(/(?<=[?.]) (?=[A-Z])/); // heading, then the explanation
  const [title, ...rest] = parts;
  const body = rest.join(cur.text.includes("\n\n") ? "\n\n" : " ");
  const isConfirm = cur.kind === "confirm";
  const label = isConfirm ? (cur.label ?? labelFor(cur.text)) : "OK";
  const bad = isConfirm && danger(cur.text);

  return (
    <div className="overlay askOverlay" onClick={() => close(isConfirm ? false : null)}>
      <form
        ref={box as unknown as React.RefObject<HTMLFormElement>}
        className="dialog askDialog"
        role={isConfirm ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby="askTitle"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          close(isConfirm ? true : text.trim());
        }}
      >
        <h2 id="askTitle">{title}</h2>
        {body && <p className="askBody">{body}</p>}
        {!isConfirm && <input value={text} onChange={(e) => setText(e.target.value)} placeholder={cur.hint} aria-label={title} />}
        <div className="askActions">
          <button type="button" className="btn big" onClick={() => close(isConfirm ? false : null)}>
            Cancel
          </button>
          <button type="submit" className={`btn big primary ${bad ? "dangerBtn" : ""}`}>
            {label}
          </button>
        </div>
      </form>
    </div>
  );
}
