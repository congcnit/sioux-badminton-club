"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;
    setError(null);
    setIsPending(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid credentials.");
        toast.error("Invalid credentials. Please try again.");
        return;
      }

      toast.success("Welcome back!");
      router.push("/");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-16 sm:px-6">
      <form
        onSubmit={onSubmit}
        className="w-full space-y-5 rounded-xl border bg-card p-6 shadow-sm transition-opacity data-[busy]:opacity-80"
        aria-busy={isPending}
        data-busy={isPending ? "" : undefined}
      >
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Login</h1>
        <div className="space-y-1">
          <Label htmlFor="email" className="text-sm">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={isPending}
            aria-disabled={isPending}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password" className="text-sm">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={isPending}
            aria-disabled={isPending}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button
          type="submit"
          disabled={isPending}
          className="w-full"
          aria-busy={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden /> Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </main>
  );
}
