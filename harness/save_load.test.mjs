// harness/save_load.test.mjs
// SAVE / LOAD PERSISTENCE — end-to-end, real code paths, across three storage situations:
//
//   A) FALLBACK (Safari/Firefox, or before any file is connected): the File System Access API
//      is ABSENT → progress auto-persists to localStorage and auto-loads on the next launch
//      with NO player action. This is the layer added so persistence works for EVERYONE.
//   B) FILE PATH (Chrome/Edge with a connected file): unchanged — the file is the primary
//      export. Proven to still load independently of localStorage.
//   C) MIGRATION: a player who accumulated progress in the localStorage fallback then connects
//      a fresh file → that progress is copied INTO the new file (one continuous profile, not a
//      reset-to-empty new slot).
//
// FAITHFULNESS: the only un-scriptable, non-our-code piece is the native OS file picker
// (window.showOpen/SaveFilePicker). Situation B/C mock ONLY that, returning a REAL OPFS-backed
// FileSystemFileHandle (Chromium persists OPFS across reload; same getFile()/createWritable()
// account.js already uses). Situation A instead REMOVES the picker to faithfully simulate a
// browser without the API. Everything else is the actual production pipeline, and page.reload()
// is a genuine close-and-reopen (module graph re-initialised, in-memory store wiped).
import { chromium, firefox, webkit } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import os from "node:os";
import { fileURLToPath } from "node:url";
import { createSaveServer } from "../server/save-server.mjs";
// ENGINE SELECTION (SL_ENGINE=chromium|firefox|webkit, default chromium). Firefox and WebKit
// genuinely LACK the File System Access API, so on them the fallback (A) is exercised for REAL,
// not simulated — and the file path (B) / migration (C) sections are Chromium-only (that API is
// Chromium-only in practice). NOTE: Playwright's WebKit is Safari's engine but an APPROXIMATION
// of shipping Safari — treat a green run as strong evidence, not a substitute for a real Safari check.
const ENGINE = (process.env.SL_ENGINE || "chromium").toLowerCase();
const ENGINES = { chromium, firefox, webkit };
const engine = ENGINES[ENGINE] || chromium;
const IS_CHROMIUM = ENGINE === "chromium";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
function startServer(port=0){const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const fp=path.join(ROOT,u==="/"?"/index.html":u);if(!fp.startsWith(ROOT)){res.writeHead(403).end();return;}fs.readFile(fp,(e,d)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{"content-type":MIME[path.extname(fp)]||"application/octet-stream"});res.end(d);});});return new Promise(r=>s.listen(port,"127.0.0.1",()=>r(s)));}
// Wait until an on-disk file satisfies `pred` (the save server POST is async+coalesced).
async function waitForFile(fp, pred, tries=60){ for(let i=0;i<tries;i++){ try{ const s=fs.readFileSync(fp,"utf8"); if(pred(s)) return s; }catch(_){} await new Promise(r=>setTimeout(r,60)); } return null; }
let PASS=0,FAIL=0;
const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};
const section=t=>console.log(`\n── ${t} ─────────────────────────────`);
const SAVE_NAME="game_player_data.json", LS_KEY="multiverse-smash-save";

const server=await startServer(); const baseURL=`http://127.0.0.1:${server.address().port}`;
const browser=await engine.launch({headless:true, ...(IS_CHROMIUM ? {args:["--autoplay-policy=no-user-gesture-required"]} : {})});
console.log(`\n▶ SAVE/LOAD PERSISTENCE — engine: ${ENGINE.toUpperCase()}${IS_CHROMIUM ? "" : "  (File System Access API genuinely absent → real fallback test)"}`);

// A context with the OPFS picker mock (File System Access API "available").
const OPFS_MOCK = (name)=>{ const g=async()=>{ const r=await navigator.storage.getDirectory(); return await r.getFileHandle(name,{create:true}); }; window.showSaveFilePicker=async()=>g(); window.showOpenFilePicker=async()=>[await g()]; };
// A context that REMOVES the picker (simulates Safari/Firefox — API absent).
const NO_FILE_API = ()=>{ const kill=k=>{ try{Object.defineProperty(window,k,{value:undefined,configurable:true,writable:true});}catch(_){try{window[k]=undefined;}catch(__){}} }; kill("showOpenFilePicker"); kill("showSaveFilePicker"); };

async function makePage(initFn, arg, base=baseURL){
  const context=await browser.newContext({viewport:{width:1280,height:720}});
  if (initFn) await context.addInitScript(initFn, arg);
  const page=await context.newPage();
  const jsErrors=[]; page.on("pageerror",e=>jsErrors.push(String(e)));
  const wf = () => page.waitForTimeout(80);
  const load = async () => { await page.goto(`${base}/index.html?harness=1`,{waitUntil:"load"}); await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await wf(); };
  const sl = (fn,...a)=>page.evaluate(([f,args])=>window.__harness.saveLoad[f](...args),[fn,a]);
  const lsGet = ()=>page.evaluate(k=>{ try{return localStorage.getItem(k);}catch(_){return null;} }, LS_KEY);
  const lsSet = (v)=>page.evaluate(([k,val])=>{ try{localStorage.setItem(k,val);}catch(_){}}, [LS_KEY,v]);
  const lsClear = ()=>page.evaluate(k=>{ try{localStorage.removeItem(k);}catch(_){}}, LS_KEY);
  const readOPFS = ()=>page.evaluate(async name=>{ try{const r=await navigator.storage.getDirectory();const h=await r.getFileHandle(name);return await (await h.getFile()).text();}catch(e){return `__ERR__${e.name}`;} }, SAVE_NAME);
  const deleteOPFS = ()=>page.evaluate(async name=>{ try{const r=await navigator.storage.getDirectory();await r.removeEntry(name);}catch(_){}}, SAVE_NAME);
  // 17C stores the granted FSA handle in IndexedDB so it reattaches on reload. The OPFS-backed
  // mock handle reports permission "granted" (OPFS never prompts), so it would auto-reattach and
  // change situation B's "nothing restored after reload" premise. Clearing that store restores B's
  // ORIGINAL manual-reconnect semantics (a REAL rehydrated file handle reports "prompt", so it
  // would NOT silently reattach anyway — see reattachStoredHandle()).
  const clearHandleDB = ()=>page.evaluate(()=>new Promise(res=>{ try{ const r=indexedDB.deleteDatabase("multiverse-smash-fs"); r.onsuccess=r.onerror=r.onblocked=()=>res(true); }catch(_){res(false);} }));
  return { context, page, jsErrors, load, sl, lsGet, lsSet, lsClear, readOPFS, deleteOPFS, clearHandleDB };
}

try {
  // ══ A) FALLBACK PATH — File System Access API ABSENT ══
  // On Chromium we DELETE the picker to simulate absence; on Firefox/WebKit the API is genuinely
  // missing, so we inject NOTHING and let the real engine drive it (the stronger test).
  section(`A) FALLBACK: no File API → progress auto-persists to localStorage, no player action`);
  {
    const t = IS_CHROMIUM ? await makePage(NO_FILE_API) : await makePage(()=>{});
    await t.load();
    check(`File System Access API reports UNSUPPORTED (${IS_CHROMIUM ? "simulated" : "GENUINE on "+ENGINE})`, (await t.sl("apiSupported")) === false);
    const acct = await t.sl("ensureAccount","FallbackUser");
    check("account created; no file is/could be connected", !!acct?.accountId && (await t.sl("connected")) === false, `id=${acct?.accountId}`);
    // Real connectSaveFile with no API → clean 'unsupported', never throws.
    check("connect() degrades gracefully to 'unsupported' (no crash)", (await t.sl("connect"))?.reason === "unsupported");
    // Make persisted changes — these can ONLY be going to localStorage here.
    await t.sl("awardXp",500);
    await t.sl("applyCode","GojoV1");
    await t.sl("setSetting","sfxMuted",true);
    await t.sl("setSetting","musicVolume",0.123);
    const raw = await t.lsGet();
    check("localStorage now holds the snapshot (xp + beta + setting)", !!raw && raw.includes('"xp":500') && raw.includes('"betaUnlock":true') && raw.includes('0.123'), `head=${(raw||"").slice(0,50)}`);
    const savedId = (await t.sl("read")).accountId;

    // Simulate close+reopen. NO connect(), NO gesture — must auto-load from localStorage at boot.
    await t.page.reload({waitUntil:"load"}); await t.page.waitForFunction(()=>!!window.__harness); await t.page.waitForTimeout(80);
    check("after reload, boot auto-loaded a profile from the fallback (no connect/gesture)", (await t.sl("hasPersisted")) === true);
    const after = await t.sl("read");
    check("XP persisted via localStorage (500 → level 3)", after.xp === 500 && after.level === 3, `xp=${after.xp} lvl=${after.level}`);
    check("beta unlock persisted via localStorage", after.beta === true, `beta=${after.beta}`);
    check("audio settings persisted via localStorage", after.settings?.sfxMuted === true && Math.abs((after.settings?.musicVolume??-1)-0.123)<1e-6, `sfxMuted=${after.settings?.sfxMuted} vol=${after.settings?.musicVolume}`);
    check("SAME account id round-tripped through localStorage", after.accountId === savedId, `${after.accountId} vs ${savedId}`);

    // Edge case: corrupted localStorage → graceful fresh start, no crash.
    await t.lsSet("{ not valid json ]]]   garbage");
    await t.page.reload({waitUntil:"load"}); await t.page.waitForFunction(()=>!!window.__harness); await t.page.waitForTimeout(80);
    check("corrupt localStorage → boot loads 0 profiles (parse failed, no crash)", (await t.sl("hasPersisted")) === false);
    const fresh = await t.sl("read");
    check("game runs on fresh defaults after corrupt localStorage", fresh.accountId === null && fresh.beta === false, `read=${JSON.stringify(fresh).slice(0,80)}`);
    check("can still create a NEW account after corruption (fully functional)", !!(await t.sl("ensureAccount","Recovered"))?.accountId);
    check("no uncaught JS exceptions (fallback path)", t.jsErrors.length === 0, t.jsErrors.slice(0,3).join(" | "));
    await t.context.close();
  }

  // ══ B) FILE PATH — File System Access API present + connected (Chrome/Edge, unchanged) ══
  // Chromium-only: the File System Access API / OPFS-backed picker doesn't exist on Firefox/WebKit,
  // which is EXACTLY why those engines rely on the fallback proven in (A).
  if (!IS_CHROMIUM) {
    section("B/C) FILE PATH + MIGRATION — SKIPPED on " + ENGINE);
    console.log(`  ⏭  SKIP  File System Access API is absent on ${ENGINE} (by design) — file path is Chromium/Edge-only; the fallback (A) IS the persistence path here.`);
  } else {
  section("B) FILE PATH: connected file is primary and still loads INDEPENDENTLY of localStorage");
  {
    const t = await makePage(OPFS_MOCK, SAVE_NAME);
    await t.load();
    await t.deleteOPFS(); await t.lsClear();
    check("File System Access API reports SUPPORTED", (await t.sl("apiSupported")) === true);
    await t.sl("ensureAccount","FileUser");
    const conn = await t.sl("connect");
    check("SAVE FILE connect succeeds and is connected", conn?.ok === true && (await t.sl("connected")) === true, `conn=${JSON.stringify(conn)}`);
    await t.sl("awardXp",800);
    await t.sl("applyCode","GojoV1");
    await t.sl("setSetting","musicVolume",0.321);
    const rawFile = await t.readOPFS();
    check("the connected FILE physically holds the snapshot (file path unaffected)", rawFile.includes('"xp": 800') && rawFile.includes('"betaUnlock": true') && rawFile.includes('0.321'), `hasData=${rawFile.startsWith("{")}`);
    const savedId = (await t.sl("read")).accountId;

    // Prove the FILE is what restores after reload — clear localStorage so ONLY the file has data.
    // Also clear the stored FSA handle (17C) so this keeps testing the MANUAL reconnect path.
    await t.lsClear(); await t.clearHandleDB();
    await t.page.reload({waitUntil:"load"}); await t.page.waitForFunction(()=>!!window.__harness); await t.page.waitForTimeout(80);
    check("with localStorage cleared, boot restores NOTHING (proves next load is file-sourced)", (await t.sl("hasPersisted")) === false);
    const conn2 = await t.sl("connect");
    check("reconnecting the file loads the save (count ≥ 1)", conn2?.ok === true && conn2?.count >= 1, `conn=${JSON.stringify(conn2)}`);
    const after = await t.sl("read");
    check("XP persisted via FILE (800)", after.xp === 800, `xp=${after.xp}`);
    check("beta unlock persisted via FILE", after.beta === true, `beta=${after.beta}`);
    check("numeric setting persisted via FILE (0.321)", Math.abs((after.settings?.musicVolume??-1)-0.321)<1e-6, `vol=${after.settings?.musicVolume}`);
    check("SAME account id round-tripped through the FILE", after.accountId === savedId, `${after.accountId} vs ${savedId}`);

    // Existing edge case: corrupted FILE → graceful fallback.
    await t.page.evaluate(async name=>{ const r=await navigator.storage.getDirectory(); const h=await r.getFileHandle(name,{create:true}); const w=await h.createWritable(); await w.write("{ bad json ]]] "); await w.close(); }, SAVE_NAME);
    await t.lsClear(); await t.clearHandleDB();
    await t.page.reload({waitUntil:"load"}); await t.page.waitForFunction(()=>!!window.__harness); await t.page.waitForTimeout(80);
    const cc = await t.sl("connect");
    check("corrupt FILE → connect returns 0 profiles, no crash", cc?.ok === true && cc?.count === 0, `conn=${JSON.stringify(cc)}`);
    check("no uncaught JS exceptions (file path)", t.jsErrors.length === 0, t.jsErrors.slice(0,3).join(" | "));
    await t.context.close();
  }

  // ══ C) MIGRATION — localStorage progress copied into a newly connected file ══
  section("C) MIGRATION: fallback progress is carried INTO a freshly connected file (one profile)");
  {
    const t = await makePage(OPFS_MOCK, SAVE_NAME);
    await t.load();
    await t.deleteOPFS(); await t.lsClear();
    // Play WITHOUT connecting a file → progress lands in localStorage only.
    await t.sl("ensureAccount","Migrator");
    await t.sl("awardXp",700);
    check("file is NOT connected yet (progress is in localStorage only)", (await t.sl("connected")) === false);
    check("no file written yet", (await t.readOPFS()).startsWith("__ERR__"), `opfs=${(await t.readOPFS()).slice(0,20)}`);
    const idBefore = (await t.sl("read")).accountId;
    // Now connect a fresh file → the empty file is SEEDED with the current (localStorage) data.
    const conn = await t.sl("connect");
    check("connecting a fresh file succeeds", conn?.ok === true, `conn=${JSON.stringify(conn)}`);
    const rawFile = await t.readOPFS();
    check("the localStorage progress was MIGRATED into the new file (xp=700 now in the file)", rawFile.includes('"xp": 700') && rawFile.includes(idBefore), `hasXp=${rawFile.includes('"xp": 700')} sameId=${rawFile.includes(idBefore)}`);
    check("no uncaught JS exceptions (migration path)", t.jsErrors.length === 0, t.jsErrors.slice(0,3).join(" | "));
    await t.context.close();
  }
  }   // end Chromium-only B/C guard

  // ══ D) SERVER TIER — local save server = automatic file persistence, ZERO clicks ══
  // Engine-agnostic (fetch + localStorage, no File System Access API) so it runs on all three.
  // Boots the REAL createSaveServer() from server/save-server.mjs against a throwaway save dir,
  // serves the game FROM it, and proves: auto-save to disk, auto-load on reload with no gesture,
  // the file on disk matches live state, and silent degradation to localStorage when it dies.
  section("D) SERVER TIER: local save server → automatic file persistence, no player action");
  {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ms-save-"));
    const saveSrv = createSaveServer({ saveDir: tmpDir });
    await new Promise(r => saveSrv.listen(0, "127.0.0.1", r));
    const port = saveSrv.address().port;
    const saveBase = `http://127.0.0.1:${port}`;
    const saveFile = saveSrv._saveFile;

    // No init script — the page talks to a REAL same-origin /api. NO File System Access mock.
    const t = await makePage(null, null, saveBase);
    await t.load();
    await t.sl("awaitBoot");   // let the async server tier finish detecting + (empty) loading
    check("save server detected at boot (/api/health responded)", (await t.sl("serverAvailable")) === true);
    check("status row reports the SERVER tier", /saves\/game_player_data\.json/.test(await t.sl("status")), `status=${await t.sl("status")}`);

    await t.sl("ensureAccount", "ServerUser");
    await t.sl("awardXp", 600);
    await t.sl("applyCode", "GojoV1");
    await t.sl("setSetting", "musicVolume", 0.222);
    const savedId = (await t.sl("read")).accountId;

    // The POST is async + coalesced — wait for the change to actually land on disk.
    const onDisk = await waitForFile(saveFile, s => s.includes('"xp":600') && s.includes(savedId));
    check("save server WROTE the file to disk (xp=600, no gesture)", !!onDisk, onDisk ? `bytes=${onDisk.length}` : "file never updated");

    // Simulate close+reopen: NO connect(), NO gesture — boot must auto-load from the SERVER.
    await t.page.reload({waitUntil:"load"}); await t.page.waitForFunction(()=>!!window.__harness); await t.page.waitForTimeout(80);
    await t.sl("awaitBoot");
    check("after reload, boot auto-loaded from the SERVER (no connect/gesture)", (await t.sl("hasPersisted")) === true && (await t.sl("connected")) === false);
    const after = await t.sl("read");
    check("XP restored from server (600 → level 4)", after.xp === 600 && after.level === 4, `xp=${after.xp} lvl=${after.level}`);
    check("beta unlock restored from server", after.beta === true, `beta=${after.beta}`);
    check("audio setting restored from server (0.222)", Math.abs((after.settings?.musicVolume??-1)-0.222)<1e-6, `vol=${after.settings?.musicVolume}`);
    check("SAME account id round-tripped through the server file", after.accountId === savedId, `${after.accountId} vs ${savedId}`);

    // Read the file DIRECTLY off disk and assert it matches the live, restored state.
    const raw = JSON.parse(fs.readFileSync(saveFile, "utf8"));
    const acctOnDisk = (raw.accounts || []).find(a => a.accountId === savedId);
    check("on-disk file is a valid save (format tag present)", raw.format === "multiverse-smash-save");
    check("on-disk file MATCHES live state (xp+beta+setting)", acctOnDisk?.progression?.xp === 600 && acctOnDisk?.unlocks?.betaUnlock === true && Math.abs((acctOnDisk?.settings?.musicVolume??-1)-0.222)<1e-6, `disk=${JSON.stringify(acctOnDisk?.progression)}`);

    // KILL the server, then rebind a STATIC-ONLY server on the SAME port (same origin → the
    // localStorage mirror survives; /api/health now 404s). Reload must degrade silently to LS.
    await Promise.race([ new Promise(r => { saveSrv.closeAllConnections?.(); saveSrv.close(r); }), new Promise(r => setTimeout(r, 2000)) ]);
    const staticSrv = await startServer(port);
    await t.page.reload({waitUntil:"load"}); await t.page.waitForFunction(()=>!!window.__harness); await t.page.waitForTimeout(80);
    await t.sl("awaitBoot");
    check("server gone → capability probe reports UNavailable (silent, no retry)", (await t.sl("serverAvailable")) === false);
    const off = await t.sl("read");
    check("game STILL loads from localStorage after server death (xp=600)", off.xp === 600 && off.beta === true, `xp=${off.xp} beta=${off.beta}`);
    check("status row falls back to the browser-storage tier", /browser storage/i.test(await t.sl("status")), `status=${await t.sl("status")}`);
    check("no uncaught JS exceptions (server tier)", t.jsErrors.length === 0, t.jsErrors.slice(0,3).join(" | "));

    await t.context.close();
    await new Promise(r => staticSrv.close(r));

    // Re-boot the save server on a fresh dir to prove the VALIDATION guard rail directly.
    const tmpDir2 = fs.mkdtempSync(path.join(os.tmpdir(), "ms-save2-"));
    const guardSrv = createSaveServer({ saveDir: tmpDir2 });
    await new Promise(r => guardSrv.listen(0, "127.0.0.1", r));
    const gBase = `http://127.0.0.1:${guardSrv.address().port}`, gFile = guardSrv._saveFile;
    // Seed a valid save, then attempt to overwrite it with garbage.
    const goodBody = JSON.stringify({ format:"multiverse-smash-save", version:1, accounts:[{accountId:"keep-me",progression:{xp:42}}] });
    const okStatus  = (await fetch(gBase+"/api/save",{method:"POST",headers:{"content-type":"application/json"},body:goodBody})).status;
    const badStatus = (await fetch(gBase+"/api/save",{method:"POST",headers:{"content-type":"application/json"},body:"NOT JSON ]]]"})).status;
    const wrongFmt  = (await fetch(gBase+"/api/save",{method:"POST",headers:{"content-type":"application/json"},body:'{"format":"something-else","accounts":[]}'})).status;
    check("valid save POST accepted (200)", okStatus === 200, `status=${okStatus}`);
    check("garbage POST rejected (400) — existing save NOT clobbered", badStatus === 400 && wrongFmt === 400, `bad=${badStatus} wrongFmt=${wrongFmt}`);
    check("the valid save survived the rejected writes", JSON.parse(fs.readFileSync(gFile,"utf8"))?.accounts?.[0]?.accountId === "keep-me");
    await new Promise(r => guardSrv.close(r));
    try { fs.rmSync(tmpDir, {recursive:true,force:true}); fs.rmSync(tmpDir2, {recursive:true,force:true}); } catch(_) {}
  }
} catch(e){ console.error("\nHARNESS ERROR:",e); FAIL++; }
finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULT [${ENGINE}]: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close(); server.close();
  process.exit(FAIL===0?0:1);
}
