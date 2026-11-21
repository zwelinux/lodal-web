"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, token, type AssignedTicket, type Subject, type User } from "@/lib/api";
import { addDays, dayNum, toISO, longDay, monthShort, rangeLabel, today, weekdayShort, weekDays, weekStart } from "@/lib/dates";
import { useDismiss } from "@/lib/useDismiss";
import { useIsPhone } from "@/lib/useIsPhone";
import { applyTheme, effectiveTheme, getTheme, type ThemeChoice } from "@/lib/theme";
import AdBanner from "./AdBanner";
import LogoMark from "./LogoMark";
import AppTabs from "./AppTabs";
import DateNav from "./DateNav";
import HiddenList from "./HiddenList";
import ViewToggle from "./ViewToggle";
import { countTasks, parseTasks, serializeTasks, TASK_MIME, type DragPayload } from "@/lib/tasks";
import AutoTextarea from "./AutoTextarea";
import TaskList from "./TaskList";

type Cells = Record<string, string>; // key = `${subjectId}|${date}`
type Sync = "saved" | "saving" | "offline";
const key = (sid: number, d: string) => `${sid}|${d}`;

export default function Planner() {
  return (
    <Suspense>
      <PlannerInner />
    </Suspense>
  );
}

function PlannerInner() {
  const router = useRouter();
  const params = useSearchParams();
  const phone = useIsPhone();

  const [user, setUser] = useState<User | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [hiddenSubjects, setHiddenSubjects] = useState<Subject[]>([]);
  const [cells, setCells] = useState<Cells>({});
  const [assigned, setAssigned] = useState<AssignedTicket[]>([]);
  const [day, setDay] = useState(today());
  const [loaded, setLoaded] = useState(false);
  const [sync, setSync] = useState<Sync>("saved");
  const [menu, setMenu] = useState(false);
  const [upgrade, setUpgrade] = useState(false);
  useDismiss(menu, useCallback(() => setMenu(false), []));
  const [manage, setManage] = useState(false);
  const [theme, setTheme] = useState<ThemeChoice>(() => (typeof window === "undefined" ? "auto" : getTheme()));
  const [seen, setSeen] = useState<"light" | "dark">(() => (typeof window === "undefined" ? "light" : effectiveTheme()));
  const chooseTheme = (t: ThemeChoice) => {
    applyTheme(t);
    setTheme(t);
    setSeen(effectiveTheme());
  };
  const [view, setView] = useState<"today" | "week">("today");
  const [notice, setNotice] = useState(params.get("upgraded") ? "Thank you! Ads are now off." : "");

  // Follow the device clock: when midnight passes, "today" moves on by itself.
  const lastToday = useRef(today());
  const [, setTick] = useState(0);
  useEffect(() => {
    const tick = () => {
      const t = today();
      if (t === lastToday.current) return;
      const prev = lastToday.current;
      lastToday.current = t;
      setDay((d) => (d === prev ? t : d));
      setTick((n) => n + 1);
    };
    const id = setInterval(tick, 30000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const pending = useRef(new Map<string, { timer: ReturnType<typeof setTimeout>; text: string }>());
  const dayRef = useRef(day);
  useEffect(() => {
    dayRef.current = day;
  }, [day]);

  const bail = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) {
        token.clear();
        router.replace("/login");
        return true;
      }
      return false;
    },
    [router],
  );

  const load = useCallback(async () => {
    const ws = weekStart(dayRef.current);
    const from = addDays(ws, -7);
    const to = addDays(ws, 14);
    try {
      const g = await api.grid(from, to);
      setUser(g.user);
      setSubjects(g.subjects);
      setHiddenSubjects(g.hidden_subjects ?? []);
      setAssigned(g.assigned ?? []);
      setCells((prev) => {
        const next: Cells = {};
        for (const [k, v] of Object.entries(prev)) {
          const d = k.split("|")[1];
          if (d < from || d > to || pending.current.has(k)) next[k] = v;
        }
        for (const e of g.entries) if (!pending.current.has(key(e.subject, e.date))) next[key(e.subject, e.date)] = e.text;
        return next;
      });
      setLoaded(true);
      if (pending.current.size === 0) setSync("saved");
    } catch (e) {
      if (!bail(e)) setSync("offline");
    }
  }, [bail]);

  // Load on start, when the week changes, every 20 seconds, and when you come back to the tab.
  const week = weekStart(day);
  useEffect(() => {
    if (!token.get()) {
      router.replace("/login");
      return;
    }
    load();
  }, [week, load, router]);
  useEffect(() => {
    const id = setInterval(load, 20000);
    const vis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("online", load);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("online", load);
    };
  }, [load]);

  const retry = useRef<(sid: number, date: string, text: string) => void>(() => {});
  const flush = useCallback(
    async (sid: number, date: string, text: string) => {
      const k = key(sid, date);
      try {
        await api.saveCell(sid, date, text);
        const p = pending.current.get(k);
        if (p && p.text === text) pending.current.delete(k); // no newer edit came in
        setSync(pending.current.size ? "saving" : "saved");
      } catch (e) {
        if (bail(e)) return;
        setSync("offline");
        const p = pending.current.get(k);
        if (p) pending.current.set(k, { text: p.text, timer: setTimeout(() => retry.current(sid, date, p.text), 5000) }); // try again soon
      }
    },
    [bail],
  );
  useEffect(() => {
    retry.current = flush;
  }, [flush]);

  const setCell = useCallback(
    (sid: number, date: string, text: string) => {
      const k = key(sid, date);
      setCells((c) => ({ ...c, [k]: text }));
      const old = pending.current.get(k);
      if (old) clearTimeout(old.timer);
      pending.current.set(k, { text, timer: setTimeout(() => flush(sid, date, text), 600) });
      setSync("saving");
    },
    [flush],
  );

  // Tick a project ticket that was given to you. Everyone in the project sees it.
  async function toggleTicket(id: number) {
    const t = assigned.find((a) => a.id === id);
    if (!t) return;
    setAssigned((l) => l.map((a) => (a.id === id ? { ...a, done: !a.done } : a)));
    try {
      await api.updateTicket(id, { done: !t.done });
    } catch (e) {
      setAssigned((l) => l.map((a) => (a.id === id ? { ...a, done: t.done } : a)));
      if (!bail(e)) setSync("offline");
    }
  }

  // Move an unfinished task to another day (and subject, if dropped on another row).
  function moveTask(p: DragPayload, toSid: number, toDate: string) {
    if (p.sid === toSid && p.date === toDate) return;
    if (toDate < today()) return;
    const fromTasks = parseTasks(cells[key(p.sid, p.date)] ?? "");
    const idx = fromTasks[p.i] && fromTasks[p.i].text === p.text && !fromTasks[p.i].done ? p.i : fromTasks.findIndex((t) => t.text === p.text && !t.done);
    if (idx < 0) return;
    const [moved] = fromTasks.splice(idx, 1);
    const toTasks = parseTasks(cells[key(toSid, toDate)] ?? "");
    toTasks.push({ text: moved.text, done: false });
    setCell(p.sid, p.date, serializeTasks(fromTasks));
    setCell(toSid, toDate, serializeTasks(toTasks));
  }

  // Don't lose the last few letters if someone closes the tab right after typing.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (pending.current.size) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  async function addSubject(name: string) {
    try {
      const s = await api.addSubject(name);
      setSubjects((l) => [...l, s]);
    } catch (e) {
      if (!bail(e)) setSync("offline");
    }
  }
  async function renameSubject(id: number, name: string) {
    const clean = name.trim();
    const cur = subjects.find((s) => s.id === id);
    if (!clean || !cur || cur.name === clean) return;
    setSubjects((l) => l.map((s) => (s.id === id ? { ...s, name: clean } : s)));
    try {
      await api.renameSubject(id, clean);
    } catch (e) {
      if (!bail(e)) setSync("offline");
    }
  }
  async function removeSubject(s: Subject) {
    if (!confirm(`Remove "${s.name}"?\n\nIf it is empty it is deleted. If something is written in it, it is only hidden and nothing is lost. You can show it again from "Hidden subjects".`)) return;
    try {
      const r = await api.deleteSubject(s.id);
      setSubjects((l) => l.filter((x) => x.id !== s.id));
      if (r.result === "hidden") {
        setHiddenSubjects((l) => [...l, s]);
        setNotice(`Hidden "${s.name}". Everything in it is kept. Bring it back from "Hidden subjects".`);
      } else setNotice(`Deleted "${s.name}".`);
    } catch (e) {
      if (!bail(e)) setSync("offline");
    }
  }
  async function restoreSubject(id: number) {
    try {
      const back = await api.restoreSubject(id);
      setHiddenSubjects((l) => l.filter((x) => x.id !== id));
      setSubjects((l) => [...l, back].sort((a, b) => a.position - b.position));
      load(); // bring its notes back too
    } catch (e) {
      if (!bail(e)) setSync("offline");
    }
  }

  async function startUpgrade() {
    try {
      const { url } = await api.checkout();
      window.location.href = url;
    } catch (e) {
      if (!bail(e)) setNotice(e instanceof Error ? e.message : "Could not start payment.");
    }
  }
  async function logout() {
    try {
      await api.logout();
    } catch {}
    token.clear();
    router.replace("/");
  }
  async function deleteAccount() {
    if (!confirm("Delete your account and all your data forever? This cannot be undone.")) return;
    try {
      await api.deleteAccount();
      token.clear();
      router.replace("/");
    } catch (e) {
      if (!bail(e)) setNotice("Could not delete the account. Please try again.");
    }
  }

  const days = phone ? weekDays(day) : view === "week" ? Array.from({ length: 7 }, (_, i) => addDays(day, i)) : [day];
  const step = phone || view === "today" ? 1 : 7;
  const dateNav = (
    <DateNav
      day={day}
      setDay={setDay}
      step={step}
      showToday={phone || view === "today" ? day !== today() : days[0] !== today()}
      label={phone ? longDay(day) : view === "today" ? `${weekdayShort(day)}, ${dayNum(day)} ${monthShort(day)}` : rangeLabel(days)}
    />
  );

  if (!loaded) return <div className="loading">Loading your planner…</div>;

  return (
    <div className={`app ${!phone && view === "today" ? "narrow" : ""}`}>
      <header className="bar">
        <span className="logo">
          <LogoMark />
          Lodal
        </span>
        <AppTabs />
        <span className="grow" />
        <span className={`sync ${sync}`} role="status">
          {sync === "saved" ? "Saved" : sync === "saving" ? "Saving…" : "Offline, will retry"}
        </span>
        <button
          className="iconBtn themeBtn"
          aria-label={seen === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={seen === "dark" ? "Light mode" : "Dark mode"}
          onClick={() => chooseTheme(seen === "dark" ? "light" : "dark")}
        >
          {seen === "dark" ? "☀" : "☾"}
        </button>
        <div className="menuWrap">
          <button className="iconBtn" aria-label="Account" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            ⋯
          </button>
          {menu && (
            <div className="menu" role="menu">
              <div className="menuInfo">
                {user?.email}
                <small>{user?.is_pro ? "Pro, no ads" : "Free plan"}</small>
              </div>
              <div className="themeRow" role="group" aria-label="Appearance">
                {(["light", "dark", "auto"] as const).map((t) => (
                  <button key={t} aria-pressed={theme === t} onClick={() => chooseTheme(t)}>
                    {t === "light" ? "Light" : t === "dark" ? "Dark" : "Auto"}
                  </button>
                ))}
              </div>
              {user?.is_pro ? (
                <button
                  role="menuitem"
                  onClick={async () => {
                    try {
                      window.location.href = (await api.portal()).url;
                    } catch (e) {
                      setNotice(e instanceof Error ? e.message : "");
                    }
                  }}
                >
                  Manage subscription
                </button>
              ) : (
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenu(false);
                    setUpgrade(true);
                  }}
                >
                  Remove ads · $1/month
                </button>
              )}
              <button role="menuitem" onClick={logout}>
                Log out
              </button>
              <button role="menuitem" className="danger" onClick={deleteAccount}>
                Delete my account
              </button>
            </div>
          )}
        </div>
      </header>

      {(phone || view === "week") && <div className="dateBar">{dateNav}</div>}

      {notice && (
        <div className="notice" role="status">
          {notice}
          <button className="iconBtn" aria-label="Dismiss" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}

      {!phone && view === "today" && <Hero day={day} subjects={subjects} cells={cells} assigned={assigned} nav={dateNav} />}

      {phone ? (
        <DayView
          hiddenSubjects={hiddenSubjects}
          restoreSubject={restoreSubject}
          assigned={assigned}
          toggleTicket={toggleTicket}
          day={day}
          setDay={setDay}
          subjects={subjects}
          cells={cells}
          setCell={setCell}
          manage={manage}
          setManage={setManage}
          addSubject={addSubject}
          renameSubject={renameSubject}
          removeSubject={removeSubject}
        />
      ) : (
        <WeekGrid
          hiddenSubjects={hiddenSubjects}
          restoreSubject={restoreSubject}
          assigned={assigned}
          toggleTicket={toggleTicket}
          moveTask={moveTask}
          view={view}
          setView={(v) => {
            setView(v);
            if (v === "today") setDay(today());
          }}
          days={days}
          subjects={subjects}
          cells={cells}
          setCell={setCell}
          addSubject={addSubject}
          renameSubject={renameSubject}
          removeSubject={removeSubject}
        />
      )}

      {user && !user.is_pro && <AdBanner onUpgrade={() => setUpgrade(true)} />}

      {upgrade && (
        <div className="overlay" onClick={() => setUpgrade(false)}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="upTitle" onClick={(e) => e.stopPropagation()}>
            <h2 id="upTitle">Lodal without ads</h2>
            <p className="price">
              $1<span> / month</span>
            </p>
            <p>Lodal stays free. If the ads bother you, pay one dollar a month and they disappear. Cancel any time.</p>
            <button className="btn primary big" onClick={startUpgrade}>
              Remove ads
            </button>
            <button className="btn" onClick={() => setUpgrade(false)}>
              Not now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type SubjectActions = {
  assigned: AssignedTicket[];
  toggleTicket: (id: number) => void;
  subjects: Subject[];
  cells: Cells;
  setCell: (sid: number, date: string, text: string) => void;
  addSubject: (name: string) => void;
  renameSubject: (id: number, name: string) => void;
  removeSubject: (s: Subject) => void;
  hiddenSubjects: Subject[];
  restoreSubject: (id: number) => void;
};

function AddSubject({ onAdd }: { onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  if (!open)
    return (
      <button className="btn addSubject" onClick={() => setOpen(true)}>
        + Add subject
      </button>
    );
  return (
    <form
      className="addForm"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onAdd(name.trim());
        setName("");
        setOpen(false);
      }}
    >
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Subject name, e.g. Family" aria-label="Subject name" maxLength={120} />
      <button className="btn primary">Add</button>
      <button type="button" className="btn" onClick={() => setOpen(false)}>
        Cancel
      </button>
    </form>
  );
}

function SubjectName({ s, rename }: { s: Subject; rename: (id: number, n: string) => void }) {
  const [v, setV] = useState(s.name);
  return (
    <AutoTextarea
      className="subjName"
      value={v}
      aria-label="Subject name"
      onChange={(e) => setV(e.target.value.replace(/\n/g, " "))}
      onBlur={() => (v.trim() ? rename(s.id, v) : setV(s.name))}
      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), e.currentTarget.blur())}
    />
  );
}

const subjColor = (i: number) => `hsl(${(i * 57 + 165) % 360} 52% 56%)`;

function WeekGrid({ days, view, setView, moveTask, assigned, toggleTicket, hiddenSubjects, restoreSubject, subjects, cells, setCell, addSubject, renameSubject, removeSubject }: SubjectActions & { days: string[]; view: "today" | "week"; setView: (v: "today" | "week") => void; moveTask: (p: DragPayload, toSid: number, toDate: string) => void }) {
  const t = today();
  return (
    <main className={`gridWrap ${view === "today" ? "oneDay" : ""}`}>
      <div className="gridTools">
        <ViewToggle expanded={view === "week"} onClick={() => setView(view === "today" ? "week" : "today")} />
      </div>
      <div className="weekGrid" style={{ "--n": days.length } as React.CSSProperties}>
        <div />
        {days.map((d) => (
          <div key={d} className={`gHead ${d === t ? "isToday" : ""} ${view === "week" ? "wk" : ""}`}>
            {view === "week" ? (
              <>
                <b className="wd">{weekdayShort(d)}</b>
                <span className="dn">{dayNum(d)}</span>
              </>
            ) : (
              <>
                <b>{d === t ? "Today" : d === addDays(t, 1) ? "Tomorrow" : d === addDays(t, -1) ? "Yesterday" : weekdayShort(d)}</b>
                <span>
                  {dayNum(d)} {monthShort(d)}
                </span>
              </>
            )}
          </div>
        ))}
        {subjects.map((s, i) => (
          <div key={s.id} style={{ display: "contents", "--sc": subjColor(i) } as React.CSSProperties}>
            <div className="gSubj">
              <i className="swatch" />
              <SubjectName key={s.name} s={s} rename={renameSubject} />
              <button className="x" aria-label={`Delete ${s.name}`} onClick={() => removeSubject(s)}>
                ×
              </button>
            </div>
            {days.map((d) => (
              <Cell key={d} today={d === t} past={d < t} drag={view === "week" ? { sid: s.id, date: d } : undefined} onDropTask={(p) => moveTask(p, s.id, d)} label={`${s.name}, ${weekdayShort(d)} ${dayNum(d)}`} value={cells[key(s.id, d)] ?? ""} onChange={(v) => setCell(s.id, d, v)} />
            ))}
          </div>
        ))}
        {projectRows(assigned, days).map(([pid, pname]) => (
          <div key={`p${pid}`} style={{ display: "contents" }}>
            <div className="gSubj proj">
              <Link href={`/app/projects/${pid}`} className="projLink" title="Open project">
                <PeopleIcon />
                {pname}
              </Link>
            </div>
            {days.map((d) => (
              <ProjectCell key={d} isToday={d === t} tickets={assigned.filter((a) => a.project === pid && a.date === d)} toggle={toggleTicket} />
            ))}
          </div>
        ))}
      </div>
      {subjects.length === 0 && assigned.length === 0 && <p className="empty">Add your first subject to begin, for example “Work” or “Family”.</p>}
      <AddSubject onAdd={addSubject} />
      <HiddenList label="Hidden subjects" items={hiddenSubjects} onRestore={restoreSubject} />
    </main>
  );
}

/** The device's own clock, ticking every second. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function projectRows(assigned: AssignedTicket[], days: string[]): [number, string][] {
  const m = new Map<number, string>();
  for (const a of assigned) if (days.includes(a.date)) m.set(a.project, a.project_name);
  return [...m.entries()];
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
      <circle cx="7.5" cy="7" r="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M2 16c.6-2.8 2.6-4.2 5.5-4.2S12.400 13.200 13 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="14" cy="7.800" r="2.300" fill="none" stroke="currentColor" strokeWidth="1.600" />
      <path d="M14.500 11.800c2 .2 3.200 1.500 3.600 3.700" fill="none" stroke="currentColor" strokeWidth="1.600" strokeLinecap="round" />
    </svg>
  );
}

function ProjectTickets({ tickets, toggle }: { tickets: AssignedTicket[]; toggle: (id: number) => void }) {
  return (
    <div className="tasks projTasks">
      {tickets.map((a) => (
        <div key={a.id} className={`pTicket ${a.done ? "done" : ""}`}>
          <button
            type="button"
            role="checkbox"
            aria-checked={a.done}
            aria-label={a.done ? "Mark as not done" : "Mark as done"}
            className="tick"
            onClick={() => toggle(a.id)}
          >
            <span>
              {a.done && (
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
          </button>
          <span className="pTitle">{a.title}</span>
        </div>
      ))}
    </div>
  );
}

function ProjectCell({ tickets, isToday, toggle }: { tickets: AssignedTicket[]; isToday: boolean; toggle: (id: number) => void }) {
  return (
    <div className={`gCell projCell ${isToday ? "isToday" : ""}`}>
      <ProjectTickets tickets={tickets} toggle={toggle} />
    </div>
  );
}

function Hero({ day, subjects, cells, assigned, nav }: { day: string; subjects: Subject[]; cells: Cells; assigned: AssignedTicket[]; nav: React.ReactNode }) {
  const now = useNow();
  const isToday = day === toISO(now);
  const h = now.getHours();
  const greet = h < 5 ? "Still up?" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  let total = 0;
  let done = 0;
  for (const s of subjects) {
    const c = countTasks(cells[key(s.id, day)] ?? "");
    total += c.total;
    done += c.done;
  }
  for (const a of assigned) {
    if (a.date !== day) continue;
    total += 1;
    if (a.done) done += 1;
  }
  const clock = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const pct = total ? Math.round((done / total) * 100) : 0;
  const R = 46;
  const C = 2 * Math.PI * R;
  let line = "";
  if (subjects.length === 0) line = "Add a subject below to begin.";
  else if (total === 0) line = isToday ? "A clear page. What is the one thing that matters today?" : "Nothing planned yet.";
  else if (done === total) line = "Everything is done. Well played.";
  return (
    <section className="hero2">
      <div className="heroText">
        <div className="greetRow">
          <h1>{isToday ? greet : "Plan ahead"}</h1>
          {isToday && <time className="heroClock">{clock}</time>}
        </div>
        {line && <p className="heroLine">{line}</p>}
        {nav}
      </div>
      {total > 0 && (
        <div className="ringBox" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Tasks done">
          <svg viewBox="0 0 110 110" width="84" height="84" aria-hidden="true">
            <circle cx="55" cy="55" r={R} fill="none" stroke="var(--line)" strokeWidth="11" />
            <circle
              className="ringFill"
              cx="55"
              cy="55"
              r={R}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="11"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - done / total)}
              transform="rotate(-90 55 55)"
            />
          </svg>
          <span className="ringNum">{pct}%</span>
          <p className="ringCap">
            {done} of {total} done
          </p>
        </div>
      )}
    </section>
  );
}

function Cell({ value, onChange, label, today: isToday, past, drag, onDropTask }: { value: string; onChange: (v: string) => void; label: string; today: boolean; past: boolean; drag?: { sid: number; date: string }; onDropTask: (p: DragPayload) => void }) {
  const [over, setOver] = useState(false);
  const canDrop = !!drag && !past;
  return (
    <div
      className={`gCell ${isToday ? "isToday" : ""} ${past ? "isPast" : ""} ${over ? "dropOver" : ""}`}
      onDragOver={(e) => {
        if (!canDrop || !e.dataTransfer.types.includes(TASK_MIME)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!over) setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(e) => {
        setOver(false);
        if (!canDrop) return;
        const raw = e.dataTransfer.getData(TASK_MIME);
        if (!raw) return;
        e.preventDefault();
        try {
          onDropTask(JSON.parse(raw) as DragPayload);
        } catch {}
      }}
    >
      <TaskList value={value} onChange={onChange} label={label} readOnly={past} drag={drag} />
    </div>
  );
}

function DayView({
  day,
  setDay,
  manage,
  setManage,
  subjects,
  cells,
  setCell,
  assigned,
  toggleTicket,
  hiddenSubjects,
  restoreSubject,
  addSubject,
  renameSubject,
  removeSubject,
}: SubjectActions & { day: string; setDay: (d: string) => void; manage: boolean; setManage: (b: boolean) => void }) {
  const t = today();
  const days = weekDays(day);
  return (
    <main className="dayWrap">
      <div className="strip" role="tablist" aria-label="Days of this week">
        {days.map((d) => {
          const has = subjects.some((s) => (cells[key(s.id, d)] ?? "").trim());
          return (
            <button key={d} role="tab" aria-selected={d === day} className={`chip ${d === t ? "isToday" : ""}`} onClick={() => setDay(d)}>
              <small>{weekdayShort(d)[0]}</small>
              <b>{dayNum(d)}</b>
              <i className={has ? "dot" : "dot off"} />
            </button>
          );
        })}
      </div>

      {subjects.map((s) => (
        <section key={s.id} className="card">
          <h3>{s.name}</h3>
          <TaskList value={cells[key(s.id, day)] ?? ""} onChange={(v) => setCell(s.id, day, v)} label={`${s.name}, ${longDay(day)}`} readOnly={day < t} />
        </section>
      ))}
      {projectRows(assigned, [day]).map(([pid, pname]) => (
        <section key={`p${pid}`} className="card projCard2">
          <h3>
            <Link href={`/app/projects/${pid}`} className="projLink">
              <PeopleIcon />
              {pname}
            </Link>
          </h3>
          <ProjectTickets tickets={assigned.filter((a) => a.project === pid && a.date === day)} toggle={toggleTicket} />
        </section>
      ))}
      {subjects.length === 0 && assigned.length === 0 && <p className="empty">Add your first subject to begin, for example “Work” or “Family”.</p>}

      <button className="linkBtn manageBtn" onClick={() => setManage(!manage)}>
        {manage ? "Done editing subjects" : "Edit subjects"}
      </button>
      {manage && (
        <div className="card">
          {subjects.map((s) => (
            <div key={s.id} className="manageRow">
              <SubjectName key={s.name} s={s} rename={renameSubject} />
              <button className="x show" aria-label={`Delete ${s.name}`} onClick={() => removeSubject(s)}>
                Delete
              </button>
            </div>
          ))}
          <AddSubject onAdd={addSubject} />
          <HiddenList label="Hidden subjects" items={hiddenSubjects} onRestore={restoreSubject} />
        </div>
      )}
    </main>
  );
}
