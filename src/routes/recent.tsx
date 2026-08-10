import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CloudOff, Loader2, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useQueue } from "@/hooks/useQueue";
import { retryItem } from "@/lib/hisabati/processor";
import { emitQueueChange, removeItem } from "@/lib/hisabati/queue";

export const Route = createFileRoute("/recent")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Pending uploads | Hisabati Scanner" },
      { name: "description", content: "Receipts waiting to be submitted to Hisabati, with offline retry." },
      { property: "og:title", content: "Pending uploads | Hisabati Scanner" },
      { property: "og:description", content: "Receipts waiting to be submitted to Hisabati, with offline retry." },
    ],
  }),
  component: RecentPage,
});

function RecentPage() {
  const { items } = useQueue();

  return (
    <AppShell title="Pending uploads">
      <section className="pt-2">
        <h1 className="text-xl font-bold tracking-tight">Pending uploads</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {items.length === 0
            ? "Everything has been submitted to Hisabati."
            : `${items.length} receipt${items.length === 1 ? "" : "s"} waiting`}
        </p>

        <ul className="mt-5 space-y-3">
          {items.map((item) => (
            <li
              key={item.client_document_id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card"
            >
              <img
                src={item.image_base64}
                alt="Receipt"
                className="h-14 w-14 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {new Date(item.captured_at).toLocaleString()}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {item.status === "uploading" ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...
                    </>
                  ) : item.status === "failed" ? (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                      <span className="truncate">{item.last_error ?? "Failed"}</span>
                    </>
                  ) : typeof navigator !== "undefined" && !navigator.onLine ? (
                    <>
                      <CloudOff className="h-3.5 w-3.5" /> Waiting for internet
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-3.5 w-3.5" /> Queued
                    </>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-10 w-10"
                  onClick={() => void retryItem(item)}
                  aria-label="Retry upload"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 text-muted-foreground"
                  onClick={() =>
                    void removeItem(item.client_document_id).then(emitQueueChange)
                  }
                  aria-label="Discard receipt"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
