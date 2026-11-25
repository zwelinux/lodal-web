/* Lodal toolbar popup. Plain JavaScript on purpose: nothing to build, easy to read and review. */
const $ = (id) => document.getElementById(id);
const DONE = /^\[x\]\s?/i;

let grid = null; // { subjects, entries, assigned }
let page = { title: "", url: "", ok: false, selection: "" };

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const say = (text, error = false) => {
  const m = $("msg");
  m.textContent = text;
  m.className = error ? "msg error" : "msg";
};

async function getToken() {
  return (await chrome.storage.local.get("token")).token || "";
}

async function call(path, opts = {}) {
  const token = await getToken();
  let res;
  try {
    res = await fetch(LODAL.api + path, {
      ...opts,
      headers: { "Content-Type": "application/json", Authorization: `Token ${token}`, ...(opts.headers || {}) },
    });
  } catch {
    throw new Error("Can't reach Lodal. Check your internet.");
  }
  if (res.status === 401) {
    await chrome.storage.local.remove("token");
    showConnect();
    throw new Error("Please connect again.");
  }
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

const parseTasks = (value) => {
  if (!value) return [];
  const lines = value.split("\n");
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  return lines.map((l) => (DONE.test(l) ? { text: l.replace(DONE, ""), done: true } : { text: l, done: false }));
};
const serialize = (tasks) => tasks.map((t) => (t.done ? "[x] " : "") + t.text).join("\n");

function showConnect() {
  $("connect").hidden = false;
  $("app").hidden = true;
}

async function loadGrid() {
  const d = today();
  grid = await call(`/grid?from=${d}&to=${d}`);
  return grid;
}

function renderToday() {
  const d = today();
  $("date").textContent = new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
  const list = $("list");
  list.textContent = "";
  let any = false;
  for (const s of grid.subjects) {
    const entry = grid.entries.find((e) => e.subject === s.id && e.date === d);
    const tasks = parseTasks(entry ? entry.text : "").filter((t) => t.text.trim());
    if (!tasks.length) continue;
    any = true;
    const g = document.createElement("div");
    g.className = "group";
    const h = document.createElement("h2");
    h.textContent = s.name;
    g.appendChild(h);
    tasks.forEach((t) => {
      const row = document.createElement("label");
      row.className = "task" + (t.done ? " done" : "");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = t.done;
      const span = document.createElement("span");
      span.textContent = t.text;
      cb.addEventListener("change", () => toggle(s.id, t.text, cb.checked));
      row.append(cb, span);
      g.appendChild(row);
    });
    list.appendChild(g);
  }
  const assigned = (grid.assigned || []).filter((t) => t.date === d && !t.done);
  if (assigned.length) {
    any = true;
    const g = document.createElement("div");
    g.className = "group";
    const h = document.createElement("h2");
    h.textContent = "Assigned to you in projects";
    g.appendChild(h);
    assigned.forEach((t) => {
      const a = document.createElement("a");
      a.className = "ticket";
      a.href = `${LODAL.web}/app/projects/${t.project}`;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = `${t.title} · ${t.project_name}`;
      g.appendChild(a);
    });
    list.appendChild(g);
  }
  if (!any) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "Nothing planned for today. Add a task, or enjoy the quiet.";
    list.appendChild(p);
  }
}

async function toggle(subject, text, done) {
  say("");
  try {
    const d = today();
    await loadGrid(); // work from the latest text, so nothing written elsewhere is overwritten
    const entry = grid.entries.find((e) => e.subject === subject && e.date === d);
    const tasks = parseTasks(entry ? entry.text : "");
    const t = tasks.find((x) => x.text === text && x.done !== done);
    if (!t) return renderToday();
    t.done = done;
    await call("/entries", { method: "PUT", body: JSON.stringify({ subject, date: d, text: serialize(tasks) }) });
    await loadGrid();
    renderToday();
  } catch (e) {
    say(e.message, true);
    try {
      await loadGrid();
      renderToday();
    } catch {}
  }
}

async function addTask() {
  const text = $("task").value.replace(/\s+/g, " ").trim();
  if (!text) return;
  const subject = Number($("subject").value);
  $("addBtn").disabled = true;
  say("");
  try {
    const d = today();
    await loadGrid();
    const entry = grid.entries.find((e) => e.subject === subject && e.date === d);
    const old = entry ? entry.text.replace(/\n+$/, "") : "";
    await call("/entries", { method: "PUT", body: JSON.stringify({ subject, date: d, text: old ? `${old}\n${text}` : text }) });
    $("task").value = "";
    await loadGrid();
    renderToday();
    say("Added to today.");
  } catch (e) {
    say(e.message, true);
  }
  $("addBtn").disabled = false;
}

async function createSubject() {
  const name = $("subjectName").value.replace(/\s+/g, " ").trim();
  if (!name) return;
  $("createSubject").disabled = true;
  say("");
  try {
    const sub = await call("/subjects", { method: "POST", body: JSON.stringify({ name }) });
    $("subject").appendChild(new Option(sub.name, sub.id));
    $("subject").value = sub.id;
    $("subjectName").value = "";
    $("newSubject").hidden = true;
    $("newSubjectBtn").hidden = false;
    await loadGrid();
    $("task").focus();
    say(`Created "${sub.name}". Now add a task to it.`);
  } catch (e) {
    say(e.message, true);
  }
  $("createSubject").disabled = false;
}

async function readPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !/^https?:\/\//.test(tab.url || "")) return;
    page = { title: tab.title || tab.url, url: tab.url, ok: true, selection: "" };
    try {
      const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => String(getSelection() || "") });
      page.selection = (r && r.result ? r.result : "").trim().slice(0, 20000);
    } catch {}
  } catch {}
}

function renderSave() {
  $("pageTitle").textContent = page.ok ? page.title : "This page can't be saved";
  $("pageUrl").textContent = page.ok ? page.url : "Open a normal web page, then try again.";
  $("saveBtn").disabled = !page.ok;
  $("useSel").parentElement.hidden = !page.selection;
  $("selLabel").textContent = page.selection ? `Include the text I selected (${page.selection.length} letters)` : "";
}

async function saveNote() {
  if (!page.ok) return;
  $("saveBtn").disabled = true;
  say("");
  try {
    const folders = await call("/note-folders");
    let folder = folders.find((f) => f.name.toLowerCase() === "web clips");
    if (!folder) folder = await call("/note-folders", { method: "POST", body: JSON.stringify({ name: "Web clips" }) });
    const mine = $("note").value.trim();
    const quote = $("useSel").checked && page.selection ? page.selection.split("\n").map((l) => `> ${l}`).join("\n") : "";
    const body = [`[${page.title.replace(/[\[\]]/g, "")}](${page.url})`, mine, quote].filter(Boolean).join("\n\n");
    const note = await call("/notes", { method: "POST", body: JSON.stringify({ title: page.title.slice(0, 200), body, folder: folder.id }) });
    $("note").value = "";
    const m = $("msg");
    m.className = "msg";
    m.textContent = "Saved. ";
    const a = document.createElement("a");
    a.href = `${LODAL.web}/app/notes/${note.id}`;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "Open the note";
    m.appendChild(a);
  } catch (e) {
    say(e.message, true);
  }
  $("saveBtn").disabled = false;
}

function tab(name) {
  for (const t of ["Today", "Add", "Save"]) {
    const on = t.toLowerCase() === name;
    $("tab" + t).setAttribute("aria-selected", String(on));
    $(t.toLowerCase()).hidden = !on;
  }
  say("");
  if (name === "add") $("task").focus();
}

let wired = false;
function wire() {
  if (wired) return;
  wired = true;
  $("open").href = `${LODAL.web}/app`;
  $("connectBtn").addEventListener("click", () => chrome.tabs.create({ url: `${LODAL.web}/app/connect` }));
  $("tabToday").addEventListener("click", () => tab("today"));
  $("tabAdd").addEventListener("click", () => tab("add"));
  $("tabSave").addEventListener("click", () => tab("save"));
  $("addBtn").addEventListener("click", addTask);
  $("task").addEventListener("keydown", (e) => e.key === "Enter" && addTask());
  $("saveBtn").addEventListener("click", saveNote);
  $("newSubjectBtn").addEventListener("click", () => {
    $("newSubject").hidden = false;
    $("newSubjectBtn").hidden = true;
    $("subjectName").focus();
  });
  $("createSubject").addEventListener("click", createSubject);
  $("subjectName").addEventListener("keydown", (e) => e.key === "Enter" && createSubject());
  $("signout").addEventListener("click", async () => {
    await chrome.storage.local.remove("token");
    showConnect();
  });
  chrome.storage.onChanged.addListener((c) => c.token && c.token.newValue && start());
}

async function start() {
  wire();
  if (!(await getToken())) return showConnect();
  $("connect").hidden = true;
  $("app").hidden = false;
  try {
    await loadGrid();
    const sel = $("subject");
    sel.textContent = "";
    grid.subjects.forEach((s) => sel.appendChild(new Option(s.name, s.id)));
    renderToday();
  } catch (e) {
    say(e.message, true);
  }
  await readPage();
  renderSave();
}

start();
