"use client";
import { askText } from "./DialogHost";
import Image from "@tiptap/extension-image";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";

type Props = {
  value: string; // Markdown
  editable: boolean;
  loadKey: number; // change it to load `value` into the editor again (for example when someone else saved)
  onChange?: (markdown: string) => void;
  onReady?: (editor: Editor) => void;
  onUpload?: (file: File) => Promise<string>; // saves a picture and gives back its address (only when editable)
  onError?: (message: string) => void;
};

const PICTURE = /^image\/(jpeg|png|webp|gif)$/;
const DOCUMENT = /\.(pdf|docx?|xlsx?|pptx?|txt|md|csv|zip)$/i; // kept in the owner's Google Drive and shown as a link

/** The writing surface. Type "# " for a heading, "- " for a list, "[ ] " for a checklist. Stored as plain Markdown. */
export default function NoteEditor({ value, editable, loadKey, onChange, onReady, onUpload, onError }: Props) {
  const [busy, setBusy] = useState(0); // pictures being uploaded
  const handle = useRef({ onUpload, onError });
  const ed = useRef<Editor | null>(null);
  useEffect(() => {
    handle.current = { onUpload, onError };
  });

  /** Upload pictures and put them in the note, at a place if given (a drop) or at the cursor. */
  async function addPictures(files: File[], at?: number) {
    const up = handle.current.onUpload;
    if (!up || !ed.current) return;
    for (const f of files) {
      const doc = DOCUMENT.test(f.name);
      if (!doc && !PICTURE.test(f.type)) {
        handle.current.onError?.("Please choose a picture (JPG, PNG, WebP, GIF) or a document (PDF, Word, Excel, PowerPoint, text, CSV, ZIP).");
        continue;
      }
      setBusy((n) => n + 1);
      try {
        const src = await up(f);
        const e = ed.current;
        if (e) {
          const piece = doc ? { type: "text", text: `📎 ${f.name}`, marks: [{ type: "link", attrs: { href: src } }] } : { type: "image", attrs: { src, alt: "" } };
          e.chain().focus().insertContentAt(at ?? e.state.selection.to, piece).run();
        }
      } catch (err) {
        handle.current.onError?.(err instanceof Error ? err.message : "Could not upload the picture.");
      }
      setBusy((n) => n - 1);
    }
  }

  const editor = useEditor({
    immediatelyRender: false, // the page is server-rendered, the editor lives in the browser
    editable,
    extensions: [
      StarterKit.configure({ link: { openOnClick: !editable, autolink: true, HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" } } }),
      Markdown,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Start writing…" }),
      Image.configure({ allowBase64: false }),
    ],
    content: value,
    contentType: "markdown",
    editorProps: {
      attributes: { class: "noteProse", "aria-label": "Note", role: "textbox", "aria-multiline": "true" },
      handlePaste: (_view, event) => {
        const files = [...(event.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/") || DOCUMENT.test(f.name));
        if (!files.length || !handle.current.onUpload) return false;
        event.preventDefault();
        void addPictures(files);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        const files = [...(event.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith("image/") || DOCUMENT.test(f.name));
        if (moved || !files.length || !handle.current.onUpload) return false;
        event.preventDefault();
        void addPictures(files, view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos);
        return true;
      },
    },
    onCreate: ({ editor: e }) => {
      ed.current = e;
    },
    onUpdate: ({ editor: e }) => onChange?.(e.getMarkdown().trimEnd()),
  });

  useEffect(() => {
    if (editor && onReady) onReady(editor);
  }, [editor, onReady]);

  const first = loadKey;
  useEffect(() => {
    // load new text when asked to (not on the very first render: the editor already has it)
    if (!editor) return;
    if (editor.getMarkdown().trimEnd() !== value.trimEnd()) editor.commands.setContent(value, { contentType: "markdown", emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [first, editor]);

  return (
    <div className="noteBody">
      {editable && editor && <Toolbar editor={editor} onPick={onUpload ? (files) => void addPictures(files) : undefined} busy={busy > 0} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor, onPick, busy }: { editor: Editor; onPick?: (files: File[]) => void; busy: boolean }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const on = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      task: e.isActive("taskList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
    }),
  });

  async function link() {
    if (on.link) return void editor.chain().focus().unsetLink().run();
    const href = (await askText("Add a link", { hint: "https://lodal.app" }))?.trim();
    if (!href) return;
    const ok = /^(https?:\/\/|mailto:)/i.test(href) ? href : `https://${href}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href: ok }).run();
  }

  const b = (label: string, text: React.ReactNode, active: boolean, run: () => void, extra = "") => (
    <button key={label} type="button" className={`tbBtn ${extra}`} aria-label={label} title={label} aria-pressed={active} onMouseDown={(e) => e.preventDefault()} onClick={run}>
      {text}
    </button>
  );
  const c = () => editor.chain().focus();
  return (
    <div className="noteTools" role="toolbar" aria-label="Formatting">
      {b("Big heading", "H1", on.h1, () => c().toggleHeading({ level: 1 }).run())}
      {b("Small heading", "H2", on.h2, () => c().toggleHeading({ level: 2 }).run())}
      <i className="tbSep" aria-hidden="true" />
      {b("Bold", "B", on.bold, () => c().toggleBold().run(), "tbBold")}
      {b("Italic", "I", on.italic, () => c().toggleItalic().run(), "tbItalic")}
      {b("Link", "🔗", on.link, link)}
      <i className="tbSep" aria-hidden="true" />
      {b("Bullet list", "•", on.bullet, () => c().toggleBulletList().run())}
      {b("Numbered list", "1.", on.ordered, () => c().toggleOrderedList().run())}
      {b("Checklist", "☑", on.task, () => c().toggleTaskList().run())}
      {b("Quote", "❝", on.quote, () => c().toggleBlockquote().run())}
      {b("Divider", "—", false, () => c().setHorizontalRule().run())}
      {onPick && (
        <>
          <i className="tbSep" aria-hidden="true" />
          <button type="button" className="tbBtn" aria-label="Add a picture or file" title="Add a picture or file" onMouseDown={(e) => e.preventDefault()} onClick={() => fileInput.current?.click()}>
            📎
          </button>
          <input
            ref={fileInput}
            type="file"
            hidden
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.zip"
            onChange={(e) => {
              const files = [...(e.target.files ?? [])];
              e.target.value = ""; // so the same picture can be chosen again
              if (files.length) onPick(files);
            }}
          />
        </>
      )}
      {busy && (
        <span className="tbBusy" role="status">
          Uploading…
        </span>
      )}
    </div>
  );
}
