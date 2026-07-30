// tools/serve.mjs
// Local dev server with the cache-busting behaviour baked in, so plain reloads
// always pick up source edits with ZERO manual steps (no hard-reload, no stamp):
//   • index.html → the module import-map + entry are RE-INJECTED live on every
//     request with a freshly-computed content-hash version, and sent `no-store`.
//   • *.js / *.mjs → sent `immutable, max-age=1yr` (aggressively cacheable) — safe
//     precisely BECAUSE their URLs carry ?v=<hash>; a code change → new hash → new
//     URL → guaranteed fresh fetch. This mirrors the GitHub Pages behaviour the
//     committed (stamped) index.html gets, so what you test locally == what deploys.
//   USAGE:  node tools/serve.mjs        (default port 8000, or PORT=xxxx)
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { buildModuleBlock, injectBlock } from "./stamp_version.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = +(process.env.PORT || 8000);
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json",".woff":"font/woff",".woff2":"font/woff2",".svg":"image/svg+xml" };

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const rel = url === "/" ? "/index.html" : url;
  const file = path.join(REPO, rel);
  if (!file.startsWith(REPO)) { res.writeHead(403).end(); return; }

  if (rel === "/index.html") {
    // Re-inject the import map + entry with a live content-hash version; never cache the HTML.
    let html = fs.readFileSync(file, "utf8");
    html = injectBlock(html, buildModuleBlock().html);
    res.writeHead(200, { "content-type": "text/html", "cache-control": "no-store, must-revalidate" });
    res.end(html); return;
  }

  fs.readFile(file, (e, data) => {
    if (e) { res.writeHead(404).end("not found"); return; }
    const ext = path.extname(file);
    const headers = { "content-type": MIME[ext] || "application/octet-stream" };
    // Versioned modules are immutable — the ?v=hash guarantees freshness on change.
    if (ext === ".js" || ext === ".mjs") headers["cache-control"] = "public, max-age=31536000, immutable";
    res.writeHead(200, headers);
    res.end(data);
  });
});
server.listen(PORT, () => console.log(`dev server → http://localhost:${PORT}  (index.html no-store, modules versioned+immutable)`));
