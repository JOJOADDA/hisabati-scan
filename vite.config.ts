// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

/**
 * MOBILE_BUILD=1 switches the build into "Capacitor mode":
 *  - no nitro / no SSR server output
 *  - full client-side SPA shell
 *  - fixed output directory: dist-mobile/
 *  - relative asset base so the bundle works from any WebView scheme
 * The web build (`npm run build:web`) is untouched.
 */
const isMobile = process.env["MOBILE_BUILD"] === "1";

export default defineConfig({
  ...(isMobile
    ? {
        nitro: false as const,
        tanstackStart: {
          spa: { enabled: true },
          prerender: { enabled: false },
        },
        vite: {
          base: "./",
          build: {
            outDir: "dist-mobile",
            emptyOutDir: true,
          },
        },
      }
    : {
        tanstackStart: {
          // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
          // nitro/vite builds from this
          server: { entry: "server" },
        },
      }),
});
