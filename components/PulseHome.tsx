"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
  const [menu, setMenu] = useState(false);

  const load = useCallback(async () => {
    try {
      const [d, f, b] = await Promise.all([api.pulse(), api.friends(), api.blocks()]);
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
    if (!confirm(`Block ${name}? You will not see each other, and you stop being friends if you were.`)) return;
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
  const below = at ? at.y < 0.6 : false; // most windows: open the card underneath, there is more room

  return (
    <div className="app narrow">
      <SimpleBar />
      <main className="projWrap pulsePage">
        <h1 className="pageTitle">Pulse</h1>
        <p className="pageSub">You are not alone. Right now, people are planning and working in this city of Lodal.</p>

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
                  {!sel.mine && sel.user !== undefined && (
                    <button className={`checkBtn ${sel.checked ? "on" : ""}`} disabled={sel.checked} onClick={() => checkPulse(sel.user as number)} title="Let them know you saw they are here">
                      💓 {sel.checked ? "Checked" : "Check pulse"}
                    </button>
                  )}
                </div>
                {!sel.mine && sel.user !== undefined && (
                  <div className="profActions">
                    {sel.relation === "friend" ? (
                      <button className="checkBtn on" onClick={() => setChatWith({ user: sel.user as number, nickname: sel.nickname as string })}>
                        💬 Message
                      </button>
                    ) : sel.relation === "requested" ? (
                      <button className="checkBtn" disabled>
                        Request sent
                      </button>
                    ) : sel.relation === "incoming" ? (
                      <button className="checkBtn on" onClick={() => addFriend(sel.user as number)}>
                        🤝 Accept friend
                      </button>
                    ) : (
                      <button className="checkBtn" onClick={() => addFriend(sel.user as number)}>
                        ➕ Add friend
                      </button>
                    )}
                    <span className="menuWrap">
                      <button className="checkBtn" aria-label="More" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
                        ⋯
                      </button>
                      {menu && (
                        <div className="menu" role="menu" onClick={() => setMenu(false)}>
                          <button role="menuitem" onClick={() => setReport({ user: sel.user as number, nickname: sel.nickname as string })}>
                            Report {sel.nickname}
                          </button>
                          <button role="menuitem" onClick={() => blockUser(sel.user as number, sel.nickname as string)}>
                            Block
                          </button>
                        </div>
                      )}
                    </span>
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

        {friends && (friends.incoming.length > 0 || friends.friends.length > 0 || blocked.length > 0) && (
          <section className="friendsBox" aria-label="Friends">
            {friends.incoming.length > 0 && (
              <>
                <h2 className="pulseH">Friend requests</h2>
                <ul className="friendList">
                  {friends.incoming.map((r) => (
                    <li key={r.id}>
                      <span className="avatar" style={{ background: `hsl(${(r.user * 67) % 360} 55% 48%)` }} aria-hidden="true">
                        {r.nickname.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="friendName">{r.nickname}</span>
                      <button className="btn primary" onClick={() => answer(r.id, true)}>
                        Accept
                      </button>
                      <button className="btn" onClick={() => answer(r.id, false)}>
                        Decline
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {friends.friends.length > 0 && (
              <>
                <h2 className="pulseH">Friends</h2>
                <ul className="friendList">
                  {friends.friends.map((f) => (
                    <li key={f.user}>
                      <span className="avatar" style={{ background: `hsl(${(f.user * 67) % 360} 55% 48%)` }} aria-hidden="true">
                        {f.nickname.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="friendName">{f.nickname}</span>
                      <button className="btn" onClick={() => setChatWith({ user: f.user, nickname: f.nickname })}>
                        💬 Message{f.unread > 0 && <span className="friendBadge">{f.unread}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
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
          </section>
        )}
      </main>
      {chatWith && <DirectChat key={chatWith.user} peer={chatWith} onClose={() => setChatWith(null)} onChanged={load} />}
      {report && <ReportDialog kind="user" target={report.user} who={report.nickname} blockUserId={report.user} onClose={() => setReport(null)} onBlocked={() => (setSelected(null), load())} />}
    </div>
  );
}
