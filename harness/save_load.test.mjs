// harness/save_load.test.mjs
// SAVE / LOAD PERSISTENCE — end-to-end, real code paths. This is the FIRST test to actually
// confirm the project's save/load pipeline round-trips across a simulated close-and-reopen.
//
// HOW IT STAYS FAITHFUL: persistence in account.js is in-memory + mirrored to a File System
// Access API handle. The only un-scriptable, non-our-code piece is the native OS file picker
// (window.showOpen/SaveFilePicker). We mock ONLY that — returning a REAL OPFS-backed
// FileSystemFileHandle (Origin Private File System, which Chromium persists across reloads).
// Everything downstream is the actual production code: connectSaveFile → _hydrateFromHandle →
// persistence.save → _writeSnapshot → the corrupt-file try/catch fallback. A page.reload() is a
// genuine close-and-reopen: the JS module graph is torn down and re-initialised (in-memory store
// wiped, unlock flags reset), and only what was written to the OPFS file can come back.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
function startServer(){const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const fp=path.join(ROOT,u==="/"?"/index.html":u);if(!fp.startsWith(ROOT)){res.writeHead(403).end();return;}fs.readFile(fp,(e,d)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{"content-type":MIME[path.extname(fp)]||"application/octet-stream"});res.end(d);});});return new Promise(r=>s.listen(0,"127.0.0.1",()=>r(s)));}
let PASS=0,FAIL=0;
const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};
const section=t=>console.log(`\n── ${t} ─────────────────────────────`);
const SAVE_NAME="game_player_data.json";

const server=await startServer(); const baseURL=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const context=await browser.newContext({viewport:{width:1280,height:720}});

// Mock ONLY the native OS picker → hand back a real OPFS FileSystemFileHandle. Registered on the
// context so it re-installs on every load/reload. isFileApiSupported() sees both as functions.
await context.addInitScript((name)=>{
  const getHandle = async () => {
    const root = await navigator.storage.getDirectory();
    return await root.getFileHandle(name, { create: true });
  };
  window.showSaveFilePicker = async () => getHandle();
  window.showOpenFilePicker = async () => [await getHandle()];
}, SAVE_NAME);

const page=await context.newPage();
const jsErrors=[]; page.on("pageerror",e=>jsErrors.push(String(e)));

const load = async () => {
  await page.goto(`${baseURL}/index.html?harness=1`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
  await page.waitForTimeout(80);
};
const sl = (fn,...a)=>page.evaluate(([f,args])=>window.__harness.saveLoad[f](...args),[fn,a]);
// Read / corrupt / delete the OPFS save file directly (test-side inspection of what was written).
const readFile = ()=>page.evaluate(async (name)=>{
  try { const r=await navigator.storage.getDirectory(); const h=await r.getFileHandle(name); return await (await h.getFile()).text(); }
  catch(e){ return `__ERR__${e.name}`; }
}, SAVE_NAME);
const writeRaw = (txt)=>page.evaluate(async ([name,t])=>{
  const r=await navigator.storage.getDirectory(); const h=await r.getFileHandle(name,{create:true});
  const w=await h.createWritable(); await w.write(t); await w.close();
}, [SAVE_NAME,txt]);
const deleteFile = ()=>page.evaluate(async (name)=>{
  try { const r=await navigator.storage.getDirectory(); await r.removeEntry(name); } catch(_){}
}, SAVE_NAME);

try {
  await load();
  await deleteFile();   // start from a clean OPFS slate

  // ── 1) FRESH SAVE: create an account, connect a file, confirm it's written to storage ──
  section("Create a fresh save state and write it to storage");
  {
    const acct = await sl("ensureAccount","Tester");
    check("a persistent account exists (GUEST progress wouldn't persist)", !!acct?.accountId, `id=${acct?.accountId}`);
    const conn = await sl("connect");
    check("SAVE FILE connect succeeds (real connectSaveFile via mocked picker)", conn?.ok === true, `conn=${JSON.stringify(conn)}`);
    check("file handle is now connected (auto-saving armed)", (await sl("connected")) === true);
    const raw0 = await readFile();
    check("a snapshot was physically written to the OPFS file", raw0.startsWith("{") && raw0.includes("multiverse-smash-save"), `head=${raw0.slice(0,60)}`);
  }

  // ── 2) Make REAL changes (XP + unlock code + a setting) — each mirrors to the file ──
  section("Make real persisted changes (XP gain, beta unlock, audio setting)");
  const savedId = (await sl("read")).accountId;
  {
    const xp = await sl("awardXp", 500);
    check("awardXp writes progression (xp=500 → level 3)", xp === 500, `xp=${xp}`);
    const code = await sl("applyCode","GojoV1");
    check("beta unlock code applied and flag set", code?.result === "beta" && code?.beta === true, `code=${JSON.stringify(code)}`);
    const settings = await sl("setSetting","sfxMuted",true);
    check("audio setting changed (sfxMuted=true) and persisted", settings?.sfxMuted === true, `settings=${JSON.stringify(settings)}`);
    await sl("setSetting","musicVolume",0.123);   // second setting, numeric
    const raw = await readFile();
    check("the OPFS file now contains the XP, the beta unlock, and the setting", raw.includes('"xp": 500') && raw.includes('"betaUnlock": true') && raw.includes('0.123'), `hasXp=${raw.includes('"xp": 500')} hasBeta=${raw.includes('"betaUnlock": true')} hasVol=${raw.includes('0.123')}`);
  }

  // ── 3) SIMULATE CLOSE + REOPEN (reload) → confirm everything loads back ──
  section("Reload (simulated close+reopen) then reconnect → changes must persist");
  {
    await page.reload({waitUntil:"load"});
    await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
    await page.waitForTimeout(80);
    // Fresh module state: nothing loaded yet — proves the reload really reset in-memory state.
    const before = await sl("read");
    check("after reload, in-memory state is FRESH before reconnect (no account, beta off)", before.accountId === null && before.beta === false, `pre=${JSON.stringify(before)}`);
    // Reconnect = the real open+hydrate path (same OPFS file the mock returns).
    const conn = await sl("connect");
    check("reconnect loads the existing file (count ≥ 1 profile)", conn?.ok === true && conn?.count >= 1, `conn=${JSON.stringify(conn)}`);
    const after = await sl("read");
    check("XP persisted (500)", after.xp === 500, `xp=${after.xp}`);
    check("level persisted (3)", after.level === 3, `level=${after.level}`);
    check("beta unlock persisted", after.beta === true, `beta=${after.beta}`);
    check("audio setting persisted (sfxMuted=true)", after.settings?.sfxMuted === true, `sfxMuted=${after.settings?.sfxMuted}`);
    check("numeric setting persisted (musicVolume≈0.123)", Math.abs((after.settings?.musicVolume ?? -1) - 0.123) < 1e-6, `musicVolume=${after.settings?.musicVolume}`);
    check("SAME account id round-tripped (not a fresh account)", after.accountId === savedId, `${after.accountId} vs ${savedId}`);
  }

  // ── 4) EDGE CASE: corrupted save file → graceful fresh-start fallback, NO crash ──
  section("Corrupted save file → handled gracefully (fresh fallback, no crash)");
  {
    await writeRaw("{ this is not valid JSON ]]] \0\0 garbage");
    await page.reload({waitUntil:"load"});
    await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
    await page.waitForTimeout(80);
    const conn = await sl("connect");
    check("connect on a corrupt file does NOT throw (returns a result)", !!conn, `conn=${JSON.stringify(conn)}`);
    check("corrupt file yields 0 loaded profiles (parse failed → empty, not a crash)", conn?.ok === true && (conn?.count === 0), `count=${conn?.count}`);
    const after = await sl("read");
    check("game still runs on fresh defaults (no account clobbered in, no exception)", after.beta === false && after.xp === null, `read=${JSON.stringify(after)}`);
    const acct = await sl("ensureAccount","Recovered");
    check("can still create a NEW account after corruption (game fully functional)", !!acct?.accountId, `id=${acct?.accountId}`);
    check("no uncaught JS exceptions across corrupt-file handling", jsErrors.length === 0, jsErrors.slice(0,4).join(" | "));
  }

  section("errors");
  check("no uncaught JS exceptions in the whole run", jsErrors.length===0, jsErrors.slice(0,4).join(" | "));
} catch(e){ console.error("\nHARNESS ERROR:",e); FAIL++; }
finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close(); server.close();
  process.exit(FAIL===0?0:1);
}
