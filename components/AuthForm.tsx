"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, token } from "@/lib/api";
import LogoMark from "./LogoMark";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next") ?? "";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/app"; // only go to pages inside Lodal
  const qs = rawNext ? `?next=${encodeURIComponent(next)}${params.get("email") ? `&email=${encodeURIComponent(params.get("email")!)}` : ""}` : "";
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";

  useEffect(() => {
    if (token.get()) router.replace(next);
  }, [router, next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = isSignup ? await api.register(email, password) : await api.login(email, password);
      token.set(r.token);
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <main className="authPage">
      <form className="authCard" onSubmit={submit}>
        <Link href="/" className="logo">
          <LogoMark />
          Lodal
        </Link>
        <h1>{isSignup ? "Create your free account" : "Welcome back"}</h1>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
          minLength={isSignup ? 8 : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {isSignup && <p className="fine">At least 8 characters.</p>}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="btn primary big" disabled={busy}>
          {busy ? "One moment…" : isSignup ? "Sign up" : "Log in"}
        </button>
        <p className="fine center">
          {isSignup ? (
            <>
              Already have an account? <Link href={`/login${qs}`}>Log in</Link>
            </>
          ) : (
            <>
              New here? <Link href={`/signup${qs}`}>Create a free account</Link>
            </>
          )}
        </p>
      </form>
    </main>
  );
}
