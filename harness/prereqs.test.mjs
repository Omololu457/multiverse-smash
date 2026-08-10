// harness/prereqs.test.mjs — Wave-3 PREREQUISITES.
//   Stage 5B  — `isPlayable`: art-less placeholder characters are hidden from normal + beta select
//               (they'd render as procedural boxes) but remain visible under the dev code.
//   Stage 13B — save migration: migrateAccount() backfills an older-schema save with any missing
//               groups (so Stage 19D arcade clears / Stage 21 unlocks can be added safely later),
//               preserving existing data and bumping the schema version.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { migrateAccount, SAVE_VERSION } from "../account.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}
let PASS=0,FAIL=0;
const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};
const section=t=>console.log(`\n── ${t} ─────────────────────────────`);
const sortJoin=a=>[...a].sort().join(",");
const LS_KEY="multiverse-smash-save";
const ARTLESS=["piccolo","frieza","cell","morty","evilMorty","rickPrime","albedo","omololu"];

try {
  // ══ Stage 13B — migrateAccount (pure) ══════════════════════════════════════════
  section("Stage 13B — migrateAccount() backfills an old-schema save (pure)");
  check("SAVE_VERSION is ≥ 3 (migration framework live)", SAVE_VERSION >= 3, `v=${SAVE_VERSION}`);
  const old = { accountId: "old1", username: "Veteran", progression: { xp: 250, level: 2 } }; // pre-13B: no arcade/tower/unlocks/settings/stats
  const m = migrateAccount(old);
  check("preserves existing progression (xp 250)", m.progression.xp === 250 && m.progression.level === 2);
  check("backfills missing arcade group", !!m.arcade && typeof m.arcade.clearedBy === "object" && typeof m.arcade.noContinueClearBy === "object", JSON.stringify(m.arcade));
  check("backfills missing tower group (Stage 21)", !!m.tower && typeof m.tower.clearedTiers === "object", JSON.stringify(m.tower));
  check("backfills missing unlocks group", m.unlocks.devUnlock === false && Array.isArray(m.unlocks.featuresUnlocked));
  check("backfills missing settings + stats", m.settings.sfxVolume === 0.8 && m.stats.favoriteCharacter === null);
  check("stamps _schemaVersion = SAVE_VERSION", m._schemaVersion === SAVE_VERSION);
  const again = migrateAccount(JSON.parse(JSON.stringify(m)));   // idempotent
  check("idempotent (re-migrating a current account changes nothing material)", again.progression.xp === 250 && !!again.arcade);
  // Partial group is merged, not clobbered.
  const partial = migrateAccount({ accountId: "p1", settings: { musicVolume: 0.1 } });
  check("partial group MERGED (keeps musicVolume:0.1, adds sfxVolume default)", partial.settings.musicVolume === 0.1 && partial.settings.sfxVolume === 0.8, JSON.stringify(partial.settings));

  // ══ In-game ═══════════════════════════════════════════════════════════════════
  const server = await srv(); const base = `http://127.0.0.1:${server.address().port}`;
  const b = await chromium.launch({ headless: true, args:["--autoplay-policy=no-user-gesture-required"] });
  const ctx = await b.newContext({ viewport:{width:1280,height:720} });
  const page = await ctx.newPage();
  const jsErrors=[]; page.on("pageerror",e=>jsErrors.push(String(e)));
  const load = async()=>{ await page.goto(`${base}/index.html?harness=1`,{waitUntil:"load"}); await page.waitForFunction(()=>!!window.__harness); await page.waitForTimeout(80); };
  const sets = ()=>page.evaluate(()=>window.__harness.rosterSets());
  const applyCode = c=>page.evaluate(c=>window.__harness.applyCode(c), c);
  const universes = ()=>page.evaluate(()=>window.__harness.menuRoster().universes);

  // ── Stage 5B — isPlayable gating ──────────────────────────────────────────────
  section("Stage 5B — isPlayable hides art-less placeholders from normal + beta, dev sees them");
  await load();
  const gt = await sets();
  check("nonPlayable set == the 8 art-less placeholders", sortJoin(gt.nonPlayable) === sortJoin(ARTLESS), `nonPlayable=${sortJoin(gt.nonPlayable)}`);
  check("baseline PLAYABLE roster excludes every art-less placeholder", ARTLESS.every(k=>!gt.playable.includes(k)));
  check("full non-hidden roster still contains them (they exist, just not offerable)", ARTLESS.every(k=>gt.all.includes(k)));
  check("playable == all minus non-playable", gt.playable.length === gt.all.length - gt.nonPlayable.length, `${gt.playable.length} == ${gt.all.length} - ${gt.nonPlayable.length}`);
  check("'original' universe (only omololu) NOT in playable universes at baseline", !gt.playableUniverses.includes("original"), `pu=${sortJoin(gt.playableUniverses)}`);

  // Dev bypasses isPlayable — sees the art-less entries.
  await applyCode("Omololu");
  const gtDev = await sets();
  check("DEV sees the art-less placeholders (isPlayable bypassed)", ARTLESS.every(k=>gtDev.playable.includes(k)), `devPlayable n=${gtDev.playable.length}`);
  check("DEV playable universes INCLUDE 'original'", gtDev.playableUniverses.includes("original"));

  // ── Stage 13B — end-to-end: an old localStorage save migrates on boot ─────────
  section("Stage 13B — an old-schema localStorage save loads, migrates, and persists v2");
  // Seed a pre-migration snapshot (version 1, account missing the arcade group).
  const oldSnap = JSON.stringify({ format:"multiverse-smash-save", version:1, currentId:"legacy1",
    accounts:[{ accountId:"legacy1", username:"Legacy", progression:{xp:150,matches:3,wins:2,level:2}, unlocks:{devUnlock:false,betaUnlock:false,featuresUnlocked:[]}, settings:{sfxVolume:0.8,musicVolume:0.4,sfxMuted:false,musicMuted:false,menuPlaylistOrder:[]}, stats:{wins:2,losses:1,matches:3,favoriteCharacter:null} }] });
  await page.evaluate(([k,v])=>{ try{localStorage.setItem(k,v);}catch(_){} }, [LS_KEY, oldSnap]);
  await page.reload({waitUntil:"load"}); await page.waitForFunction(()=>!!window.__harness); await page.waitForTimeout(80);
  const after = await page.evaluate(()=>window.__harness.saveLoad.read());
  check("old save loaded on boot (xp 150 preserved)", after.xp === 150, `xp=${after.xp}`);
  // Trigger a save so the migrated (v2 + arcade) snapshot is written back to localStorage.
  await page.evaluate(()=>window.__harness.saveLoad.awardXp(0));
  const raw = await page.evaluate(k=>{ try{return localStorage.getItem(k);}catch(_){return null;} }, LS_KEY);
  check("re-saved snapshot carries the current SAVE_VERSION", !!raw && JSON.parse(raw).version === SAVE_VERSION, `v=${raw?JSON.parse(raw).version:"?"}`);
  const acct = raw ? JSON.parse(raw).accounts.find(a=>a.accountId==="legacy1") : null;
  check("legacy account gained the arcade group after migration", !!acct?.arcade && typeof acct.arcade.clearedBy === "object", JSON.stringify(acct?.arcade));
  check("legacy account kept its data (xp 150, musicVolume 0.4)", acct?.progression?.xp === 150 && acct?.settings?.musicVolume === 0.4);
  check("no uncaught JS exceptions", jsErrors.length === 0, jsErrors.slice(0,3).join(" | "));

  await b.close(); server.close();
} catch (e) { console.error("\nHARNESS ERROR:", e); FAIL++; }
console.log(`\n════════════════════════════════════════`);
console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════`);
process.exit(FAIL === 0 ? 0 : 1);
