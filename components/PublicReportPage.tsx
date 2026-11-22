"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, type ProjectDetail, type PublicReport } from "@/lib/api";
import { addDays, dayNum, longDay, monthShort, rangeLabel, today, weekdayShort } from "@/lib/dates";
import { useIsPhone } from "@/lib/useIsPhone";
import DateNav from "./DateNav";
import LogoMark from "./LogoMark";
import ProjectBoard from "./ProjectBoard";
import ViewToggle from "./ViewToggle";

const noop = () => {};

function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`;
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

/** The read-only view of a shared project: the same board the team sees, with nothing to edit. */
export default function PublicReportPage() {
  const { token } = useParams<{ token: string }>();
  const [report, setReport] = useState<PublicReport | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<"today" | "week">("today");
  const [day, setDay] = useState(today());
  const phone = useIsPhone();

  useEffect(() => {
    const load = () => api.publicReport(token).then((r) => (setReport(r), setError(""))).catch((e) => setError(e instanceof Error ? e.message : "This link is not shared any more."));
    const first = setTimeout(load, 0);
    const t = setInterval(load, 60000); // keep a report that stays open fresh
    return () => (clearTimeout(first), clearInterval(t));
  }, [token]);

  // dress the report up as a project, so the very same board draws it
  const data = useMemo<ProjectDetail | null>(
    () =>
      report && {
        project: { id: 0, name: report.name, owner: 0, is_owner: false, role: "member", member_count: report.people, open_assigned_to_me: 0, open_total: report.total - report.done, archived: false },
        members: [],
        subjects: report.subjects,
        hidden_subjects: [],
        invites: [],
        tickets: report.tickets.map((t) => ({ ...t, project: 0, assignee: null, created_by: null, can_edit: false })),
      },
    [report],
  );

  const days = phone || view === "today" ? [day] : Array.from({ length: 7 }, (_, i) => addDays(day, i));
  const dayTickets = report ? report.tickets.filter((t) => t.date === day) : [];
  const dayTotal = dayTickets.length;
  const dayDone = dayTickets.filter((t) => t.done).length;

  return (
    <div className={`app ${view === "week" ? "" : "narrow"}`}>
      <header className="reportTop">
        <Link href="/" className="logo" aria-label="Lodal">
          <LogoMark />
          <span>Lodal</span>
        </Link>
        <span className="reportTag">Read-only</span>
      </header>
      <main className="projWrap">
        {error && (
          <div className="reportCard">
            <h1>Not available</h1>
            <p className="fine">{error}</p>
          </div>
        )}
        {!report && !error && <p className="fine">Loading…</p>}
        {report && data && (
          <>
            <section className="hero2 reportHero">
              <div className="heroText">
                <h1 className="pageTitle nameText" title={report.name}>
                  {report.name}
                </h1>
                <div className="heroRow">
                  <DateNav
                    day={day}
                    setDay={setDay}
                    step={phone || view === "today" ? 1 : 7}
                    showToday={phone || view === "today" ? day !== today() : days[0] !== today()}
                    label={phone ? longDay(day) : view === "today" ? `${weekdayShort(day)}, ${dayNum(day)} ${monthShort(day)}` : rangeLabel(days)}
                  />
                </div>
                <p className="reportMeta">
                  <b>{report.percent}%</b> of the project done · {report.done} of {report.total} tasks · updated {ago(report.updated_at)}
                </p>
              </div>
              {dayTotal > 0 && (
                <div className="ringBox" role="progressbar" aria-valuemin={0} aria-valuemax={dayTotal} aria-valuenow={dayDone} aria-label="Tasks done on this day">
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
              {!phone && (
                <div className="boardTools">
                  <div className="toolIcons">
                    <ViewToggle
                      expanded={view === "week"}
                      onClick={() => {
                        setView(view === "today" ? "week" : "today");
                        setDay(today());
                      }}
                    />
                  </div>
                </div>
              )}
              <ProjectBoard
                data={data}
                me={null}
                filter="all"
                day={day}
                view={view}
                readOnly
                onUpdate={noop}
                onAdd={noop}
                onDelete={noop}
                onSubjectAdd={noop}
                onSubjectRename={noop}
                onSubjectDelete={noop}
                onSubjectRestore={noop}
                onSubjectReorder={noop}
              />
            </section>

            <p className="reportBanner">
              Made with <Link href="/">Lodal</Link>, a simple planner for you and your team.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
