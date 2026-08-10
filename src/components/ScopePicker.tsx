import { useEffect, useState } from "react";
import { Building2, GitBranch, Loader2 } from "lucide-react";
import { fetchBranches, fetchOrganizations } from "@/lib/hisabati/api";
import type { Branch, Organization } from "@/lib/hisabati/types";

interface Props {
  organizationId: string;
  onOrganization: (id: string, name: string) => void;
  onBranch: (id: string, name: string) => void;
}

export function ScopePicker({ organizationId, onOrganization, onBranch }: Props) {
  const [orgs, setOrgs] = useState<Organization[] | null>(null);
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (organizationId) return;
    let cancelled = false;
    setError("");
    fetchOrganizations()
      .then((list) => {
        if (cancelled) return;
        setOrgs(list);
        if (list.length === 1 && list[0]) onOrganization(list[0].id, list[0].name);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [organizationId, onOrganization]);

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;
    setError("");
    fetchBranches(organizationId)
      .then((list) => {
        if (cancelled) return;
        setBranches(list);
        if (list.length === 1 && list[0]) onBranch(list[0].id, list[0].name);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [organizationId, onBranch]);

  const loading = organizationId ? branches === null : orgs === null;
  const title = organizationId ? "Select Branch" : "Select Organization";
  const items = organizationId ? (branches ?? []) : (orgs ?? []);
  const Icon = organizationId ? GitBranch : Building2;

  return (
    <section className="pt-6">
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Only the options you are allowed to use in Hisabati are shown.
      </p>

      {error ? (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="mt-8 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
        </div>
      ) : items.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          No {organizationId ? "branches" : "organizations"} available for your account.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <button
                onClick={() =>
                  organizationId ? onBranch(item.id, item.name) : onOrganization(item.id, item.name)
                }
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-card transition-colors active:bg-accent"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-medium">{item.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
