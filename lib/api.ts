export type User = { id: number; email: string; is_pro: boolean };
export type Subject = { id: number; name: string; position: number };
export type Entry = { subject: number; date: string; text: string };
export type AssignedTicket = { id: number; project: number; project_name: string; title: string; date: string; done: boolean };
export type GridResponse = { subjects: Subject[]; hidden_subjects: Subject[]; entries: Entry[]; assigned: AssignedTicket[]; user: User };
export type AppNotification = { id: number; kind: "invited" | "accepted" | "assigned" | "done" | "update" | "announcement"; title: string; body: string; link: string; created_at: string; read: boolean };
export type NotificationsResponse = { unread: number; items: AppNotification[] };
export type DeleteResult = { result: "hidden" | "deleted" };

export type ProjectSummary = { id: number; name: string; owner: number; is_owner: boolean; role: "owner" | "member"; member_count: number; open_assigned_to_me: number; open_total: number; archived: boolean; unread_chat?: number };
export type Member = { user_id: number; email: string; name: string; role: "owner" | "member" };
export type ProjectSubject = { id: number; name: string; position: number };
export type ProjectTicket = { id: number; project: number; subject: number | null; title: string; date: string; assignee: number | null; done: boolean; created_by: number | null; can_edit: boolean };
export type Invite = { id: number; email: string; role: "owner" | "member"; link: string; expires_at: string };
export type ChatMessage = { id: number; user: number | null; name: string; text: string; created_at: string; mine: boolean };
export type ChatPage = { items: ChatMessage[]; has_more: boolean };
export type ProjectDetail = { project: ProjectSummary; members: Member[]; subjects: ProjectSubject[]; hidden_subjects: ProjectSubject[]; invites: Invite[]; tickets: ProjectTicket[] };
export type InvitePreview = { project: string; email: string; invited_by: string | null; expired: boolean; accepted: boolean };

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const TOKEN_KEY = "lodal.token";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
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
  if (!res.ok) throw new ApiError(res.status, data.error ?? "Something went wrong. Please try again.");
  return data as T;
}

const body = (o: unknown) => JSON.stringify(o);

export const api = {
  register: (email: string, password: string) =>
    call<{ token: string; user: User }>("/auth/register", { method: "POST", body: body({ email, password }) }),
  login: (email: string, password: string) =>
    call<{ token: string; user: User }>("/auth/login", { method: "POST", body: body({ email, password }) }),
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
    call<ProjectTicket>(`/tickets/${id}`, { method: "PATCH", body: body(patch) }),
  deleteTicket: (id: number) => call<void>(`/tickets/${id}`, { method: "DELETE" }),
  invitePreview: (token: string) => call<InvitePreview>(`/invites/${token}`),
  acceptInvite: (token: string) => call<{ project: number }>(`/invites/${token}/accept`, { method: "POST" }),
  checkout: () => call<{ url: string }>("/billing/checkout", { method: "POST" }),
  portal: () => call<{ url: string }>("/billing/portal", { method: "POST" }),
};
