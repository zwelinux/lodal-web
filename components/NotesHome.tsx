"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, token, type NoteListItem, type NotesList } from "@/lib/api";
import { ago } from "@/lib/ago";
import SimpleBar from "./SimpleBar";

/** All your notes, and the ones other people shared with you. */
export default function NotesHome() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [data, setData] = useState<NotesList | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token.get()) {
      router.replace("/login?next=/app/notes");
      return;
    }
    let gone = false;
    const t = setTimeout(
      () =>
        api
          .notes(q.trim())
          .then((d) => !gone && (setData(d), setError("")))
          .catch((e) => {
            if (e instanceof ApiError && e.status === 401) {
              token.clear();
              router.replace("/login?next=/app/notes");
            } else if (!gone) setError(e instanceof Error ? e.message : "Could not load your notes.");
          }),
      q ? 250 : 0, // wait a moment while typing in the search box
    );
    return () => {
      gone = true;
      clearTimeout(t);
    };
  }, [q, router]);

  async function create() {
    setBusy(true);
    try {
      const n = await api.createNote();
      router.push(`/app/notes/${n.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not make a note.");
      setBusy(false);
    }
  }

  const empty = data && data.mine.length === 0 && data.shared.length === 0;
  return (
    <div className="app narrow">
      <SimpleBar />
      <main className="projWrap">
        <h1 className="pageTitle">Notes</h1>
        <p className="pageSub">Write things down once. Keep them, or send a link to a client.</p>

        <div className="notesBar">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your notes" aria-label="Search notes" maxLength={100} />
          <button className="btn primary" onClick={create} disabled={busy}>
            New note
          </button>
        </div>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {!data && !error && <p className="empty">Loading…</p>}
        {empty && (
          <div className="emptyBox">
            <b>{q ? "Nothing found" : "No notes yet"}</b>
            <p>{q ? "Try other words." : "Make a note for anything you want to remember, like a guide, a checklist or a plan. Share it with a link when a client needs to read it."}</p>
          </div>
        )}

        {data && data.mine.length > 0 && <NoteGroup title={data.shared.length ? "Your notes" : ""} items={data.mine} />}
        {data && data.shared.length > 0 && <NoteGroup title="Shared with you" items={data.shared} />}
      </main>
    </div>
  );
}

function NoteGroup({ title, items }: { title: string; items: NoteListItem[] }) {
  return (
    <section className="noteGroup">
      {title && <h2 className="noteGroupTitle">{title}</h2>}
      <div className="noteGrid">
        {items.map((n) => (
          <Link key={n.id} href={`/app/notes/${n.id}`} className="noteCard">
            <b>{n.title || "Untitled"}</b>
            <span className="noteSnip">{n.snippet || "Empty note"}</span>
            <small>
              {ago(n.updated_at)}
              {n.mine && n.shared && " · Shared"}
              {!n.mine && ` · ${n.owner} · ${n.can_edit ? "Can edit" : "Can view"}`}
            </small>
          </Link>
        ))}
      </div>
    </section>
  );
}
