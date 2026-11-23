"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const svg = { viewBox: "0 0 24 24", width: 24, height: 24, fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

const ICONS = {
  planner: (
    <svg {...svg}>
      <rect x="4" y="5" width="16" height="15" rx="3" />
      <path d="M4 10h16M8 3v4M16 3v4" />
    </svg>
  ),
  projects: (
    <svg {...svg}>
      <rect x="4" y="4" width="7" height="7" rx="2" />
      <rect x="13" y="4" width="7" height="7" rx="2" />
      <rect x="4" y="13" width="7" height="7" rx="2" />
      <rect x="13" y="13" width="7" height="7" rx="2" />
    </svg>
  ),
  notes: (
    <svg {...svg}>
      <rect x="5" y="3" width="14" height="18" rx="3" />
      <path d="M9 9h6M9 13h6M9 17h3" />
    </svg>
  ),
  pulse: (
    <svg {...svg}>
      <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
    </svg>
  ),
};

/** The four main places. Plain links with an underline on a computer; a thumb-friendly bar along the bottom on a phone. */
export default function AppTabs() {
  const path = usePathname();
  const inProjects = path.startsWith("/app/projects");
  const inNotes = path.startsWith("/app/notes");
  const inPulse = path.startsWith("/app/pulse");
  const tabs = [
    { href: "/app", label: "My planner", icon: ICONS.planner, on: !inProjects && !inNotes && !inPulse },
    { href: "/app/projects", label: "Projects", icon: ICONS.projects, on: inProjects },
    { href: "/app/notes", label: "Notes", icon: ICONS.notes, on: inNotes },
    { href: "/app/pulse", label: "Pulse", icon: ICONS.pulse, on: inPulse },
  ];
  return (
    <nav className="appTabs" aria-label="Main">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.on ? "page" : undefined}>
          {t.icon}
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}
