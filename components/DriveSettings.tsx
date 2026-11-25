"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, token, type DriveStatus } from "@/lib/api";
import { ask } from "./DialogHost";
import SimpleBar from "./SimpleBar";

const NOTICE: Record<string, [string, boolean]> = {
  connected: ["Google Drive is connected.", false],
  cancelled: ["You did not connect Google Drive.", false],
  denied: ["Lodal needs the permission to make its own files in your Drive. Please try again and leave the box ticked.", true],
  error: ["Something went wrong connecting Google Drive. Please try again.", true],
};

/** Each person connects their own Google Drive. Pictures in their notes are then kept in their Drive. */
export default function DriveSettings() {
  const router = useRouter();
  const params = useSearchParams();
  const [st, setSt] = useState<DriveStatus | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const flash = NOTICE[params.get("status") ?? ""];

  useEffect(() => {
    if (!token.get()) {
      router.replace("/login?next=/app/drive");
      return;
    }
    api
      .drive()
      .then(setSt)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          token.clear();
          router.replace("/login?next=/app/drive");
        } else setErr(e instanceof Error ? e.message : "Could not load this page.");
      });
  }, [router]);

  async function connect() {
    setBusy(true);
    setErr("");
    try {
      window.location.href = (await api.driveConnect()).url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start.");
      setBusy(false);
    }
  }

  async function disconnect(force = false) {
    if (!force && !(await ask(`Disconnect Google Drive?\n\nYour pictures are copied back into Lodal first, so your notes keep showing them. You will be asked to connect again the next time you open Lodal.`, "Disconnect"))) return;
    setBusy(true);
    setErr("");
    try {
      await api.driveDisconnect(force);
      setSt(await api.drive());
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        if (await ask(`${e.message}\n\nDisconnect anyway?`, "Disconnect anyway")) return disconnect(true);
      } else setErr(e instanceof Error ? e.message : "Could not disconnect.");
    }
    setBusy(false);
  }

  return (
    <div className="app narrow">
      <SimpleBar />
      <main className="projWrap">
        <h1 className="pageTitle">Google Drive</h1>
        <p className="pageSub">Keep your notes and their pictures in your own Google Drive.</p>
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
            <p>Google Drive is not switched on for this Lodal yet.</p>
          </div>
        )}
        {st && st.enabled && !st.connected && (
          <div className="emptyBox">
            <b>Not connected</b>
            <p>Connect your own Google Drive. Lodal keeps a copy of each of your notes as a text file, and the pictures you add, in a folder called Lodal in your Drive. Files keep the same names as in Lodal.</p>
            <button className="btn primary big" style={{ marginTop: 6 }} onClick={connect} disabled={busy}>
              Connect Google Drive
            </button>
            <ul className="authPoints" style={{ marginTop: 14 }}>
              <li>Lodal can only see the files it makes itself, in its own Lodal folder. Nothing else in your Drive.</li>
              <li>Notes go in Lodal/Notes as .md files named after the note, and update a few seconds after you change them. Pictures go in Lodal/Pictures with the name you uploaded.</li>
              <li>You can disconnect any time. Your pictures are copied back into Lodal, and your note files stay in your Drive.</li>
            </ul>
          </div>
        )}
        {st && st.enabled && st.connected && (
          <div className="emptyBox">
            <b>Connected{st.email ? ` as ${st.email}` : ""}</b>
            <p>
              {st.notes} note{st.notes === 1 ? "" : "s"} copied to Lodal/Notes
              {st.pictures > 0 ? `, and ${st.pictures} picture${st.pictures === 1 ? "" : "s"} in Lodal/Pictures` : ""}. Changes you make to a note update its file a few seconds later.
            </p>
            <p className="fine">The note files are copies: changing them in Drive does not change your note. If you delete a picture in Drive, it disappears from your notes too.</p>
            <button className="btn" onClick={() => disconnect()} disabled={busy}>
              Disconnect
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
