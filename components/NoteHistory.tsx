"use client";
import { useEffect, useState } from "react";
import { api, type NoteDetail, type NoteVersionItem } from "@/lib/api";
import { ago } from "@/lib/ago";
import { ask } from "./DialogHost";

/** Earlier versions of a note. Look at one, and bring it back if you want it. */
export default function NoteHistory({ noteId, onClose, onRestored }: { noteId: number; onClose: () => void; onRestored: (n: NoteDetail) => void }) {
  const [items, setItems] = useState<NoteVersionItem[] | null>(null);
  const [picked, setPicked] = useState<(NoteVersionItem & { body: string }) | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let gone = false;
    api
      .noteVersions(noteId)
      .then((v) => !gone && setItems(v))
      .catch((e) => !gone && setErr(e instanceof Error ? e.message : "Could not load the history."));
    return () => {
      gone = true;
    };
  }, [noteId]);

  async function open(v: NoteVersionItem) {
    setErr("");
    try {
      setPicked(await api.noteVersion(noteId, v.id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not open this version.");
    }
  }

  async function restore() {
    if (!picked || !(await ask(`Bring back this version?\n\nThe note goes back to how it was ${ago(picked.saved_at)}. What it says now is kept in the history, so you can undo this.`, "Bring back"))) return;
    setBusy(true);
    try {
      onRestored(await api.restoreNoteVersion(noteId, picked.id));
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not bring it back.");
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog wide historyBox" role="dialog" aria-modal="true" aria-labelledby="histTitle" onClick={(e) => e.stopPropagation()}>
        <div className="dialogHead">
          <h2 id="histTitle">{picked ? "Earlier version" : "History"}</h2>
          <button className="iconBtn" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        {err && (
          <p className="error" role="alert">
            {err}
          </p>
        )}
        {!picked && (
          <>
            <p className="fine">Lodal keeps earlier versions of this note. Pick one to look at it.</p>
            {!items && !err && <p className="fine">Loading…</p>}
            {items && items.length === 0 && <p className="fine">No earlier versions yet.</p>}
            <ul className="historyList">
              {items?.map((v, i) => (
                <li key={v.id}>
                  <button onClick={() => open(v)}>
                    <b>
                      {ago(v.saved_at)}
                      {i === 0 && <span className="historyNow"> · latest</span>}
                    </b>
                    <small>{v.saved_by ? `by ${v.saved_by}` : ""}</small>
                    <span className="historySnip">{v.snippet || v.title || "Empty"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {picked && (
          <>
            <p className="fine">
              Saved {ago(picked.saved_at)}
              {picked.saved_by ? ` by ${picked.saved_by}` : ""}
            </p>
            <div className="historyView">
              <h3>{picked.title || "Untitled"}</h3>
              <pre>{picked.body || "(empty)"}</pre>
            </div>
            <div className="historyActions">
              <button className="btn" onClick={() => setPicked(null)}>
                Back
              </button>
              <button className="btn primary" onClick={restore} disabled={busy}>
                Bring back this version
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
