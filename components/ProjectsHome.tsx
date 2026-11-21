"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, token, type ProjectSummary } from "@/lib/api";
import HiddenList from "./HiddenList";
import SimpleBar from "./SimpleBar";

export default function ProjectsHome() {
  const router = useRouter();
  const params = useSearchParams();
  const note = params.get("note");
  const [list, setList] = useState<ProjectSummary[] | null>(null);
  const [hidden, setHidden] = useState<ProjectSummary[]>([]);
  const [showNote, setShowNote] = useState(true);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token.get()) {
      router.replace("/login?next=/app/projects");
      return;
    }
    api.projects(true).then(setHidden).catch(() => {});
    api
      .projects()
      .then(setList)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          token.clear();
          router.replace("/login?next=/app/projects");
        } else setError(e.message);
      });
  }, [router]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const p = await api.createProject(name.trim());
      router.push(`/app/projects/${p.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the project.");
    }
  }

  return (
    <div className="app narrow">
      <SimpleBar />
      <main className="projWrap">
        <h1 className="pageTitle">Projects</h1>
        <p className="pageSub">Shared spaces where you and your friends work on the same tickets.</p>

        <form className="newProject" onSubmit={create}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New project, e.g. Video Content Creation" aria-label="Project name" maxLength={120} />
          <button className="btn primary">Create project</button>
        </form>
        {note && showNote && (
          <div className="notice" role="status">
            {note === "hidden" ? "Hidden. Everything in it is kept. Bring it back from “Hidden projects” below." : "Deleted."}
            <button className="iconBtn" aria-label="Dismiss" onClick={() => setShowNote(false)}>
              ×
            </button>
          </div>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {list === null && !error && <p className="empty">Loading…</p>}
        {list && list.length === 0 && (
          <div className="emptyBox">
            <b>No projects yet</b>
            <p>Make one for something you do with friends, then invite them by email. Tickets you give to someone show up in their own planner.</p>
          </div>
        )}
        <div className="projGrid">
          {list?.map((p) => (
            <Link key={p.id} href={`/app/projects/${p.id}`} className="projCard">
              <b>{p.name}</b>
              <span>
                {p.member_count} {p.member_count === 1 ? "person" : "people"} · {p.open_total} open
              </span>
              {p.open_assigned_to_me > 0 && <em>{p.open_assigned_to_me} assigned to you</em>}
              {p.is_owner && <small>You own this</small>}
            </Link>
          ))}
        </div>
        <HiddenList
          label="Hidden projects"
          items={hidden.filter((h) => h.is_owner)}
          canRestore
          onRestore={async (pid) => {
            try {
              await api.restoreProject(pid);
              setShowNote(false);
              setHidden((l) => l.filter((x) => x.id !== pid));
              setList(await api.projects());
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not show it again.");
            }
          }}
        />
      </main>
    </div>
  );
}
