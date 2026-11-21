"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, token, type PulseData } from "@/lib/api";
import SimpleBar from "./SimpleBar";

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  return `${Math.floor(s / 3600)} h ago`;
}
const hue = (id: number) => `hsl(${(id * 67) % 360} 55% 48%)`;

function Face({ id, name }: { id: number; name: string }) {
  return (
    <span className="avatar" style={{ background: hue(id) }} aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** The public page: you are not alone. Anonymous numbers for everyone, and people who chose to be seen. */
export default function PulseHome() {
  const router = useRouter();
  const [data, setData] = useState<PulseData | null>(null);
  const [error, setError] = useState("");
  const [nick, setNick] = useState("");
  const [busy, setBusy] = useState(false);
  const [popped, setPopped] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.pulse());
      setError("");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        token.clear();
        router.replace("/login?next=/app/pulse");
      } else setError(e instanceof Error ? e.message : "Could not load Pulse.");
    }
  }, [router]);

  useEffect(() => {
    if (!token.get()) {
      router.replace("/login?next=/app/pulse");
      return;
    }
    const first = setTimeout(load, 0);
    const every = setInterval(() => document.visibilityState === "visible" && load(), 15000);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, [load, router]);

  async function setVisible(visible: boolean) {
    setBusy(true);
    setError("");
    try {
      await api.pulseMe(visible ? { nickname: nick.trim() || data?.me.nickname, visible } : { visible });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    }
    setBusy(false);
  }

  async function clap(id: number) {
    setPopped(id);
    setTimeout(() => setPopped(null), 600);
    setData((d) => (d ? { ...d, feed: d.feed.map((f) => (f.id === id && !f.clapped ? { ...f, clapped: true, claps: f.claps + 1 } : f)) } : d));
    try {
      await api.pulseClap(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not clap.");
      load();
    }
  }

  return (
    <div className="app narrow">
      <SimpleBar />
      <main className="projWrap pulsePage">
        <h1 className="pageTitle">Pulse</h1>
        <p className="pageSub">You are not alone. Right now, other people are planning and getting things done too.</p>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <section className="pulseStats" aria-label="Right now">
          <div className="stat">
            <b>{data ? data.active_now : "–"}</b>
            <span>
              <i className="liveDot on" /> planning now
            </span>
          </div>
          <div className="stat">
            <b>{data ? data.done_today : "–"}</b>
            <span>tasks done today</span>
          </div>
          <div className="stat">
            <b>{data ? data.total_users : "–"}</b>
            <span>people on Lodal</span>
          </div>
        </section>

        {data && (
          <section className="pulseJoin">
            {data.me.visible ? (
              <p>
                You show up as <b>{data.me.nickname}</b>. Others can send you a 👏.{" "}
                <button className="linkBtn" disabled={busy} onClick={() => setVisible(false)}>
                  Hide me
                </button>
              </p>
            ) : (
              <>
                <p>
                  <b>Want to be seen?</b> Pick a nickname (not your email or real name) and others can cheer you on. You can hide again any time.
                </p>
                <form
                  className="inviteForm"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setVisible(true);
                  }}
                >
                  <input value={nick} onChange={(e) => setNick(e.target.value)} placeholder="Nickname, e.g. Mia" aria-label="Nickname" maxLength={20} required />
                  <button className="btn primary" disabled={busy}>
                    Show me
                  </button>
                </form>
              </>
            )}
          </section>
        )}

        {data && data.online.length > 0 && (
          <section>
            <h2 className="pulseH">Here now</h2>
            <div className="pulseOnline">
              {data.online.map((p) => (
                <span key={p.id} className="person">
                  <Face id={p.id} name={p.nickname} />
                  {p.nickname}
                </span>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="pulseH">Just finished</h2>
          {data && data.feed.length === 0 && <p className="pageSub">Nothing yet. Finish a task, and be the first to show up here.</p>}
          <ul className="pulseFeed">
            {data?.feed.map((f) => (
              <li key={f.id}>
                <Face id={f.user} name={f.nickname} />
                <span className="pulseText">
                  <b>{f.mine ? "You" : f.nickname}</b> finished a task <small>{ago(f.created_at)}</small>
                </span>
                {f.mine ? (
                  <span className="clapCount" aria-label={`${f.claps} claps`}>
                    👏 {f.claps}
                  </span>
                ) : (
                  <button className={`clapBtn ${f.clapped ? "on" : ""} ${popped === f.id ? "pop" : ""}`} onClick={() => clap(f.id)} disabled={f.clapped} aria-label={f.clapped ? "You clapped" : `Clap for ${f.nickname}`}>
                    👏 {f.claps > 0 ? f.claps : ""}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
