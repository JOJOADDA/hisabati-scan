import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabase } from "@/lib/hisabati/client";
import { getHisabatiKey, getHisabatiUrl, setHisabatiConfig } from "@/lib/hisabati/config";
import { useHisabatiSession } from "@/hooks/useHisabatiSession";
import { useScope } from "@/hooks/useScope";

export const Route = createFileRoute("/settings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Settings | Hisabati Scanner" },
      { name: "description", content: "Manage your Hisabati connection, organization, branch and session." },
      { property: "og:title", content: "Settings | Hisabati Scanner" },
      { property: "og:description", content: "Manage your Hisabati connection, organization, branch and session." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const { session } = useHisabatiSession();
  const { scope, clearScope } = useScope();
  const [url, setUrl] = useState(() => (typeof window === "undefined" ? "" : getHisabatiUrl()));
  const [key, setKey] = useState(() => (typeof window === "undefined" ? "" : getHisabatiKey()));
  const [saved, setSaved] = useState(false);

  function save() {
    setHisabatiConfig(url, key);
    setSaved(true);
    setTimeout(() => window.location.reload(), 400);
  }

  async function signOut() {
    const sb = getSupabase();
    clearScope();
    await sb?.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell title="Settings">
      <section className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <h2 className="text-sm font-semibold">Account</h2>
          <p className="mt-1 text-sm text-muted-foreground">{session?.user?.email ?? "Not signed in"}</p>
          <div className="mt-3 space-y-2 text-sm">
            <Row label="Organization" value={scope.organizationName || "Not selected"} />
            <Row label="Branch" value={scope.branchName || "Not selected"} />
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" className="h-11 flex-1" onClick={clearScope}>
              Change organization
            </Button>
            <Button variant="outline" className="h-11 flex-1" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <h2 className="text-sm font-semibold">Hisabati connection</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Scanner only stores the project URL and the public publishable key. Never a service key.
          </p>
          <div className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="url">Project URL</Label>
              <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="key">Publishable / anon key</Label>
              <Input
                id="key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="sb_publishable_... or eyJ..."
                className="h-11"
              />
            </div>
            <Button className="h-11 w-full" onClick={save}>
              {saved ? "Saved" : "Save connection"}
            </Button>
          </div>
        </div>

        <p className="px-1 text-center text-xs text-muted-foreground">
          Receipts are analysed, validated and stored by Hisabati Core. Scanner only submits them.
        </p>
      </section>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
