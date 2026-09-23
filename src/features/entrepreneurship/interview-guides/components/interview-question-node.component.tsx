"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { GripVertical, Trash2 } from "lucide-react";

function probesFrom(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

export function InterviewQuestionNode({
  deleteNode,
  editor,
  getPos,
  node,
  updateAttributes,
}: NodeViewProps) {
  const questionNumber = (() => {
    const position = getPos();
    if (typeof position !== "number") return null;
    let number = 0;
    editor.state.doc.descendants((candidate, candidatePosition) => {
      if (candidatePosition > position) return false;
      if (candidate.type.name === "interviewQuestion") number += 1;
      return true;
    });
    return number;
  })();
  const readOnly = !editor.isEditable;
  const prompt = String(node.attrs.prompt ?? "");
  const intent = String(node.attrs.intent ?? "");
  const probes = probesFrom(node.attrs.probes);

  return (
    <NodeViewWrapper
      className="interview-question-node"
      data-question-id={String(node.attrs.questionId)}
    >
      <div className="interview-question-node-heading" contentEditable={false}>
        <span>
          <GripVertical aria-hidden="true" />
          Question {questionNumber ?? ""}
        </span>
        {!readOnly && (
          <button
            type="button"
            aria-label={`Remove question ${questionNumber ?? ""}`}
            onClick={deleteNode}
          >
            <Trash2 aria-hidden="true" />
            Remove
          </button>
        )}
      </div>
      <div className="interview-question-node-fields" contentEditable={false}>
        <label>
          Ask
          <textarea
            value={prompt}
            disabled={readOnly}
            rows={2}
            onChange={(event) =>
              updateAttributes({ prompt: event.target.value })
            }
          />
        </label>
        <label>
          Listen for <span>Optional</span>
          <textarea
            value={intent}
            disabled={readOnly}
            rows={2}
            onChange={(event) =>
              updateAttributes({ intent: event.target.value })
            }
          />
        </label>
        <label>
          Follow-up prompts <span>One per line · optional</span>
          <textarea
            value={probes.join("\n")}
            disabled={readOnly}
            rows={Math.max(2, Math.min(5, probes.length + 1))}
            onChange={(event) =>
              updateAttributes({
                probes: event.target.value.split("\n"),
              })
            }
          />
        </label>
      </div>
    </NodeViewWrapper>
  );
}
