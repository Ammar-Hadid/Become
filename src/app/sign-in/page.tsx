import { redirect } from "next/navigation";
import { ArrowDownRight } from "lucide-react";
import { BrandMark } from "@/components/layout/branding/brand-mark.component";
import { AuthForm } from "@/features/auth/components/auth-form.component";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export default async function SignInPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <main className="auth-page">
      <section className="auth-story">
        <BrandMark />
        <div className="max-w-copy relative z-10">
          <p className="eyebrow text-primary mb-2xl">
            Your personal operating system
          </p>
          <h1>
            Make your direction
            <br />
            <span>visible.</span>
          </h1>
          <p className="text-text-secondary text-h5 max-w-copy mt-7">
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
        <div className="max-w-copy w-full">
          <div className="mb-4xl lg:hidden">
            <BrandMark />
          </div>
          <p className="eyebrow mb-md">Welcome</p>
          <h2 className="text-h2 font-semibold tracking-[-0.045em]">
            Continue your record.
          </h2>
          <p className="text-text-secondary mt-md text-body">
            A truthful view starts with the work you log.
          </p>
          <AuthForm />
        </div>
      </section>
    </main>
  );
}
