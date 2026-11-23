"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, token, type NoteDetail } from "@/lib/api";
import { ago } from "@/lib/ago";
import NoteEditor from "./NoteEditor";
import ShareNote from "./ShareNote";
import SimpleBar from "./SimpleBar";

type Status = "saved" | "saving" | "unsaved" | "error" | "conflict";
const LABEL: Record<Status, string> = { saved: "Saved", saving: "Saving…", unsaved: "Editing…", error: "Not saved. Trying again", conflict: "Not saved" };

/** One note: write, it saves by itself. The owner can share it and delete it. */
export default function NoteView() {
  const router = useRouter();
  const { id: rawId } = useParams<{ id: string }>();
  const id = Number(rawId);
  const [note, setNote] = useState<NoteDetail | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState(""); // the text last loaded into the editor (not every keystroke)
  const [loadKey, setLoadKey] = useState(0);
  const [status, setStatus] = useState<Status>("saved");
  const [conflict, setConflict] = useState<NoteDetail | null>(null);
  const [error, setError] = useState("");
  const [shareOpen, setShareOpen] = useState(false);

  const titleBox = useRef<HTMLInputElement>(null);
  const body = useRef(""); // the newest text in the editor
  const titleNow = useRef("");
  const version = useRef(0);
  const edits = useRef(0); // counts every change, so a save knows if more was typed meanwhile
  const dirty = useRef(false);
  const saving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const again = useRef<() => void>(() => {}); // lets a failed save try again later

  const apply = useCallback((n: NoteDetail) => {
    setNote(n);
    setTitle(n.title);
    setText(n.body);
    titleNow.current = n.title;
    body.current = n.body;
    version.current = n.version;
    setLoadKey((k) => k + 1);
  }, []);

  const fail = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) {
        token.clear();
        router.replace(`/login?next=/app/notes/${id}`);
      } else if (e instanceof ApiError && e.status === 404) setError("This note does not exist, or it is not shared with you.");
      else setError(e instanceof Error ? e.message : "Something went wrong.");
    },
    [id, router],
  );

  useEffect(() => {
    if (!token.get()) {
      router.replace(`/login?next=/app/notes/${id}`);
      return;
    }
    let gone = false;
    const first = setTimeout(() => api.note(id).then((n) => !gone && apply(n)).catch((e) => !gone && fail(e)), 0);
    return () => {
      gone = true;
      clearTimeout(first);
    };
  }, [id, router, apply, fail]);

  // a brand new note: start in the title
  const fresh = note && !note.title && !note.body;
  useEffect(() => {
    if (fresh && note?.can_edit) titleBox.current?.focus();
  }, [fresh, note?.can_edit]);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (saving.current) return;
    saving.current = true;
    try {
      while (dirty.current) {
        const mark = edits.current;
        setStatus("saving");
        const n = await api.saveNote(id, { title: titleNow.current, body: body.current, base_version: version.current });
        version.current = n.version;
        setNote((cur) => (cur ? { ...cur, version: n.version, updated_at: n.updated_at, updated_by: n.updated_by } : n));
        if (edits.current === mark) dirty.current = false;
      }
      setStatus("saved");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.data?.note) {
        setConflict(e.data.note as NoteDetail);
        setStatus("conflict");
      } else if (e instanceof ApiError && (e.status === 403 || e.status === 404 || e.status === 401)) {
        fail(e);
        setStatus("error");
      } else {
        setStatus("error");
        timer.current = setTimeout(() => again.current(), 5000); // offline or a hiccup: try again
      }
    } finally {
      saving.current = false;
    }
  }, [id, fail]);

  useEffect(() => {
    again.current = flush;
  }, [flush]);

  const touch = useCallback(() => {
    edits.current += 1;
    dirty.current = true;
    setStatus("unsaved");
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 900);
  }, [flush]);

  // keep what was typed: save when the tab is hidden or closed, and when leaving the page
  useEffect(() => {
    const hide = () => document.visibilityState === "hidden" && dirty.current && flush();
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("beforeunload", warn);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("beforeunload", warn);
      if (dirty.current) flush();
    };
  }, [flush]);

  // pick up other people's changes while nothing of ours is waiting
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState !== "visible" || dirty.current || saving.current || conflict) return;
      api
        .note(id)
        .then((n) => {
          if (dirty.current || saving.current) return;
          if (n.version > version.current) apply(n);
        })
        .catch(() => {});
    }, 8000);
    return () => clearInterval(t);
  }, [id, apply, conflict]);

  async function remove() {
    if (!note?.is_owner) return;
    if (!confirm(`Delete "${note.title || "Untitled"}" for everyone?\n\nThis cannot be undone.`)) return;
    try {
      await api.deleteNote(id);
      dirty.current = false;
      router.replace("/app/notes");
    } catch (e) {
      fail(e);
    }
  }

  async function leave() {
    if (!confirm("Stop seeing this note? The owner keeps it.")) return;
    try {
      await api.leaveNote(id);
      router.replace("/app/notes");
    } catch (e) {
      fail(e);
    }
  }

  if (error && !note)
    return (
      <div className="app narrow">
        <SimpleBar />
        <main className="noteWrap">
          <p className="error">{error}</p>
          <Link href="/app/notes">← All notes</Link>
        </main>
      </div>
    );
  if (!note) return <div className="loading">Loading note…</div>;

  const canEdit = note.can_edit;
  return (
    <div className="app narrow">
      <SimpleBar />
      <main className="noteWrap">
        <div className="noteTop">
          <Link href="/app/notes" className="backLink">
            ← All notes
          </Link>
          <div className="noteActions">
            {canEdit && (
              <span className={`saveState ${status}`} role="status">
                {LABEL[status]}
              </span>
            )}
            {note.is_owner && (
              <button className="btn" onClick={() => setShareOpen(true)}>
                {note.public_url || note.shares.length ? "Shared" : "Share"}
              </button>
            )}
            {note.is_owner ? (
              <button className="linkBtn" onClick={remove}>
                Delete
              </button>
            ) : (
              <button className="linkBtn" onClick={leave}>
                Leave
              </button>
            )}
          </div>
        </div>

        {conflict && (
          <div className="notice conflict" role="alert">
            <span>Someone else changed this note while you were writing.</span>
            <span className="noticeBtns">
              <button
                className="btn"
                onClick={() => {
                  apply(conflict);
                  dirty.current = false;
                  setConflict(null);
                  setStatus("saved");
                }}
              >
                Use their version
              </button>
              <button
                className="btn"
                onClick={() => {
                  version.current = conflict.version; // overwrite with mine
                  setConflict(null);
                  touch();
                }}
              >
                Keep mine
              </button>
            </span>
          </div>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {canEdit ? (
          <input
            ref={titleBox}
            className="noteTitle"
            value={title}
            maxLength={200}
            placeholder="Untitled"
            aria-label="Title"
            onChange={(e) => {
              setTitle(e.target.value);
              titleNow.current = e.target.value;
              touch();
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), document.querySelector<HTMLElement>(".noteProse")?.focus())}
          />
        ) : (
          <h1 className="noteTitle ro">{title || "Untitled"}</h1>
        )}
        <p className="noteMeta">
          {!note.is_owner && <>By {note.owner} · </>}
          {note.updated_by ? `Last edited by ${note.updated_by} ` : "Edited "}
          {ago(note.updated_at)}
          {!canEdit && " · You can read this note"}
        </p>

        <NoteEditor
          value={text}
          loadKey={loadKey}
          editable={canEdit}
          onChange={(md) => {
            body.current = md;
            touch();
          }}
          onUpload={
            canEdit
              ? async (file) => {
                  setError("");
                  return (await api.uploadNoteImage(id, file)).url;
                }
              : undefined
          }
          onError={setError}
        />
      </main>
      {shareOpen && <ShareNote note={note} onClose={() => setShareOpen(false)} onChange={setNote} />}
    </div>
  );
}
