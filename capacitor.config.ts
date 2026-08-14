import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Mobile shell configuration.
 * `webDir` MUST match the fixed output of `npm run build:mobile` (scripts/build-mobile.mjs).
 */
const config: CapacitorConfig = {
  appId: "app.lovable.hisabati.scanner",
  appName: "Hisabati Scanner",
  webDir: "dist-mobile",
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
    // For live-reload during development, uncomment and point to your preview URL:
    // url: "https://id-preview--a5e6e1f4-9577-4e07-a320-8e039f11f33d.lovable.app",
    // cleartext: false,
  },
  plugins: {
    Keyboard: {
      resizeOnFullScreen: true,
    },
  },
};

export default config;
