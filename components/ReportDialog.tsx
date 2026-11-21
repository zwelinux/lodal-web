"use client";
import { useState } from "react";
import { api, type ReportInput } from "@/lib/api";

const REASONS: [ReportInput["reason"], string][] = [
  ["spam", "Spam"],
  ["harassment", "Harassment or bullying"],
  ["inappropriate", "Inappropriate content"],
  ["other", "Something else"],
];

/** "Report" for a person or a message. The reporter can block that person in the same step. */
export default function ReportDialog({ kind, target, who, blockUserId, onClose, onBlocked }: { kind: ReportInput["kind"]; target: number; who: string; blockUserId?: number; onClose: () => void; onBlocked?: () => void }) {
  const [reason, setReason] = useState<ReportInput["reason"]>("harassment");
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.report({ kind, target, reason, details: details.trim() });
      if (alsoBlock && blockUserId) {
        await api.block(blockUserId);
        onBlocked?.();
      }
      setDone(true);
    } catch (x) {
      setError(x instanceof Error ? x.message : "Could not send the report.");
    }
    setBusy(false);
  }

  return (
    <div className="overlay" onClick={onClose}>
      <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="repTitle" onClick={(e) => e.stopPropagation()} onSubmit={send}>
        {done ? (
          <>
            <h2 id="repTitle">Thank you</h2>
            <p>We got your report and will look at it.{alsoBlock && blockUserId ? ` ${who} is blocked, so you will not see each other.` : ""}</p>
            <button type="button" className="btn primary" onClick={onClose}>
              Done
            </button>
          </>
        ) : (
          <>
            <h2 id="repTitle">Report {who}</h2>
            <fieldset className="reasons">
              {REASONS.map(([value, label]) => (
                <label key={value}>
                  <input type="radio" name="reason" checked={reason === value} onChange={() => setReason(value)} /> {label}
                </label>
              ))}
            </fieldset>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} rows={3} placeholder="Anything we should know? (optional)" aria-label="Details" />
            {blockUserId && (
              <label className="alsoBlock">
                <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} /> Also block {who}
              </label>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="btn primary" disabled={busy}>
              Send report
            </button>
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
          </>
        )}
      </form>
    </div>
  );
}
