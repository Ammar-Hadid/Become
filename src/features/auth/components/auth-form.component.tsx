"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import { authClient } from "@/lib/auth/config/auth-client.config";

export function AuthForm({ allowSignUp }: { allowSignUp: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signingUp = allowSignUp && mode === "sign-up";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = signingUp
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message ?? "Authentication failed.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError(
        "Become could not connect. Check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-form-wrap">
      {allowSignUp && (
        <div
          className="auth-mode-switch"
          role="group"
          aria-label="Authentication mode"
        >
          <button
            type="button"
            aria-pressed={!signingUp}
            className={!signingUp ? "active" : ""}
            disabled={pending}
            onClick={() => {
              setMode("sign-in");
              setError(null);
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            aria-pressed={signingUp}
            className={signingUp ? "active" : ""}
            disabled={pending}
            onClick={() => {
              setMode("sign-up");
              setError(null);
            }}
          >
            Create account
          </button>
        </div>
      )}
      <form onSubmit={submit} className="mt-3xl space-y-xl">
        {signingUp && (
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
              autoComplete={signingUp ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={
                signingUp ? "At least 8 characters" : "Your password"
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
              {signingUp ? "Create your space" : "Enter Become"}
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>
      <p className="auth-supporting-text text-text-muted mt-2xl text-center">
        Your data stays in your PostgreSQL database.
        <br />
        No activity is shared or published.
      </p>
    </div>
  );
}
