export type TypingUnit = "character" | "word" | "phrase" | "line" | "packet";

export type TypingStudy = {
  id: string;
  name: string;
  unit: TypingUnit;
  tempo: number;
  description: string;
  detail: string;
  recommended?: boolean;
  approved?: boolean;
};

export const typingStudies: TypingStudy[] = [
  {
    id: "signal-cursor",
    name: "Signal Cursor",
    unit: "character",
    tempo: 1,
    description: "A fine light cursor tracks each letter.",
    detail: "Direct and familiar. The message stays the focus.",
    recommended: true,
  },
  {
    id: "amber-block",
    name: "Amber Block",
    unit: "character",
    tempo: 0.92,
    description: "A compact terminal block advances with the text.",
    detail:
      "Sharper computer voice without turning the whole card into a terminal.",
  },
  {
    id: "soft-ink",
    name: "Soft Ink",
    unit: "word",
    tempo: 0.86,
    description: "Words appear in a restrained warm fade.",
    detail: "Easy to read while the sentence forms.",
    recommended: true,
  },
  {
    id: "pulse-train",
    name: "Pulse Train",
    unit: "packet",
    tempo: 0.9,
    description: "Short text packets arrive with a three-beat signal.",
    detail: "Feels active without blinking the full message.",
  },
  {
    id: "line-sweep",
    name: "Line Sweep",
    unit: "line",
    tempo: 0.86,
    description: "Each line draws in under a moving baseline.",
    detail: "An editorial pace for longer daily messages.",
  },
  {
    id: "quantum-dot",
    name: "Quantum Dot",
    unit: "word",
    tempo: 1.06,
    description: "A small orbiting point marks the current word.",
    detail: "A quiet futuristic cue that gives the eye an anchor.",
  },
  {
    id: "terminal-prompt",
    name: "Terminal Prompt",
    unit: "character",
    tempo: 1.08,
    description: "A prompt mark and precise monospaced entry.",
    detail: "Most technical of the set; best for command-like C.O.T.S replies.",
    approved: true,
  },
  {
    id: "breath-marks",
    name: "Breath Marks",
    unit: "phrase",
    tempo: 0.84,
    description: "Phrases arrive with a brief pause at punctuation.",
    detail: "Natural rhythm, fewer distracting updates.",
    recommended: true,
  },
  {
    id: "comet-tail",
    name: "Comet Tail",
    unit: "character",
    tempo: 0.95,
    description: "The newest glyph carries a short light trail.",
    detail: "Expressive but localized to the writing point.",
  },
  {
    id: "edge-draw",
    name: "Edge Draw",
    unit: "word",
    tempo: 0.98,
    description: "A thin edge lights beneath the new word.",
    detail: "Connects the copy to Become's precise light language.",
  },
  {
    id: "word-lift",
    name: "Word Lift",
    unit: "word",
    tempo: 0.92,
    description: "Each word settles upward a few pixels.",
    detail: "Soft kinetic character while keeping the rest of the card still.",
  },
  {
    id: "horizon-wipe",
    name: "Horizon Wipe",
    unit: "line",
    tempo: 1,
    description: "A horizontal aperture reveals one line at a time.",
    detail: "Cinematic on a wide card; calm when the message is short.",
  },
  {
    id: "echo-layer",
    name: "Echo Layer",
    unit: "packet",
    tempo: 1.02,
    description: "A faint ghost of each packet resolves into solid text.",
    detail: "A generated feel without pretending to show AI reasoning.",
  },
  {
    id: "glyph-cascade",
    name: "Glyph Cascade",
    unit: "character",
    tempo: 1.12,
    description: "New letters settle from a tiny vertical offset.",
    detail: "More animated; suited to a one-time reveal only.",
  },
  {
    id: "focus-lock",
    name: "Focus Lock",
    unit: "packet",
    tempo: 0.92,
    description: "A soft packet sharpens instantly into focus.",
    detail: "Clean high-tech reveal with no persistent cursor.",
    recommended: true,
  },
  {
    id: "clear-sentence",
    name: "Clear Sentence",
    unit: "phrase",
    tempo: 0.96,
    description: "A whole thought appears, then the next follows.",
    detail: "Fastest to scan; the animation never competes with reading.",
  },
  {
    id: "packet-relay",
    name: "Packet Relay",
    unit: "packet",
    tempo: 1.04,
    description: "Each new fragment briefly gains a signal frame.",
    detail: "System-like and modular, with a stronger technical character.",
  },
  {
    id: "live-manuscript",
    name: "Live Manuscript",
    unit: "phrase",
    tempo: 0.9,
    description: "Phrases are written with a quiet editorial underline.",
    detail: "A reflective tone for longer C.O.T.S messages.",
  },
];
