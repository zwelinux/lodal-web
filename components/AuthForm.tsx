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

/** Email and password (temporary, until Google sign-in is set up) plus Continue with Google when it is configured. */
export default function AuthForm({ mode = "login" }: { mode?: "login" | "signup" }) {
  const signup = mode === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next") ?? "";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/app"; // only go to pages inside Lodal
  const hint = params.get("email") ?? "";
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const holder = useRef<HTMLDivElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = signup ? await api.register(email, password) : await api.login(email, password);
      token.set(r.token);
      router.replace(next);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

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
        <h1>{signup ? "Create your account" : "Welcome back"}</h1>
        {hint && (
          <p className="fine">
            Use the account for <b>{hint}</b>.
          </p>
        )}
        <form onSubmit={submit} className="authFields">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 8 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="btn primary big" type="submit" disabled={busy}>
            {busy ? "One moment…" : signup ? "Sign up" : "Log in"}
          </button>
        </form>
        {CLIENT_ID && (
          <>
            <p className="fine center">or</p>
            <div className="googleSlot" aria-busy={busy}>
              <div ref={holder} />
            </div>
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <p className="fine center">
          {signup ? (
            <>
              Already have an account? <Link href="/login">Log in</Link>
            </>
          ) : (
            <>
              New here? <Link href="/signup">Sign up</Link>
            </>
          )}
        </p>
        <p className="fine center">
          By continuing you agree to the <Link href="/terms">Terms</Link> and the <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  );
}
