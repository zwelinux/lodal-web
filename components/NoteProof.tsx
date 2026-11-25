"use client";
import { useEffect, useState } from "react";
import { api, type NoteProofItem } from "@/lib/api";

const when = (iso: string) => new Date(iso).toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Owner only: a dated proof that this note said exactly this, anchored in Bitcoin. */
export default function NoteProof({ noteId, onClose }: { noteId: number; onClose: () => void }) {
  const [items, setItems] = useState<NoteProofItem[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let gone = false;
    api
      .noteProofs(noteId)
      .then((v) => !gone && setItems(v))
      .catch((e) => !gone && setErr(e instanceof Error ? e.message : "Could not load your proofs."));
    return () => {
      gone = true;
    };
  }, [noteId]);

  async function make() {
    setBusy(true);
    setErr("");
    try {
      const p = await api.createNoteProof(noteId);
      setItems((cur) => [p, ...(cur ?? [])]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not make the proof.");
    }
    setBusy(false);
  }

  async function save(p: NoteProofItem, kind: "file" | "receipt") {
    setErr("");
    try {
      await api.downloadNoteProof(noteId, p.id, kind, p.file_name);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not download the file.");
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog wide historyBox" role="dialog" aria-modal="true" aria-labelledby="proofTitle" onClick={(e) => e.stopPropagation()}>
        <div className="dialogHead">
          <h2 id="proofTitle">Proof this is yours</h2>
          <button className="iconBtn" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="fine">
          Make a dated proof of this note as it is right now. It shows that this exact text existed on this date, written by your Google account. Only a fingerprint is sent out, never your text. It is anchored in Bitcoin, so nobody can change the date later, not even us.
        </p>
        <button className="btn primary" onClick={make} disabled={busy}>
          {busy ? "Making the proof…" : "Make a proof now"}
        </button>
        {err && (
          <p className="error" role="alert">
            {err}
          </p>
        )}
        {items && items.length > 0 && (
          <ul className="historyList">
            {items.map((p) => (
              <li key={p.id} className="proofRow">
                <b>{when(p.created_at)}</b>
                <small>{p.status === "confirmed" ? `Confirmed in Bitcoin block ${p.block_height}` : "Waiting for Bitcoin. This takes a few hours, and it is already valid."}</small>
                <span className="proofBtns">
                  <button className="btn" onClick={() => save(p, "file")}>
                    Download text
                  </button>
                  <button className="btn" onClick={() => save(p, "receipt")}>
                    Download receipt
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {items && items.length === 0 && <p className="fine">No proofs yet.</p>}
        <p className="fine">Keep both files together, somewhere safe. The text is what you wrote. The receipt proves when.</p>
        <button className="linkBtn" onClick={() => setHelp(!help)} aria-expanded={help}>
          How anyone can check it {help ? "▴" : "▾"}
        </button>
        {help && (
          <ol className="fine proofHelp">
            <li>Put the text file and its receipt (.ots) in the same folder.</li>
            <li>
              Go to <b>opentimestamps.org</b> and drop the receipt and the text file on the page. Or run <code>ots verify</code> on the receipt.
            </li>
            <li>It shows the date and the Bitcoin block. If the text was changed by even one letter, it fails.</li>
          </ol>
        )}
        <p className="fine">A proof is strong evidence of what you wrote and when. It is not a legal ruling on ownership. Ask a lawyer for that.</p>
      </div>
    </div>
  );
}
