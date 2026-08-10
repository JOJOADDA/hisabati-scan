import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/hisabati-logo.png.asset.json";
import { getSupabase } from "@/lib/hisabati/client";
import { isConfigured } from "@/lib/hisabati/config";
import { useHisabatiSession } from "@/hooks/useHisabatiSession";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in | Hisabati Scanner" },
      { name: "description", content: "Sign in with your Hisabati account to scan and submit receipts." },
      { property: "og:title", content: "Sign in | Hisabati Scanner" },
      { property: "og:description", content: "Sign in with your Hisabati account to scan and submit receipts." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useHisabatiSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/", replace: true });
  }, [loading, session, navigate]);

  const configured = typeof window !== "undefined" && isConfigured();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) {
      setError("Hisabati connection is not configured yet.");
      return;
    }
    setBusy(true);
    setError("");
    const { error: err } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    void navigate({ to: "/", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src={logo.url} alt="Hisabati" className="h-20 w-20 rounded-2xl object-cover shadow-card" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Hisabati Scanner</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in with your Hisabati account</p>
        </div>

        {!configured ? (
          <div className="mb-4 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
            The Hisabati connection key is missing.{" "}
            <button className="underline" onClick={() => navigate({ to: "/settings" })}>
              Open settings
            </button>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="h-12 w-full text-base" disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
