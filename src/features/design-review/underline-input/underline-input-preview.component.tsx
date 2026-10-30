"use client";

import { useRef, useState, type FormEvent } from "react";
import { WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import { Input } from "@/components/ui/forms/input.component";
import "./underline-input-preview.css";

export function UnderlineInputPreview() {
  const [name, setName] = useState("Okabe Rintarou");
  const [source, setSource] = useState("Steins;Gate");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [bodyNotice, setBodyNotice] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Enter a character name to continue.");
      setNotice("");
      nameRef.current?.focus();
      return;
    }
    setError("");
    setNotice(
      `Preview submitted for ${name.trim()}${source.trim() ? ` · ${source.trim()}` : ""}. No AI lookup ran and no Season data was saved.`,
    );
  }

  return (
    <main className="underline-input-preview">
      <header className="underline-preview-header">
        <p className="type-overline">Approved shared input</p>
        <h1 className="type-page-title">Underline input</h1>
        <p className="type-body">
          Featured for defining moments. Body for everyday forms. Try both in
          the forms below.
        </p>
        <a className="type-label underline-preview-jump" href="#underline-form">
          Jump to the form ↓
        </a>
      </header>

      <section
        className="underline-preview-comparison"
        aria-label="Input comparison"
      >
        <div className="underline-preview-example">
          <h2 className="type-overline">Featured · onboarding</h2>
          <Input
            label="Character name"
            variant="featured"
            defaultValue="Okabe Rintarou"
            help="A larger presence for onboarding and important entries."
          />
        </div>
        <div className="underline-preview-example">
          <h2 className="type-overline">Body · regular forms</h2>
          <Input
            label="Character name"
            variant="body"
            defaultValue="Okabe Rintarou"
            help="The same underline treatment at the normal form size."
          />
        </div>
      </section>

      <section
        className="underline-preview-states"
        aria-labelledby="underline-states-title"
      >
        <header className="underline-preview-section-head">
          <h2 id="underline-states-title" className="type-section-title">
            Body · everyday states
          </h2>
          <p className="type-body-sm">
            One underline, a clear label, and room for feedback.
          </p>
        </header>
        <div className="underline-preview-state-grid">
          <Input label="Empty" placeholder="Type a name…" />
          <Input label="Filled" defaultValue="Kaoruko Waguri" />
          <Input
            label="Read only"
            value="TV anime"
            readOnly
            help="Selectable text; editing is locked."
          />
          <Input label="Disabled" defaultValue="Levi Ackerman" disabled />
          <Input
            label="Required field"
            placeholder="Character name"
            required
            error="A character name is required."
          />
          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            help="Native input types and keyboard behavior are retained."
          />
        </div>
      </section>

      <section
        className="underline-preview-form-section"
        aria-labelledby="underline-body-title"
      >
        <header className="underline-preview-section-head">
          <p className="type-overline">Body · in a regular form</p>
          <h2 id="underline-body-title" className="type-section-title">
            Profile details
          </h2>
          <p className="type-body-sm">
            Compact fields for the kind of form you use every day.
          </p>
        </header>
        <form
          className="underline-preview-body-form"
          onSubmit={(event) => {
            event.preventDefault();
            setBodyNotice(
              "Body form submitted locally. No profile changes were saved.",
            );
          }}
          onReset={() => setBodyNotice("")}
        >
          <div className="underline-preview-body-fields">
            <Input
              label="Display name"
              name="displayName"
              defaultValue="Ari"
              required
              help="The name shown in your profile."
            />
            <Input
              label="Email"
              name="email"
              type="email"
              defaultValue="ari@example.com"
              required
              help="Try a different address to check the email input."
            />
          </div>
          <div className="underline-preview-body-actions">
            <Button type="submit">Save preview</Button>
            <Button type="reset" variant="secondary">
              Reset
            </Button>
          </div>
          <p className="type-caption underline-preview-notice" role="status">
            {bodyNotice || "Local form example. Nothing is saved."}
          </p>
        </form>
      </section>

      <section
        className="underline-preview-form-section"
        id="underline-form"
        aria-labelledby="underline-form-title"
      >
        <header className="underline-preview-form-header">
          <p className="type-overline">Featured · a new beginning</p>
          <h2 id="underline-form-title">
            Who will inspire
            <br />
            this Season?
          </h2>
          <p className="type-body">
            Name a character. AI will find the real one.
            <br />
            You choose the character and version.
          </p>
        </header>
        <form className="underline-preview-form" onSubmit={submit} noValidate>
          <Input
            ref={nameRef}
            label="Character name"
            name="characterName"
            variant="featured"
            value={name}
            required
            error={error}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
              setNotice("");
            }}
          />
          <Input
            label="Source work · optional"
            name="sourceWork"
            variant="featured"
            value={source}
            onChange={(event) => {
              setSource(event.target.value);
              setNotice("");
            }}
          />
          <div className="underline-preview-actions">
            <Button type="submit">
              <WandSparkles aria-hidden="true" />
              Find my character
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setName("");
                setSource("");
                setError("");
                setNotice("");
                nameRef.current?.focus();
              }}
            >
              Enter another character or person
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setName("Okabe Rintarou");
                setSource("Steins;Gate");
                setError("");
                setNotice("Sample character restored for this preview.");
              }}
            >
              Keep current character
            </Button>
          </div>
          <p className="type-caption underline-preview-notice" role="status">
            {notice ||
              "Interactive preview only. Nothing here changes your Season or calls an AI provider."}
          </p>
        </form>
      </section>
    </main>
  );
}
