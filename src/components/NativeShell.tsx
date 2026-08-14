import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { initNativeChrome, registerBackButton } from "@/lib/native";

/**
 * Native-only side effects: status bar styling and the Android hardware
 * back button. Renders nothing; a no-op on the web.
 */
export function NativeShell() {
  const router = useRouter();

  useEffect(() => {
    void initNativeChrome();
    let dispose: (() => void) | undefined;
    void registerBackButton(
      () => window.history.length > 1 && router.state.location.pathname !== "/",
      () => router.history.back(),
    ).then((off) => {
      dispose = off;
    });
    return () => dispose?.();
  }, [router]);

  return null;
}
