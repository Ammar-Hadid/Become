"use client";

import { useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Check,
  ChevronDown,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Plus,
  Redo2,
  Strikethrough,
  Undo2,
  Unlink,
  X,
} from "lucide-react";
import { MenuItem } from "@/components/ui/menus/menu-item.component";
import { SubMenu } from "@/components/ui/menus/submenu.component";

function ToolButton({
  active,
  children,
  disabled,
  label,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="interview-guide-tool"
      aria-label={label}
      aria-pressed={active ?? undefined}
      data-editor-tool=""
      disabled={disabled}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function normalizeLink(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = /^(https?:|mailto:)/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return /^(https?:|mailto:)/i.test(normalized) ? normalized : null;
}

export function InterviewGuideToolbar({
  editor,
  readOnly,
}: {
  editor: Editor;
  readOnly: boolean;
}) {
  const [editingLink, setEditingLink] = useState(false);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive("bold"),
      bulletList: current.isActive("bulletList"),
      canRedo: current.can().chain().focus().redo().run(),
      canUndo: current.can().chain().focus().undo().run(),
      heading2: current.isActive("heading", { level: 2 }),
      heading3: current.isActive("heading", { level: 3 }),
      italic: current.isActive("italic"),
      link: current.isActive("link"),
      orderedList: current.isActive("orderedList"),
      strike: current.isActive("strike"),
    }),
  });
  const blockLabel = state.heading2
    ? "Section heading"
    : state.heading3
      ? "Subheading"
      : "Paragraph";

  function openLinkEditor() {
    const current = editor.getAttributes("link").href;
    setLink(typeof current === "string" ? current : "");
    setLinkError(null);
    setEditingLink(true);
  }

  function applyLink() {
    const href = normalizeLink(link);
    if (!href) {
      setLinkError("Enter a web or email address.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setEditingLink(false);
    setLinkError(null);
  }

  function handleToolbarKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
      return;
    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        "[data-editor-tool]:not(:disabled)",
      ),
    ).filter((control) => control.offsetParent !== null);
    const index = controls.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0 || controls.length === 0) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? controls.length - 1
          : event.key === "ArrowRight"
            ? (index + 1) % controls.length
            : (index - 1 + controls.length) % controls.length;
    controls[next]?.focus();
  }

  return (
    <div className="interview-guide-toolbar-shell">
      <div
        className="interview-guide-toolbar"
        role="toolbar"
        aria-label="Guide formatting"
        onKeyDown={handleToolbarKeyDown}
      >
        <div className="interview-guide-tool-group" aria-label="History">
          <ToolButton
            label="Undo"
            disabled={readOnly || !state.canUndo}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 aria-hidden="true" />
          </ToolButton>
          <ToolButton
            label="Redo"
            disabled={readOnly || !state.canRedo}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 aria-hidden="true" />
          </ToolButton>
        </div>

        <SubMenu
          label="Text style"
          placement="bottom-end"
          trigger={(triggerProps) => (
            <button
              {...triggerProps}
              className="interview-guide-style-trigger"
              data-editor-tool=""
              disabled={readOnly}
            >
              <Pilcrow aria-hidden="true" />
              <span>{blockLabel}</span>
              <ChevronDown aria-hidden="true" />
            </button>
          )}
        >
          <MenuItem
            role="menuitemradio"
            checked={blockLabel === "Paragraph"}
            onSelect={() => editor.chain().focus().setParagraph().run()}
          >
            Paragraph
            {blockLabel === "Paragraph" && <Check aria-hidden="true" />}
          </MenuItem>
          <MenuItem
            role="menuitemradio"
            checked={state.heading2}
            onSelect={() =>
              editor.chain().focus().setHeading({ level: 2 }).run()
            }
          >
            Section heading
            {state.heading2 && <Check aria-hidden="true" />}
          </MenuItem>
          <MenuItem
            role="menuitemradio"
            checked={state.heading3}
            onSelect={() =>
              editor.chain().focus().setHeading({ level: 3 }).run()
            }
          >
            Subheading
            {state.heading3 && <Check aria-hidden="true" />}
          </MenuItem>
        </SubMenu>

        <div className="interview-guide-tool-group" aria-label="Emphasis">
          <ToolButton
            label="Bold"
            active={state.bold}
            disabled={readOnly}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold aria-hidden="true" />
          </ToolButton>
          <ToolButton
            label="Italic"
            active={state.italic}
            disabled={readOnly}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic aria-hidden="true" />
          </ToolButton>
          <ToolButton
            label="Strikethrough"
            active={state.strike}
            disabled={readOnly}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough aria-hidden="true" />
          </ToolButton>
          <ToolButton
            label={state.link ? "Edit link" : "Add link"}
            active={state.link}
            disabled={readOnly || editor.state.selection.empty}
            onClick={openLinkEditor}
          >
            <Link2 aria-hidden="true" />
          </ToolButton>
          {state.link && (
            <ToolButton
              label="Remove link"
              disabled={readOnly}
              onClick={() => editor.chain().focus().unsetLink().run()}
            >
              <Unlink aria-hidden="true" />
            </ToolButton>
          )}
        </div>

        <div className="interview-guide-tool-group" aria-label="Lists">
          <ToolButton
            label="Bulleted list"
            active={state.bulletList}
            disabled={readOnly}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List aria-hidden="true" />
          </ToolButton>
          <ToolButton
            label="Numbered list"
            active={state.orderedList}
            disabled={readOnly}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered aria-hidden="true" />
          </ToolButton>
        </div>

        <button
          type="button"
          className="interview-guide-insert-question"
          disabled={readOnly}
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertContent([
                {
                  type: "interviewQuestion",
                  attrs: {
                    questionId: `question-${crypto.randomUUID()}`,
                    prompt: "What happened the last time this came up?",
                    intent: "",
                    probes: [],
                  },
                },
                { type: "paragraph" },
              ])
              .run()
          }
        >
          <Plus aria-hidden="true" /> Add question
        </button>
      </div>

      {editingLink && (
        <form
          className="interview-guide-link-editor"
          onSubmit={(event) => {
            event.preventDefault();
            applyLink();
          }}
        >
          <label htmlFor="interview-guide-link">Link address</label>
          <input
            id="interview-guide-link"
            type="text"
            inputMode="url"
            value={link}
            autoFocus
            placeholder="https://example.com"
            aria-describedby={linkError ? "interview-guide-link-error" : undefined}
            onChange={(event) => setLink(event.target.value)}
          />
          <button type="submit" className="interview-guide-link-apply">
            Apply
          </button>
          <button
            type="button"
            className="interview-guide-link-close"
            aria-label="Close link editor"
            onClick={() => setEditingLink(false)}
          >
            <X aria-hidden="true" />
          </button>
          {linkError && (
            <p id="interview-guide-link-error" role="alert">
              {linkError}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
