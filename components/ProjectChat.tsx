"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, type ChatMessage } from "@/lib/api";

function clock(iso: string): string {
  const d = new Date(iso);
  const t = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === new Date().toDateString() ? t : `${d.toLocaleDateString([], { day: "numeric", month: "short" })}, ${t}`;
}

/** The chat icon for a project and the panel that slides in from the left. */
export default function ProjectChat({ projectId, isOwner, initialUnread }: { projectId: number; isOwner: boolean; initialUnread: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const lastId = useRef(0);
  const stick = useRef(true); // keep the view at the newest message unless the reader scrolled up
  const openRef = useRef(false);

  const merge = useCallback((fresh: ChatMessage[]) => {
    if (!fresh.length) return;
    setItems((cur) => {
      const have = new Set(cur.map((m) => m.id));
      const add = fresh.filter((m) => !have.has(m.id));
      return add.length ? [...cur, ...add].sort((a, b) => a.id - b.id) : cur;
    });
    lastId.current = Math.max(lastId.current, ...fresh.map((m) => m.id));
  }, []);

  // first load, then check for new messages every few seconds (faster while the panel is open)
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    async function tick(first: boolean) {
      if (document.visibilityState === "visible" || first) {
        try {
          const r = first ? await api.messages(projectId) : await api.messages(projectId, { after: lastId.current });
          if (stop) return;
          if (first) setHasMore(r.has_more);
          merge(r.items);
          if (!first && !openRef.current) setUnread((u) => u + r.items.filter((m) => !m.mine).length);
        } catch {
          /* offline: try again next time */
        }
      }
      if (!stop) timer = setTimeout(() => tick(false), openRef.current ? 4000 : 20000);
    }
    tick(true);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [projectId, merge]);

  useEffect(() => {
    openRef.current = open;
    if (!open) return;
    api.readMessages(projectId).then(() => setUnread(0)).catch(() => {});
  }, [open, projectId, items.length]);

  useEffect(() => {
    const el = listRef.current;
    if (open && el && stick.current) el.scrollTop = el.scrollHeight;
  }, [open, items]);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    try {
      const m = await api.sendMessage(projectId, text);
      setDraft("");
      stick.current = true;
      merge([m]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send.");
    }
    setSending(false);
  }

  async function older() {
    if (!items.length) return;
    const r = await api.messages(projectId, { before: items[0].id }).catch(() => null);
    if (!r) return;
    stick.current = false;
    setHasMore(r.has_more);
    setItems((cur) => [...r.items, ...cur]);
  }

  async function remove(m: ChatMessage) {
    if (!confirm("Delete this message for everyone?")) return;
    try {
      await api.deleteMessage(m.id);
      setItems((cur) => cur.filter((x) => x.id !== m.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete.");
    }
  }

  return (
    <>
      <button className="expandBtn chatBtn" aria-label={unread ? `Chat, ${unread} new` : "Chat"} aria-expanded={open} title="Chat" onClick={() => setOpen((v) => !v)}>
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 5.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-3.500 3v-3h0a2 2 0 0 1-2-2z" />
        </svg>
        {unread > 0 && <span className="toolBadge">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && <div className="chatScrim" onClick={() => setOpen(false)} />}
      <aside className={`chatDrawer ${open ? "open" : ""}`} aria-hidden={!open} aria-label="Project chat">
        <header className="chatHead">
          <h2>Chat</h2>
          <button className="x show" aria-label="Close chat" onClick={() => setOpen(false)}>
            ×
          </button>
        </header>
        <div
          className="chatList"
          ref={listRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
        >
          {hasMore && (
            <button className="linkBtn chatMore" onClick={older}>
              Show earlier messages
            </button>
          )}
          {items.length === 0 && <p className="chatEmpty">No messages yet. Say hello to your team.</p>}
          {items.map((m, i) => {
            const prev = items[i - 1];
            const first = !prev || prev.user !== m.user || new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60000;
            return (
              <div key={m.id} className={`chatMsg ${m.mine ? "mine" : ""} ${first ? "first" : ""}`}>
                {first && (
                  <div className="chatMeta">
                    <b>{m.mine ? "You" : m.name}</b> <span>{clock(m.created_at)}</span>
                  </div>
                )}
                <div className="chatBubble">
                  <span>{m.text}</span>
                  {(m.mine || isOwner) && (
                    <button className="chatDel" aria-label="Delete message" title="Delete" onClick={() => remove(m)}>
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {error && (
          <p className="error chatErr" role="alert">
            {error}
          </p>
        )}
        <form
          className="chatForm"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <textarea
            value={draft}
            rows={1}
            maxLength={2000}
            placeholder="Write a message"
            aria-label="Message"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button className="btn primary" disabled={!draft.trim() || sending}>
            Send
          </button>
        </form>
      </aside>
    </>
  );
}
