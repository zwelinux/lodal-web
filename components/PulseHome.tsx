"use client";
import { ask } from "./DialogHost";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, token, type FriendsData, type PulseData } from "@/lib/api";
import DirectChat from "./DirectChat";
import ReportDialog from "./ReportDialog";
import SimpleBar from "./SimpleBar";
import CityScene, { scenePos } from "./CityScene";

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  return `${Math.floor(s / 3600)} h ago`;
}

/** The public page: you are not alone. A world of lights, one for each person planning right now. */
export default function PulseHome() {
  const router = useRouter();
  const params = useSearchParams();
  const userParam = Number(params.get("user")) || null;
  const chatParam = Number(params.get("chat")) || null;
  const nonce = params.get("n");
  const focusRef = useRef<number | null>(null); // someone a notification pointed at, who may be offline
  const mapRef = useRef<HTMLElement>(null);
  const [want, setWant] = useState<number | null>(userParam);
  const [data, setData] = useState<PulseData | null>(null);
  const [error, setError] = useState("");
  const [nick, setNick] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [popped, setPopped] = useState(false);
  const [friends, setFriends] = useState<FriendsData | null>(null);
  const [blocked, setBlocked] = useState<{ user: number; nickname: string }[]>([]);
  const [chatWith, setChatWith] = useState<{ user: number; nickname: string } | null>(null);
  const [report, setReport] = useState<{ user: number; nickname: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [d, f, b] = await Promise.all([api.pulse(focusRef.current), api.friends(), api.blocks()]);
      setData(d);
      setFriends(f);
      setBlocked(b);
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

  // a notification (or a request chip) points at one person: open their card in the city
  useEffect(() => {
    const t = setTimeout(() => setWant(userParam), 0);
    return () => clearTimeout(t);
  }, [userParam, nonce]);
  useEffect(() => {
    if (!want || !data) return;
    const light = data.lights.find((l) => l.user === want);
    if (light) {
      const t = setTimeout(() => {
        setSelected(light.slot);
        setWant(null);
        mapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
      return () => clearTimeout(t);
    }
    if (focusRef.current !== want) {
      focusRef.current = want;
      const t = setTimeout(load, 0);
      return () => clearTimeout(t);
    }
  }, [want, data, load]);
  // a message notification opens that friend's chat
  useEffect(() => {
    if (!chatParam || !friends) return;
    const f = friends.friends.find((x) => x.user === chatParam);
    if (f) {
      const t = setTimeout(() => setChatWith({ user: f.user, nickname: f.nickname }), 0);
      return () => clearTimeout(t);
    }
  }, [chatParam, friends]);

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

  async function addFriend(userId: number) {
    setError("");
    try {
      await api.friendRequest(userId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the request.");
    }
  }
  async function answer(id: number, yes: boolean) {
    try {
      if (yes) await api.acceptFriend(id);
      else await api.declineFriend(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not answer.");
    }
  }
  async function blockUser(userId: number, name: string) {
    if (!(await ask(`Block ${name}? You will not see each other, and you stop being friends if you were.`))) return;
    try {
      await api.block(userId);
      setSelected(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not block.");
    }
  }
  async function unblockUser(userId: number) {
    await api.unblock(userId).catch(() => {});
    await load();
  }

  async function checkPulse(userId: number) {
    setData((d) => (d ? { ...d, lights: d.lights.map((l) => (l.user === userId ? { ...l, checked: true } : l)) } : d));
    try {
      await api.pulseCheck(userId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check the pulse.");
      load();
    }
  }

  async function clap(eventId: number) {
    setPopped(true);
    setTimeout(() => setPopped(false), 600);
    setData((d) => (d ? { ...d, lights: d.lights.map((l) => ({ ...l, events: l.events?.map((e) => (e.id === eventId && !e.clapped ? { ...e, clapped: true, claps: e.claps + 1 } : e)) })) } : d));
    try {
      await api.pulseClap(eventId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not clap.");
      load();
    }
  }

  const sel = data?.lights.find((d) => d.slot === selected) ?? null;
  const at = sel ? scenePos(sel.slot) : null;
  const pos = at ? { left: `${at.x * 100}%`, top: `${at.y * 100}%` } : null;
  const side = at ? (at.x < 0.25 ? "left" : at.x > 0.75 ? "right" : "mid") : "mid"; // keep the card inside the city
  const below = at ? at.y < 0.5 : false; // windows in the upper half: open the card underneath, otherwise above

  return (
    <div className="app narrow">
      <SimpleBar />
      <main className="projWrap pulsePage">
        <h1 className="pageTitle">Pulse</h1>
        <p className="pageSub">You are not alone. Right now, people are planning and working in this city of Lodal.</p>

        {friends && (friends.incoming.length > 0 || friends.friends.length > 0) && (
          <section className="friendsTop" aria-label="Friends">
            {friends.incoming.length > 0 && (
              <div className="friendChips requests">
                {friends.incoming.map((r) => (
                  <button key={r.id} className="friendChip incoming" onClick={() => (setSelected(null), setWant(r.user))} aria-label={`Friend request from ${r.nickname}. Open their profile`}>
                    <span className="avatar" style={{ background: `hsl(${(r.user * 67) % 360} 55% 48%)` }} aria-hidden="true">
                      {r.nickname.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="friendName">🤝 {r.nickname}</span>
                    <span className="friendBadge">request</span>
                  </button>
                ))}
              </div>
            )}
            {friends.friends.length > 0 && (
              <>
                <h2 className="pulseH">
                  Friends <span className="friendCount">{friends.friends.filter((f) => f.active).length} online</span>
                </h2>
                <div className="friendChips">
                  {friends.friends.map((f) => (
                    <button key={f.user} className="friendChip" onClick={() => setChatWith({ user: f.user, nickname: f.nickname })} aria-label={`Message ${f.nickname}${f.active ? ", online" : ""}${f.unread ? `, ${f.unread} new` : ""}`}>
                      <span className="avatar" style={{ background: `hsl(${(f.user * 67) % 360} 55% 48%)` }} aria-hidden="true">
                        {f.nickname.slice(0, 1).toUpperCase()}
                        {f.active && <i className="onlineDot" />}
                      </span>
                      <span className="friendName">{f.nickname}</span>
                      {f.unread > 0 && <span className="friendBadge">{f.unread}</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <section className="mapCard" aria-label="Who is here now" ref={mapRef}>
          <div className="mapHead">
            <p className="mapCount">
              <span className="liveDot on" /> <b>{data ? data.active_now : "–"}</b> active now <span className="mapOf">out of {data ? data.total_users : "–"} users</span>
            </p>
          </div>
          <div className="mapWrap">
            {data && <CityScene lights={data.lights} selected={selected} onSelect={setSelected} />}
            {sel && pos && (
              <div className={`mapCardPop ${side} ${below ? "below" : ""}`} style={pos} role="dialog" aria-label={`${sel.nickname}, profile`}>
                <button className="x show" aria-label="Close" onClick={() => setSelected(null)}>
                  ×
                </button>
                <div className="profHead">
                  <span className="avatar big" style={{ background: `hsl(${((sel.user ?? 0) * 67) % 360} 55% 48%)` }} aria-hidden="true">
                    {(sel.nickname ?? "?").slice(0, 1).toUpperCase()}
                  </span>
                  <div className="profName">
                    <b>{sel.mine ? `${sel.nickname} (you)` : sel.nickname}</b>
                    {sel.active ? (
                      <span className="status on">
                        <i className="liveDot on" /> Active · planning now
                      </span>
                    ) : (
                      <span className="status">{sel.last_seen ? `Was here ${ago(sel.last_seen)}` : "Away"}</span>
                    )}
                  </div>
                </div>
                {!sel.mine && sel.user !== undefined && (
                  <div className="profActions">
                    <button className={`checkBtn ${sel.checked ? "on" : ""}`} disabled={sel.checked} onClick={() => checkPulse(sel.user as number)} title="Let them know you saw they are here">
                      💓 {sel.checked ? "Checked" : "Check pulse"}
                    </button>
                    {sel.relation === "friend" ? (
                      <button className="checkBtn on" onClick={() => setChatWith({ user: sel.user as number, nickname: sel.nickname as string })}>
                        💬 Message
                      </button>
                    ) : sel.relation === "requested" ? (
                      <button className="checkBtn" disabled>
                        Request sent
                      </button>
                    ) : sel.relation === "incoming" ? (
                      <>
                        <button className="checkBtn on" onClick={() => addFriend(sel.user as number)}>
                          🤝 Accept friend
                        </button>
                        {sel.request_id ? (
                          <button className="checkBtn" onClick={() => answer(sel.request_id as number, false)}>
                            Decline
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <button className="checkBtn" onClick={() => addFriend(sel.user as number)}>
                        ➕ Add friend
                      </button>
                    )}
                  </div>
                )}
                <h3 className="actTitle">Recent activity</h3>
                {sel.events && sel.events.length > 0 ? (
                  <ul className="actList">
                    {sel.events.map((e) => (
                      <li key={e.id}>
                        <span className="actText">
                          Finished a task <small>{ago(e.created_at)}</small>
                        </span>
                        {sel.mine ? (
                          <span className="clapCount">👏 {e.claps}</span>
                        ) : (
                          <button className={`clapBtn ${e.clapped ? "on" : ""} ${popped ? "pop" : ""}`} disabled={e.clapped} onClick={() => clap(e.id)} aria-label={e.clapped ? "You clapped" : `Clap for ${sel.nickname}`}>
                            👏 {e.claps > 0 ? e.claps : ""}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="actEmpty">Nothing finished yet today.</p>
                )}
                {!sel.mine && sel.user !== undefined && (
                  <p className="profFoot">
                    <button className="linkBtn" onClick={() => setReport({ user: sel.user as number, nickname: sel.nickname as string })}>
                      Report
                    </button>
                    <button className="linkBtn" onClick={() => blockUser(sel.user as number, sel.nickname as string)}>
                      Block
                    </button>
                  </p>
                )}
              </div>
            )}
          </div>
          <p className="mapHint">Each lit window is a person working right now. Tap a glowing window to see what they did.</p>
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
                  <b>Want to be seen?</b> Pick a nickname (not your email or real name) and others can tap your window and cheer you on. Without one, you are an anonymous lit window.
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

        {blocked.length > 0 && (
          <details className="blockedBox">
            <summary>Blocked people ({blocked.length})</summary>
            <ul className="friendList">
              {blocked.map((b) => (
                <li key={b.user}>
                  <span className="friendName">{b.nickname}</span>
                  <button className="btn" onClick={() => unblockUser(b.user)}>
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </main>
      {chatWith && <DirectChat key={chatWith.user} peer={chatWith} onClose={() => setChatWith(null)} onChanged={load} />}
      {report && <ReportDialog kind="user" target={report.user} who={report.nickname} blockUserId={report.user} onClose={() => setReport(null)} onBlocked={() => (setSelected(null), load())} />}
    </div>
  );
}
