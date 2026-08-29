// harness/story_live.test.mjs
// Part 1 — LIVE Story Mode playthrough in the real game (browser). Drives the actual flow:
// chapter select → pre-fight dialogue beat → fight → win → next chapter unlocks → progress SAVES.
// Walks all 15 chapters, confirms each matchup + dialogue, the finale's boss super-armor, campaign
// completion, and that progress survives a full page reload (localStorage persistence).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}
let PASS=0,FAIL=0; const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};
const section=t=>console.log(`\n── ${t} ─────────────────────────────`);

// expected matchups (source of truth) parsed straight from story.js
const { STORY_CHAPTERS } = await import("../story.js");

const server=await srv(); const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true, args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const jsErrors=[]; page.on("pageerror",e=>jsErrors.push(String(e)));
await page.goto(`${base}/index.html?harness=1`);
await page.waitForFunction(() => window.__harness && window.__harness.story, null, { timeout: 20000 });
// clear any prior saved story progress so the walk starts fresh
await page.evaluate(() => { try { localStorage.removeItem("multiverse-smash-story"); } catch(_){} });
await page.reload(); await page.waitForFunction(() => window.__harness && window.__harness.story);

section("Chapter select — fresh state");
const view0 = await page.evaluate(() => window.__harness.story.open());
check("chapter map shows 15 chapters", view0.length === 15, `got ${view0.length}`);
check("chapter 1 is unlocked", view0[0].unlocked === true);
check("chapter 2 is locked", view0[1].unlocked === false);
check("finale is locked initially", view0[14].unlocked === false);
check("locked chapter can't be entered (guarded no-op)", await page.evaluate(() => { window.__harness.story.open(); return window.__harness.story.begin(5).gameState === "storyMode"; }));

section("Full 15-chapter playthrough");
for (let i = 0; i < STORY_CHAPTERS.length; i++) {
  const exp = STORY_CHAPTERS[i];
  const beg = await page.evaluate((idx) => window.__harness.story.begin(idx), i);
  check(`ch${i+1} (${exp.num}) enters its pre-fight beat`, beg.gameState === "storyIntro", `state=${beg.gameState}`);
  check(`ch${i+1} matchup is ${exp.player} vs ${exp.opponent}`, beg.p1 === exp.player && beg.p2 === exp.opponent, `${beg.p1} vs ${beg.p2}`);
  check(`ch${i+1} shows a 2-3 line dialogue exchange`, Array.isArray(beg.lines) && beg.lines.length >= 2 && beg.lines.length <= 3, `lines=${beg.lines?.length}`);
  check(`ch${i+1} dialogue matches story.js content`, JSON.stringify(beg.lines) === JSON.stringify(exp.pre));
  // Real-font overflow check (18px Arial, same font drawRivalIntroScreen renders the lines with).
  const m = await page.evaluate(() => window.__harness.story.introMetrics());
  check(`ch${i+1} no dialogue line overflows the canvas`, m && !m.overflow, `maxLine=${Math.round(m?.maxWidth)}px limit=${m?.marginLimit}px`);
  if (exp.narration) check(`ch${i+1} narration beat carries NO attributed speaker`, m.hasSpeaker.every(s => s === false) && m.narrationOnly);
  check(`ch${i+1} runs in story mode`, beg.mode === "story");

  const fought = await page.evaluate(() => window.__harness.story.fight());
  check(`ch${i+1} fight starts with a per-character CPU template applied`, !!fought.template, `template=${fought.template}`);
  if (exp.boss) {
    check(`finale applies boss super-armor`, fought.bossArmor === true);
    check(`finale boss has boosted HP (${fought.bossHp})`, fought.bossHp > 1200);
  }

  const won = await page.evaluate(() => window.__harness.story.win());
  check(`ch${i+1} win → victory beat`, won.gameState === "victory", `state=${won.gameState}`);
  const isLast = i === STORY_CHAPTERS.length - 1;
  check(`ch${i+1} beat shows the right prompt`, isLast ? /COMPLETE/i.test(won.subtitle) : /CLEARED|UNLOCK/i.test(won.subtitle), `subtitle="${won.subtitle}"`);

  const prog = await page.evaluate(() => window.__harness.story.progress());
  check(`ch${i+1} clear is saved (completed)`, prog.completed[i] === true);
  if (!isLast) check(`ch${i+2} is now unlocked`, prog.highest >= i + 1, `highest=${prog.highest}`);

  await page.evaluate(() => window.__harness.story.advance());   // back to the chapter map (as the real button does)
}

section("Persistence across a full page reload");
const beforeReload = await page.evaluate(() => window.__harness.story.progress());
await page.reload(); await page.waitForFunction(() => window.__harness && window.__harness.story);
const afterReload = await page.evaluate(() => window.__harness.story.progress());
check("highest chapter persisted across reload", afterReload.highest === beforeReload.highest && afterReload.highest === 14, `highest=${afterReload.highest}`);
check("all 15 clears persisted across reload", Object.keys(afterReload.completed).filter(k=>afterReload.completed[k]).length === 15);
const viewR = await page.evaluate(() => window.__harness.story.open());
check("every chapter shows unlocked + completed after reload", viewR.every(c => c.unlocked && c.completed));

check("no uncaught JS exceptions across the whole playthrough", jsErrors.length === 0, jsErrors.slice(0,3).join(" | "));

console.log(`\n════════════════════════════════════════`);
console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
