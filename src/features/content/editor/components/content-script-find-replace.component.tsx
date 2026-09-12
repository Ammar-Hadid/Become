"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import {
  CaseSensitive,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Replace,
  Search,
  WholeWord,
  X,
} from "lucide-react";

export function ContentScriptFindReplace({
  editor,
  replaceInitiallyOpen,
  onClose,
}: {
  editor: Editor;
  replaceInitiallyOpen: boolean;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [replaceOpen, setReplaceOpen] = useState(
    replaceInitiallyOpen && editor.isEditable,
  );
  const [searchTerm, setSearchTerm] = useState(
    editor.storage.findAndReplace.searchTerm,
  );
  const [replaceTerm, setReplaceTerm] = useState(
    editor.storage.findAndReplace.replaceTerm,
  );
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      caseSensitive: current.storage.findAndReplace.caseSensitive,
      currentIndex: current.storage.findAndReplace.currentIndex,
      resultCount: current.storage.findAndReplace.results.length,
      wholeWord: current.storage.findAndReplace.wholeWord,
    }),
  });

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function close() {
    editor.commands.clearSearch();
    onClose();
    requestAnimationFrame(() => editor.commands.focus());
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (event.shiftKey) editor.commands.goToPreviousResult();
      else editor.commands.goToNextResult();
    }
  }

  const currentResult =
    state.resultCount === 0 || state.currentIndex === null
      ? 0
      : state.currentIndex + 1;

  return (
    <div
      className="content-script-find"
      role="search"
      aria-label="Find and replace in script"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        }
      }}
    >
      <div className="content-script-find-row">
        <Search aria-hidden="true" />
        <label>
          <span className="sr-only">Find in script</span>
          <input
            ref={inputRef}
            type="search"
            value={searchTerm}
            placeholder="Find in this script"
            onChange={(event) => {
              setSearchTerm(event.target.value);
              editor.commands.setSearchTerm(event.target.value);
            }}
            onKeyDown={handleSearchKeyDown}
          />
        </label>
        <span className="content-script-find-count" aria-live="polite">
          {currentResult} of {state.resultCount}
        </span>
        <button
          type="button"
          className="content-script-find-option"
          aria-label="Match case"
          aria-pressed={state.caseSensitive}
          title="Match case"
          onClick={() => editor.commands.setCaseSensitive(!state.caseSensitive)}
        >
          <CaseSensitive aria-hidden="true" />
        </button>
        <button
          type="button"
          className="content-script-find-option"
          aria-label="Match whole word"
          aria-pressed={state.wholeWord}
          title="Match whole word"
          onClick={() => editor.commands.setWholeWord(!state.wholeWord)}
        >
          <WholeWord aria-hidden="true" />
        </button>
        <button
          type="button"
          className="content-script-find-option"
          aria-label="Previous result"
          title="Previous result · Shift+Enter"
          disabled={!state.resultCount}
          onClick={() => editor.commands.goToPreviousResult()}
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <button
          type="button"
          className="content-script-find-option"
          aria-label="Next result"
          title="Next result · Enter"
          disabled={!state.resultCount}
          onClick={() => editor.commands.goToNextResult()}
        >
          <ChevronRight aria-hidden="true" />
        </button>
        <button
          type="button"
          className="content-script-find-option content-script-find-expand"
          aria-label={replaceOpen ? "Hide replace" : "Show replace"}
          aria-expanded={replaceOpen}
          disabled={!editor.isEditable}
          title={replaceOpen ? "Hide replace" : "Show replace"}
          onClick={() => {
            if (editor.isEditable) setReplaceOpen((current) => !current);
          }}
        >
          <ChevronDown aria-hidden="true" />
        </button>
        <button
          type="button"
          className="content-script-find-option"
          aria-label="Close find"
          title="Close · Escape"
          onClick={close}
        >
          <X aria-hidden="true" />
        </button>
      </div>

      {replaceOpen && (
        <div className="content-script-find-row content-script-find-row--replace">
          <Replace aria-hidden="true" />
          <label>
            <span className="sr-only">Replace with</span>
            <input
              value={replaceTerm}
              placeholder="Replace with"
              onChange={(event) => {
                setReplaceTerm(event.target.value);
                editor.commands.setReplaceTerm(event.target.value);
              }}
            />
          </label>
          <button
            type="button"
            className="content-script-find-text-action"
            disabled={!state.resultCount || editor.isEditable === false}
            onClick={() => editor.commands.replace()}
          >
            Replace
          </button>
          <button
            type="button"
            className="content-script-find-text-action"
            disabled={!state.resultCount || editor.isEditable === false}
            onClick={() => editor.commands.replaceAll()}
          >
            Replace all
          </button>
        </div>
      )}
    </div>
  );
}
