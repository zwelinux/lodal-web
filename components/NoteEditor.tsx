"use client";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

type Props = {
  value: string; // Markdown
  editable: boolean;
  loadKey: number; // change it to load `value` into the editor again (for example when someone else saved)
  onChange?: (markdown: string) => void;
  onReady?: (editor: Editor) => void;
};

/** The writing surface. Type "# " for a heading, "- " for a list, "[ ] " for a checklist. Stored as plain Markdown. */
export default function NoteEditor({ value, editable, loadKey, onChange, onReady }: Props) {
  const editor = useEditor({
    immediatelyRender: false, // the page is server-rendered, the editor lives in the browser
    editable,
    extensions: [
      StarterKit.configure({ link: { openOnClick: !editable, autolink: true, HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" } } }),
      Markdown,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Start writing…" }),
    ],
    content: value,
    contentType: "markdown",
    editorProps: { attributes: { class: "noteProse", "aria-label": "Note", role: "textbox", "aria-multiline": "true" } },
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
      {editable && editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
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

  function link() {
    if (on.link) return void editor.chain().focus().unsetLink().run();
    const href = window.prompt("Link address, for example https://lodal.app")?.trim();
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
    </div>
  );
}
