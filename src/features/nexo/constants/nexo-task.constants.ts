export const NEXO_TASKS = [
  "cots.image-prompt-writing",
  "cots.character-research",
  "cots.season-assembly",
  "entrepreneurship.soFarWeKnow.summary",
  "entrepreneurship.evidence.extract",
  "entrepreneurship.conversations.analyze",
  "entrepreneurship.outreach.analyze",
  "nexo.season-analysis",
  "cots.daily-message",
  "cots.conversation",
  "cots.character-profile",
  "cots.visual-intent",
] as const;
export const SYNTHESIS_TASK = "entrepreneurship.soFarWeKnow.summary" as const;

// Allow the configured 180-second provider deadline plus request/context overhead.
export const NEXO_INTERACTIVE_REQUEST_TIMEOUT_MS = 210_000;

/** Tasks with an implemented domain use case. Reserved IDs above are not runnable. */
export const ACTIVE_NEXO_TASKS = [
  { id: "cots.image-prompt-writing", version: 1, group: "C.O.T.S", label: "Season image prompts", description: "Write versioned, character-specific image directions and a coherent seven-chapter progression from approved Season facts and owner recipes." },
  {
    id: "cots.character-research",
    version: 1,
    group: "C.O.T.S",
    label: "Character research",
    description:
      "Research adaptation-specific evidence for guided Season onboarding.",
  },
  {
    id: "cots.season-assembly",
    version: 1,
    group: "C.O.T.S",
    label: "Season assembly",
    description:
      "Prepare a source-grounded profile, visual intent and summary for owner approval.",
  },
  {
    id: "cots.character-profile",
    version: 1,
    group: "C.O.T.S",
    label: "Character profile",
    description:
      "Draft a character profile from supplied source evidence for owner review.",
  },
  {
    id: SYNTHESIS_TASK,
    version: 1,
    group: "Entrepreneurship",
    label: "So Far We Know summary",
    description: "Generate a source-grounded proposal for an exploration.",
  },
  {
    id: "nexo.season-analysis",
    version: 1,
    group: "Nexo",
    label: "Season analysis",
    description:
      "Explain calculated Season pace from bounded facts, including missing evidence and main drivers.",
  },
  {
    id: "cots.daily-message",
    version: 1,
    group: "C.O.T.S",
    label: "Daily message",
    description:
      "Respond in the approved character voice to bounded Season and domain facts.",
  },
  {
    id: "cots.conversation",
    version: 1,
    group: "C.O.T.S",
    label: "Character conversation",
    description:
      "Answer a Season question with the approved character profile and relevant Nexo facts.",
  },
  {
    id: "cots.visual-intent",
    version: 1,
    group: "C.O.T.S",
    label: "Character visual intent",
    description:
      "Draft a source-grounded visual-intent brief for owner review.",
  },
] as const;
