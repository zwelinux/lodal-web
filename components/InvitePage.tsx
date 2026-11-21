"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, token, type InvitePreview, type User } from "@/lib/api";
import LogoMark from "./LogoMark";

export default function InvitePage() {
  const router = useRouter();
  const { token: inviteToken } = useParams<{ token: string }>();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [me, setMe] = useState<User | null | undefined>(() => (typeof window !== "undefined" && token.get() ? undefined : null)); // undefined = still checking
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.invitePreview(inviteToken).then(setPreview).catch((e) => setError(e.message));
    if (token.get()) api.me().then(setMe).catch(() => setMe(null));
  }, [inviteToken]);

  async function accept() {
    setBusy(true);
    setError("");
    try {
      const r = await api.acceptInvite(inviteToken);
      router.replace(`/app/projects/${r.project}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not accept.");
      setBusy(false);
    }
  }

  const next = `/invite/${inviteToken}`;
  const qs = preview ? `?next=${encodeURIComponent(next)}${preview.email ? `&email=${encodeURIComponent(preview.email)}` : ""}` : "";
  const wrongAccount = !!me && !!preview && !preview.friend && me.email.toLowerCase() !== preview.email.toLowerCase();

  return (
    <main className="authPage">
      <div className="authCard">
        <Link href="/" className="logo">
          <LogoMark />
          Lodal
        </Link>
        {!preview && !error && <p className="fine">Checking your invitation…</p>}
        {!preview && error && (
          <>
            <h1>Invitation not found</h1>
            <p className="error">{error}</p>
            <Link href="/app" className="btn">
              Go to Lodal
            </Link>
          </>
        )}
        {preview && (
          <>
            <h1>Join “{preview.project}”</h1>
            <p className="fine">
              {preview.invited_by ? <b>{preview.invited_by}</b> : "A friend"} invited {preview.friend ? "you" : <b>{preview.email}</b>} to work on this project together.
            </p>
            {preview.expired && <p className="error">This invitation has expired. Ask your friend to send a new one.</p>}
            {preview.accepted && !preview.expired && <p className="fine">This invitation was already used.</p>}

            {!preview.expired && me === null && (
              <>
                <p className="fine">Create a free account with this email, or log in if you already have one.</p>
                <Link className="btn primary big" href={`/signup${qs}`}>
                  Create account
                </Link>
                <Link className="btn" href={`/login${qs}`}>
                  I already have an account
                </Link>
              </>
            )}
            {!preview.expired && me && !wrongAccount && (
              <button className="btn primary big" onClick={accept} disabled={busy}>
                {busy ? "One moment…" : "Accept invitation"}
              </button>
            )}
            {!preview.expired && wrongAccount && (
              <>
                <p className="error">
                  You are logged in as {me?.email}, but this invitation is for {preview.email}.
                </p>
                <button
                  className="btn primary big"
                  onClick={async () => {
                    try {
                      await api.logout();
                    } catch {}
                    token.clear();
                    router.replace(`/login${qs}`);
                  }}
                >
                  Log out and switch account
                </button>
              </>
            )}
            {error && preview && <p className="error">{error}</p>}
          </>
        )}
      </div>
    </main>
  );
}
