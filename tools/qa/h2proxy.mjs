// tools/qa/h2proxy.mjs: a production-like front for `next start` during QA: HTTP/2 over TLS (a throwaway self-signed
// certificate) and Brotli for text, as Vercel serves the site. `next start` alone speaks HTTP/1.1 with gzip, and
// Lighthouse's simulated throttling (Lantern) models every parallel HTTP/1.1 request as its own new connection with a
// cold TCP window, which makes a page with preloaded fonts look far slower on mobile than it will be in production.
//
//   node tools/qa/h2proxy.mjs <upstream port> <listen port>
//
// Used by tools/qa/lighthouse.sh (H2=1). Chrome must be started with --ignore-certificate-errors. The certificate and
// key are made with openssl into .work/qa/h2cert/ (gitignored) the first time. Stops on SIGTERM / SIGINT.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import http from "node:http";
import http2 from "node:http2";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const [upstreamPort, listenPort] = process.argv.slice(2).map(Number);
if (!upstreamPort || !listenPort) {
  console.error("usage: node tools/qa/h2proxy.mjs <upstream port> <listen port>");
  process.exit(64);
}

const certDir = path.join(REPO, ".work", "qa", "h2cert");
const keyFile = path.join(certDir, "key.pem");
const certFile = path.join(certDir, "cert.pem");
if (!existsSync(keyFile) || !existsSync(certFile)) {
  mkdirSync(certDir, { recursive: true });
  const openssl = existsSync("/opt/homebrew/bin/openssl") ? "/opt/homebrew/bin/openssl" : "/usr/bin/openssl";
  execFileSync(openssl, ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=127.0.0.1", "-days", "7", "-keyout", keyFile, "-out", certFile], { stdio: "ignore" });
}

const HOP = new Set(["connection", "keep-alive", "proxy-connection", "transfer-encoding", "upgrade", "content-length", "content-encoding"]);
const TEXT = /^(text\/|application\/(javascript|json|xml|manifest\+json)|image\/svg\+xml)/;

const server = http2.createSecureServer({ key: readFileSync(keyFile), cert: readFileSync(certFile), allowHTTP1: true }, (req, res) => {
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) if (!k.startsWith(":") && !HOP.has(k) && k !== "host") headers[k] = v;
  headers.host = `127.0.0.1:${upstreamPort}`;
  headers["accept-encoding"] = "identity";
  const up = http.request({ host: "127.0.0.1", port: upstreamPort, method: req.method, path: req.url, headers }, (ur) => {
    const out = {};
    for (const [k, v] of Object.entries(ur.headers)) if (!HOP.has(k)) out[k] = v;
    const type = String(ur.headers["content-type"] ?? "");
    const wantsBr = /\bbr\b/.test(String(req.headers["accept-encoding"] ?? ""));
    if (wantsBr && TEXT.test(type) && req.method !== "HEAD") {
      const chunks = [];
      ur.on("data", (c) => chunks.push(c));
      ur.on("end", () => {
        const body = Buffer.concat(chunks);
        const br = zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9 } });
        res.writeHead(ur.statusCode ?? 502, { ...out, "content-encoding": "br", "content-length": br.length, vary: "Accept-Encoding" });
        res.end(br);
      });
    } else {
      res.writeHead(ur.statusCode ?? 502, out);
      ur.pipe(res);
    }
  });
  up.on("error", () => {
    if (!res.headersSent) res.writeHead(502);
    res.end();
  });
  req.pipe(up);
});
server.listen(listenPort, "127.0.0.1", () => console.log(`h2proxy: https://127.0.0.1:${listenPort} → http://127.0.0.1:${upstreamPort}`));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
