"use client";

import { useEffect, useState, type RefObject } from "react";
import type { Editor } from "@tiptap/core";
import { closeHistory } from "@tiptap/pm/history";
import { TableMap } from "@tiptap/pm/tables";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { addScriptRowAbove } from "@/features/content/editor/utils/content-script-table.util";

type BlockTarget = {
  element: HTMLElement;
  kind: "image" | "table";
  position: number;
  top: number;
  left: number;
  width: number;
  height: number;
};

// Resolve against the live document, including images nested inside table cells.
// DOM positions are refreshed before every action so edits above a block cannot
// redirect its controls to a different image or table.
function blockPosition(
  editor: Editor,
  element: HTMLElement,
  kind: BlockTarget["kind"],
) {
  if (!element.isConnected || !editor.view.dom.contains(element)) return null;
  const position = editor.view.posAtDOM(element, 0);
  const resolved = editor.state.doc.resolve(position);
  for (let depth = resolved.depth; depth > 0; depth--) {
    if (resolved.node(depth).type.name === kind) return resolved.before(depth);
  }
  return editor.state.doc.nodeAt(position)?.type.name === kind
    ? position
    : null;
}

export function ContentScriptBlockControls({
  editor,
  containerRef,
  onEditImage,
}: {
  editor: Editor;
  containerRef: RefObject<HTMLDivElement | null>;
  onEditImage: () => void;
}) {
  const [target, setTarget] = useState<BlockTarget | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !editor.isEditable) return;
    let active: HTMLElement | null = null;
    let frame = 0;

    function measure() {
      frame = 0;
      if (!active?.isConnected || !container) {
        setTarget(null);
        return;
      }
      const kind = active.matches("table") ? "table" : "image";
      const position = blockPosition(editor, active, kind);
      if (position === null) {
        setTarget(null);
        return;
      }
      const bounds = (
        kind === "image" ? (active.querySelector("img") ?? active) : active
      ).getBoundingClientRect();
      const parent = container.getBoundingClientRect();
      const next: BlockTarget = {
        element: active,
        kind,
        position,
        top: bounds.top - parent.top,
        left: bounds.left - parent.left,
        width: bounds.width,
        height: bounds.height,
      };
      setTarget((previous) =>
        previous &&
        Object.keys(next).every(
          (key) =>
            previous[key as keyof BlockTarget] ===
            next[key as keyof BlockTarget],
        )
          ? previous
          : next,
      );
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(measure);
    }
    const observer = new ResizeObserver(schedule);
    observer.observe(container);

    function track(element: HTMLElement | null) {
      if (active !== element) {
        if (active) observer.unobserve(active);
        active = element;
        if (active) observer.observe(active);
      }
      schedule();
    }

    function pointerMove(event: PointerEvent) {
      const element = event.target instanceof Element ? event.target : null;
      if (element?.closest(".content-script-block-controls")) return;
      track(
        element?.closest<HTMLElement>("figure[data-script-image], table") ??
          null,
      );
    }

    function pointerLeave(event: PointerEvent) {
      // Touch ends with pointerleave before its click. Keep the selected block's
      // controls available until another block is selected.
      if (event.pointerType === "touch") return;
      if (
        container
          ?.querySelector(".content-script-block-controls")
          ?.contains(document.activeElement)
      )
        return;
      track(null);
    }

    function selectionChanged() {
      const selection = editor.state.selection;
      const selected = editor.state.doc.nodeAt(selection.from);
      let position: number | null =
        selected?.type.name === "image" || selected?.type.name === "table"
          ? selection.from
          : null;
      if (position === null) {
        for (let depth = selection.$from.depth; depth > 0; depth--) {
          if (selection.$from.node(depth).type.name === "table") {
            position = selection.$from.before(depth);
            break;
          }
        }
      }
      const nodeDOM = position === null ? null : editor.view.nodeDOM(position);
      // Tiptap's table NodeView wraps the actual table even without resizing.
      track(
        nodeDOM instanceof HTMLElement
          ? nodeDOM.matches("figure[data-script-image], table")
            ? nodeDOM
            : nodeDOM.querySelector("table")
          : null,
      );
    }

    container.addEventListener("pointermove", pointerMove);
    container.addEventListener("pointerleave", pointerLeave);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    editor.on("selectionUpdate", selectionChanged);
    editor.on("transaction", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      container.removeEventListener("pointermove", pointerMove);
      container.removeEventListener("pointerleave", pointerLeave);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      editor.off("selectionUpdate", selectionChanged);
      editor.off("transaction", schedule);
    };
  }, [containerRef, editor]);

  if (!target || !editor.isEditable) return null;

  function editImage() {
    if (!target || !editor.isEditable) return;
    const position = blockPosition(editor, target.element, "image");
    if (position === null) return;
    editor.chain().focus().setNodeSelection(position).run();
    onEditImage();
  }

  function tableAction(
    action: "left" | "right" | "above" | "below" | "delete",
  ) {
    if (!target || !editor.isEditable) return;
    const position = blockPosition(editor, target.element, "table");
    if (position === null) return;
    const table = editor.state.doc.nodeAt(position)!;
    const map = TableMap.get(table);
    const cellIndex =
      action === "right"
        ? map.width - 1
        : action === "below"
          ? (map.height - 1) * map.width
          : 0;
    const chain = editor
      .chain()
      .focus()
      // Structural shortcuts are separate undo steps, even when clicked quickly.
      .command(({ tr }) => {
        closeHistory(tr);
        return true;
      })
      .setCellSelection({ anchorCell: position + 1 + map.map[cellIndex] });
    if (action === "left") chain.addColumnBefore().run();
    if (action === "right") chain.addColumnAfter().run();
    if (action === "above") chain.command(addScriptRowAbove).run();
    if (action === "below") chain.addRowAfter().run();
    if (action === "delete") {
      chain.deleteTable().run();
      setTarget(null);
    }
    editor.view.dispatch(closeHistory(editor.state.tr));
  }

  return (
    <div
      className="content-script-block-controls"
      data-kind={target.kind}
      style={{
        top: target.top,
        left: target.left,
        width: target.width,
        height: target.height,
      }}
      // Keep the document selection intact until the chosen command targets its block.
      onMouseDown={(event) => event.preventDefault()}
    >
      {target.kind === "image" ? (
        <button
          type="button"
          className="content-script-image-handle"
          aria-label="Edit image details"
          title="Edit image details"
          onClick={editImage}
        >
          <GripVertical aria-hidden="true" />
        </button>
      ) : (
        <>
          <button
            type="button"
            className="content-script-table-delete"
            aria-label="Delete table"
            title="Delete table · Undo to restore"
            onClick={() => tableAction("delete")}
          >
            <Trash2 aria-hidden="true" />
          </button>
          {(
            [
              ["left", "Add column left"],
              ["right", "Add column right"],
              ["above", "Add row above"],
              ["below", "Add row below"],
            ] as const
          ).map(([edge, label]) => (
            <button
              key={edge}
              type="button"
              className="content-script-table-edge"
              data-edge={edge}
              aria-label={label}
              title={label}
              onClick={() => tableAction(edge)}
            >
              <span>
                <Plus aria-hidden="true" />
              </span>
            </button>
          ))}
        </>
      )}
    </div>
  );
}
