// Feasibility check: build Pebble's real frontend + the demo IPC mock into a static folder (no Tauri, no backend), e.g.
// for an interactive demo iframe on the landing page. Writes only to ./demo-build (and ./vite-cache); the repo is read-only.
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { pebbleRepo } from "./pebble-repo.mjs";

const REPO = pebbleRepo();
const HERE = path.dirname(fileURLToPath(import.meta.url));
const fromRepo = (rel) => pathToFileURL(path.join(REPO, "node_modules", rel)).href;
const { build } = await import(fromRepo("vite/dist/node/index.js"));
const { default: vue } = await import(fromRepo("@vitejs/plugin-vue/dist/index.mjs"));

const PREFIX = "/@pebble-mock/";
await build({
  configFile: false,
  envFile: false,
  root: REPO,
  base: "./",
  cacheDir: path.join(HERE, "vite-cache"),
  logLevel: "warn",
  plugins: [
    {
      name: "pebble-ipc-mock",
      enforce: "pre",
      resolveId: (id) => (id.startsWith(PREFIX) ? path.join(HERE, "mock", id.slice(PREFIX.length)) : null),
      transformIndexHtml: { order: "pre", handler: (html) => html.replace('<script type="module" src="/src/main.ts"></script>', `<script type="module" src="${PREFIX}entry.js"></script>`) },
    },
    vue(),
  ],
  resolve: { alias: { "pebble-tauri-mocks": path.join(REPO, "node_modules/@tauri-apps/api/mocks.js") } },
  build: { outDir: path.join(HERE, "demo-build"), emptyOutDir: true, target: "es2022", reportCompressedSize: false },
});
console.log("built", path.join(HERE, "demo-build"));
