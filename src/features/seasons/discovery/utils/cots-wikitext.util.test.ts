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
  it("matches a character's full and last-name speaker labels", () => {
    expect(
      extractWikiQuotes(
        "== Season 1 ==\n:'''Monkey D. Luffy''': Well, I'm gonna be the King of the Pirates!\n:'''Luffy''': I decided long ago that I'm gonna be King of the Pirates.\n'''Luffy''': The way you said it, I believed you.\n'''Usopp''' (sheepishly): This belongs to somebody else.",
        "Monkey D. Luffy",
      ),
    ).toMatchObject([
      {
        text: "Well, I'm gonna be the King of the Pirates!",
        speaker: "Monkey D. Luffy",
        unresolved: false,
      },
      {
        text: "I decided long ago that I'm gonna be King of the Pirates.",
        speaker: "Luffy",
        unresolved: true,
      },
      {
        text: "The way you said it, I believed you.",
        speaker: "Luffy",
        unresolved: true,
      },
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

  it("does not mistake a public-figure biography containing a URL for a quote", () => {
    const result = extractWikiQuotes(
      "'''Emory Andrew Tate III''' (born December 1, 1986) is a social media personality. https://example.com/profile\n== Quotes ==\n* Discipline is doing what needs to be done.",
      "Andrew Tate",
      true,
    );

    expect(result).toMatchObject([
      { text: "Discipline is doing what needs to be done." },
    ]);
  });

  it("normalizes URLs out of extracted quotations", () => {
    expect(
      extractWikiQuotes(
        "== Quotes ==\n* Fear is only a thought. (https://example.com/quote)",
        "Alex",
        true,
      ),
    ).toMatchObject([{ text: "Fear is only a thought." }]);
  });

  it("keeps a colon inside public-figure wording instead of inventing a speaker", () => {
    expect(
      extractWikiQuotes(
        "== Quotes ==\n* Remember this: discipline compounds.",
        "Alex",
        true,
      ),
    ).toMatchObject([{ text: "Remember this: discipline compounds." }]);
  });

  it("rejects Wikiquote media labels while preserving complete nearby quotes", () => {
    expect(
      extractWikiQuotes(
        "== Quotes ==\n=== 2022 ===\n* absolutely a misogynist (YouTube video)\n* I'm a realist and when you're a realist you're sexist. (same YouTube video)\n* playing a comedic character (statement to The Guardian)\n* Internet sensationalism has purported the idea that I am anti women when nothing could be further from the truth. (statement to The Guardian)",
        "Andrew Tate",
        true,
      ),
    ).toMatchObject([
      {
        text: "I'm a realist and when you're a realist you're sexist.",
        detail: "2022 · same YouTube video",
      },
      {
        text: "Internet sensationalism has purported the idea that I am anti women when nothing could be further from the truth.",
        detail: "2022 · statement to The Guardian",
      },
    ]);
  });

  it("rejects addressed social-post wording while preserving quote-shaped text", () => {
    expect(
      extractWikiQuotes(
        "== Quotes ==\n* Hello @GretaThunberg I have 33 cars. Please provide your email address so I can send a complete list.\n* Discipline is built by keeping promises to yourself.",
        "Andrew Tate",
        true,
      ),
    ).toMatchObject([
      { text: "Discipline is built by keeping promises to yourself." },
    ]);
  });
});
