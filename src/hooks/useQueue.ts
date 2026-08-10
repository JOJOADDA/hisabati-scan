import { useCallback, useEffect, useState } from "react";
import { listQueue, onQueueChange } from "@/lib/hisabati/queue";
import { startQueueProcessor } from "@/lib/hisabati/processor";
import type { QueueItem } from "@/lib/hisabati/types";

export function useQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);

  const refresh = useCallback(() => {
    void listQueue().then(setItems);
  }, []);

  useEffect(() => {
    refresh();
    const off = onQueueChange(refresh);
    const stop = startQueueProcessor();
    return () => {
      off();
      stop();
    };
  }, [refresh]);

  return { items, refresh };
}
