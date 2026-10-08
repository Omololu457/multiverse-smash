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
async function fx(){ return await page.evaluate(()=>window.__harness.lightFx?.("p1")||null); }

// ── SELECT GRID (real search filter) ──
await page.goto(`${base}/index.html?harness=1`, { waitUntil:"load" });
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
await page.mouse.click(640,360);
await page.evaluate(()=>window.__harness.ui.goto("SELECT_CHARACTER"));
await waitFrames(2);
const vis = await page.evaluate(()=>window.__harness.charSearch.state().visible);
log.push(`SELECT_CHARACTER visible count=${vis.length}  has sasuke_adult=${vis.includes("sasuke_adult")}`);
// type "sasuke" to filter the grid down so the tile is unmistakable in the shot
await page.evaluate(()=>{ window.__harness.charSearch.focus(true); window.__harness.charSearch.set("sasuke"); });
await waitFrames(2);
const vis2 = await page.evaluate(()=>window.__harness.charSearch.state().visible);
log.push(`filtered 'sasuke' -> ${JSON.stringify(vis2)}`);
await page.screenshot({ path: path.join(OUT, "01_select.png") });
await page.evaluate(()=>window.__harness.charSearch.clear());

// ── GROUNDED CHIDORI + FRESH SHINRA ──
async function newMatch(){ await page.goto(`${base}/index.html?harness=1&p1=sasuke_adult&p2=sasuke`,{waitUntil:"load"}); await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360); await page.evaluate(()=>window.__harness.boot()); await page.evaluate(()=>window.__harness.setDummyBehavior?.("stand")); await waitFrames(30); }
async function faceRight(){ const a=await page.evaluate(()=>window.__harness.arena?.()||{left:300,width:600}); await page.evaluate(x=>window.__harness.setP1X(x), Math.round(a.left+a.width*0.4)); const p=await page.evaluate(()=>window.__harness.p1()); await page.evaluate(x=>window.__harness.setP2X(x), p.x+150); }
async function energy(){ await page.evaluate(()=>window.__harness.setEnergy?.(200)); }

// grounded Chidori: ensure on ground (no prior jump), hold d + l
await newMatch(); await energy(); await faceRight(); await waitFrames(5);
await page.keyboard.down("d"); await waitFrames(1); await page.keyboard.down("l"); await waitFrames(5);
await page.screenshot({ path: path.join(OUT, "08_chidori.png") });
log.push("grounded chidori: "+JSON.stringify(await fx()));
await page.keyboard.up("l"); await page.keyboard.up("d");

// fresh Shinra Tensei (Fwd+Ultimate) on a clean match (no prior ult → no cooldown)
await newMatch(); await energy(); await faceRight(); await waitFrames(5);
await page.keyboard.down("d"); await waitFrames(1); await page.keyboard.down("u"); await waitFrames(14);
await page.screenshot({ path: path.join(OUT, "13_shinra.png") });
log.push("fresh shinra(d+u): "+JSON.stringify(await fx()));
await page.keyboard.up("u"); await page.keyboard.up("d");

console.log("\n──── RESULTS ────"); for (const l of log) console.log("  "+l);
console.log("errors:", errs.length, errs.slice(0,4));
await browser.close(); server.close(); process.exit(0);
