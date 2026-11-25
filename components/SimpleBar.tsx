"use client";
import { ask } from "./DialogHost";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, token, type User } from "@/lib/api";
import { applyTheme, effectiveTheme, getTheme, type ThemeChoice } from "@/lib/theme";
import { useDismiss } from "@/lib/useDismiss";
import AppTabs from "./AppTabs";
import LogoMark from "./LogoMark";
import NotificationBell from "./NotificationBell";

/** Top bar for the Projects pages. Same controls as the personal planner: tabs, theme switch and account menu. */
export default function SimpleBar() {
  const router = useRouter();
  const [seen, setSeen] = useState<"light" | "dark">(() => (typeof window === "undefined" ? "light" : effectiveTheme()));
  const [theme, setTheme] = useState<ThemeChoice>(() => (typeof window === "undefined" ? "auto" : getTheme()));
  const [menu, setMenu] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (token.get()) api.me().then(setUser).catch(() => {});
  }, []);

  useDismiss(menu, useCallback(() => setMenu(false), []));

  const choose = (t: ThemeChoice) => {
    applyTheme(t);
    setTheme(t);
    setSeen(effectiveTheme());
  };
  async function logout() {
    try {
      await api.logout();
    } catch {}
    token.clear();
    router.replace("/");
  }
  async function deleteAccount() {
    if (!(await ask("Delete your account and all your data forever? This cannot be undone."))) return;
    try {
      await api.deleteAccount();
      token.clear();
      router.replace("/");
    } catch {}
  }

  return (
    <header className="bar">
      <span className="logo">
        <LogoMark />
        Lodal
      </span>
      <AppTabs />
      <span className="grow" />
      <NotificationBell />
      <button
        className="iconBtn themeBtn"
        suppressHydrationWarning
        aria-label={seen === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={seen === "dark" ? "Light mode" : "Dark mode"}
        onClick={() => choose(seen === "dark" ? "light" : "dark")}
      >
        {seen === "dark" ? "☀" : "☾"}
      </button>
      <div className="menuWrap">
        <button className="iconBtn" aria-label="Account" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
          ⋯
        </button>
        {menu && (
          <div className="menu" role="menu">
            <div className="menuInfo">
              {user?.email}
              <small>{user ? (user.is_pro ? "Pro, no ads" : "Free plan") : ""}</small>
            </div>
            <div className="themeRow" role="group" aria-label="Appearance">
              {(["light", "dark", "auto"] as const).map((t) => (
                <button key={t} aria-pressed={theme === t} onClick={() => choose(t)}>
                  {t === "light" ? "Light" : t === "dark" ? "Dark" : "Auto"}
                </button>
              ))}
            </div>
            <button role="menuitem" onClick={() => router.push("/app/calendar")}>
                Google Calendar
              </button>
              <button role="menuitem" onClick={() => router.push("/app/drive")}>
                Google Drive
              </button>
              <button role="menuitem" onClick={() => router.push("/app/connect")}>
              Browser extension
            </button>
            <button role="menuitem" onClick={logout}>
              Sign out
            </button>
            <button role="menuitem" className="danger" onClick={deleteAccount}>
              Delete my account
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
