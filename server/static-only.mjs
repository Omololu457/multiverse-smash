// server/static-only.mjs
// ──────────────────────────────────────────────────────────────────────────
// `npm run dev:noserver` — a plain static host with NO /api/* endpoints.
//
// This is the "prove the fallback" server. It deliberately serves ONLY static files
// (no /api/health, no /api/save), which is exactly what GitHub Pages does. The client's
// capability probe (fetch('/api/health')) gets a 404 here, flips _serverAvailable=false,
// and persistence transparently rides localStorage — no console errors, no user warning.
// Use it to confirm the game behaves identically with and without the save server.
//
// Same static pattern as the harness / save-server; binds 127.0.0.1 only.
// ──────────────────────────────────────────────────────────────────────────
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = +(process.env.PORT || 8000);
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json",".woff":"font/woff",".woff2":"font/woff2",".svg":"image/svg+xml" };

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const fp = path.join(REPO_ROOT, url === "/" ? "/index.html" : url);
  if (!fp.startsWith(REPO_ROOT)) { res.writeHead(403).end(); return; }
  fs.readFile(fp, (e, d) => {
    if (e) { res.writeHead(404).end("not found"); return; }
    res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" });
    res.end(d);
  });
});
server.listen(PORT, "127.0.0.1", () => {
  console.log(`static-only server → http://127.0.0.1:${PORT}  (NO /api — localStorage fallback path)`);
});
