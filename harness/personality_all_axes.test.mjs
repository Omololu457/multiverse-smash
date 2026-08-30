// harness/personality_all_axes.test.mjs — proves the TRACKING FIX: all five Big-Five axes now receive
// live fighter-behaviour evidence. Before the fix only E and N ever moved (O/C/A were frozen at the
// neutral prior forever, since their event rows were dormant and there is no TIPI questionnaire UI), so
// "The Choir's Reading" could never fill in three of its five spokes. This drives real match outcomes and
// asserts Openness / Conscientiousness / Agreeableness all move in the expected directions.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); if(u.startsWith("/api/")){res.writeHead(200).end("{}");return;} const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
let pass=0, fail=0; const check=(n,c,e="")=>{ console.log(`${c?"✓":"✗"} ${n}${e?"  — "+e:""}`); c?pass++:fail++; };
const P = (fn, ...a) => page.evaluate(fn, ...a);
const NEUTRAL = [4,4,4,4,4,4,4,4,4,4];

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=piccolo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness && !!window.__harness.personality, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await P(() => window.__harness.boot());

  // helper: reseed a neutral prior (fresh headroom on every axis), run one match, return {pre,post}
  const trial = async (stats, won, char) => {
    await P(n => window.__harness.personality.setTipi(n), NEUTRAL);
    const pre = await P(() => window.__harness.personality.get());
    await P(([s,w,c]) => window.__harness.personality.match(s, w, c), [stats, won, char]);
    const post = await P(() => window.__harness.personality.get());
    return { pre: pre.summary, post: post.summary };
  };

  console.log("\n── OPENNESS: playing a NEW character raises O (novelty) ──");
  const o = await trial({ p1:{maxCombo:1,specialsUsed:0,ultimatesUsed:0,perfectRounds:0,damageDealt:500}, p2:{damageDealt:400}, totalRounds:1 }, true, "brand_new_char_1");
  check("new-character match raises Openness", o.post.O.mu > o.pre.O.mu + 0.05, `O ${o.pre.O.mu}→${o.post.O.mu}`);
  check("Openness gains confidence (no longer frozen at 0%)", o.post.O.confidence > o.pre.O.confidence, `conf ${o.pre.O.confidence}→${o.post.O.confidence}`);

  console.log("\n── OPENNESS: a wide toolkit (many specials) nudges O even on a known char ──");
  const o2 = await trial({ p1:{maxCombo:1,specialsUsed:4,ultimatesUsed:0,perfectRounds:0,damageDealt:500}, p2:{damageDealt:400}, totalRounds:1 }, true, "brand_new_char_1");
  check("diverse-moveset match raises Openness", o2.post.O.mu > o2.pre.O.mu, `O ${o2.pre.O.mu}→${o2.post.O.mu}`);

  console.log("\n── CONSCIENTIOUSNESS: a FLAWLESS round raises C; a beating lowers it ──");
  const cUp = await trial({ p1:{maxCombo:2,specialsUsed:0,ultimatesUsed:0,perfectRounds:1,damageDealt:800}, p2:{damageDealt:0}, totalRounds:2 }, true, "brand_new_char_1");
  check("flawless round raises Conscientiousness", cUp.post.C.mu > cUp.pre.C.mu + 0.05, `C ${cUp.pre.C.mu}→${cUp.post.C.mu}`);
  const cDn = await trial({ p1:{maxCombo:1,specialsUsed:0,ultimatesUsed:0,perfectRounds:0,damageDealt:300}, p2:{damageDealt:900}, totalRounds:1 }, false, "brand_new_char_1");
  check("taking a beating lowers Conscientiousness", cDn.post.C.mu < cDn.pre.C.mu, `C ${cDn.pre.C.mu}→${cDn.post.C.mu}`);

  console.log("\n── AGREEABLENESS: winning without an ult raises A; leaning on ults lowers it ──");
  const aUp = await trial({ p1:{maxCombo:2,specialsUsed:1,ultimatesUsed:0,perfectRounds:0,damageDealt:800}, p2:{damageDealt:400}, totalRounds:2 }, true, "brand_new_char_1");
  check("ult-free win raises Agreeableness", aUp.post.A.mu > aUp.pre.A.mu, `A ${aUp.pre.A.mu}→${aUp.post.A.mu}`);
  const aDn = await trial({ p1:{maxCombo:2,specialsUsed:2,ultimatesUsed:2,perfectRounds:0,damageDealt:900}, p2:{damageDealt:400}, totalRounds:2 }, true, "brand_new_char_1");
  check("ultimate-heavy domination lowers Agreeableness", aDn.post.A.mu < aDn.pre.A.mu, `A ${aDn.pre.A.mu}→${aDn.post.A.mu}`);

  console.log("\n── ALL FIVE AXES are live: a varied career gives every spoke non-zero confidence ──");
  await P(n => window.__harness.personality.setTipi(n), NEUTRAL);
  // a spread of matches across new characters, flawless + scrappy, ults + none
  const career = [
    [{ p1:{maxCombo:5,specialsUsed:4,ultimatesUsed:0,perfectRounds:1,damageDealt:900}, p2:{damageDealt:100}, totalRounds:2 }, true,  "career_a"],
    [{ p1:{maxCombo:1,specialsUsed:0,ultimatesUsed:2,perfectRounds:0,damageDealt:700}, p2:{damageDealt:650}, totalRounds:2 }, true,  "career_b"],
    [{ p1:{maxCombo:2,specialsUsed:1,ultimatesUsed:0,perfectRounds:0,damageDealt:300}, p2:{damageDealt:800}, totalRounds:1 }, false, "career_c"],
  ];
  for (const [s,w,c] of career) await P(([s,w,c]) => window.__harness.personality.match(s,w,c), [s,w,c]);
  const fin = (await P(() => window.__harness.personality.get())).summary;
  check("every axis (O,C,E,A,N) now has confidence > 0", ["O","C","E","A","N"].every(t => fin[t].confidence > 0), JSON.stringify(Object.fromEntries(["O","C","E","A","N"].map(t=>[t, fin[t].confidence]))));

  console.log("\n── no JS errors ──");
  check("no page errors during the run", jsErrors.length === 0, jsErrors.slice(0,3).join(" | "));
} catch (e) { console.error(e); fail++; }
finally {
  await browser.close(); server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
