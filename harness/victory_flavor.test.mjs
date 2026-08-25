// harness/victory_flavor.test.mjs — Part 1 #5 victory flavor-line coverage.
// Boots the page and asserts EVERY non-hidden roster key yields a non-empty flavor line,
// and enumerates which characters fall back to their arcade epilogue (no passive bio).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}
let PASS=0,FAIL=0;
const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};

try {
  const server = await srv(); const base = `http://127.0.0.1:${server.address().port}`;
  const b = await chromium.launch({ headless: true });
  const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness); await page.waitForTimeout(80);

  const cov = await page.evaluate(() => window.__harness.victoryFlavor.coverage());
  console.log(`\n── VICTORY FLAVOR COVERAGE (${cov.total} roster keys) ─────────────────────────────`);
  check("no character yields a BLANK victory line", cov.blank.length === 0, cov.blank.length ? `BLANK: ${cov.blank.join(", ")}` : "none blank");
  check("at least the known passive-bio characters resolve from their bio", cov.bio.length >= 40, `${cov.bio.length} from passive bio`);
  console.log(`  ℹ️  ${cov.bio.length} use a hand-written passive bio; ${cov.fallback.length} fall back to their arcade epilogue (still real written material).`);
  console.log(`     ▼ fallback (no dedicated passive bio): ${cov.fallback.join(", ")}`);

  // Spot-check a couple resolve to concrete, capped strings.
  const goku = await page.evaluate(() => window.__harness.victoryFlavor.line("goku"));
  const gojo = await page.evaluate(() => window.__harness.victoryFlavor.line("gojo"));
  check("goku line resolves", !!goku && goku.length <= 120, JSON.stringify(goku));
  check("gojo line resolves", !!gojo && gojo.length <= 120, JSON.stringify(gojo));

  await b.close(); server.close();
} catch (e) { console.error(e); FAIL++; }

console.log(`\n════════════════════════════════════════\n  RESULT: ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
