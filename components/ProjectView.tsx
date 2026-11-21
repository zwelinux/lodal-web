"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, token, type Invite, type Member, type ProjectDetail, type ProjectSubject, type ProjectTicket } from "@/lib/api";
import { addDays, dayNum, longDay, monthShort, rangeLabel, today, weekdayShort } from "@/lib/dates";
import { useIsPhone } from "@/lib/useIsPhone";
import DateNav from "./DateNav";
import AutoTextarea from "./AutoTextarea";
import AdBanner from "./AdBanner";
import ProjectBoard from "./ProjectBoard";
import ProjectChat from "./ProjectChat";
import SimpleBar from "./SimpleBar";
import ViewToggle from "./ViewToggle";
import { AddSubjectButton, HiddenButton } from "./ToolbarIcons";

const hue = (id: number) => `hsl(${(id * 67 + 140) % 360} 50% 52%)`;

function Avatar({ m }: { m: Pick<Member, "user_id" | "name"> }) {
  return (
    <span className="avatar" style={{ background: hue(m.user_id) }} title={m.name} aria-hidden="true">
      {m.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export default function ProjectView() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [data, setData] = useState<ProjectDetail | null>(null);
  const [me, setMe] = useState<number | null>(null);
  const [isPro, setIsPro] = useState(true); // assume paid until we know, so free users never see a flash and paid users never do
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [view, setView] = useState<"today" | "week">("today");
  const [day, setDay] = useState(today());
  const phone = useIsPhone();
  const [notice, setNotice] = useState("");
  const [info, setInfo] = useState("");
  const [peopleOpen, setPeopleOpen] = useState(false);
  useEffect(() => {
    if (!peopleOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPeopleOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [peopleOpen]);

  const load = useCallback(async () => {
    try {
      setData(await api.project(id));
      setError("");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        token.clear();
        router.replace(`/login?next=/app/projects/${id}`);
      } else if (e instanceof ApiError && e.status === 404) setError("This project does not exist, or you are not in it.");
      else if (e instanceof Error) setError(e.message);
    }
  }, [id, router]);

  useEffect(() => {
    if (!token.get()) {
      router.replace(`/login?next=/app/projects/${id}`);
      return;
    }
    api.me().then((u) => (setMe(u.id), setIsPro(u.is_pro))).catch(() => {});
    const first = setTimeout(load, 0);
    const t = setInterval(load, 15000);
    const vis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", vis);
    return () => {
      clearTimeout(first);
      clearInterval(t);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [id, load, router]);

  if (error)
    return (
      <div className="app narrow">
        <SimpleBar />
        <main className="projWrap">
          <p className="error">{error}</p>
          <Link href="/app/projects">← All projects</Link>
        </main>
      </div>
    );
  if (!data) return <div className="loading">Loading project…</div>;

  const { project, members, invites, tickets } = data;
  const patchLocal = (tid: number, p: Partial<ProjectTicket>) =>
    setData((d) => (d ? { ...d, tickets: d.tickets.map((t) => (t.id === tid ? { ...t, ...p } : t)) } : d));

  async function update(t: ProjectTicket, patch: Partial<Pick<ProjectTicket, "title" | "date" | "assignee" | "done">>) {
    patchLocal(t.id, patch);
    try {
      await api.updateTicket(t.id, patch);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not save.");
      load();
    }
  }

  const days = phone || view === "today" ? [day] : Array.from({ length: 7 }, (_, i) => addDays(day, i));
  const dayTickets = tickets.filter((t) => t.date === day);
  const dayTotal = dayTickets.length;
  const dayDone = dayTickets.filter((t) => t.done).length;

  const run = async (fn: () => Promise<unknown>) => {
    try {
      const msg = await fn();
      setNotice("");
      if (typeof msg === "string") setInfo(msg);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Something went wrong.");
    }
    load();
  };
  const addSubject = (name: string) => run(() => api.addProjectSubject(id, name));
  const renameSubject = (sid: number, name: string) => {
    setData((d) => (d ? { ...d, subjects: d.subjects.map((x) => (x.id === sid ? { ...x, name } : x)) } : d));
    run(() => api.renameProjectSubject(sid, name));
  };
  const deleteSubject = (sub: ProjectSubject) => {
    if (!confirm(`Remove "${sub.name}" for everyone?\n\nIf it is empty it is deleted. If it has tickets, it is only hidden and nothing is lost. You can show it again from "Hidden subjects".`)) return;
    run(async () => {
      const r = await api.deleteProjectSubject(sub.id);
      return r.result === "hidden" ? `Hidden "${sub.name}". Its tickets are kept.` : `Deleted "${sub.name}".`;
    });
  };
  const restoreSubject = (sid: number) => run(() => api.restoreProjectSubject(sid));
  const reorderSubjects = (ids: number[]) => {
    setData((d) => {
      if (!d) return d;
      const byId = new Map(d.subjects.map((x) => [x.id, x]));
      return { ...d, subjects: ids.map((i) => byId.get(i)).filter((x): x is ProjectSubject => !!x) };
    });
    run(() => api.reorderProjectSubjects(id, ids));
  };
  const addTicket = (p: { title: string; date: string; subject: number; assignee: number | null }) => run(() => api.addTicket(id, p));
  const deleteTicket = (t: ProjectTicket) => run(() => api.deleteTicket(t.id));

  return (
    <div className={`app ${view === "week" ? "" : "narrow"}`}>
      <SimpleBar />
      <main className="projWrap">
        <section className="hero2">
          <div className="heroText">
            <ProjectName project={project} onRename={async (n) => setData(await api.renameProject(id, n))} />
            <div className="heroRow">
            <DateNav
              day={day}
              setDay={setDay}
              step={phone || view === "today" ? 1 : 7}
              showToday={phone || view === "today" ? day !== today() : days[0] !== today()}
              label={phone ? longDay(day) : view === "today" ? `${weekdayShort(day)}, ${dayNum(day)} ${monthShort(day)}` : rangeLabel(days)}
            />
              <div className="projMeta">
              <button className="peopleBtn" onClick={() => setPeopleOpen(true)} aria-haspopup="dialog">
                <span className="avatarStack" aria-hidden="true">
                  {members.slice(0, 4).map((m) => (
                    <Avatar key={m.user_id} m={m} />
                  ))}
                </span>
                <span>
                  {members.length} {members.length === 1 ? "person" : "people"}
                </span>
                {invites.length > 0 && <em>{invites.length} waiting</em>}
                <i aria-hidden="true">▾</i>
              </button>
            </div>
            </div>
          </div>
          {dayTotal > 0 && (
            <div className="ringBox" role="progressbar" aria-valuemin={0} aria-valuemax={dayTotal} aria-valuenow={dayDone} aria-label="Tickets done">
              <svg viewBox="0 0 110 110" width="84" height="84" aria-hidden="true">
                <circle cx="55" cy="55" r="46" fill="none" stroke="var(--line)" strokeWidth="11" />
                <circle
                  className="ringFill"
                  cx="55"
                  cy="55"
                  r="46"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 46}
                  strokeDashoffset={2 * Math.PI * 46 * (1 - dayDone / dayTotal)}
                  transform="rotate(-90 55 55)"
                />
              </svg>
              <span className="ringNum">{Math.round((dayDone / dayTotal) * 100)}%</span>
              <p className="ringCap">
                {dayDone} of {dayTotal} done
              </p>
            </div>
          )}
        </section>

        <section className="boardSection">
          <div className="boardTools">
            <div className="seg" role="group" aria-label="Filter">
              <button aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
                Everyone
              </button>
              <button aria-pressed={filter === "mine"} onClick={() => setFilter("mine")}>
                Mine
              </button>
            </div>
            <div className="toolIcons">
              <ProjectChat projectId={id} isOwner={project.is_owner} initialUnread={project.unread_chat ?? 0} />
              <AddSubjectButton onAdd={addSubject} />
              <HiddenButton groups={[{ label: "Hidden subjects", items: data.hidden_subjects, onRestore: restoreSubject, canRestore: project.is_owner }]} />
              {!phone && (
                <ViewToggle
                  expanded={view === "week"}
                  onClick={() => {
                    setView(view === "today" ? "week" : "today");
                    setDay(today());
                  }}
                />
              )}
            </div>
          </div>
          {project.archived && (
            <div className="notice" role="status">
              This project is hidden. Its tickets are kept and do not show in anyone&apos;s planner.
              {project.is_owner && (
                <button className="btn" onClick={() => run(async () => (await api.restoreProject(id), "Project is visible again."))}>
                  Show it again
                </button>
              )}
            </div>
          )}
          {info && (
            <div className="notice" role="status">
              {info}
              <button className="iconBtn" aria-label="Dismiss" onClick={() => setInfo("")}>
                ×
              </button>
            </div>
          )}
          {notice && (
            <p className="error" role="alert">
              {notice}
            </p>
          )}
          <ProjectBoard
            data={data}
            me={me}
            filter={filter}
            day={day}
            view={view}
            onUpdate={update}
            onAdd={addTicket}
            onDelete={deleteTicket}
            onSubjectAdd={addSubject}
            onSubjectRename={renameSubject}
            onSubjectDelete={deleteSubject}
            onSubjectRestore={restoreSubject}
            onSubjectReorder={reorderSubjects}
          />
        </section>

        {!isPro && <AdBanner />}

        {peopleOpen && (
          <div className="overlay" onClick={() => setPeopleOpen(false)}>
            <div className="dialog wide" role="dialog" aria-modal="true" aria-labelledby="peopleTitle" onClick={(e) => e.stopPropagation()}>
              <div className="dialogHead">
                <h2 id="peopleTitle">People</h2>
                <button className="iconBtn" aria-label="Close" onClick={() => setPeopleOpen(false)}>
                  ×
                </button>
              </div>
              <People members={members} invites={invites} isOwner={project.is_owner} ownerId={project.owner} projectId={id} me={me} onChange={load} onLeft={() => router.replace("/app/projects")} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ProjectName({ project, onRename }: { project: ProjectDetail["project"]; onRename: (n: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(project.name);

  if (!project.is_owner)
    return (
      <h1 className="pageTitle nameText" title={project.name}>
        {project.name}
      </h1>
    );

  function save() {
    const n = v.trim();
    setEditing(false);
    if (n && n !== project.name) onRename(n);
    else setV(project.name);
  }

  if (editing)
    return (
      <AutoTextarea
        className="pageTitle nameEdit"
        value={v}
        autoFocus
        onFocus={(e) => e.currentTarget.select()}
        aria-label="Project name"
        maxLength={120}
        onChange={(e) => setV(e.target.value.replace(/\n/g, " "))}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
          if (e.key === "Escape") {
            setV(project.name);
            setEditing(false);
          }
        }}
      />
    );

  return (
    <div className="nameRow">
      <h1 className="pageTitle nameText" title={project.name}>
        {project.name}
      </h1>
      <button
        className="pencil"
        aria-label="Rename project"
        title="Rename"
        onClick={() => {
          setV(project.name);
          setEditing(true);
        }}
      >
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 16.5l.8-3.4L13.600 3.700a1.800 1.800 0 0 1 2.500 0l.2.2a1.800 1.800 0 0 1 0 2.500L6.900 15.700l-3.400.8z" />
          <path d="M12 5.300l2.700 2.700" />
        </svg>
      </button>
    </div>
  );
}

function People({ members, invites, isOwner, ownerId, projectId, me, onChange, onLeft }: { members: Member[]; invites: Invite[]; isOwner: boolean; ownerId: number; projectId: number; me: number | null; onChange: () => void; onLeft: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "owner">("member");
  const [fresh, setFresh] = useState<(Invite & { email_sent?: boolean }) | null>(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState("");

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const inv = await api.invite(projectId, email.trim(), role);
      setFresh(inv);
      setEmail("");
      onChange();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Could not create the invitation.");
    }
  }
  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(link);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      window.prompt("Copy this link", link);
    }
  }
  async function changeRole(m: Member, r: "owner" | "member") {
    setErr("");
    try {
      await api.setRole(projectId, m.user_id, r);
      onChange();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Could not change the role.");
    }
  }
  async function remove(m: Member) {
    const self = m.user_id === me;
    if (!confirm(self ? "Leave this project? Tickets assigned to you become unassigned." : `Remove ${m.name} from this project?`)) return;
    try {
      await api.removeMember(projectId, m.user_id);
      if (self) onLeft();
      else onChange();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Could not remove.");
    }
  }

  return (
    <section className="peopleBody">
      <div className="people">
        {members.map((m) => (
          <span key={m.user_id} className="person">
            <Avatar m={m} />
            <span>
              {m.name}
              {m.user_id === me && " (you)"}
              {m.role === "owner" && <small> owner</small>}
            </span>
            {isOwner && m.user_id !== me && m.user_id !== ownerId && (
              <select className="roleSel" value={m.role} aria-label={`Role of ${m.name}`} onChange={(e) => changeRole(m, e.target.value as "owner" | "member")}>
                <option value="member">Member</option>
                <option value="owner">Owner</option>
              </select>
            )}
            {m.user_id !== ownerId && (isOwner || m.user_id === me) && (
              <button className="x show" aria-label={m.user_id === me ? "Leave project" : `Remove ${m.name}`} onClick={() => remove(m)}>
                ×
              </button>
            )}
          </span>
        ))}
      </div>

      {isOwner && (
        <>
          <form className="inviteForm" onSubmit={invite}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Friend's email, e.g. friend@gmail.com" aria-label="Friend's email" required autoFocus />
            <select className="roleSel" value={role} aria-label="Role" onChange={(e) => setRole(e.target.value as "member" | "owner")}>
              <option value="member">Member</option>
              <option value="owner">Owner</option>
            </select>
            <button className="btn primary">Invite</button>
          </form>
          <p className="fine">Members can see everything and can only change tickets given to them or made by them. Owners can change anything.</p>
          {err && <p className="error">{err}</p>}
          {fresh && (
            <div className="linkBox" role="status">
              <p>
                {fresh.email_sent ? (
                  <>
                    We emailed an invitation to <b>{fresh.email}</b>. You can also send them this link yourself. It only works for that email and lasts 7 days.
                  </>
                ) : (
                  <>
                    We could not send the email to <b>{fresh.email}</b>. Send them this link yourself. It only works for that email and lasts 7 days.
                  </>
                )}
              </p>
              <div className="linkRow">
                <code>{fresh.link}</code>
                <button className="btn" onClick={() => copy(fresh.link)}>
                  {copied === fresh.link ? "Copied" : "Copy link"}
                </button>
              </div>
            </div>
          )}
          {invites.length > 0 && (
            <div className="pending">
              <h3>Waiting to join</h3>
              {invites.map((i) => (
                <div key={i.id} className="pendingRow">
                  <span>{i.email}{i.role === "owner" && <small> owner</small>}</span>
                  <button
                    className="linkBtn"
                    onClick={async () => {
                      setErr("");
                      try {
                        setFresh(await api.invite(projectId, i.email));
                      } catch (x) {
                        setErr(x instanceof Error ? x.message : "Could not resend.");
                      }
                    }}
                  >
                    Resend email
                  </button>
                  <button className="linkBtn" onClick={() => copy(i.link)}>
                    {copied === i.link ? "Copied" : "Copy link"}
                  </button>
                  <button
                    className="linkBtn"
                    onClick={async () => {
                      await api.revokeInvite(projectId, i.id);
                      if (fresh?.id === i.id) setFresh(null);
                      onChange();
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <DangerZone isOwner={isOwner} projectId={projectId} />
    </section>
  );
}

function DangerZone({ isOwner, projectId }: { isOwner: boolean; projectId: number }) {
  const router = useRouter();
  if (!isOwner) return null;
  return (
    <button
      className="linkBtn dangerLink"
      onClick={async () => {
        if (!confirm("Delete this project?\n\nIf it has no tickets it is deleted. If it has tickets, it is only hidden for everyone and nothing is lost. You can bring it back from “Hidden projects”.")) return;
        try {
          const r = await api.deleteProject(projectId);
          router.replace(`/app/projects?note=${r.result}`);
        } catch {}
      }}
    >
      Delete this project
    </button>
  );
}
