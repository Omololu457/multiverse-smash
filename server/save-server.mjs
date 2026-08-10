// server/save-server.mjs
// ──────────────────────────────────────────────────────────────────────────
// LOCAL DEV SAVE SERVER — the fourth persistence tier (see account.js).
//
// A browser cannot silently write to disk (a security boundary, not a bug). But
// during LOCAL DEV there is a server available anyway, so this tiny endpoint gives
// fully automatic file persistence — the client just POSTs its snapshot and the file
// on disk stays current with ZERO clicks. It is deliberately built against `fetch`
// so going live later is a URL change, not a rewrite.
//
// STATIC SERVING reuses the EXACT pattern at the top of every harness/*.test.mjs
// (no cache-busting, no dependency — node:http only). The API endpoints are layered
// on top; everything else falls through to static files from the repo root.
//
// GUARD RAILS (all enforced below):
//   • binds 127.0.0.1 ONLY (never 0.0.0.0) — this is dev data, not a public service.
//   • request body capped at 1MB → 413 on overflow.
//   • POST body must parse as JSON AND have format === "multiverse-smash-save"
//     before it's allowed to overwrite the save → refuses to clobber a real save
//     with garbage.
//   • rolling one-deep backup: the current file is copied to *.bak.json before each
//     write, and the write itself is atomic (write .tmp, then rename).
// ──────────────────────────────────────────────────────────────────────────
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = "1";
const SAVE_FORMAT = "multiverse-smash-save";
const MAX_BODY = 1 * 1024 * 1024;   // 1MB cap
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json",".woff":"font/woff",".woff2":"font/woff2",".svg":"image/svg+xml" };

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(body);
}

// Read a request body with a hard 1MB cap. Resolves { tooLarge } or { text }.
function readBody(req) {
  return new Promise((resolve) => {
    let size = 0; const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) { resolve({ tooLarge: true }); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve({ text: Buffer.concat(chunks).toString("utf8") }));
    req.on("error", () => resolve({ text: "" }));
  });
}

// Create (but do not start) the save server. Exported so the harness can boot it on a
// random port against a throwaway save dir; the CLI entry below starts it on 127.0.0.1.
export function createSaveServer({ root = REPO_ROOT, saveDir = path.join(REPO_ROOT, "saves"), version = VERSION } = {}) {
  const SAVE_FILE = path.join(saveDir, "game_player_data.json");
  const TMP_FILE  = SAVE_FILE + ".tmp";
  const BAK_FILE  = path.join(saveDir, "game_player_data.bak.json");
  fs.mkdirSync(saveDir, { recursive: true });

  const server = http.createServer(async (req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);

    // ── API: capability probe ────────────────────────────────────────────────
    if (url === "/api/health") { sendJson(res, 200, { ok: true, version }); return; }

    // ── API: read the save ───────────────────────────────────────────────────
    if (url === "/api/save" && req.method === "GET") {
      fs.readFile(SAVE_FILE, "utf8", (e, data) => {
        if (e || !data) { res.writeHead(204, { "cache-control": "no-store" }).end(); return; }
        res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
        res.end(data);
      });
      return;
    }

    // ── API: write the save (validated, backed-up, atomic) ───────────────────
    if (url === "/api/save" && req.method === "POST") {
      const { tooLarge, text } = await readBody(req);
      if (tooLarge) { sendJson(res, 413, { ok: false, error: "payload too large (>1MB)" }); return; }
      let data = null;
      try { data = JSON.parse(text); } catch (_) { sendJson(res, 400, { ok: false, error: "body is not valid JSON" }); return; }
      if (!data || data.format !== SAVE_FORMAT) { sendJson(res, 400, { ok: false, error: `refusing to write: format !== "${SAVE_FORMAT}"` }); return; }
      try {
        // Rolling one-deep backup: copy the current good file aside before overwriting.
        try { if (fs.existsSync(SAVE_FILE)) fs.copyFileSync(SAVE_FILE, BAK_FILE); } catch (_) {}
        fs.writeFileSync(TMP_FILE, text);       // write scratch first…
        fs.renameSync(TMP_FILE, SAVE_FILE);     // …then atomically swap it in
        sendJson(res, 200, { ok: true, bytes: Buffer.byteLength(text) });
      } catch (err) {
        try { fs.rmSync(TMP_FILE, { force: true }); } catch (_) {}
        sendJson(res, 500, { ok: false, error: String((err && err.message) || err) });
      }
      return;
    }

    // ── STATIC (harness pattern) ─────────────────────────────────────────────
    const fp = path.join(root, url === "/" ? "/index.html" : url);
    if (!fp.startsWith(root)) { res.writeHead(403).end(); return; }
    fs.readFile(fp, (e, d) => {
      if (e) { res.writeHead(404).end("not found"); return; }
      res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" });
      res.end(d);
    });
  });

  server._saveFile = SAVE_FILE;   // exposed so the harness can read the file off disk
  return server;
}

// ── CLI ENTRY ────────────────────────────────────────────────────────────────
// `npm run dev`. Bind 127.0.0.1 ONLY. Save file lives at ./saves/game_player_data.json.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const PORT = +(process.env.PORT || 8000);
  const server = createSaveServer();
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`save server → http://127.0.0.1:${PORT}`);
    console.log(`  • GET/POST /api/save  → ${path.relative(REPO_ROOT, server._saveFile)}  (auto file persistence)`);
    console.log(`  • GET /api/health     → { ok: true, version: "${VERSION}" }`);
    console.log(`  • static              → repo root`);
  });
}
