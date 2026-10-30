"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import { Input } from "@/components/ui/forms/input.component";
import { Textarea } from "@/components/ui/forms/textarea.component";
import "./underline-textarea-preview.css";

const directionExample =
  "Calm, cinematic, early morning light.\n\nA quiet mountain city with detailed streets, soft clouds and a restrained expression. Keep the character recognizable; let the world evolve gently as the Season progresses.";

export function UnderlineTextareaPreview() {
  const [setting, setSetting] = useState(
    "A quiet city at the edge of the mountains",
  );
  const [direction, setDirection] = useState(directionExample);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const directionRef = useRef<HTMLTextAreaElement>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!direction.trim()) {
      setError("Describe the feeling or appearance you want for this Season.");
      setNotice("");
      directionRef.current?.focus();
      return;
    }
    setError("");
    setNotice(
      "Preview accepted. Your paragraphs are kept; no Season data was changed.",
    );
  }

  return (
    <main className="underline-textarea-preview">
      <header className="textarea-preview-heading">
        <h1 className="type-page-title">Room for a longer thought.</h1>
        <p className="type-body">
          The same underline, typography and focus treatment as the approved
          input, with space for paragraphs.
        </p>
        <p className="type-caption">
          Approved shared textarea · local preview only. The onboarding
          candidate is unchanged.
        </p>
      </header>

      <form className="textarea-preview-season" onSubmit={submit} noValidate>
        <Input
          variant="featured"
          label="Where should this Season take place?"
          value={setting}
          onChange={(event) => setSetting(event.target.value)}
        />
        <Textarea
          ref={directionRef}
          variant="featured"
          label="How should it feel and look?"
          value={direction}
          required
          rows={3}
          help="Write as much as you need. Enter adds a new line; the area grows as you write."
          error={error}
          onChange={(event) => {
            setDirection(event.target.value);
            setError("");
            setNotice("");
          }}
        />
        <div className="textarea-preview-actions">
          <Button type="submit">Try the textarea</Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setDirection(directionExample);
              setError("");
              setNotice("");
            }}
          >
            Restore example
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setDirection("");
              setNotice("");
              directionRef.current?.focus();
            }}
          >
            Clear
          </Button>
        </div>
        <p className="type-caption textarea-preview-notice" role="status">
          {notice ||
            "Try wrapping, paragraphs, selection and keyboard focus. Nothing is saved to your Season."}
        </p>
      </form>

      <section
        className="textarea-preview-body"
        aria-labelledby="textarea-body-heading"
      >
        <header className="textarea-preview-section-heading">
          <h2 id="textarea-body-heading" className="type-section-title">
            The same treatment for everyday writing.
          </h2>
          <p className="type-body-sm">
            Body keeps the regular form size. Featured gives defining entries
            more presence.
          </p>
        </header>
        <div className="textarea-preview-comparison">
          <Textarea
            variant="body"
            label="Notes"
            defaultValue={
              "Keep the setting grounded in the character’s world.\n\nUse light and expression to show change, without turning a setback into a battle scene."
            }
            help="Compact typography, with the same open writing surface."
          />
          <Textarea
            variant="body"
            label="An empty thought"
            placeholder="Start writing here…"
            help="The empty state gives you room to begin."
          />
        </div>
      </section>

      <section
        className="textarea-preview-states"
        aria-labelledby="textarea-states-heading"
      >
        <header className="textarea-preview-section-heading">
          <h2 id="textarea-states-heading" className="type-section-title">
            Clear in every state.
          </h2>
          <p className="type-body-sm">
            Feedback stays beside the writing, and locked text remains
            selectable.
          </p>
        </header>
        <div className="textarea-preview-state-grid">
          <Textarea
            label="Needs a little more detail"
            placeholder="Describe the visual direction…"
            error="Add a feeling, atmosphere or visual detail."
          />
          <Textarea
            label="Read only"
            value={
              "Reserved and attentive.\n\nRecognizable clothing and expression, with soft natural light."
            }
            readOnly
            help="Selectable text; editing is locked."
          />
          <Textarea
            label="Disabled"
            defaultValue="This note is unavailable while the current action finishes."
            disabled
          />
        </div>
      </section>
    </main>
  );
}
