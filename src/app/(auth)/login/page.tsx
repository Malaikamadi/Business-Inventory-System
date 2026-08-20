"use client";

import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Store, UserCog } from "lucide-react";

import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo-accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);

  const busy = loadingEmail !== null;

  async function signInAs(accountEmail: string, accountPassword: string) {
    setError("");
    setLoadingEmail(accountEmail);

    try {
      if (session?.user) {
        await signOut({ redirect: false });
      }

      const result = await signIn("credentials", {
        email: accountEmail,
        password: accountPassword,
        redirect: false,
      });

      if (result?.error) {
        setError("Could not sign in with that account. Check the email and password.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoadingEmail(null);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void signInAs(email, password);
  }

  const current = session?.user;

  return (
    <div className="w-full max-w-3xl animate-scale-in">
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-lg font-bold text-white">
          IS
        </div>
        <h1 className="text-2xl font-bold text-white">InvSys</h1>
        <p className="mt-1 text-sm text-white/60">
          Choose a role to sign in. Each role opens a different set of pages.
        </p>
      </div>

      {status === "authenticated" && current && (
        <div className="mb-6 flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/80">
            Signed in as{" "}
            <span className="font-medium text-white">
              {current.firstName} {current.lastName}
            </span>
            <span className="capitalize text-white/50"> · {current.role}</span>
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => router.push("/dashboard")}
          >
            Continue to dashboard
          </Button>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-md border border-danger/20 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {DEMO_ACCOUNTS.map((account) => {
          const Icon = account.role === "Owner" ? UserCog : Store;
          const loading = loadingEmail === account.email;

          return (
            <button
              key={account.email}
              type="button"
              disabled={busy}
              onClick={() => void signInAs(account.email, DEMO_PASSWORD)}
              className="rounded-xl border border-white/10 bg-white/5 p-5 text-left transition-colors hover:border-accent hover:bg-white/10 disabled:opacity-60"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20 text-accent">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-accent">
                    {account.role}
                  </p>
                  <p className="text-sm font-semibold text-white">{account.name}</p>
                </div>
              </div>
              <p className="text-sm text-white/70">{account.summary}</p>
              <p className="mt-2 text-xs text-white/40">{account.shop}</p>
            </button>
          );
        })}
      </div>

      <Card className="mt-8 border-white/10 bg-white/5 shadow-2xl backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-lg text-white">Sign in with email</CardTitle>
          <CardDescription className="text-white/50">
            For accounts that are not listed above.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/80">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="border-white/10 bg-white/10 text-white placeholder:text-white/30 focus-visible:ring-accent"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/80">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                className="border-white/10 bg-white/10 text-white placeholder:text-white/30 focus-visible:ring-accent"
              />
            </div>

            <Button type="submit" className="w-full" disabled={busy} size="lg">
              {busy && loadingEmail === email ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Sign in
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
