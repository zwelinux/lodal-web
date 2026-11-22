"use client";
import { useRef, useState } from "react";
import type { Member, ProjectDetail, ProjectSubject, ProjectTicket } from "@/lib/api";
import { addDays, dayNum, monthShort, today, weekdayShort } from "@/lib/dates";
import { useSubjectDnd } from "@/lib/useSubjectDnd";
import { useIsPhone } from "@/lib/useIsPhone";
import AutoTextarea from "./AutoTextarea";

const TICKET_MIME = "application/x-lodal-ticket";
const hue = (id: number) => `hsl(${(id * 67 + 140) % 360} 50% 52%)`;
const subjColor = (i: number) => `hsl(${(i * 57 + 165) % 360} 52% 56%)`;

type Patch = Partial<Pick<ProjectTicket, "title" | "date" | "assignee" | "done" | "subject">>;

type Props = {
  data: ProjectDetail;
  me: number | null;
  filter: "all" | "mine";
  day: string;
  view: "today" | "week";
  readOnly?: boolean; // the public report: look, never touch
  onUpdate: (t: ProjectTicket, patch: Patch) => void;
  onAdd: (p: { title: string; date: string; subject: number; assignee: number | null }) => void;
  onDelete: (t: ProjectTicket) => void;
  onSubjectAdd: (name: string) => void;
  onSubjectRename: (id: number, name: string) => void;
  onSubjectDelete: (s: ProjectSubject) => void;
  onSubjectRestore: (id: number) => void;
  onSubjectReorder: (ids: number[]) => void;
};

export default function ProjectBoard(p: Props) {
  const phone = useIsPhone();
  const day = p.day;
  const t = today();
  const { subjects, tickets, members } = p.data;
  const ro = !!p.readOnly;
  const isOwner = p.data.project.is_owner && !ro;
  const days = phone || p.view === "today" ? [day] : Array.from({ length: 7 }, (_, i) => addDays(day, i));
  const shown = tickets.filter((x) => p.filter === "all" || x.assignee === p.me);
  const firstSubject = subjects[0]?.id;
  const dnd = useSubjectDnd(subjects.map((x) => x.id), p.onSubjectReorder);
  // tickets always belong to a subject; if an old one has none, show it in the first row
  const cellTickets = (sid: number, d: string) => shown.filter((x) => (x.subject ?? firstSubject) === sid && x.date === d);

  const cell = (s: ProjectSubject, d: string) => (
    <TicketCell
      key={d}
      label={`${s.name}, ${d}`}
      tickets={cellTickets(s.id, d)}
      members={members}
      me={p.me}
      date={d}
      past={d < t}
      isToday={d === t}
      ro={ro}
      onUpdate={p.onUpdate}
      onDelete={p.onDelete}
      onAdd={(title) => p.onAdd({ title, date: d, subject: s.id, assignee: p.me })}
      onDropTicket={(id) => {
        const tk = tickets.find((x) => x.id === id);
        if (tk && tk.can_edit && (tk.date !== d || (tk.subject ?? firstSubject) !== s.id)) p.onUpdate(tk, { date: d, subject: s.id });
      }}
    />
  );

  if (phone)
    return (
      <div className="dayWrap">
        {subjects.map((s) => (
          <section key={s.id} className="card">
            <h3>{s.name}</h3>
            {cell(s, day)}
          </section>
        ))}
      </div>
    );

  return (
    <div className={`gridWrap boardWrap ${p.view === "today" ? "oneDay" : ""}`}>
      <div className="weekGrid" style={{ "--n": days.length } as React.CSSProperties}>
        <div />
        {days.map((d) => (
          <div key={d} className={`gHead ${d === t ? "isToday" : ""} ${p.view === "week" ? "wk" : ""}`}>
            {p.view === "week" ? (
              <>
                <b className="wd">{weekdayShort(d)}</b>
                <span className="dn">{dayNum(d)}</span>
              </>
            ) : (
              <>
                <b>{d === t ? "Today" : d === addDays(t, 1) ? "Tomorrow" : d === addDays(t, -1) ? "Yesterday" : weekdayShort(d)}</b>
                <span>
                  {dayNum(d)} {monthShort(d)}
                </span>
              </>
            )}
          </div>
        ))}
        {subjects.map((s, i) => (
          <div key={s.id} {...(ro ? {} : dnd.row(s.id))} style={{ display: "contents", "--sc": subjColor(i) } as React.CSSProperties}>
            <div className={`gSubj ${ro ? "" : dnd.cls(s.id)}`}>
              {!ro && (
                <button className="subjGrip" aria-label={`Move ${s.name}. Drag it, or press the up or down arrow key.`} title="Drag to reorder" {...dnd.handle(s.id)}>
                  ⋮⋮
                </button>
              )}
              <i className="swatch" />
              {ro ? <span className="subjName subjStatic">{s.name}</span> : <SubjName key={s.name} s={s} onRename={p.onSubjectRename} />}
              {isOwner && subjects.length > 1 && (
                <button className="x" aria-label={`Delete ${s.name}`} onClick={() => p.onSubjectDelete(s)}>
                  ×
                </button>
              )}
            </div>
            {days.map((d) => cell(s, d))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SubjName({ s, onRename }: { s: ProjectSubject; onRename: (id: number, n: string) => void }) {
  const [v, setV] = useState(s.name);
  return (
    <AutoTextarea
      className="subjName"
      value={v}
      aria-label="Subject name"
      onChange={(e) => setV(e.target.value.replace(/\n/g, " "))}
      onBlur={() => (v.trim() ? v.trim() !== s.name && onRename(s.id, v.trim()) : setV(s.name))}
      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), e.currentTarget.blur())}
    />
  );
}

function TicketCell({
  tickets,
  members,
  me,
  past,
  isToday,
  ro,
  label,
  onUpdate,
  onDelete,
  onAdd,
  onDropTicket,
}: {
  tickets: ProjectTicket[];
  members: Member[];
  me: number | null;
  date: string;
  past: boolean;
  isToday: boolean;
  ro: boolean;
  label: string;
  onUpdate: (t: ProjectTicket, patch: Patch) => void;
  onDelete: (t: ProjectTicket) => void;
  onAdd: (title: string) => void;
  onDropTicket: (id: number) => void;
}) {
  const [over, setOver] = useState(false);
  const [draft, setDraft] = useState("");
  const draftRef = useRef<HTMLInputElement>(null);
  const byId = new Map(members.map((m) => [m.user_id, m]));

  function addDraft() {
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    onAdd(title);
  }

  return (
    <div
      className={`gCell ${isToday ? "isToday" : ""} ${past ? "isPast" : ""} ${over ? "dropOver" : ""}`}
      onClick={(e) => !ro && !past && e.target === e.currentTarget && draftRef.current?.focus()}
      onDragOver={(e) => {
        if (ro || past || !e.dataTransfer.types.includes(TICKET_MIME)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!over) setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(e) => {
        setOver(false);
        if (ro || past) return;
        const id = Number(e.dataTransfer.getData(TICKET_MIME));
        if (id) {
          e.preventDefault();
          onDropTicket(id);
        }
      }}
    >
      <div className="tasks">
        {tickets.map((tk) => (
          <TicketItem key={`${tk.id}-${tk.title}`} ro={ro} t={tk} who={tk.assignee ? byId.get(tk.assignee) : undefined} members={members} me={me} past={past} label={label} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
        {!past && !ro && (
          <div className="task newTask">
            <span className="plus" aria-hidden="true">
              +
            </span>
            <input
              ref={draftRef}
              className="draft"
              value={draft}
              placeholder={tickets.length ? "Add another task" : "Add a task"}
              aria-label={`${label}, add a task`}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDraft())}
              onBlur={addDraft}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function TicketItem({ ro, t, who, members, past, label, onUpdate, onDelete }: { ro: boolean; t: ProjectTicket; who?: Member; members: Member[]; me: number | null; past: boolean; label: string; onUpdate: (t: ProjectTicket, patch: Patch) => void; onDelete: (t: ProjectTicket) => void }) {
  const [title, setTitle] = useState(t.title);
  const [dragging, setDragging] = useState(false);
  const locked = ro || !t.can_edit; // a member can only change tickets given to them or made by them
  return (
    <div className={`task ticketTask ${ro ? "ro" : ""} ${locked ? "locked" : ""} ${t.done ? "done" : ""} ${!t.done ? "hasGrip" : ""} ${dragging ? "dragging" : ""}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={t.done}
        aria-label={t.done ? "Mark as not done" : "Mark as done"}
        className="tick"
        disabled={locked}
        title={locked ? "Only the person it is given to, or an owner, can tick this" : undefined}
        onClick={() => onUpdate(t, { done: !t.done })}
      >
        <span>
          {t.done && (
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </button>
      {!t.done && !locked && (
        <span
          className="grip"
          draggable
          title="Drag to another day or subject"
          aria-hidden="true"
          onDragStart={(e) => {
            e.dataTransfer.setData(TICKET_MIME, String(t.id));
            e.dataTransfer.effectAllowed = "move";
            const row = (e.currentTarget as HTMLElement).closest(".task");
            if (row) e.dataTransfer.setDragImage(row, 12, 14);
            setDragging(true);
          }}
          onDragEnd={() => setDragging(false)}
        >
          ⋮⋮
        </span>
      )}
      <AutoTextarea
        value={title}
        readOnly={past || locked}
        aria-label={`${label}, ticket`}
        onChange={(e) => setTitle(e.target.value.replace(/\n/g, " "))}
        onBlur={() => !past && !locked && (title.trim() ? title.trim() !== t.title && onUpdate(t, { title: title.trim() }) : onDelete(t))}
        onKeyDown={(e) => {
          if (past || locked) return;
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          } else if (e.key === "Backspace" && !title) {
            e.preventDefault();
            onDelete(t);
          }
        }}
      />
      {!ro && (
      <label className="assignee" title={who ? `Assigned to ${who.name}` : "Nobody yet. Click to assign."}>
        {who ? (
          <span className="avatar" style={{ background: hue(who.user_id) }} aria-hidden="true">
            {who.name.slice(0, 1).toUpperCase()}
          </span>
        ) : (
          <span className="avatar empty" aria-hidden="true">
            +
          </span>
        )}
        <select value={t.assignee ?? ""} disabled={past || locked} aria-label="Assigned to" onChange={(e) => onUpdate(t, { assignee: e.target.value ? Number(e.target.value) : null })}>
          <option value="">Nobody yet</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      )}
      {!past && !locked && (
        <button className="x" aria-label="Delete ticket" onClick={() => onDelete(t)}>
          ×
        </button>
      )}
    </div>
  );
}
