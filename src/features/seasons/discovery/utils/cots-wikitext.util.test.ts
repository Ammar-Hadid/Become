import { describe, expect, it } from "vitest";
import { extractWikiQuotes } from "./cots-wikitext.util";
describe("bounded speaker extraction", () => {
  it("keeps explicit speakers separate from other characters and nested source details", () => {
    const lines =
      "== Chapter one ==\n* '''Alex''': Keep the promise you made.\n** Episode 2, reviewed edition\n* '''Sam''': This belongs to another speaker.\n* This is narrative, not dialogue.";
    expect(extractWikiQuotes(lines, "Alex")).toMatchObject([
      {
        text: "Keep the promise you made.",
        detail: "Chapter one Episode 2, reviewed edition",
      },
    ]);
  });
  it("never promotes nested quotes about a public figure into their own statements", () => {
    const lines =
      "== Quotes ==\n* A documented personal statement.\n** Interview, 2000\n== Quotes about Alex ==\n=== A contemporary ===\n* This was said about Alex by somebody else.\n== Disputed ==\n* This was not reliably attributed.";
    expect(extractWikiQuotes(lines, "Alex", true)).toHaveLength(1);
  });
  it("supports colon-prefixed explicit dialogue without inferring other speakers", () => {
    expect(
      extractWikiQuotes(
        "== Dialogue ==\n:'''Alex:''' A real explicit speaker turn.\n:'''Sam:''' Another speaker’s own sentence.",
        "Alex",
      ),
    ).toMatchObject([
      { text: "A real explicit speaker turn.", detail: "Dialogue" },
    ]);
  });
  it("rejects unresolved template wording and preserves language variants separately", () => {
    expect(
      extractWikiQuotes(
        "== Alex ==\n* {{unresolved text}}\n* First wording of this statement.\n* Another translation of that statement.",
        "Alex",
      ),
    ).toHaveLength(2);
  });
  it("supports an explicit nested attribution and preserves short speaker labels as unresolved", () => {
    const result = extractWikiQuotes(
      "== Quotes ==\n* An exact synthetic statement.\n** Alex Example (last words)\n== Dialogue ==\n:'''Alex:''' A synthetic separate turn.\n:'''Sam:''' Another speaker's turn.",
      "Alex Example",
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      text: "An exact synthetic statement.",
      speaker: "Alex Example",
      unresolved: false,
    });
    expect(result[1]).toMatchObject({
      speaker: "Alex",
      unresolved: true,
      dialogue: true,
    });
    expect(
      extractWikiQuotes(
        "'''Alex, to Sam:''' A synthetic unlisted speaker turn.",
        "Alex Example",
      ),
    ).toMatchObject([
      {
        speaker: "Alex",
        unresolved: true,
        text: "A synthetic unlisted speaker turn.",
      },
    ]);
  });
});
