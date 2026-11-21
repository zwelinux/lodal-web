"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, type AppNotification } from "@/lib/api";
import { useDismiss } from "@/lib/useDismiss";

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString("en", { day: "numeric", month: "short" });
}

const ICON: Record<AppNotification["kind"], string> = { invited: "✉", accepted: "✓", assigned: "@", done: "✓", update: "↑", announcement: "★" };

/** The bell in the top bar: invitations, people joining, and news from Lodal. */
export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  useDismiss(open, useCallback(() => setOpen(false), []));

  const load = useCallback(async () => {
    try {
      const r = await api.notifications();
      setItems(r.items);
      setUnread(r.unread);
    } catch {}
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const id = setInterval(load, 30000);
    const vis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", vis);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [load]);

  async function openItem(n: AppNotification) {
    setOpen(false);
    if (!n.read) {
      setItems((l) => l.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      api.markRead({ ids: [n.id] }).catch(() => {});
    }
    if (n.link.startsWith("/")) router.push(n.link);
    else if (n.link.startsWith("https://")) window.open(n.link, "_blank", "noopener,noreferrer");
  }
  async function markAll() {
    setItems((l) => l.map((x) => ({ ...x, read: true })));
    setUnread(0);
    api.markRead({ all: true }).catch(() => {});
  }

  return (
    <div className="menuWrap bellWrap">
      <button
        className="iconBtn bellBtn"
        aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}
        aria-expanded={open}
        title="Notifications"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
      >
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 8a5 5 0 0 1 10 0c0 5 2 6 2 6H3s2-1 2-6z" />
          <path d="M8.500 17a1.700 1.700 0 0 0 3 0" />
        </svg>
        {unread > 0 && <span className="bellBadge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="notifPanel" role="dialog" aria-label="Notifications">
          <div className="notifHead">
            <b>Notifications</b>
            {unread > 0 && (
              <button className="linkBtn" onClick={markAll}>
                Mark all as read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="notifEmpty">You&apos;re all caught up. News from Lodal and project invitations will show up here.</p>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id}>
                  <button className={`notifItem ${n.read ? "" : "unread"}`} onClick={() => openItem(n)}>
                    <span className={`notifIcon k-${n.kind}`} aria-hidden="true">
                      {ICON[n.kind]}
                    </span>
                    <span className="notifText">
                      <b>{n.title}</b>
                      {n.body && <span>{n.body}</span>}
                      <small>{ago(n.created_at)}</small>
                    </span>
                    {!n.read && <i className="notifDot" aria-label="New" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
