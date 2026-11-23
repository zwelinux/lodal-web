"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, token } from "@/lib/api";
import { effectiveTheme } from "@/lib/theme";
import LogoMark from "./LogoMark";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const SCRIPT = "https://accounts.google.com/gsi/client";

type GoogleId = {
  initialize: (o: { client_id: string; callback: (r: { credential?: string }) => void }) => void;
  renderButton: (el: HTMLElement, o: Record<string, string | number>) => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

/** The one way in: Continue with Google. There are no passwords, and signing up and logging in are the same step. */
export default function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next") ?? "";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/app"; // only go to pages inside Lodal
  const hint = params.get("email") ?? "";
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token.get()) router.replace(next);
  }, [router, next]);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let gone = false;
    const fail = (msg: string) => setTimeout(() => !gone && setError(msg), 0);

    async function got(credential?: string) {
      if (!credential) return fail("Google sign-in did not work. Please try again.");
      setBusy(true);
      setError("");
      try {
        const r = await api.googleLogin(credential);
        token.set(r.token);
        router.replace(next);
      } catch (e) {
        setBusy(false);
        fail(e instanceof Error ? e.message : "Something went wrong.");
      }
    }

    function draw() {
      const id = window.google?.accounts.id;
      if (gone || !id || !holder.current) return;
      id.initialize({ client_id: CLIENT_ID, callback: (r) => got(r.credential) });
      id.renderButton(holder.current, { type: "standard", theme: effectiveTheme() === "dark" ? "filled_black" : "outline", size: "large", text: "continue_with", shape: "pill", logo_alignment: "left", width: 300 });
    }

    if (window.google) draw();
    else {
      const have = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
      const s = have ?? Object.assign(document.createElement("script"), { src: SCRIPT, async: true });
      s.addEventListener("load", draw);
      s.addEventListener("error", () => fail("Could not load Google. Check your connection or turn off your ad blocker."));
      if (!have) document.head.appendChild(s);
    }
    return () => {
      gone = true;
    };
  }, [router, next]);

  return (
    <main className="authPage">
      <div className="authCard">
        <Link href="/" className="logo">
          <LogoMark />
          Lodal
        </Link>
        <h1>Welcome to Lodal</h1>
        <p className="fine">Plan your days, alone or with your team. New here? Just continue. We make your account for you.</p>
        {hint && (
          <p className="fine">
            Use the Google account for <b>{hint}</b>.
          </p>
        )}
        {CLIENT_ID ? (
          <div className="googleSlot" aria-busy={busy}>
            <div ref={holder} />
            {busy && <p className="fine center">One moment…</p>}
          </div>
        ) : (
          <p className="error" role="alert">
            Google sign-in is not set up yet.
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <p className="fine center">
          By continuing you agree to the <Link href="/terms">Terms</Link> and the <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  );
}
