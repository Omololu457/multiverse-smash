// Live verification: REAL select → REAL match → REAL keystrokes for Sasuke (Adult).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "sasuke_adult_work", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".m4a":"audio/mp4",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((q,res) => { const u=decodeURIComponent(q.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless:true, args:["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
const errs=[]; page.on("pageerror", e=>errs.push(String(e)));
const log=[];
async function waitFrames(n){ const s=await page.evaluate(()=>window.__harness.state().frame); await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16}).catch(()=>{}); }
async function shot(name){ await page.screenshot({ path: path.join(OUT, name+".png") }); }
async function fx(){ return await page.evaluate(()=>window.__harness.lightFx?.("p1")||null); }
async function reset(){ await page.evaluate(()=>{ window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setEnergy?.(200); }); await waitFrames(40); }  // energy full + let p1 settle to the ground
async function tap(k,ms=40){ await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); }

// ── SELECT SCREEN (real UI) ──
await page.goto(`${base}/index.html?harness=1`, { waitUntil:"load" });
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
await page.mouse.click(640,360);
// jump to the character-select screen via the harness UI hook
const gotoOk = await page.evaluate(()=>{ try { return !!(window.__harness.ui?.goto?.("SELECT_CHAR") ?? window.__harness.ui?.goto?.("characterSelect")); } catch(e){ return "err:"+e.message; } });
await page.waitForTimeout(500);
await shot("01_select");
const onGrid = await page.evaluate(()=>{ const r=(window.__harness.roster?.()||[]); return r.includes? r.includes("sasuke_adult") : null; });
log.push(`select goto=${gotoOk}  roster-has-sasuke_adult=${onGrid}`);

// ── MATCH (real keystrokes) ──
await page.goto(`${base}/index.html?harness=1&p1=sasuke_adult&p2=sasuke`, { waitUntil:"load" });
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
await page.mouse.click(640,360);
// intro: boot but capture the intro frames before snapping to idle
await page.evaluate(()=>window.__harness.boot?.({ intro:true }) ?? window.__harness.boot());
await page.waitForTimeout(200); await shot("02_intro");
await page.evaluate(()=>window.__harness.setDummyBehavior?.("stand"));
await waitFrames(30); await reset();
await shot("03_idle"); log.push("idle: "+JSON.stringify(await fx()));

// position p1 near p2
async function faceRight(){ const a=await page.evaluate(()=>window.__harness.arena?.()||{left:300,width:600}); await page.evaluate(x=>window.__harness.setP1X(x), Math.round(a.left+a.width*0.4)); const p=await page.evaluate(()=>window.__harness.p1()); await page.evaluate(x=>window.__harness.setP2X(x), p.x+120); }
await faceRight();

// RUN (hold right)
await reset(); await page.keyboard.down("d"); await waitFrames(8); await shot("04_run"); log.push("run: "+JSON.stringify(await fx())); await page.keyboard.up("d");

// FIST STRING (light, light)
await reset(); await faceRight(); await tap("j",50); await waitFrames(2); await tap("j",50); await waitFrames(1); await shot("05_fist"); log.push("fist: "+JSON.stringify(await fx()));

// SWORD STRING (heavy)
await reset(); await faceRight(); await page.keyboard.down("k"); await waitFrames(3); await shot("06_sword"); log.push("sword(heavy): "+JSON.stringify(await fx())); await page.keyboard.up("k");

// AIR ATTACK (jump then light)
await reset(); await faceRight(); await tap("w",40); await waitFrames(6); await page.keyboard.down("j"); await waitFrames(2); await shot("07_air"); log.push("air: "+JSON.stringify(await fx())); await page.keyboard.up("j");

// CHIDORI (Fwd+Special = hold d + l)
await reset(); await faceRight(); await page.keyboard.down("d"); await waitFrames(1); await page.keyboard.down("l"); await waitFrames(4); await shot("08_chidori"); log.push("chidori(F+special): "+JSON.stringify(await fx())); await page.keyboard.up("l"); await page.keyboard.up("d");

// KATON (neutral special = l)
await reset(); await faceRight(); await page.keyboard.down("l"); await waitFrames(5); await shot("09_katon"); log.push("katon(N special): "+JSON.stringify(await fx())); await page.keyboard.up("l");

// AMATERASU (Up+Special = hold w + l)
await reset(); await faceRight(); await page.keyboard.down("w"); await page.keyboard.down("l"); await waitFrames(4); await shot("10_amaterasu"); log.push("amaterasu(U+special): "+JSON.stringify(await fx())); await page.keyboard.up("l"); await page.keyboard.up("w");

// SWORD-SWAP (Down+Special = hold s + l)
await reset(); await faceRight(); await page.keyboard.down("s"); await waitFrames(1); await page.keyboard.down("l"); await waitFrames(10); await shot("11_swordswap"); log.push("swordSwap(D+special): "+JSON.stringify(await fx())); await page.keyboard.up("l"); await page.keyboard.up("s");

// RINNEGAN ULT (neutral Ultimate = u → Chibaku Tensei)
await reset(); await faceRight(); await page.keyboard.down("u"); await waitFrames(14); await shot("12_rinnegan_chibaku"); log.push("ult-neutral(u): "+JSON.stringify(await fx())); await page.keyboard.up("u");

// SHINRA TENSEI (Fwd+Ultimate = hold d + u)
await reset(); await faceRight(); await page.keyboard.down("d"); await waitFrames(1); await page.keyboard.down("u"); await waitFrames(14); await shot("13_shinra"); log.push("ult-fwd shinra(d+u): "+JSON.stringify(await fx())); await page.keyboard.up("u"); await page.keyboard.up("d");

console.log("\n──── RESULTS ────");
for (const l of log) console.log("  "+l);
console.log("\nerrors:", errs.length, errs.slice(0,4));
await browser.close(); server.close();
process.exit(0);
