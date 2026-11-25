"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, token, type CalendarStatus } from "@/lib/api";
import { ago } from "@/lib/ago";
import { ask } from "./DialogHost";
import SimpleBar from "./SimpleBar";

const NOTICE: Record<string, [string, boolean]> = {
  connected: ["Google Calendar is connected. Your plan is on its way to your calendar.", false],
  cancelled: ["You did not connect Google Calendar.", false],
  denied: ["Lodal needs the permission to make its own calendar. Please try again and leave the box ticked.", true],
  error: ["Something went wrong connecting Google Calendar. Please try again.", true],
};

/** Each person connects their own Google Calendar. Their dated tasks and tickets show up in a calendar called Lodal. */
export default function CalendarSettings() {
  const router = useRouter();
  const params = useSearchParams();
  const [st, setSt] = useState<CalendarStatus | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const flash = NOTICE[params.get("status") ?? ""];

  useEffect(() => {
    if (!token.get()) {
      router.replace("/login?next=/app/calendar");
      return;
    }
    api
      .calendar()
      .then(setSt)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          token.clear();
          router.replace("/login?next=/app/calendar");
        } else setErr(e instanceof Error ? e.message : "Could not load this page.");
      });
  }, [router]);

  async function connect() {
    setBusy(true);
    setErr("");
    try {
      window.location.href = (await api.calendarConnect()).url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start.");
      setBusy(false);
    }
  }

  async function syncNow() {
    setBusy(true);
    setErr("");
    try {
      await api.calendarSync();
      setSt(await api.calendar());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not update your calendar.");
    }
    setBusy(false);
  }

  async function disconnect() {
    if (!(await ask("Disconnect Google Calendar?\n\nThe Lodal calendar is removed from your Google Calendar. Your tasks in Lodal are not touched.", "Disconnect"))) return;
    setBusy(true);
    setErr("");
    try {
      await api.calendarDisconnect();
      setSt(await api.calendar());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not disconnect.");
    }
    setBusy(false);
  }

  return (
    <div className="app narrow">
      <SimpleBar />
      <main className="projWrap">
        <h1 className="pageTitle">Google Calendar</h1>
        <p className="pageSub">See your Lodal plan in your own Google Calendar, on your phone and computer.</p>
        {flash && (
          <p className={flash[1] ? "error" : "fine"} role="status">
            {flash[0]}
          </p>
        )}
        {err && (
          <p className="error" role="alert">
            {err}
          </p>
        )}
        {!st && !err && <p className="empty">Loading…</p>}
        {st && !st.enabled && (
          <div className="emptyBox">
            <b>Not available yet</b>
            <p>Google Calendar is not switched on for this Lodal yet.</p>
          </div>
        )}
        {st && st.enabled && !st.connected && (
          <div className="emptyBox">
            <b>Not connected</b>
            <p>Connect your own Google Calendar. Your tasks and project tickets that have a date appear in a calendar called Lodal.</p>
            <button className="btn primary big" style={{ marginTop: 6 }} onClick={connect} disabled={busy}>
              Connect Google Calendar
            </button>
            <ul className="authPoints" style={{ marginTop: 14 }}>
              <li>Lodal makes its own calendar. It cannot see or change your other calendars or events.</li>
              <li>It goes one way: from Lodal to Google. Changes you make in Google are not sent back.</li>
              <li>A task you add for today appears at the time you added it, as a 30 minute event. Tasks for other days, and project tickets, are all-day events.</li>
              <li>Events never make you look busy. Ticked tasks get a ✓.</li>
            </ul>
          </div>
        )}
        {st && st.enabled && st.connected && (
          <div className="emptyBox">
            <b>Connected{st.email ? ` as ${st.email}` : ""}</b>
            <p>
              {st.events} event{st.events === 1 ? "" : "s"} in your Lodal calendar
              {st.last_synced_at ? `, updated ${ago(st.last_synced_at)}` : ""}. It updates a few seconds after you change a task.
            </p>
            {st.error && (
              <p className="error" role="alert">
                {st.error}
              </p>
            )}
            <p className="fine">Today and the next 90 days are kept in step. Earlier days stay in your calendar as they were.</p>
            <span className="proofBtns">
              <button className="btn" onClick={syncNow} disabled={busy}>
                {busy ? "Updating…" : "Update now"}
              </button>
              <button className="btn" onClick={disconnect} disabled={busy}>
                Disconnect
              </button>
            </span>
          </div>
        )}
      </main>
    </div>
  );
}
