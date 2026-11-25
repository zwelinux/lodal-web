"use client";
import { useEffect, useRef, useState } from "react";
import { api, chatFileUrl, type ChatFile, type NoteListItem } from "@/lib/api";

const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** What is inside one chat bubble: the text, a picture or file, or a Google Meet call. Shared by project chat and friend chat. */
export function ChatContent({ text, file, meet }: { text: string; file?: ChatFile | null; meet?: string }) {
  return (
    <>
      {file &&
        (file.image ? (
          <a href={chatFileUrl(file.token)} target="_blank" rel="noreferrer" className="chatPic">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={chatFileUrl(file.token)} alt={file.name} width={file.width || undefined} height={file.height || undefined} loading="lazy" />
          </a>
        ) : (
          <a href={chatFileUrl(file.token)} className="chatFile" download={file.name}>
            <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 2.500h6l4 4v11H5z" />
              <path d="M11 2.500v4h4" />
            </svg>
            <span>
              <b>{file.name}</b>
              <small>{kb(file.size)}</small>
            </span>
          </a>
        ))}
      {meet && (
        <a href={meet} target="_blank" rel="noreferrer" className="chatMeet">
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="5" width="11" height="10" rx="2" />
            <path d="M13 9l5-3v8l-5-3z" />
          </svg>
          <span>
            <b>Google Meet call</b>
            <small>Tap to join</small>
          </span>
        </a>
      )}
      {text && <span>{text}</span>}
    </>
  );
}

/** The two buttons next to the message box: attach a picture or file, and start a Google Meet call. */
export function ChatTools({ onFile, onMeet, busy }: { onFile: (f: File) => void; onMeet: () => void; busy: boolean }) {
  const pick = useRef<HTMLInputElement>(null);
  return (
    <span className="chatTools">
      <input
        ref={pick}
        type="file"
        hidden
        accept="image/*,.pdf,.txt,.md,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onFile(f);
        }}
      />
      <button type="button" className="chatTool" aria-label="Send a picture or file" title="Send a picture or file" disabled={busy} onClick={() => pick.current?.click()}>
        <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M16 9.500l-5.800 5.800a3.500 3.500 0 0 1-5-5l6-6a2.300 2.300 0 0 1 3.300 3.300l-6 6a1.100 1.100 0 0 1-1.600-1.600l5.500-5.500" />
        </svg>
      </button>
      <button type="button" className="chatTool" aria-label="Start a Google Meet call" title="Start a Google Meet call" disabled={busy} onClick={onMeet}>
        <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="5" width="11" height="10" rx="2" />
          <path d="M13 9l5-3v8l-5-3z" />
        </svg>
      </button>
    </span>
  );
}

/** Pick one of your notes (or start a new one) and put a message at the end of it. */
export function SaveToNote({ text, who, onClose, onDone }: { text: string; who: string; onClose: () => void; onDone: (msg: string) => void }) {
  const [notes, setNotes] = useState<NoteListItem[] | null>(null);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .notes()
      .then((r) => setNotes([...r.mine, ...r.shared.filter((n) => n.can_edit)]))
      .catch((e) => setErr(e instanceof Error ? e.message : "Could not load your notes."));
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);

  async function save(id: number | null, title: string) {
    setBusy(true);
    setErr("");
    try {
      const target = id ?? (await api.createNote()).id;
      await api.appendToNote(target, text, who);
      onDone(`Saved to ${title || "your note"}.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save.");
      setBusy(false);
    }
  }

  const shown = (notes ?? []).filter((n) => !q.trim() || (n.title || "Untitled").toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog wide saveNote" role="dialog" aria-modal="true" aria-label="Save to a note" onClick={(e) => e.stopPropagation()}>
        <div className="dialogHead">
          <h2>Save to a note</h2>
          <button className="x show" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <blockquote className="saveQuote">{text.length > 160 ? text.slice(0, 160) + "…" : text}</blockquote>
        <input className="saveSearch" value={q} placeholder="Search your notes" aria-label="Search your notes" onChange={(e) => setQ(e.target.value)} />
        <div className="saveList">
          <button className="saveRow new" disabled={busy} onClick={() => save(null, "a new note")}>
            + New note
          </button>
          {notes === null && !err && <p>Loading…</p>}
          {shown.map((n) => (
            <button key={n.id} className="saveRow" disabled={busy} onClick={() => save(n.id, n.title || "Untitled")}>
              <b>{n.title || "Untitled"}</b>
              <small>{n.snippet}</small>
            </button>
          ))}
          {notes && !shown.length && <p>No notes match.</p>}
        </div>
        {err && (
          <p className="error" role="alert">
            {err}
          </p>
        )}
      </div>
    </div>
  );
}
