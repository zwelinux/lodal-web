export type User = { id: number; email: string; is_pro: boolean };
export type Subject = { id: number; name: string; position: number };
export type Entry = { subject: number; date: string; text: string };
export type AssignedTicket = { id: number; project: number; project_name: string; title: string; date: string; done: boolean };
export type GridResponse = { subjects: Subject[]; hidden_subjects: Subject[]; entries: Entry[]; assigned: AssignedTicket[]; user: User };
export type AppNotification = { id: number; kind: "invited" | "accepted" | "assigned" | "done" | "message" | "clap" | "pulse" | "friend" | "update" | "announcement"; title: string; body: string; link: string; created_at: string; read: boolean };
export type NotificationsResponse = { unread: number; items: AppNotification[] };
export type DeleteResult = { result: "hidden" | "deleted" };

export type ProjectSummary = { id: number; name: string; owner: number; is_owner: boolean; role: "owner" | "member"; member_count: number; open_assigned_to_me: number; open_total: number; archived: boolean; unread_chat?: number; public_url?: string };
export type Member = { user_id: number; name: string; role: "owner" | "member" };
export type ProjectSubject = { id: number; name: string; position: number };
export type ProjectTicket = { id: number; project: number; subject: number | null; title: string; date: string; assignee: number | null; done: boolean; created_by: number | null; can_edit: boolean };
export type Invite = { id: number; email: string; label: string; friend: number | null; role: "owner" | "member"; link: string; expires_at: string };
export type PulseLight = {
  key: number;
  slot: number; // which window in the city
  active: boolean;
  mine: boolean;
  user?: number; // only for people who switched themselves on
  nickname?: string;
  last_seen?: string | null;
  checked?: boolean; // you already checked their pulse in the last hour
  relation?: "none" | "friend" | "requested" | "incoming";
  request_id?: number | null; // their friend request to you, when relation is "incoming"
  events?: { id: number; created_at: string; claps: number; clapped: boolean }[];
};
export type PulseData = { total_users: number; active_now: number; windows: number; lights: PulseLight[]; me: { nickname: string; visible: boolean } };
export type FriendsData = { friends: { user: number; nickname: string; unread: number; active: boolean }[]; incoming: { id: number; user: number; nickname: string }[]; unread: number };
export type DirectMessage = { id: number; from: number; to: number; text: string; created_at: string; mine: boolean };
export type ReportInput = { kind: "user" | "message" | "dm"; target: number; reason: "spam" | "harassment" | "inappropriate" | "other"; details?: string };
export type ChatMessage = { id: number; user: number | null; name: string; text: string; created_at: string; mine: boolean };
export type ChatPage = { items: ChatMessage[]; has_more: boolean };
export type ProjectDetail = { project: ProjectSummary; members: Member[]; subjects: ProjectSubject[]; hidden_subjects: ProjectSubject[]; invites: Invite[]; tickets: ProjectTicket[] };
export type PublicReport = {
  name: string;
  total: number;
  done: number;
  percent: number;
  people: number;
  updated_at: string;
  subjects: ProjectSubject[];
  tickets: { id: number; title: string; date: string; subject: number | null; done: boolean }[];
};
export type NoteListItem = { id: number; title: string; snippet: string; updated_at: string; mine: boolean; can_edit: boolean; owner: string; shared: boolean };
export type NotesList = { mine: NoteListItem[]; shared: NoteListItem[] };
export type NoteShare = { id: number; email: string; can_edit: boolean };
export type NoteDetail = { id: number; title: string; body: string; version: number; updated_at: string; updated_by: string; is_owner: boolean; can_edit: boolean; owner: string; public_url: string; shares: NoteShare[] };
export type PublicNote = { title: string; body: string; updated_at: string };
export type InvitePreview = { project: string; email: string; friend: boolean; invited_by: string | null; expired: boolean; accepted: boolean };

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
/** Address of the live direct-message connection */
export const dmSocketUrl = () => `${API.replace(/^http/, "ws").replace(/\/api\/?$/, "")}/ws/dm`;
/** Address of a project's live chat connection, e.g. wss://api.example.com/ws/projects/3/chat */
export const chatSocketUrl = (projectId: number) => `${API.replace(/^http/, "ws").replace(/\/api\/?$/, "")}/ws/projects/${projectId}/chat`;
const TOKEN_KEY = "lodal.token";

export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: Record<string, unknown>) {
    super(message);
  }
}

export const token = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(v: string) {
    try {
      localStorage.setItem(TOKEN_KEY, v);
    } catch {}
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
  },
};

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const t = token.get();
  let res: Response;
  try {
    res = await fetch(API + path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(t ? { Authorization: `Token ${t}` } : {}),
      },
    });
  } catch {
    throw new ApiError(0, "Can't reach the Lodal server. Check your internet, and that the API is running.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? "Something went wrong. Please try again.", data);
  return data as T;
}

const body = (o: unknown) => JSON.stringify(o);

export const api = {
  googleLogin: (idToken: string) => call<{ token: string; user: User }>("/auth/google", { method: "POST", body: body({ id_token: idToken }) }),
  logout: () => call<void>("/auth/logout", { method: "POST" }),
  deleteAccount: () => call<void>("/me/delete", { method: "DELETE" }),
  grid: (from: string, to: string) => call<GridResponse>(`/grid?from=${from}&to=${to}`),
  addSubject: (name: string) => call<Subject>("/subjects", { method: "POST", body: body({ name }) }),
  renameSubject: (id: number, name: string) =>
    call<Subject>(`/subjects/${id}`, { method: "PATCH", body: body({ name }) }),
  deleteSubject: (id: number) => call<DeleteResult>(`/subjects/${id}`, { method: "DELETE" }),
  reorderSubjects: (ids: number[]) => call<{ ok: boolean }>("/subjects/reorder", { method: "POST", body: body({ ids }) }),
  reorderProjectSubjects: (projectId: number, ids: number[]) =>
    call<{ ok: boolean }>(`/projects/${projectId}/subjects/reorder`, { method: "POST", body: body({ ids }) }),
  restoreSubject: (id: number) => call<Subject>(`/subjects/${id}`, { method: "PATCH", body: body({ archived: false }) }),
  saveCell: (subject: number, date: string, text: string) =>
    call<Entry>("/entries", { method: "PUT", body: body({ subject, date, text }) }),
  me: () => call<User>("/me"),
  notifications: () => call<NotificationsResponse>("/notifications"),
  markRead: (arg: { ids: number[] } | { all: true }) => call<{ unread: number }>("/notifications/read", { method: "POST", body: body(arg) }),
  projects: (hidden = false) => call<ProjectSummary[]>(`/projects${hidden ? "?hidden=1" : ""}`),
  createProject: (name: string) => call<ProjectSummary>("/projects", { method: "POST", body: body({ name }) }),
  project: (id: number) => call<ProjectDetail>(`/projects/${id}`),
  renameProject: (id: number, name: string) => call<ProjectDetail>(`/projects/${id}`, { method: "PATCH", body: body({ name }) }),
  deleteProject: (id: number) => call<DeleteResult>(`/projects/${id}`, { method: "DELETE" }),
  restoreProject: (id: number) => call<ProjectDetail>(`/projects/${id}`, { method: "PATCH", body: body({ archived: false }) }),
  invite: (id: number, email: string, role: "owner" | "member" = "member") => call<Invite & { email_sent: boolean }>(`/projects/${id}/invites`, { method: "POST", body: body({ email, role }) }),
  inviteFriend: (id: number, friend: number, role: "owner" | "member" = "member") => call<Invite & { email_sent: boolean }>(`/projects/${id}/invites`, { method: "POST", body: body({ friend, role }) }),
  setRole: (id: number, userId: number, role: "owner" | "member") => call<Member>(`/projects/${id}/members/${userId}`, { method: "PATCH", body: body({ role }) }),
  revokeInvite: (id: number, inviteId: number) => call<void>(`/projects/${id}/invites/${inviteId}`, { method: "DELETE" }),
  removeMember: (id: number, userId: number) => call<void>(`/projects/${id}/members/${userId}`, { method: "DELETE" }),
  messages: (id: number, q: { after?: number; before?: number } = {}) =>
    call<ChatPage>(`/projects/${id}/messages${q.after ? `?after=${q.after}` : q.before ? `?before=${q.before}` : ""}`),
  sendMessage: (id: number, text: string) => call<ChatMessage>(`/projects/${id}/messages`, { method: "POST", body: body({ text }) }),
  readMessages: (id: number) => call<{ unread: number }>(`/projects/${id}/messages/read`, { method: "POST" }),
  deleteMessage: (id: number) => call<void>(`/messages/${id}`, { method: "DELETE" }),
  addProjectSubject: (id: number, name: string) => call<ProjectSubject>(`/projects/${id}/subjects`, { method: "POST", body: body({ name }) }),
  renameProjectSubject: (id: number, name: string) => call<ProjectSubject>(`/project-subjects/${id}`, { method: "PATCH", body: body({ name }) }),
  deleteProjectSubject: (id: number) => call<DeleteResult>(`/project-subjects/${id}`, { method: "DELETE" }),
  restoreProjectSubject: (id: number) => call<ProjectSubject>(`/project-subjects/${id}`, { method: "PATCH", body: body({ archived: false }) }),
  addTicket: (id: number, t: { title: string; date: string; assignee: number | null; subject?: number | null }) =>
    call<ProjectTicket>(`/projects/${id}/tickets`, { method: "POST", body: body(t) }),
  updateTicket: (id: number, patch: Partial<Pick<ProjectTicket, "title" | "date" | "assignee" | "done" | "subject">>) =>
    call<ProjectTicket>(`/tickets/${id}`, { method: "PATCH", body: body(patch) }).then((t) => {
      if (patch.done) void api.pulseDone();
      return t;
    }),
  pulse: (focus?: number | null) => call<PulseData>(`/pulse${focus ? `?focus=${focus}` : ""}`),
  pulseMe: (p: { nickname?: string; visible?: boolean }) => call<PulseData["me"]>("/pulse/me", { method: "PATCH", body: body(p) }),
  pulseDone: () => call<{ ok: boolean }>("/pulse/done", { method: "POST" }).catch(() => ({ ok: false })),
  pulseCheck: (userId: number) => call<{ checked: boolean }>(`/pulse/users/${userId}/check`, { method: "POST" }),
  friends: () => call<FriendsData>("/friends"),
  friendRequest: (user: number) => call<{ relation: string }>("/friends/requests", { method: "POST", body: body({ user }) }),
  acceptFriend: (id: number) => call<{ relation: string }>(`/friends/requests/${id}/accept`, { method: "POST" }),
  declineFriend: (id: number) => call<void>(`/friends/requests/${id}/decline`, { method: "POST" }),
  unfriend: (user: number) => call<void>(`/friends/${user}`, { method: "DELETE" }),
  dm: (user: number, q: { after?: number; before?: number } = {}) =>
    call<{ items: DirectMessage[]; has_more: boolean }>(`/dm/${user}${q.after ? `?after=${q.after}` : q.before ? `?before=${q.before}` : ""}`),
  sendDm: (user: number, text: string) => call<DirectMessage>(`/dm/${user}`, { method: "POST", body: body({ text }) }),
  readDm: (user: number) => call<{ unread: number }>(`/dm/${user}/read`, { method: "POST" }),
  blocks: () => call<{ user: number; nickname: string }[]>("/blocks"),
  block: (user: number) => call<{ blocked: number }>("/blocks", { method: "POST", body: body({ user }) }),
  unblock: (user: number) => call<void>(`/blocks/${user}`, { method: "DELETE" }),
  report: (r: ReportInput) => call<{ ok: boolean }>("/reports", { method: "POST", body: body(r) }),
  pulseClap: (eventId: number) => call<{ claps: number; clapped: boolean }>(`/pulse/events/${eventId}/clap`, { method: "POST" }),
  deleteTicket: (id: number) => call<void>(`/tickets/${id}`, { method: "DELETE" }),
  setProjectPublic: (id: number, on: boolean) => call<ProjectDetail>(`/projects/${id}`, { method: "PATCH", body: body({ public: on }) }),
  publicReport: (token: string) => call<PublicReport>(`/public/${token}`),
  notes: (q = "") => call<NotesList>(`/notes${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  createNote: () => call<NoteDetail>("/notes", { method: "POST", body: body({ title: "", body: "" }) }),
  note: (id: number) => call<NoteDetail>(`/notes/${id}`),
  saveNote: (id: number, p: { title?: string; body?: string; base_version?: number }) => call<NoteDetail>(`/notes/${id}`, { method: "PATCH", body: body(p) }),
  setNotePublic: (id: number, on: boolean) => call<NoteDetail>(`/notes/${id}`, { method: "PATCH", body: body({ public: on }) }),
  deleteNote: (id: number) => call<void>(`/notes/${id}`, { method: "DELETE" }),
  shareNote: (id: number, email: string, can_edit: boolean) => call<NoteShare & { email_sent: boolean }>(`/notes/${id}/shares`, { method: "POST", body: body({ email, can_edit }) }),
  updateNoteShare: (id: number, shareId: number, can_edit: boolean) => call<NoteShare>(`/notes/${id}/shares/${shareId}`, { method: "PATCH", body: body({ can_edit }) }),
  removeNoteShare: (id: number, shareId: number) => call<void>(`/notes/${id}/shares/${shareId}`, { method: "DELETE" }),
  leaveNote: (id: number) => call<void>(`/notes/${id}/leave`, { method: "POST" }),
  publicNote: (token: string) => call<PublicNote>(`/public/notes/${token}`),
  invitePreview: (token: string) => call<InvitePreview>(`/invites/${token}`),
  acceptInvite: (token: string) => call<{ project: number }>(`/invites/${token}/accept`, { method: "POST" }),
  checkout: () => call<{ url: string }>("/billing/checkout", { method: "POST" }),
  portal: () => call<{ url: string }>("/billing/portal", { method: "POST" }),
};
