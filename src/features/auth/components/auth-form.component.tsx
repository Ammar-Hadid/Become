"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button.component";
import { authClient } from "@/lib/auth/auth-client.config";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result =
      mode === "sign-in"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ name, email, password });
    setPending(false);
    if (result.error)
      return setError(result.error.message ?? "Authentication failed.");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="auth-form-wrap">
      <div
        className="auth-mode-switch"
        role="tablist"
        aria-label="Authentication mode"
      >
        <button
          type="button"
          className={mode === "sign-in" ? "active" : ""}
          onClick={() => {
            setMode("sign-in");
            setError(null);
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          className={mode === "sign-up" ? "active" : ""}
          onClick={() => {
            setMode("sign-up");
            setError(null);
          }}
        >
          Create account
        </button>
      </div>
      <form onSubmit={submit} className="mt-8 space-y-5">
        {mode === "sign-up" && (
          <label className="block">
            <span className="field-label">Name</span>
            <input
              className="text-input"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              required
              data-testid="name-input"
            />
          </label>
        )}
        <label className="block">
          <span className="field-label">Email</span>
          <input
            className="text-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            data-testid="email-input"
          />
        </label>
        <label className="block">
          <span className="field-label">Password</span>
          <span className="relative block">
            <input
              className="text-input pr-12"
              type={showPassword ? "text" : "password"}
              autoComplete={
                mode === "sign-in" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={
                mode === "sign-up" ? "At least 8 characters" : "Your password"
              }
              minLength={8}
              required
              data-testid="password-input"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </span>
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={pending}
          data-testid="auth-submit"
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <>
              {mode === "sign-in" ? "Enter Become" : "Create your space"}
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>
      <p className="auth-supporting-text mt-6 text-center leading-relaxed text-[var(--text-muted)]">
        Your data stays in your PostgreSQL database.
        <br />
        No activity is shared or published.
      </p>
    </div>
  );
}
