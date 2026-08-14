#!/usr/bin/env node
/**
 * One-command, repeatable Capacitor build.
 *
 *   npm run build:mobile
 *
 * Steps:
 *  1. Validate required VITE_* env (or the build-time defaults in src/lib/hisabati/config.ts).
 *  2. Run the Vite build with MOBILE_BUILD=1 (SPA, no nitro, base "./").
 *  3. Normalise the output into a single fixed folder: dist-mobile/ with index.html at its root.
 *
 * No manual steps afterwards — `npx cap sync android` can run straight away.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, cpSync, rmSync, renameSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const OUT = join(root, "dist-mobile");

/* ------------------------------------------------------------------ 1. env */

const CONFIG_FILE = join(root, "src/lib/hisabati/config.ts");
const configSrc = existsSync(CONFIG_FILE) ? readFileSync(CONFIG_FILE, "utf8") : "";

const defaultOf = (name) =>
  (configSrc.match(new RegExp(`const ${name} = "([^"]*)"`))?.[1] ?? "").trim();

const REQUIRED = [
  {
    env: "VITE_HISABATI_SUPABASE_URL",
    fallback: defaultOf("DEFAULT_URL"),
    hint: "Hisabati Supabase project URL, e.g. https://xxxx.supabase.co",
  },
  {
    env: "VITE_HISABATI_SUPABASE_PUBLISHABLE_KEY",
    fallback: defaultOf("DEFAULT_KEY"),
    hint: "Supabase publishable/anon key (public by design — never the service role key)",
  },
];

const missing = [];
for (const { env, fallback, hint } of REQUIRED) {
  const value = (process.env[env] ?? "").trim() || fallback;
  if (!value) missing.push(`  - ${env}  (${hint})`);
  else if (!process.env[env]) console.log(`[env] ${env}: using built-in default`);
  else console.log(`[env] ${env}: from environment`);
}

if (missing.length) {
  console.error(
    "\n[build:mobile] ABORTED — missing required build-time configuration:\n" +
      missing.join("\n") +
      "\n\nSet them in .env (see .env.example) or export them before building." +
      "\nBuilding without them would produce an APK that cannot reach the backend.\n",
  );
  process.exit(1);
}

/* ---------------------------------------------------------------- 2. build */

rmSync(OUT, { recursive: true, force: true });

const build = spawnSync("npx", ["vite", "build"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, MOBILE_BUILD: "1" },
});
if (build.status !== 0) process.exit(build.status ?? 1);

/* ------------------------------------------------------- 3. normalise output */

// Depending on the TanStack/nitro version the client bundle can land in
// dist-mobile/, dist-mobile/client/ or .output/public/. Collapse to dist-mobile/.
const candidates = [OUT, join(OUT, "client"), join(root, ".output/public"), join(root, "dist/client")];
const source = candidates.find((dir) => existsSync(join(dir, "index.html")) || existsSync(join(dir, "_shell.html")));

if (!source) {
  console.error("[build:mobile] Could not locate the built client bundle. Looked in:\n" + candidates.join("\n"));
  process.exit(1);
}

if (source !== OUT) {
  cpSync(source, OUT, { recursive: true });
}

// SPA entry: TanStack emits _shell.html — Capacitor needs index.html.
const shell = join(OUT, "_shell.html");
const index = join(OUT, "index.html");
if (existsSync(shell)) {
  if (existsSync(index)) rmSync(index);
  renameSync(shell, index);
  console.log("[build:mobile] _shell.html -> index.html");
}

if (!existsSync(index)) {
  console.error("[build:mobile] No index.html in dist-mobile — aborting.");
  process.exit(1);
}

// Drop any server-side leftovers that must not ship inside the APK.
for (const junk of ["_server", "server", ".vite", "_worker.js"]) {
  rmSync(join(OUT, junk), { recursive: true, force: true });
}

console.log(
  `\n[build:mobile] OK — ${readdirSync(OUT).length} entries in dist-mobile/\n` +
    "Next: npx cap sync android && npx cap open android\n",
);
