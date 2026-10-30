"use client";
import { useState } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import { CharacterConfirmation } from "@/components/ui/character-confirmation/character-confirmation.component";

export function CharacterConfirmationCandidate() {
  const [state, setState] = useState("match");
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <main
      style={{
        padding: "var(--space-app-page-gutter)",
        display: "grid",
        gap: "var(--spacing-xl)",
        minHeight: "100vh",
      }}
    >
      <header>
        <p className="type-overline">
          COMPONENT CANDIDATE · NOT SAVED SEASON DATA
        </p>
        <h1 className="type-page-title">Character confirmation</h1>
        <p className="type-body">
          Shared cards, controls, typography, and AI text. Sample source images;
          no live lookup runs on this page.
        </p>
      </header>
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-sm)" }}
      >
        {["match", "loading", "not-found", "error"].map((value) => (
          <Button
            key={value}
            variant="secondary"
            onClick={() => {
              setState(value);
              setNotice(null);
            }}
          >
            {value}
          </Button>
        ))}
      </div>
      <CharacterConfirmation
        aiUsed={false}
        loading={state === "loading"}
        match={
          state === "match"
            ? {
                name: "Kaoruko Waguri",
                sourceWork: "The Fragrant Flower Blooms with Dignity",
                adaptation: "TV anime",
                images: [
                  {
                    href: "https://kaoruhana-anime.com/assets/img/chara/img_main_chara_2.png",
                    alt: "Kaoruko Waguri character artwork from the official anime site",
                    sourceUrl: "https://kaoruhana-anime.com/character/",
                    sourceLabel: "Official anime character page",
                  },
                  {
                    href: "https://kaoruhana-anime.com/assets/img/chara/img_sub_chara_2.png",
                    alt: "Second Kaoruko Waguri image from the official anime character page",
                    sourceUrl: "https://kaoruhana-anime.com/character/",
                    sourceLabel: "Official anime character page",
                  },
                ],
              }
            : null
        }
        notice={
          notice ??
          (state === "error"
            ? "The source is unavailable. Retry or upload your own references."
            : null)
        }
        onConfirm={() =>
          setNotice(
            "Confirmed in this preview. No Season records were changed.",
          )
        }
        onDifferentVersion={() =>
          setNotice(
            "Choose the adaptation you want. This preview does not perform a lookup.",
          )
        }
        onWrongCharacter={() => {
          setState("not-found");
          setNotice("Try another name or provide a source image.");
        }}
      />
    </main>
  );
}
