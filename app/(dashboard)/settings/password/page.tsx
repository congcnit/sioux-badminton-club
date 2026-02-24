import Link from "next/link";

import { PasswordForm } from "@/components/settings/password-form";
import { Button } from "@/components/ui/button";

export default function PasswordSettingsPage() {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Password Settings</h1>
          <p className="text-sm text-muted-foreground">
            Change your account password securely.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/settings/profile">Back to Profile</Link>
        </Button>
      </div>
      <PasswordForm />
    </section>
  );
}
