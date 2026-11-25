"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, token, type User } from "@/lib/api";
import LogoMark from "./LogoMark";

const NOTICE: Record<string, string> = {
  cancelled: "You did not finish connecting. Please try again.",
  denied: "Lodal needs the permission it asked for. Please try again and leave the box ticked.",
  error: "Something went wrong connecting. Please try again.",
};

/** The one step after signing up: connect Google Drive (files) and Google Calendar (tasks and calls). Both are needed. */
export default function SetupPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [err, setErr] = useState(NOTICE[params.get("status") ?? ""] ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token.get()) {
      router.replace("/login?next=/app/setup");
      return;
    }
    api
      .me()
      .then((u) => {
        setUser(u);
        if (!u.google || (u.google.drive && u.google.calendar)) router.replace("/app");
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          token.clear();
          router.replace("/login?next=/app/setup");
        } else setErr(e instanceof Error ? e.message : "Could not load this page.");
      });
  }, [router]);

  async function connect(which: "drive" | "calendar") {
    setBusy(true);
    setErr("");
    try {
      window.location.href = (which === "drive" ? await api.driveConnect("setup") : await api.calendarConnect("setup")).url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start.");
      setBusy(false);
    }
  }

  const g = user?.google;
  const nextStep = g && !g.drive ? "drive" : "calendar";
  return (
    <div className="app narrow">
      <header className="bar">
        <span className="logo">
          <LogoMark />
          <span>Lodal</span>
        </span>
      </header>
      <main className="projWrap setupWrap">
        <h1 className="pageTitle">One last step</h1>
        <p className="pageSub">Lodal keeps your files in your own Google account, so they always belong to you. Connect these two to start.</p>
        {err && (
          <p className="error" role="alert">
            {err}
          </p>
        )}
        {!user && !err && <p className="empty">Loading…</p>}
        {g && (
          <ol className="setupSteps">
            <li className={g.drive ? "done" : nextStep === "drive" ? "now" : ""}>
              <span className="setupNum">{g.drive ? "✓" : "1"}</span>
              <div>
                <b>Google Drive</b>
                <p>Your notes and the pictures and files you send are kept in a folder called Lodal in your Drive. Lodal can only see what it makes itself.</p>
                {!g.drive && (
                  <button className="btn primary big" disabled={busy || nextStep !== "drive"} onClick={() => connect("drive")}>
                    Connect Google Drive
                  </button>
                )}
              </div>
            </li>
            <li className={g.calendar ? "done" : nextStep === "calendar" && g.drive ? "now" : ""}>
              <span className="setupNum">{g.calendar ? "✓" : "2"}</span>
              <div>
                <b>Google Calendar</b>
                <p>Your dated tasks appear in a calendar called Lodal, and it lets you start a Google Meet call from any chat.</p>
                {!g.calendar && (
                  <button className="btn primary big" disabled={busy || !g.drive} onClick={() => connect("calendar")}>
                    Connect Google Calendar
                  </button>
                )}
              </div>
            </li>
          </ol>
        )}
        <p className="fine setupFine">Pick the same Google account if you like, or another one. You can disconnect later from the menu.</p>
      </main>
    </div>
  );
}
