// harness/stage4_clone_chars.test.mjs — STAGE 4 batch evidence: Kakashi, Itachi, Hiruzen are now full clone
// characters and inherit the whole shared system (create/dispel, real-hittable clones, consciousness-swap)
// each with THEIR OWN body. Fast, deterministic unit test (no browser). For each char it proves:
//   1. clone-capable with the expected cap; spawning past the cap is a no-op,
//   2. clones render that character's OWN body sheet (not the Naruto fallback),
//   3. clones are REAL hit-objects (Stage 1 revealClonesHitByMelee poofs them),
//   4. clones support the Stage 3 consciousness-swap (position trade, count preserved).
// Plus: no drift on the pre-existing clone chars / a non-clone char.

import {
  activeSummons, spawnShadowClone, countShadowClones,
  isCloneCapable, getCloneCap, revealClonesHitByMelee, swapConsciousnessWithClone,
  dispelShadowClones, getWoodReleaseFxCount
} from "../summons.js";

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);
function reset() { activeSummons.length = 0; }
const OPP = { x: 100, y: 400, w: 60, h: 90 };
function owner(key) { return { rosterKey: key, x: 500, y: 400, w: 60, h: 90, facing: 1 }; }
function liveClone(o, x, y = 400) { const s = spawnShadowClone(o, OPP); if (s) { s._state = "idle"; s._hidden = false; s.x = x; s.y = y; } return s; }

const CHARS = [
  { key: "kakashi", cap: 2, sheetHint: "kakashi" },
  { key: "itachi",  cap: 3, sheetHint: "itachi" },
  { key: "hiruzen", cap: 3, sheetHint: "hiruzen" },
  { key: "madara",  cap: 3, sheetHint: "madara" },
];

for (const { key, cap, sheetHint } of CHARS) {
  section(`${key.toUpperCase()} — full clone character`);

  // 1. capability + cap
  check(`${key}: clone-capable`, isCloneCapable({ rosterKey: key }) === true);
  check(`${key}: cap = ${cap}`, getCloneCap({ rosterKey: key }) === cap, `cap=${getCloneCap({ rosterKey: key })}`);
  reset();
  const o1 = owner(key);
  for (let i = 0; i < cap + 2; i++) spawnShadowClone(o1, OPP);
  check(`${key}: spawning past the cap is a no-op (count = ${cap})`, countShadowClones(o1) === cap, `count=${countShadowClones(o1)}`);

  // 2. own body sheet
  reset();
  const bodyClone = spawnShadowClone(owner(key), OPP);
  check(`${key}: clones use ${key}'s own body sheet`, typeof bodyClone.sheet === "string" && bodyClone.sheet.includes(sheetHint), `sheet=${bodyClone.sheet}`);

  // 3. real hit-object
  reset();
  const oHit = owner(key);
  const hitClone = liveClone(oHit, 160, 360);
  const attacker = { rosterKey: "sasuke", facing: 1, x: 100, y: 400, w: 50, h: 100,
    currentAttack: { name: "light", rangeX: 60, rangeY: 40, total: 10, timer: 5, activeStart: 0, activeEnd: 10, hasHit: false } };
  revealClonesHitByMelee(attacker);
  check(`${key}: an overlapping melee swing poofs the clone`, hitClone._state === "hurt", `state=${hitClone._state}`);

  // 4. consciousness-swap
  reset();
  const oSwap = owner(key);
  liveClone(oSwap, 200);
  const far = liveClone(oSwap, 900);
  const before = countShadowClones(oSwap);
  const chosen = swapConsciousnessWithClone(oSwap, OPP);
  check(`${key}: consciousness-swap trades onto the far clone`, chosen === far && oSwap.x === 900, `owner.x=${oSwap.x}`);
  check(`${key}: clone count preserved across the swap`, countShadowClones(oSwap) === before, `count=${countShadowClones(oSwap)}`);
}

section("MADARA — wood clones revert to LOGS on despawn (Mokuton, like Hashirama)");
{
  reset();
  const o = owner("madara");
  liveClone(o, 400); liveClone(o, 600);
  const woodBefore = getWoodReleaseFxCount();
  dispelShadowClones(o);   // deliberate recall → wood-release FX (not smoke puff)
  check("dispelling Madara clones fires the wood-release (log) FX", getWoodReleaseFxCount() > woodBefore, `wood ${woodBefore}→${getWoodReleaseFxCount()}`);
  check("all Madara clones dispelled", countShadowClones(o) === 0);
}

section("No drift on other characters");
check("pre-existing clone chars still capable", ["naruto", "minato", "hashirama", "tobirama", "boruto", "kakashi", "itachi", "hiruzen"].every(k => isCloneCapable({ rosterKey: k })));
check("a non-clone char (sasuke) is still not capable", isCloneCapable({ rosterKey: "sasuke" }) === false);
check("naruto cap unchanged (4), minato (2)", getCloneCap({ rosterKey: "naruto" }) === 4 && getCloneCap({ rosterKey: "minato" }) === 2);

console.log(`\n${FAIL === 0 ? "✅" : "❌"}  stage4_clone_chars: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
