import type { CommandProps } from "@tiptap/core";
import { closeHistory } from "@tiptap/pm/history";
import {
  addRow,
  isInTable,
  rowIsHeader,
  selectedRect,
} from "@tiptap/pm/tables";

export function addScriptRowAbove({
  state,
  dispatch,
}: Pick<CommandProps, "state" | "dispatch">) {
  if (!isInTable(state)) return false;
  if (dispatch) {
    const rect = selectedRect(state);
    // Keep the heading and its contents first. The top insertion belongs at
    // the start of the table body, rather than before the heading.
    const row =
      rect.top === 0 && rowIsHeader(rect.map, rect.table, 0) ? 1 : rect.top;
    dispatch(addRow(closeHistory(state.tr), rect, row));
  }
  return true;
}
