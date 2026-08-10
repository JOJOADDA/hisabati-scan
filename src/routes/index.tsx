import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  CloudOff,
  Copy,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ScopePicker } from "@/components/ScopePicker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useHisabatiSession } from "@/hooks/useHisabatiSession";
import { useQueue } from "@/hooks/useQueue";
import { useScope } from "@/hooks/useScope";
import { compressImage } from "@/lib/hisabati/image";
import { processItem } from "@/lib/hisabati/processor";
import { putItem, emitQueueChange } from "@/lib/hisabati/queue";
import type { QueueItem, SubmitResult } from "@/lib/hisabati/types";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Hisabati Scanner — Capture & submit receipts" },
      {
        name: "description",
        content:
          "Capture a receipt with your camera and submit it straight to Hisabati for analysis, validation and accounting.",
      },
      { property: "og:title", content: "Hisabati Scanner — Capture & submit receipts" },
      {
        property: "og:description",
        content: "Capture a receipt and submit it straight to Hisabati for analysis and accounting.",
      },
    ],
  }),
  component: ScannerPage,
});

type Stage = "idle" | "preview" | "submitting" | "result";

const STEPS = ["Uploading receipt...", "Analyzing receipt...", "Saving to Hisabati..."];

function ScannerPage() {
  const navigate = useNavigate();
  const { session, loading } = useHisabatiSession();
  const { scope, ready, setOrganization, setBranch } = useScope();
  const { items } = useQueue();

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("idle");
  const [image, setImage] = useState("");
  const [note, setNote] = useState("");
  const [docId, setDocId] = useState("");
  const [capturedAt, setCapturedAt] = useState("");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [queued, setQueued] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth", replace: true });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (stage !== "submitting") return;
    setStep(0);
    const t1 = setTimeout(() => setStep(1), 1200);
    const t2 = setTimeout(() => setStep(2), 3500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [stage]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const base64 = await compressImage(file);
      setImage(base64);
      setNote("");
      // client_document_id is generated ONCE per capture and reused on every retry.
      setDocId(crypto.randomUUID());
      setCapturedAt(new Date().toISOString());
      setResult(null);
      setQueued(false);
      setStage("preview");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    const item: QueueItem = {
      client_document_id: docId,
      organization_id: scope.organizationId,
      branch_id: scope.branchId,
      image_base64: image,
      note: note.trim() || undefined,
      captured_at: capturedAt,
      status: "pending",
      attempts: 0,
      next_attempt_at: 0,
    };
    await putItem(item);
    emitQueueChange();

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setQueued(true);
      setStage("result");
      return;
    }

    setStage("submitting");
    const res = await processItem(item);
    if (res.kind === "error" && res.authExpired) {
      setResult(res);
      setStage("result");
      return;
    }
    if (res.kind === "error" && res.retryable) {
      setQueued(true);
      setResult(res);
      setStage("result");
      return;
    }
    setResult(res);
    setStage("result");
  }

  function reset() {
    setStage("idle");
    setImage("");
    setNote("");
    setDocId("");
    setResult(null);
    setQueued(false);
  }

  if (loading || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session) return null;

  if (!scope.organizationId || !scope.branchId) {
    return (
      <AppShell title="Setup">
        <ScopePicker
          organizationId={scope.organizationId}
          onOrganization={setOrganization}
          onBranch={setBranch}
        />
      </AppShell>
    );
  }

  return (
    <AppShell title={`${scope.organizationName} · ${scope.branchName}`}>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFile}
      />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      {stage === "idle" ? (
        <IdleView
          scope={scope}
          pending={items.length}
          busy={busy}
          onCamera={() => cameraRef.current?.click()}
          onGallery={() => galleryRef.current?.click()}
          onPending={() => navigate({ to: "/recent" })}
        />
      ) : null}

      {stage === "preview" ? (
        <section className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <img src={image} alt="Receipt preview" className="max-h-[52vh] w-full object-contain bg-secondary" />
          </div>
          <div className="space-y-2">
            <label htmlFor="note" className="text-sm font-medium">
              Optional note
            </label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Add a note for this receipt"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="h-13 flex-1 py-4 text-base" onClick={reset}>
              Retake
            </Button>
            <Button className="h-13 flex-1 py-4 text-base shadow-cta" onClick={() => void submit()}>
              Submit
            </Button>
          </div>
        </section>
      ) : null}

      {stage === "submitting" ? (
        <section className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-5 text-base font-medium">{STEPS[step]}</p>
          <p className="mt-1 text-sm text-muted-foreground">Hisabati is handling the rest.</p>
        </section>
      ) : null}

      {stage === "result" ? (
        <ResultView result={result} queued={queued} onAgain={reset} />
      ) : null}
    </AppShell>
  );
}

function IdleView({
  scope,
  pending,
  busy,
  onCamera,
  onGallery,
  onPending,
}: {
  scope: { organizationName: string; branchName: string };
  pending: number;
  busy: boolean;
  onCamera: () => void;
  onGallery: () => void;
  onPending: () => void;
}) {
  return (
    <section className="flex min-h-[70vh] flex-col">
      <div className="grid grid-cols-2 gap-3">
        <InfoCard label="Organization" value={scope.organizationName} />
        <InfoCard label="Branch" value={scope.branchName} />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center py-8">
        <button
          onClick={onCamera}
          disabled={busy}
          className="gradient-brand flex h-44 w-44 flex-col items-center justify-center gap-2 rounded-full text-primary-foreground shadow-cta transition-transform active:scale-95 disabled:opacity-70"
        >
          {busy ? <Loader2 className="h-12 w-12 animate-spin" /> : <Camera className="h-14 w-14" strokeWidth={1.6} />}
          <span className="text-base font-semibold">Scan Receipt</span>
        </button>

        <Button
          variant="secondary"
          className="mt-8 h-12 w-full max-w-xs gap-2 text-base"
          onClick={onGallery}
          disabled={busy}
        >
          <ImageIcon className="h-4 w-4" />
          Choose from Gallery
        </Button>
      </div>

      <button
        onClick={onPending}
        className="mx-auto flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-card"
      >
        Pending: <span className="font-semibold text-foreground">{pending}</span>
      </button>
    </section>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function ResultView({
  result,
  queued,
  onAgain,
}: {
  result: SubmitResult | null;
  queued: boolean;
  onAgain: () => void;
}) {
  return (
    <section className="flex min-h-[68vh] flex-col justify-center">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        {queued ? (
          <Header
            icon={<CloudOff className="h-6 w-6 text-primary" />}
            title="Saved to queue"
            subtitle="This receipt will be submitted to Hisabati automatically once the connection is back."
          />
        ) : result?.kind === "success" ? (
          <SuccessBody result={result} />
        ) : result?.kind === "duplicate" ? (
          <Header
            icon={<Copy className="h-6 w-6 text-warning" />}
            title={
              result.code === "duplicate_transaction"
                ? "This transaction already exists in Hisabati."
                : "This receipt already exists in Hisabati."
            }
            subtitle="Nothing was submitted again."
          />
        ) : (
          <Header
            icon={<AlertTriangle className="h-6 w-6 text-destructive" />}
            title={result?.kind === "error" && result.authExpired ? "Your session has expired." : "Could not submit"}
            subtitle={result?.kind === "error" ? result.message : "Unknown error."}
          />
        )}
      </div>

      <Button className="mt-6 h-13 w-full py-4 text-base shadow-cta" onClick={onAgain}>
        Scan Another
      </Button>
    </section>
  );
}

function SuccessBody({ result: r }: { result: Extract<SubmitResult, { kind: "success" }> }) {
  const alreadySubmitted = r.status === "duplicate_retry";
  return (
    <div>
      <Header
        icon={<CheckCircle2 className="h-6 w-6 text-success" />}
        title={alreadySubmitted ? "Receipt already submitted" : "Receipt submitted"}
        subtitle={alreadySubmitted ? "Hisabati had already received this receipt." : "Saved to Hisabati"}
      />

      {r.needs_review ? (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          This receipt needs review in Hisabati.
        </p>
      ) : null}

      <dl className="mt-5 space-y-3 text-sm">
        {r.data?.amount != null ? (
          <Field label="Amount" value={new Intl.NumberFormat().format(r.data.amount)} strong />
        ) : null}
        {r.data?.transfer_date ? <Field label="Date" value={formatDate(r.data.transfer_date)} /> : null}
        {r.data?.sender_name ? <Field label="Sender" value={r.data.sender_name} /> : null}
        <Field label="Status" value={alreadySubmitted ? "Already in Hisabati" : "Saved to Hisabati"} />
        <Field label="Review" value={r.needs_review ? "Review required" : "No review required"} />
        {r.transfer_id ? <Field label="Transfer ID" value={r.transfer_id} mono /> : null}
      </dl>
    </div>
  );
}

function formatDate(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function Header({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">{icon}</div>
      <div>
        <h1 className="text-lg font-bold leading-tight tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  strong,
  mono,
}: {
  label: string;
  value: string;
  strong?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={[
          "truncate text-right font-medium",
          strong ? "text-xl font-bold" : "",
          mono ? "font-mono text-xs" : "",
        ].join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}
