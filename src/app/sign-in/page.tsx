import { redirect } from "next/navigation";
import { ArrowDownRight } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark.component";
import { AuthForm } from "@/features/auth/components/auth-form.component";
import { getCurrentUser } from "@/lib/auth/current-user.query";

export default async function SignInPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <main className="auth-page">
      <section className="auth-story">
        <BrandMark />
        <div className="relative z-10 max-w-xl">
          <p className="eyebrow mb-6 text-[var(--primary)]">
            Your personal operating system
          </p>
          <h1>
            Make your direction
            <br />
            <span>visible.</span>
          </h1>
          <p className="mt-7 max-w-md text-base leading-relaxed text-[var(--text-secondary)]">
            Connect intention to action, time to evidence, and daily work to the
            person you are becoming.
          </p>
        </div>
        <div className="auth-quote">
          <ArrowDownRight />
          <p>
            “Who am I becoming, and does my actual behavior support that
            direction?”
          </p>
        </div>
        <div className="auth-grid" aria-hidden="true" />
      </section>
      <section className="auth-panel">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <BrandMark />
          </div>
          <p className="eyebrow mb-3">Welcome</p>
          <h2 className="text-3xl font-semibold tracking-[-0.045em]">
            Continue your record.
          </h2>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            A truthful view starts with the work you log.
          </p>
          <AuthForm />
        </div>
      </section>
    </main>
  );
}
