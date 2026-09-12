import { getSchema } from "@tiptap/core";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { CellSelection, TableMap } from "@tiptap/pm/tables";
import { describe, expect, it } from "vitest";
import { getScriptExtensions } from "@/features/content/scripts/config/content-script-editor.config";
import { addScriptRowAbove } from "./content-script-table.util";

const schema = getSchema(getScriptExtensions());

function tableState(header: boolean, rows = 2, merged = false) {
  const table = schema.nodes.table.create(
    null,
    Array.from({ length: rows }, (_, row) =>
      schema.nodes.tableRow.create(
        null,
        Array.from({ length: merged && row === 0 ? 1 : 2 }, (_, column) =>
          schema.nodes[
            header && row === 0 ? "tableHeader" : "tableCell"
          ].create(
            { colspan: merged && row === 0 ? 2 : 1 },
            schema.nodes.paragraph.create(
              null,
              schema.text(`${row}:${column}`),
            ),
          ),
        ),
      ),
    ),
  );
  const doc = schema.nodes.doc.create(null, table);
  return EditorState.create({
    schema,
    doc,
    selection: CellSelection.create(doc, 1 + TableMap.get(table).map[0]),
  });
}

function insert(state: EditorState) {
  let next = state;
  expect(
    addScriptRowAbove({
      state,
      dispatch: (tr) => {
        next = state.apply(tr);
      },
    }),
  ).toBe(true);
  return next;
}

describe("script row insertion", () => {
  it.each([false, true])(
    "keeps the heading intact through repeated top additions (merged: %s)",
    (merged) => {
      let state = tableState(true, 2, merged);
      const heading = state.doc.firstChild!.firstChild!.toJSON();
      const body = state.doc.firstChild!.lastChild!.toJSON();
      for (let count = 0; count < 3; count++) {
        state = insert(state);
        const table = state.doc.firstChild!;
        expect(table.childCount).toBe(3 + count);
        expect(table.firstChild!.toJSON()).toEqual(heading);
        expect(table.child(1).textContent).toBe("");
        expect(table.child(1).childCount).toBe(2);
        table
          .child(1)
          .forEach((cell) => expect(cell.type.name).toBe("tableCell"));
        expect(table.lastChild!.toJSON()).toEqual(body);
        expect(TableMap.get(table).problems).toBeNull();
      }
    },
  );

  it("creates body cells when the table contains only its heading", () => {
    const state = insert(tableState(true, 1));
    const table = state.doc.firstChild!;
    expect(table.childCount).toBe(2);
    expect(table.firstChild!.textContent).toBe("0:00:1");
    table.lastChild!.forEach((cell) =>
      expect(cell.type.name).toBe("tableCell"),
    );
  });

  it("still inserts at the top of a table without a heading", () => {
    const state = insert(tableState(false));
    expect(state.doc.firstChild!.firstChild!.textContent).toBe("");
    expect(state.doc.firstChild!.child(1).textContent).toBe("0:00:1");
  });

  it("inserts above the selected body row without moving its heading", () => {
    let state = tableState(true, 3);
    const table = state.doc.firstChild!;
    state = state.apply(
      state.tr.setSelection(
        CellSelection.create(state.doc, 1 + TableMap.get(table).map[4]),
      ),
    );
    const next = insert(state).doc.firstChild!;
    expect(next.firstChild!.toJSON()).toEqual(table.firstChild!.toJSON());
    expect(next.child(1).textContent).toBe("1:01:1");
    expect(next.child(2).textContent).toBe("");
    expect(next.child(3).textContent).toBe("2:02:1");
  });

  it("does not mutate during availability checks or outside a table", () => {
    const state = tableState(true);
    expect(addScriptRowAbove({ state, dispatch: undefined })).toBe(true);
    expect(state.doc.firstChild!.childCount).toBe(2);
    const doc = schema.nodes.doc.create(null, schema.nodes.paragraph.create());
    const outside = EditorState.create({
      schema,
      doc,
      selection: TextSelection.create(doc, 1),
    });
    expect(addScriptRowAbove({ state: outside, dispatch: undefined })).toBe(
      false,
    );
  });
});
