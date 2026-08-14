/**
 * Native (Capacitor) helpers. All of them degrade gracefully to plain web APIs
 * so `vite dev` in a browser keeps working exactly as before.
 */
import { Capacitor } from "@capacitor/core";

export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Capture a receipt with the device camera (native) — returns a Blob, or null if cancelled. */
export async function captureWithNativeCamera(source: "camera" | "gallery"): Promise<Blob | null> {
  const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      correctOrientation: true,
      resultType: CameraResultType.Uri,
      source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
    });
    if (!photo.webPath) return null;
    const res = await fetch(photo.webPath);
    return await res.blob();
  } catch {
    // User cancelled or permission denied.
    return null;
  }
}

/** Android hardware back button: navigate back, or exit the app at the root. */
export async function registerBackButton(canGoBack: () => boolean, goBack: () => void) {
  if (!isNative()) return () => {};
  const { App } = await import("@capacitor/app");
  const handle = await App.addListener("backButton", () => {
    if (canGoBack()) goBack();
    else void App.exitApp();
  });
  return () => void handle.remove();
}

/** Match the status bar to the app chrome on Android. */
export async function initNativeChrome() {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch {
    /* status bar not available */
  }
}
