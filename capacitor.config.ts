import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.hisabati.scanner",
  appName: "Hisabati Scanner",
  webDir: "dist/client",
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
    // For live-reload during development, uncomment and point to your preview URL:
    // url: "https://id-preview--a5e6e1f4-9577-4e07-a320-8e039f11f33d.lovable.app",
    // cleartext: false,
  },
};

export default config;
