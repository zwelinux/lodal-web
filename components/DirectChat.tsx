"use client";
import { ask } from "./DialogHost";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, dmSocketUrl, token, type DirectMessage } from "@/lib/api";
import ReportDialog from "./ReportDialog";

function clock(iso: string): string {
  const d = new Date(iso);
  const t = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === new Date().toDateString() ? t : `${d.toLocaleDateString([], { day: "numeric", month: "short" })}, ${t}`;
}

/** A private chat with one friend, in the same small panel as project chat. Live over a websocket. */
export default function DirectChat({ peer, onClose, onChanged }: { peer: { user: number; nickname: string }; onClose: () => void; onChanged: () => void }) {
  const [items, setItems] = useState<DirectMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [live, setLive] = useState(false);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState<{ kind: "user" | "dm"; target: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastId = useRef(0);
  const liveRef = useRef(false);
  const stick = useRef(true);

  const merge = useCallback((fresh: DirectMessage[]) => {
    if (!fresh.length) return;
    setItems((cur) => {
      const have = new Set(cur.map((m) => m.id));
      const add = fresh.filter((m) => !have.has(m.id));
      return add.length ? [...cur, ...add].sort((a, b) => a.id - b.id) : cur;
    });
    lastId.current = Math.max(lastId.current, ...fresh.map((m) => m.id));
  }, []);

  const markRead = useCallback(() => {
    api.readDm(peer.user).then(onChanged).catch(() => {});
  }, [peer.user, onChanged]);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    async function tick(first: boolean) {
      try {
        const r = first ? await api.dm(peer.user) : await api.dm(peer.user, { after: lastId.current });
        if (stop) return;
        if (first) setHasMore(r.has_more);
        merge(r.items);
        if (first || r.items.length) markRead();
      } catch {
        /* offline: try again next time */
      }
      if (!stop) timer = setTimeout(() => tick(false), liveRef.current ? 60000 : 4000);
    }
    tick(true);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [peer.user, merge, markRead]);

  useEffect(() => {
    let stop = false;
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout>;
    let wait = 1000;
    function connect() {
      const t = token.get();
      if (stop || !t) return;
      try {
        ws = new WebSocket(dmSocketUrl());
      } catch {
        return;
      }
      ws.onopen = () => ws?.send(JSON.stringify({ type: "auth", token: t }));
      ws.onmessage = (e) => {
        let d: { type: string } & Partial<DirectMessage>;
        try {
          d = JSON.parse(e.data);
        } catch {
          return;
        }
        if (d.type === "ready") {
          wait = 1000;
          liveRef.current = true;
          setLive(true);
        } else if (d.type === "dm" && d.id && (d.from === peer.user || d.to === peer.user)) {
          merge([d as DirectMessage]);
          if (d.from === peer.user) markRead();
        }
      };
      ws.onclose = () => {
        liveRef.current = false;
        setLive(false);
        if (!stop) {
          retry = setTimeout(connect, wait);
          wait = Math.min(wait * 2, 30000);
        }
      };
      ws.onerror = () => ws?.close();
    }
    connect();
    return () => {
      stop = true;
      clearTimeout(retry);
      ws?.close();
    };
  }, [peer.user, merge, markRead]);

  useEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [items]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    try {
      const m = await api.sendDm(peer.user, text);
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
    const r = await api.dm(peer.user, { before: items[0].id }).catch(() => null);
    if (!r) return;
    stick.current = false;
    setHasMore(r.has_more);
    setItems((cur) => [...r.items, ...cur]);
  }

  async function blockThem() {
    if (!(await ask(`Block ${peer.nickname}? You will not see each other and you stop being friends.`))) return;
    try {
      await api.block(peer.user);
      onChanged();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not block.");
    }
  }
  async function unfriendThem() {
    if (!(await ask(`Remove ${peer.nickname} from your friends?`))) return;
    try {
      await api.unfriend(peer.user);
      onChanged();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove.");
    }
  }

  return (
    <aside className="chatPanel open dmPanel" aria-label={`Chat with ${peer.nickname}`}>
      <header className="chatHead">
        <h2>
          {peer.nickname} <span className={`liveDot ${live ? "on" : ""}`} title={live ? "Live" : "Reconnecting…"} />
        </h2>
        <span className="chatHeadBtns">
          <span className="menuWrap dmMenu">
            <button className="x show" aria-label="More" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
              ⋯
            </button>
            {menu && (
              <div className="menu" role="menu" onClick={() => setMenu(false)}>
                <button role="menuitem" onClick={() => setReport({ kind: "user", target: peer.user })}>
                  Report {peer.nickname}
                </button>
                <button role="menuitem" onClick={unfriendThem}>
                  Remove friend
                </button>
                <button role="menuitem" onClick={blockThem}>
                  Block
                </button>
              </div>
            )}
          </span>
          <button className="x show" aria-label="Close chat" onClick={onClose}>
            ×
          </button>
        </span>
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
        {items.length === 0 && <p className="chatEmpty">No messages yet. Say hi to {peer.nickname}.</p>}
        {items.map((m, i) => {
          const prev = items[i - 1];
          const first = !prev || prev.from !== m.from || new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60000;
          return (
            <div key={m.id} className={`chatMsg ${m.mine ? "mine" : ""} ${first ? "first" : ""}`}>
              {first && (
                <div className="chatMeta">
                  <b>{m.mine ? "You" : peer.nickname}</b> <span>{clock(m.created_at)}</span>
                </div>
              )}
              <div className="chatBubble">
                <span>{m.text}</span>
                {!m.mine && (
                  <button className="chatDel" aria-label="Report message" title="Report" onClick={() => setReport({ kind: "dm", target: m.id })}>
                    ⚑
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
      {report && <ReportDialog kind={report.kind} target={report.target} who={peer.nickname} blockUserId={peer.user} onClose={() => setReport(null)} onBlocked={() => (onChanged(), onClose())} />}
    </aside>
  );
}
