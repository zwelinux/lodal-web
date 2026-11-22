"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type PublicReport } from "@/lib/api";
import LogoMark from "./LogoMark";

function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`;
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

function day(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString([], { day: "numeric", month: "short" });
}

/** The read-only progress report anyone with the secret link can open. */
export default function PublicReportPage() {
  const { token } = useParams<{ token: string }>();
  const [report, setReport] = useState<PublicReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.publicReport(token).then(setReport).catch((e) => setError(e instanceof Error ? e.message : "This link is not shared any more."));
  }, [token]);

  return (
    <main className="reportPage">
      <header className="reportTop">
        <Link href="/" className="logo" aria-label="Lodal">
          <LogoMark size={26} />
          <span>Lodal</span>
        </Link>
        <span className="reportTag">Progress report</span>
      </header>

      {error && (
        <div className="reportCard">
          <h1>Not available</h1>
          <p className="fine">{error}</p>
        </div>
      )}

      {!report && !error && <p className="fine">Loading…</p>}

      {report && (
        <>
          <section className="reportCard">
            <h1>{report.name}</h1>
            <div className="reportBar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={report.percent} aria-label="Progress">
              <span style={{ width: `${report.percent}%` }} />
            </div>
            <p className="reportNums">
              <b>{report.percent}%</b> done · {report.done} of {report.total} tasks
            </p>
            <p className="fine">
              {report.people} {report.people === 1 ? "person" : "people"} · updated {ago(report.updated_at)}
            </p>
          </section>

          {report.recently_done.length > 0 && (
            <section className="reportCard">
              <h2>Recently finished</h2>
              <ul className="reportList">
                {report.recently_done.map((t, i) => (
                  <li key={i} className="done">
                    <span className="tick" aria-hidden="true">✓</span>
                    <span>{t.title}</span>
                    <small>{ago(t.when)}</small>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {report.subjects.map((s) => (
            <section key={s.name} className="reportCard">
              <div className="reportHead">
                <h2>{s.name}</h2>
                <small>
                  {s.done}/{s.total}
                </small>
              </div>
              <div className="reportBar slim" aria-hidden="true">
                <span style={{ width: `${s.total ? (100 * s.done) / s.total : 0}%` }} />
              </div>
              <ul className="reportList">
                {s.tickets.map((t, i) => (
                  <li key={i} className={t.done ? "done" : ""}>
                    <span className="tick" aria-hidden="true">{t.done ? "✓" : ""}</span>
                    <span>{t.title}</span>
                    <small>{day(t.date)}</small>
                  </li>
                ))}
                {s.tickets.length === 0 && <li className="empty">No tasks yet</li>}
              </ul>
            </section>
          ))}

          <p className="reportFoot">
            Made with <Link href="/">Lodal</Link>, a simple planner for you and your team.
          </p>
        </>
      )}
    </main>
  );
}
