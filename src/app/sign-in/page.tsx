import { redirect } from "next/navigation";
import { Compass, Clock3, Layers3 } from "lucide-react";
import { BrandMark } from "@/components/layout/branding/brand-mark.component";
import { Card } from "@/components/ui/cards/card.component";
import { Workspace } from "@/components/ui/workspace/workspace.component";
import { AuthForm } from "@/features/auth/components/auth-form.component";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { getServerEnv } from "@/lib/config/server-environment.config";

export default async function SignInPage() {
  if (await getCurrentUser()) redirect("/");
  const { BECOME_ALLOW_SIGNUP } = getServerEnv();
  return (
    <main className="auth-page">
      <Workspace className="auth-experience" area="direction">
        <section className="auth-welcome">
          <BrandMark />
          <div className="auth-welcome-copy">
            <p className="workspace-eyebrow">A better you. Every day.</p>
            <h1>
              A little clearer.
              <br />
              <span>A little closer.</span>
            </h1>
            <p>
              Your goals, your work, and your everyday life.
              <br />
              One place to see where you are going.
            </p>
          </div>
          <div className="auth-purpose">
            <span>
              <Compass aria-hidden="true" /> Choose your direction
            </span>
            <span>
              <Clock3 aria-hidden="true" /> Make time for it
            </span>
            <span>
              <Layers3 aria-hidden="true" /> See what changes
            </span>
          </div>
        </section>
        <Card material="elevated-glass" spacing="action" className="auth-entry">
          <p className="workspace-eyebrow">Welcome to Become</p>
          <h2>Pick up where you left off.</h2>
          <p className="auth-entry-description">
            Your workspace is waiting for you.
          </p>
          <AuthForm allowSignUp={BECOME_ALLOW_SIGNUP} />
        </Card>
      </Workspace>
    </main>
  );
}
