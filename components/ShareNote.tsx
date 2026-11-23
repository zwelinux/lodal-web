"use client";
import { useEffect, useState } from "react";
import { api, type NoteDetail } from "@/lib/api";

/** Owner only: a public read-only link for clients, and people who can edit or read. */
export default function ShareNote({ note, onClose, onChange }: { note: NoteDetail; onClose: () => void; onChange: (n: NoteDetail) => void }) {
  const [email, setEmail] = useState("");
  const [canEdit, setCanEdit] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setErr("");
    setInfo("");
    try {
      await fn();
      onChange(await api.note(note.id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    }
    setBusy(false);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const to = email.trim();
    if (!to) return;
    await run(async () => {
      const r = await api.shareNote(note.id, to, canEdit);
      setEmail("");
      setInfo(r.email_sent ? `We emailed ${r.email}.` : `Added ${r.email}. They can open it when they sign in with Google using that email.`);
    });
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog wide" role="dialog" aria-modal="true" aria-labelledby="shareTitle" onClick={(e) => e.stopPropagation()}>
        <div className="dialogHead">
          <h2 id="shareTitle">Share this note</h2>
          <button className="iconBtn" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <section className="pending shareBox">
          <h3>Anyone with the link</h3>
          {note.public_url ? (
            <>
              <p className="fine">Anyone with this link can read this note, even without an account. They cannot change it.</p>
              <div className="shareRow">
                <input readOnly value={note.public_url} aria-label="Public link" onFocus={(e) => e.currentTarget.select()} />
                <button
                  className="btn"
                  onClick={() =>
                    navigator.clipboard?.writeText(note.public_url).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1800);
                    })
                  }
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <button className="linkBtn" disabled={busy} onClick={() => run(() => api.setNotePublic(note.id, false))}>
                Stop sharing the link
              </button>
            </>
          ) : (
            <>
              <p className="fine">Make a link to send to a client. It is read-only, and you can turn it off any time.</p>
              <button className="btn" disabled={busy} onClick={() => run(() => api.setNotePublic(note.id, true))}>
                Create public link
              </button>
            </>
          )}
        </section>

        <section className="pending shareBox">
          <h3>People</h3>
          <form className="inviteForm" onSubmit={add}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Their Google email" aria-label="Their Google email" required />
            <select className="roleSel" value={canEdit ? "edit" : "view"} aria-label="Permission" onChange={(e) => setCanEdit(e.target.value === "edit")}>
              <option value="edit">Can edit</option>
              <option value="view">Can view</option>
            </select>
            <button className="btn primary" disabled={busy}>
              Add
            </button>
          </form>
          {note.shares.map((s) => (
            <div key={s.id} className="pendingRow">
              <span>{s.email}</span>
              <select className="roleSel" value={s.can_edit ? "edit" : "view"} aria-label={`Permission for ${s.email}`} disabled={busy} onChange={(e) => run(() => api.updateNoteShare(note.id, s.id, e.target.value === "edit"))}>
                <option value="edit">Can edit</option>
                <option value="view">Can view</option>
              </select>
              <button className="x show" aria-label={`Remove ${s.email}`} disabled={busy} onClick={() => run(() => api.removeNoteShare(note.id, s.id))}>
                ×
              </button>
            </div>
          ))}
          <p className="fine">They sign in with Google using that email. People who can edit can change the note, but only you can delete it or change who it is shared with.</p>
          {info && <p className="fine" role="status">{info}</p>}
        </section>
        {err && <p className="error" role="alert">{err}</p>}
      </div>
    </div>
  );
}
