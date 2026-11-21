"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** The two main places: your own planner, and shared projects. */
export default function AppTabs() {
  const path = usePathname();
  const inProjects = path.startsWith("/app/projects");
  return (
    <nav className="appTabs" aria-label="Main">
      <Link href="/app" aria-current={!inProjects ? "page" : undefined}>
        My planner
      </Link>
      <Link href="/app/projects" aria-current={inProjects ? "page" : undefined}>
        Projects
      </Link>
    </nav>
  );
}
