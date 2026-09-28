"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/buttons/button.component";
import { useRecordFormGuard } from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import { savePersonalSettingsAction } from "@/features/settings/personal/actions/personal-settings.action";

type Feedback =
  | { kind: "error"; message: string }
  | { kind: "success"; message: string }
  | null;

const normalizedEmail = (value: string) => value.trim().toLowerCase();

export function PersonalSettings({
  name: initialName,
  email: initialEmail,
}: {
  name: string;
  email: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const markSaved = useRecordFormGuard(formRef);
  const [savedName, setSavedName] = useState(initialName.trim());
  const [savedEmail, setSavedEmail] = useState(initialEmail.trim());
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, startTransition] = useTransition();

  const cleanName = name.trim();
  const cleanEmail = normalizedEmail(email);
  const emailChanged = normalizedEmail(email) !== normalizedEmail(savedEmail);
  const dirty = cleanName !== savedName || emailChanged;

  function resetForm() {
    setName(savedName);
    setEmail(savedEmail);
    setCurrentPassword("");
    setFeedback(null);
    window.requestAnimationFrame(markSaved);
  }

  return (
    <div className="personal-settings">
      <header className="settings-page-heading">
        <p className="eyebrow">Personal</p>
        <h2>Profile and account</h2>
        <p>
          Keep the personal details used across Become and for signing in up to
          date.
        </p>
      </header>

      <form
        ref={formRef}
        className="personal-settings-form"
        aria-busy={pending}
        onSubmit={(event) => {
          event.preventDefault();
          if (!dirty || pending) return;

          const formData = new FormData(event.currentTarget);
          setFeedback(null);
          startTransition(async () => {
            try {
              const result = await savePersonalSettingsAction(formData);
              if ("error" in result) {
                setFeedback({ kind: "error", message: result.error });
                return;
              }

              setSavedName(cleanName);
              setSavedEmail(cleanEmail);
              setName(cleanName);
              setEmail(cleanEmail);
              setCurrentPassword("");
              setFeedback({
                kind: "success",
                message: "Personal settings saved.",
              });
              window.requestAnimationFrame(() => {
                markSaved();
                router.refresh();
              });
            } catch {
              setFeedback({
                kind: "error",
                message:
                  "Could not save your personal settings. Your changes are still here.",
              });
            }
          });
        }}
      >
        <fieldset className="personal-settings-fields" disabled={pending}>
          <div className="personal-settings-row">
            <div>
              <label htmlFor="personal-name">Name</label>
              <p id="personal-name-description">
                Shown throughout your private workspace.
              </p>
            </div>
            <div className="personal-settings-field">
              <input
                id="personal-name"
                className="text-input"
                name="name"
                value={name}
                maxLength={120}
                autoComplete="name"
                aria-describedby="personal-name-description"
                required
                onChange={(event) => {
                  setName(event.target.value);
                  setFeedback(null);
                }}
              />
            </div>
          </div>

          <div className="personal-settings-row">
            <div>
              <label htmlFor="personal-email">Email</label>
              <p id="personal-email-description">
                Used to sign in and identify your account.
              </p>
            </div>
            <div className="personal-settings-field">
              <input
                id="personal-email"
                className="text-input"
                type="email"
                name="email"
                value={email}
                maxLength={254}
                autoComplete="email"
                aria-describedby="personal-email-description"
                required
                onChange={(event) => {
                  setEmail(event.target.value);
                  setCurrentPassword("");
                  setFeedback(null);
                }}
              />
            </div>
          </div>

          {emailChanged ? (
            <div className="personal-settings-row">
              <div>
                <label htmlFor="personal-current-password">
                  Current password
                </label>
                <p id="personal-current-password-description">
                  Confirm your identity before changing the sign-in email.
                </p>
              </div>
              <div className="personal-settings-field">
                <input
                  id="personal-current-password"
                  className="text-input"
                  type="password"
                  name="currentPassword"
                  value={currentPassword}
                  maxLength={128}
                  autoComplete="current-password"
                  aria-describedby="personal-current-password-description"
                  required
                  onChange={(event) => {
                    setCurrentPassword(event.target.value);
                    setFeedback(null);
                  }}
                />
                <small>Your password is never displayed or stored here.</small>
              </div>
            </div>
          ) : (
            <input type="hidden" name="currentPassword" value="" />
          )}
        </fieldset>

        <div className="personal-settings-actions">
          <div className="personal-settings-feedback" aria-live="polite">
            {feedback?.kind === "error" ? (
              <p className="form-error" role="alert">
                {feedback.message}
              </p>
            ) : null}
            {feedback?.kind === "success" ? (
              <p className="personal-settings-success" role="status">
                {feedback.message}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            disabled={!dirty || pending}
            onClick={resetForm}
          >
            Reset changes
          </Button>
          <Button type="submit" disabled={!dirty || pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
