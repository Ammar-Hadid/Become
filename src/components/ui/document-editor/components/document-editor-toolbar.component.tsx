"use client";

import type { ReactNode } from "react";
import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  ChevronDown,
  FileDown,
  FileInput,
  FileText,
  ImagePlus,
  Italic,
  Keyboard,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Printer,
  Quote,
  Redo2,
  Search,
  SlidersHorizontal,
  Strikethrough,
  Table2,
  Underline,
  Undo2,
} from "lucide-react";
import { MenuItem } from "@/components/ui/menus/menu-item.component";
import { SubMenu } from "@/components/ui/menus/submenu.component";
import "../styles/document-editor-toolbar.css";

function ToolButton({
  active,
  children,
  disabled,
  label,
  onClick,
  shortcut,
  wideOnly,
}: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  shortcut?: string;
  wideOnly?: boolean;
}) {
  return (
    <button
      type="button"
      className="document-editor-tool"
      aria-label={label}
      aria-keyshortcuts={shortcut}
      aria-pressed={active ?? undefined}
      data-editor-tool=""
      data-wide-only={wideOnly ? "true" : undefined}
      disabled={disabled}
      title={shortcut ? `${label} · ${shortcut}` : label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function MenuCheck({ visible }: { visible: boolean }) {
  return visible ? <Check className="document-editor-menu-check" /> : null;
}

export function DocumentEditorToolbar({
  editor,
  readOnly,
  mode = "text",
  documentName = "Document",
  onAddRowAbove,
  onEditImage,
  onEditLink,
  onExport,
  onFind,
  onImport,
  onInsertImage,
  onPrint,
  onShortcuts,
  wordCount,
}: {
  editor: Editor;
  readOnly: boolean;
  mode?: "text" | "full";
  documentName?: string;
  onAddRowAbove?: () => void;
  onEditImage?: () => void;
  onEditLink?: () => void;
  onExport?: (format: "docx" | "txt") => void;
  onFind?: (replace: boolean) => void;
  onImport?: () => void;
  onInsertImage?: () => void;
  onPrint?: () => void;
  onShortcuts?: () => void;
  wordCount?: number;
}) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      alignCenter: current.isActive({ textAlign: "center" }),
      alignJustify: current.isActive({ textAlign: "justify" }),
      alignRight: current.isActive({ textAlign: "right" }),
      blockquote: current.isActive("blockquote"),
      bold: current.isActive("bold"),
      bulletList: current.isActive("bulletList"),
      canRedo: current.can().chain().focus().redo().run(),
      canUndo: current.can().chain().focus().undo().run(),
      heading1: current.isActive("heading", { level: 1 }),
      heading2: current.isActive("heading", { level: 2 }),
      heading3: current.isActive("heading", { level: 3 }),
      image: current.isActive("image"),
      italic: current.isActive("italic"),
      link: current.isActive("link"),
      orderedList: current.isActive("orderedList"),
      strike: current.isActive("strike"),
      table: current.isActive("table"),
      underline: current.isActive("underline"),
    }),
  });

  const blockLabel = state.heading1
    ? "Heading 1"
    : state.heading2
      ? "Heading 2"
      : state.heading3
        ? "Heading 3"
        : state.blockquote
          ? "Quote"
          : "Paragraph";

  function run(command: () => boolean) {
    command();
  }

  function handleToolbarKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
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
    <div
      className="document-editor-toolbar"
      role="toolbar"
      aria-label={`${documentName} formatting`}
      aria-orientation="horizontal"
      onKeyDown={handleToolbarKeyDown}
    >
      <div className="document-editor-tool-group" aria-label="History">
        <ToolButton
          label="Undo"
          shortcut="Control+Z Meta+Z"
          disabled={readOnly || !state.canUndo}
          onClick={() => run(() => editor.chain().focus().undo().run())}
        >
          <Undo2 aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="Redo"
          shortcut="Control+Y Meta+Shift+Z"
          disabled={readOnly || !state.canRedo}
          onClick={() => run(() => editor.chain().focus().redo().run())}
        >
          <Redo2 aria-hidden="true" />
        </ToolButton>
      </div>

      <div className="document-editor-tool-group document-editor-tool-group--style">
        <SubMenu
          label="Text style"
          placement="bottom-end"
          menuClassName="document-editor-menu"
          trigger={(triggerProps) => (
            <button
              {...triggerProps}
              className="document-editor-style-trigger"
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
            onSelect={() =>
              run(() => editor.chain().focus().setParagraph().run())
            }
          >
            <span>Paragraph</span>
            <MenuCheck visible={blockLabel === "Paragraph"} />
          </MenuItem>
          {([1, 2, 3] as const).map((level) => {
            const active = editor.isActive("heading", { level });
            return (
              <MenuItem
                key={level}
                role="menuitemradio"
                checked={active}
                onSelect={() =>
                  run(() => editor.chain().focus().setHeading({ level }).run())
                }
              >
                <span>Heading {level}</span>
                <MenuCheck visible={active} />
              </MenuItem>
            );
          })}
          <MenuItem
            role="menuitemradio"
            checked={state.blockquote}
            icon={<Quote />}
            onSelect={() =>
              run(() => editor.chain().focus().toggleBlockquote().run())
            }
          >
            <span>Quote</span>
            <MenuCheck visible={state.blockquote} />
          </MenuItem>
        </SubMenu>
      </div>

      <div className="document-editor-tool-group" aria-label="Emphasis">
        <ToolButton
          label="Bold"
          shortcut="Control+B Meta+B"
          active={state.bold}
          disabled={readOnly}
          onClick={() => run(() => editor.chain().focus().toggleBold().run())}
        >
          <Bold aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="Italic"
          shortcut="Control+I Meta+I"
          active={state.italic}
          disabled={readOnly}
          onClick={() => run(() => editor.chain().focus().toggleItalic().run())}
        >
          <Italic aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="Underline"
          shortcut="Control+U Meta+U"
          active={state.underline}
          wideOnly
          disabled={readOnly}
          onClick={() =>
            run(() => editor.chain().focus().toggleUnderline().run())
          }
        >
          <Underline aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="Strikethrough"
          active={state.strike}
          wideOnly
          disabled={readOnly}
          onClick={() => run(() => editor.chain().focus().toggleStrike().run())}
        >
          <Strikethrough aria-hidden="true" />
        </ToolButton>
        {mode === "full" && onEditLink ? (
          <ToolButton
            label={state.link ? "Edit link" : "Add link"}
            shortcut="Control+K Meta+K"
            active={state.link}
            wideOnly
            disabled={readOnly}
            onClick={onEditLink}
          >
            <Link2 aria-hidden="true" />
          </ToolButton>
        ) : null}
      </div>

      <div className="document-editor-tool-group" aria-label="Structure">
        <ToolButton
          label="Bulleted list"
          active={state.bulletList}
          disabled={readOnly}
          onClick={() =>
            run(() => editor.chain().focus().toggleBulletList().run())
          }
        >
          <List aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="Numbered list"
          active={state.orderedList}
          disabled={readOnly}
          onClick={() =>
            run(() => editor.chain().focus().toggleOrderedList().run())
          }
        >
          <ListOrdered aria-hidden="true" />
        </ToolButton>

        <SubMenu
          label="Text alignment"
          className="document-editor-wide-tool"
          placement="bottom-end"
          menuClassName="document-editor-menu"
          trigger={(triggerProps) => (
            <button
              {...triggerProps}
              className="document-editor-tool"
              data-editor-tool=""
              disabled={readOnly}
            >
              {state.alignCenter ? (
                <AlignCenter aria-hidden="true" />
              ) : state.alignRight ? (
                <AlignRight aria-hidden="true" />
              ) : state.alignJustify ? (
                <AlignJustify aria-hidden="true" />
              ) : (
                <AlignLeft aria-hidden="true" />
              )}
            </button>
          )}
        >
          {(
            [
              ["left", "Left", <AlignLeft key="left" />],
              ["center", "Center", <AlignCenter key="center" />],
              ["right", "Right", <AlignRight key="right" />],
              ["justify", "Justify", <AlignJustify key="justify" />],
            ] as const
          ).map(([alignment, label, icon]) => {
            const active = editor.isActive({ textAlign: alignment });
            return (
              <MenuItem
                key={alignment}
                role="menuitemradio"
                checked={active}
                icon={icon}
                onSelect={() =>
                  run(() =>
                    editor.chain().focus().setTextAlign(alignment).run(),
                  )
                }
              >
                <span>{label}</span>
                <MenuCheck visible={active} />
              </MenuItem>
            );
          })}
        </SubMenu>
      </div>

      <div className="document-editor-tool-group document-editor-mobile-format">
        <SubMenu
          label="More formatting"
          placement="bottom-end"
          menuClassName="document-editor-menu"
          trigger={(triggerProps) => (
            <button
              {...triggerProps}
              className="document-editor-tool"
              data-editor-tool=""
              disabled={readOnly}
            >
              <SlidersHorizontal aria-hidden="true" />
            </button>
          )}
        >
          <MenuItem
            role="menuitemcheckbox"
            checked={state.underline}
            icon={<Underline />}
            onSelect={() =>
              run(() => editor.chain().focus().toggleUnderline().run())
            }
          >
            <span>Underline</span>
            <MenuCheck visible={state.underline} />
          </MenuItem>
          <MenuItem
            role="menuitemcheckbox"
            checked={state.strike}
            icon={<Strikethrough />}
            onSelect={() =>
              run(() => editor.chain().focus().toggleStrike().run())
            }
          >
            <span>Strikethrough</span>
            <MenuCheck visible={state.strike} />
          </MenuItem>
          {mode === "full" && onEditLink ? (
            <MenuItem
              role="menuitemcheckbox"
              checked={state.link}
              icon={<Link2 />}
              onSelect={onEditLink}
            >
              <span>{state.link ? "Edit link" : "Add link"}</span>
              <MenuCheck visible={state.link} />
            </MenuItem>
          ) : null}
          {(
            [
              ["left", "Align left", <AlignLeft key="left" />],
              ["center", "Align center", <AlignCenter key="center" />],
              ["right", "Align right", <AlignRight key="right" />],
              ["justify", "Justify", <AlignJustify key="justify" />],
            ] as const
          ).map(([alignment, label, icon]) => {
            const active = editor.isActive({ textAlign: alignment });
            return (
              <MenuItem
                key={alignment}
                role="menuitemradio"
                checked={active}
                icon={icon}
                onSelect={() =>
                  run(() =>
                    editor.chain().focus().setTextAlign(alignment).run(),
                  )
                }
              >
                <span>{label}</span>
                <MenuCheck visible={active} />
              </MenuItem>
            );
          })}
        </SubMenu>
      </div>

      {mode === "full" && <div className="document-editor-tool-group" aria-label="Insert">
        <SubMenu
          label="Table"
          placement="bottom-end"
          menuClassName="document-editor-menu"
          trigger={(triggerProps) => (
            <button
              {...triggerProps}
              className="document-editor-tool"
              data-editor-tool=""
              disabled={readOnly}
            >
              <Table2 aria-hidden="true" />
            </button>
          )}
        >
          {!state.table ? (
            <>
              {[2, 3, 4].map((size) => (
                <MenuItem
                  key={size}
                  icon={<Table2 />}
                  onSelect={() =>
                    run(() =>
                      editor
                        .chain()
                        .focus()
                        .insertTable({
                          rows: size,
                          cols: size,
                          withHeaderRow: true,
                        })
                        .run(),
                    )
                  }
                >
                  {size} × {size} table
                </MenuItem>
              ))}
            </>
          ) : (
            <>
              <MenuItem
                onSelect={() =>
                  run(() =>
                    onAddRowAbove?.() ?? false,
                  )
                }
              >
                Add row above
              </MenuItem>
              <MenuItem
                onSelect={() =>
                  run(() => editor.chain().focus().addRowAfter().run())
                }
              >
                Add row below
              </MenuItem>
              <MenuItem
                onSelect={() =>
                  run(() => editor.chain().focus().addColumnBefore().run())
                }
              >
                Add column left
              </MenuItem>
              <MenuItem
                onSelect={() =>
                  run(() => editor.chain().focus().addColumnAfter().run())
                }
              >
                Add column right
              </MenuItem>
              <MenuItem
                onSelect={() =>
                  run(() => editor.chain().focus().toggleHeaderRow().run())
                }
              >
                Toggle header row
              </MenuItem>
              <MenuItem
                disabled={!editor.can().chain().focus().mergeCells().run()}
                onSelect={() =>
                  run(() => editor.chain().focus().mergeCells().run())
                }
              >
                Merge selected cells
              </MenuItem>
              <MenuItem
                disabled={!editor.can().chain().focus().splitCell().run()}
                onSelect={() =>
                  run(() => editor.chain().focus().splitCell().run())
                }
              >
                Split cell
              </MenuItem>
              <MenuItem
                onSelect={() =>
                  run(() => editor.chain().focus().deleteRow().run())
                }
              >
                Delete row
              </MenuItem>
              <MenuItem
                onSelect={() =>
                  run(() => editor.chain().focus().deleteColumn().run())
                }
              >
                Delete column
              </MenuItem>
              <MenuItem
                className="document-editor-menu-danger"
                onSelect={() =>
                  run(() => editor.chain().focus().deleteTable().run())
                }
              >
                Delete table
              </MenuItem>
            </>
          )}
        </SubMenu>

        <SubMenu
          label="Insert"
          placement="bottom-end"
          menuClassName="document-editor-menu"
          trigger={(triggerProps) => (
            <button
              {...triggerProps}
              className="document-editor-insert-trigger"
              data-editor-tool=""
              disabled={readOnly}
            >
              <span>Insert</span>
              <ChevronDown aria-hidden="true" />
            </button>
          )}
        >
          <MenuItem icon={<ImagePlus />} onSelect={() => onInsertImage?.()}>
            Image
          </MenuItem>
          {state.image && (
            <MenuItem icon={<ImagePlus />} onSelect={() => onEditImage?.()}>
              Image details
            </MenuItem>
          )}
          <MenuItem
            icon={<Minus />}
            onSelect={() =>
              run(() => editor.chain().focus().setHorizontalRule().run())
            }
          >
            Divider
          </MenuItem>
        </SubMenu>
      </div>}

      {mode === "full" && <div
        className="document-editor-tool-group document-editor-tool-group--document"
        aria-label="Document"
      >
        <ToolButton
          label={`Find in ${documentName.toLowerCase()}`}
          shortcut="Control+F Meta+F"
          onClick={() => onFind?.(false)}
        >
          <Search aria-hidden="true" />
        </ToolButton>
        <SubMenu
          label="Document"
          placement="bottom-end"
          menuClassName="document-editor-menu"
          trigger={(triggerProps) => (
            <button
              {...triggerProps}
              className="document-editor-file-trigger"
              data-editor-tool=""
            >
              <FileText aria-hidden="true" />
              <span>Document</span>
              <ChevronDown aria-hidden="true" />
            </button>
          )}
        >
          <p className="document-editor-menu-stat" role="status">
            {(wordCount ?? 0).toLocaleString()} {wordCount === 1 ? "word" : "words"}
          </p>
          <MenuItem
            icon={<FileInput />}
            disabled={readOnly}
            onSelect={() => onImport?.()}
          >
            Import Word or text
          </MenuItem>
          <MenuItem icon={<FileDown />} onSelect={() => onExport?.("docx")}>
            Download Word
          </MenuItem>
          <MenuItem icon={<FileDown />} onSelect={() => onExport?.("txt")}>
            Download plain text
          </MenuItem>
          <MenuItem icon={<Printer />} onSelect={() => onPrint?.()}>
            Print / Save as PDF
          </MenuItem>
          <MenuItem icon={<Keyboard />} onSelect={() => onShortcuts?.()}>
            Keyboard shortcuts
          </MenuItem>
        </SubMenu>
      </div>}
    </div>
  );
}
