// Serve Pebble's REAL frontend (src/main.ts -> App.vue / Pet.vue) from the read-only repo, with Tauri v2's official
// IPC mocks installed before any app module runs. Nothing is written inside the repo:
//   - Vite runs with configFile:false (the repo's vite.config.ts is not loaded or bundled),
//   - the dependency pre-bundle cache goes to ./vite-cache (not <repo>/node_modules/.vite),
//   - file watching and HMR are off,
//   - index.html is rewritten in memory only (transformIndexHtml) so that ./mock/entry.js runs first.
// Usage: node serve.mjs            (PORT=5199 by default; the repo path comes from PEBBLE_REPO, see pebble-repo.mjs)
// PEBBLE_REPO may also be a frozen copy of one release's frontend (its index.html and src/ from the release tag, with
// node_modules linked to a checkout's): when the checkout's working tree moves on, the captures stay on the release.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { pebbleRepo } from "./pebble-repo.mjs";

const REPO = pebbleRepo();
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5199);
const fromRepo = (rel) => pathToFileURL(path.join(REPO, "node_modules", rel)).href;

const { createServer } = await import(fromRepo("vite/dist/node/index.js"));
const { default: vue } = await import(fromRepo("@vitejs/plugin-vue/dist/index.mjs"));

const PREFIX = "/@pebble-mock/";
const mockPlugin = {
  name: "pebble-ipc-mock",
  enforce: "pre",
  resolveId(id) {
    if (id.startsWith(PREFIX)) return path.join(HERE, "mock", id.slice(PREFIX.length));
    return null;
  },
  // File watching is off (the repo is large and read-only here), so after editing ./mock/*.js call
  // GET /__pebble/invalidate (capture.mjs does it on start) to drop Vite's cached transforms.
  configureServer(server) {
    server.middlewares.use("/__pebble/invalidate", (_req, res) => {
      server.moduleGraph.invalidateAll();
      res.end("invalidated\n");
    });
    // Chrome requests /favicon.ico on every fresh profile, and Pebble's index.html declares no icon. Answer 204 so the
    // capture reports aren't polluted by a harness-only 404.
    server.middlewares.use("/favicon.ico", (_req, res) => {
      res.statusCode = 204;
      res.end();
    });
  },
  transformIndexHtml: {
    order: "pre",
    handler(html) {
      const original = '<script type="module" src="/src/main.ts"></script>';
      if (!html.includes(original)) throw new Error("Pebble index.html no longer has the expected /src/main.ts entry");
      // entry.js installs window.isTauri + mockWindows + mockIPC, then imports /src/main.ts itself.
      return html.replace(original, `<script type="module" src="${PREFIX}entry.js"></script>`);
    },
  },
};

const server = await createServer({
  configFile: false,
  envFile: false,
  root: REPO,
  cacheDir: path.join(HERE, "vite-cache"),
  logLevel: "info",
  clearScreen: false,
  plugins: [mockPlugin, vue()],
  resolve: {
    // The mock lives outside the repo, so its bare import is pinned to the repo's own @tauri-apps/api copy.
    alias: { "pebble-tauri-mocks": path.join(REPO, "node_modules/@tauri-apps/api/mocks.js") },
  },
  optimizeDeps: { entries: ["index.html"] }, // never crawl the repo's other *.html (old .runtime fixtures, docs)
  server: {
    host: "127.0.0.1",
    port: PORT,
    strictPort: true,
    hmr: false,
    watch: null,
    // node_modules may be a link (a frozen copy's): Vite checks resolved paths, so its real path is allowed too.
    fs: { strict: true, allow: [path.join(REPO, "src"), path.join(REPO, "node_modules"), fs.realpathSync(path.join(REPO, "node_modules")), path.join(REPO, "index.html"), HERE] },
  },
});
await server.listen();
console.log(`serving Pebble's frontend from ${REPO}`);
server.printUrls();
const stop = async () => {
  await server.close();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
