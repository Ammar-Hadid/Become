import { describe, expect, it } from "vitest";
import type { CotsIdentityView } from "@/features/seasons/discovery/types/cots-discovery.types";
import type { ProviderCandidate } from "@/features/seasons/discovery/types/cots-provider.types";
import { rankCotsTextCandidates } from "./cots-text-quality.util";

const identity = (values: Partial<CotsIdentityView>): CotsIdentityView => ({
  id: "identity",
  identityRevision: 1,
  displayName: "Spike Spiegel",
  subjectKind: "FICTIONAL",
  sourceCategory: "anime",
  registryVersion: 1,
  discoveryContextId: "context",
  discoveryRevision: 1,
  sourceWork: "Cowboy Bebop",
  adaptation: "",
  language: "en",
  savedAt: new Date(0).toISOString(),
  ...values,
});

const quote = (
  text: string,
  values: Partial<ProviderCandidate> = {},
): ProviderCandidate => ({
  provider: "fixture",
  externalId: text,
  form: "QUOTATION",
  title: "Spike Spiegel",
  width: null,
  height: null,
  text,
  speaker: "Spike Spiegel",
  sourceUrl: "https://example.com",
  sourceWork: "Cowboy Bebop",
  sourceDetail: "Fixture evidence",
  credit: null,
  license: null,
  evidence: "PROVIDER",
  language: "en",
  importable: true,
  unavailableReason: null,
  ...values,
});

describe("COTS text quality ranking", () => {
  it("uses provider popularity before source recency for an anime character", () => {
    const result = rankCotsTextCandidates(identity({}), [
      quote("I believe you must choose your own path in life.", {
        popularityRank: 8,
      }),
      quote("Whatever happens, happens.", { popularityRank: 1 }),
    ]);
    expect(result[0].text).toBe("Whatever happens, happens.");
  });

  it("keeps frame-worthy Luffy thoughts and removes ordinary scene dialogue", () => {
    const luffy = identity({
      displayName: "Monkey D. Luffy",
      sourceWork: "One Piece",
    });
    const dialogue = (text: string) =>
      quote(text, {
        form: "DIALOGUE_TURN",
        title: "One Piece",
        speaker: "Luffy",
        sourceWork: "One Piece",
        evidence: "UNRESOLVED",
      });
    const result = rankCotsTextCandidates(luffy, [
      dialogue("And now to the Grand Line!"),
      dialogue("[furiously crushes the blade] Use her?!"),
      dialogue("I run a pirate crew and I'm looking for people to join up."),
      dialogue("I'm gonna be King of the Pirates!"),
      dialogue(
        "I'm doing it because I want to. I decided long ago that I'm gonna be King of the Pirates. If I have to die fighting for that, then I die!",
      ),
      dialogue(
        "The world's greatest swordsman sounds pretty good. The King of the Pirates wouldn't have any less than the best on this crew.",
      ),
      dialogue("But the way you said it, I believed you."),
    ]);

    expect(result.map(({ text }) => text)).toEqual([
      "I'm doing it because I want to. I decided long ago that I'm gonna be King of the Pirates. If I have to die fighting for that, then I die!",
      "But the way you said it, I believed you.",
      "The world's greatest swordsman sounds pretty good. The King of the Pirates wouldn't have any less than the best on this crew.",
    ]);
  });

  it("prefers the exact character and show for TV dialogue", () => {
    const tv = identity({
      displayName: "Omar Little",
      sourceCategory: "tv",
      sourceWork: "The Wire",
    });
    const result = rankCotsTextCandidates(tv, [
      quote("Somebody else's line.", {
        speaker: "Jimmy McNulty",
        sourceWork: "The Wire",
      }),
      quote("A man got to have a code.", {
        title: "Omar Little",
        speaker: "Omar Little",
        sourceWork: "The Wire",
      }),
    ]);
    expect(result[0].speaker).toBe("Omar Little");
  });

  it("rejects biography prose and duplicate public-figure wording", () => {
    const person = identity({
      displayName: "Andrew Tate",
      subjectKind: "PERSON",
      sourceCategory: "person",
      sourceWork: "",
    });
    const result = rankCotsTextCandidates(person, [
      quote(
        "Emory Andrew Tate III (born December 1, 1986) is a British and American social media personality and businessman.",
        { title: "Andrew Tate", speaker: "Andrew Tate", sourceWork: "" },
      ),
      quote("Discipline is doing what needs to be done.", {
        title: "Andrew Tate",
        speaker: "Andrew Tate",
        sourceWork: "",
      }),
      quote("Discipline is doing what needs to be done!", {
        title: "Andrew Tate",
        speaker: "Andrew Tate",
        sourceWork: "",
      }),
    ]);
    expect(result.map(({ text }) => text)).toEqual([
      "Discipline is doing what needs to be done.",
    ]);
  });
});
