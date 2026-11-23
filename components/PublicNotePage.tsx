"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type PublicNote } from "@/lib/api";
import { ago } from "@/lib/ago";
import LogoMark from "./LogoMark";
import NoteEditor from "./NoteEditor";

/** A note shared with a link: just the words, clean, read-only. */
export default function PublicNotePage() {
  const { token } = useParams<{ token: string }>();
  const [note, setNote] = useState<PublicNote | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => api.publicNote(token).then(setNote).catch((e) => setError(e instanceof Error ? e.message : "This link is not shared any more.")), 0);
    return () => clearTimeout(t);
  }, [token]);

  return (
    <div className="app narrow">
      <main className="noteWrap">
      <header className="reportTop inWrap">
        <Link href="/" className="logo" aria-label="Lodal">
          <LogoMark />
          <span>Lodal</span>
        </Link>
        <span className="reportTag">Read-only</span>
      </header>
        {error && (
          <div className="reportCard">
            <h1>Not available</h1>
            <p className="fine">{error}</p>
          </div>
        )}
        {!note && !error && <p className="fine">Loading…</p>}
        {note && (
          <article>
            <h1 className="noteTitle ro">{note.title || "Untitled"}</h1>
            <p className="noteMeta">Updated {ago(note.updated_at)}</p>
            <NoteEditor value={note.body} loadKey={0} editable={false} />
          </article>
        )}
        <p className="reportBanner">
          Made with <Link href="/">Lodal</Link>, a simple planner and notebook.
        </p>
      </main>
    </div>
  );
}
