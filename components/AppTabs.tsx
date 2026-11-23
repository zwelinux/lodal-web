"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** The main places: your own planner, shared projects, notes, and the public Pulse. */
export default function AppTabs() {
  const path = usePathname();
  const inProjects = path.startsWith("/app/projects");
  const inNotes = path.startsWith("/app/notes");
  const inPulse = path.startsWith("/app/pulse");
  return (
    <nav className="appTabs" aria-label="Main">
      <Link href="/app" aria-current={!inProjects && !inNotes && !inPulse ? "page" : undefined}>
        My planner
      </Link>
      <Link href="/app/projects" aria-current={inProjects ? "page" : undefined}>
        Projects
      </Link>
      <Link href="/app/notes" aria-current={inNotes ? "page" : undefined}>
        Notes
      </Link>
      <Link href="/app/pulse" aria-current={inPulse ? "page" : undefined}>
        Pulse
      </Link>
    </nav>
  );
}
