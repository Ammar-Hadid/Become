import { mergeAttributes, Node, type Extensions } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { InterviewQuestionNode } from "@/features/entrepreneurship/interview-guides/components/interview-question-node.component";

function isAllowedLink(url: string) {
  return /^(https?:|mailto:)/i.test(url);
}

const InterviewQuestion = Node.create({
  name: "interviewQuestion",
  group: "block",
  atom: true,
  selectable: true,
  isolating: true,

  addAttributes() {
    return {
      questionId: { default: null },
      prompt: { default: "" },
      intent: { default: "" },
      probes: { default: [] },
    };
  },

  parseHTML() {
    return [{ tag: "section[data-interview-question]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-interview-question": "",
        "data-question-id": node.attrs.questionId,
        "data-prompt": node.attrs.prompt,
        "data-intent": node.attrs.intent,
        "data-probes": JSON.stringify(node.attrs.probes),
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(InterviewQuestionNode);
  },
});

export function getInterviewGuideEditorExtensions(): Extensions {
  return [
    StarterKit.configure({
      blockquote: false,
      code: false,
      codeBlock: false,
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      horizontalRule: false,
      link: {
        openOnClick: false,
        defaultProtocol: "https",
        isAllowedUri: isAllowedLink,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      },
    }),
    Placeholder.configure({
      placeholder:
        "Write the context, opening, or reminders you want available during the conversation…",
    }),
    InterviewQuestion,
  ];
}
