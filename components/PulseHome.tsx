"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, token, type PulseData } from "@/lib/api";
import SimpleBar from "./SimpleBar";
import WorldMap, { mapPos } from "./WorldMap";

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  return `${Math.floor(s / 3600)} h ago`;
}

/** The public page: you are not alone. A world of lights, one for each person planning right now. */
export default function PulseHome() {
  const router = useRouter();
  const [data, setData] = useState<PulseData | null>(null);
  const [error, setError] = useState("");
  const [nick, setNick] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [popped, setPopped] = useState(false);

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

  async function clap(eventId: number) {
    setPopped(true);
    setTimeout(() => setPopped(false), 600);
    setData((d) => (d ? { ...d, dots: d.dots.map((p) => (p.event?.id === eventId && !p.event.clapped ? { ...p, event: { ...p.event, clapped: true, claps: p.event.claps + 1 } } : p)) } : d));
    try {
      await api.pulseClap(eventId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not clap.");
      load();
    }
  }

  const sel = data?.dots.find((d) => d.key === selected) ?? null;
  const pos = sel ? { left: `${(mapPos.x(sel.lon) / mapPos.W) * 100}%`, top: `${(mapPos.y(sel.lat) / mapPos.H) * 100}%` } : null;
  const flip = sel ? mapPos.x(sel.lon) / mapPos.W > 0.6 : false; // open the card towards the middle of the map

  return (
    <div className="app narrow">
      <SimpleBar />
      <main className="projWrap pulsePage">
        <h1 className="pageTitle">Pulse</h1>
        <p className="pageSub">You are not alone. Right now, people around the world are planning too.</p>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <section className="mapCard" aria-label="Who is here now">
          <div className="mapHead">
            <p className="mapCount">
              <span className="liveDot on" /> <b>{data ? data.active_now : "–"}</b> active now <span className="mapOf">out of {data ? data.total_users : "–"} users</span>
            </p>
          </div>
          <div className="mapWrap">
            {data && <WorldMap dots={data.dots} selected={selected} onSelect={setSelected} />}
            {sel && pos && (
              <div className={`mapCardPop ${flip ? "flip" : ""}`} style={pos} role="dialog" aria-label={sel.nickname}>
                <button className="x show" aria-label="Close" onClick={() => setSelected(null)}>
                  ×
                </button>
                <b>{sel.mine ? `${sel.nickname} (you)` : sel.nickname}</b>
                <span className="popLine">
                  {sel.event ? (
                    <>
                      finished a task <small>{ago(sel.event.created_at)}</small>
                    </>
                  ) : (
                    "is planning now"
                  )}
                </span>
                {sel.event &&
                  (sel.mine ? (
                    <span className="clapCount">👏 {sel.event.claps}</span>
                  ) : (
                    <button className={`clapBtn ${sel.event.clapped ? "on" : ""} ${popped ? "pop" : ""}`} disabled={sel.event.clapped} onClick={() => clap(sel.event!.id)}>
                      {sel.event.clapped ? "👏 You clapped" : `👏 Clap for ${sel.nickname}`}
                      {sel.event.claps > 0 ? ` · ${sel.event.claps}` : ""}
                    </button>
                  ))}
              </div>
            )}
          </div>
          <p className="mapHint">Each light is a person. Tap a named light to see what they did.</p>
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
                  <b>Want to be seen?</b> Pick a nickname (not your email or real name) and others can tap your light and cheer you on. Without one, you are an anonymous light. Your place on the map is only a region, from your device timezone.
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
      </main>
    </div>
  );
}
