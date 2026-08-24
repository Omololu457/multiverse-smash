// harness/ghostface_basekit.test.mjs — CANONICAL suite for the GHOSTFACE VARIANT KIT
// (the shared base-kit TEMPLATE for the 12 "[Killer] Ghostface" roster slots).
//
// Pure Node (no browser) — the template is not yet registered into the live roster
// (blocked on real art / undesigned specials+ultimates / undefined companion input
// scheme). This suite verifies the TEMPLATE itself:
//   • roster integrity (12 unique variant keys, "[Killer] Ghostface" naming)
//   • family gate excludes the original "ghostface"
//   • the base kit is IDENTICAL across all 12 (normals / knife-string / stats / anim)
//   • placeholder art: every declared sheet is a real file on disk
//   • per-variant special/ultimate/companions are honest STUBS (not fabricated)
//   • the three shared mechanics behave (knife-string rekka gate, phone-taunt
//     cancel window, cloak-dash i-frames)
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import {
  GHOSTFACE_VARIANT_KEYS, GHOSTFACE_VARIANT_ROSTER, isGhostfaceVariant,
  BASE_STATS, BASE_NORMALS, BASE_KNIFE_STRING, CLOAK_DASH, PHONE_TAUNT, GRAB_CONTRACT,
  COMPANION_MOTIONS, companionSlotFromMotion,
  COMPANION_TRIGGER, COMPANION_PHANTOM,
  resolveCompanionInvocation, fireCompanionInvocation, updateCompanionInvocation,
  companionListFor, resolveCompanionSummon, makeSummonCompanion, companionCoverageReport,
  makeGhostfaceVariantCharacter, buildAllGhostfaceVariants,
  fireVariantKnifeStage, updateVariantKnifeString,
  fireVariantPhoneTaunt, updateVariantPhoneTaunt, fireVariantCloakDash,
  isBillyGhostface, BILLY_COUNTER, BILLY_ULT, billyUltEff,
  fireBillyCounter, updateBillyCounter, fireBillyUltimate, updateBillyUltimate,
  IDENTITY_SLICES, KILLER_TINT, killerTint,
} from "../ghostfaceVariantKit.js";
import { characters } from "../characters.js";
import { applyGhostfaceSwap } from "../abilities.js";   // the REAL swap engine (not a stub)

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const built = buildAllGhostfaceVariants();
const all = GHOSTFACE_VARIANT_KEYS.map(k => built[k]);

// ── ROSTER INTEGRITY ─────────────────────────────────────────────────────────
section("roster integrity — 12 standalone variant slots");
check("exactly 12 variant keys", GHOSTFACE_VARIANT_KEYS.length === 12, `${GHOSTFACE_VARIANT_KEYS.length}`);
check("12 roster configs", GHOSTFACE_VARIANT_ROSTER.length === 12);
check("all rosterKeys unique", new Set(GHOSTFACE_VARIANT_KEYS).size === 12);
check("all keys prefixed ghostface_", GHOSTFACE_VARIANT_KEYS.every(k => k.startsWith("ghostface_")));
check("buildAllGhostfaceVariants produced 12", Object.keys(built).length === 12);
check('every name follows "[Killer] Ghostface"', all.every(c => c.name.endsWith(" Ghostface") && c.name.split(" Ghostface")[0].length > 0),
  all.map(c => c.name).join(", "));
check("every variant tagged family=ghostface_variant", all.every(c => c.family === "ghostface_variant"));

// ── FAMILY GATE — must NOT touch the original "ghostface" ───────────────────────
section("family gate isolates the 12 from the original ghostface");
check("isGhostfaceVariant true for all 12", GHOSTFACE_VARIANT_KEYS.every(k => isGhostfaceVariant(k)));
check('isGhostfaceVariant("ghostface") is FALSE', isGhostfaceVariant("ghostface") === false);
check('isGhostfaceVariant("jason") is FALSE', isGhostfaceVariant("jason") === false);
check("accepts a fighter object too", isGhostfaceVariant({ rosterKey: "ghostface_billy" }) === true);
check("original ghostface STILL registered + untouched", !!characters.ghostface && characters.ghostface.rosterKey === "ghostface");
check("no variant key collides with a live roster key", GHOSTFACE_VARIANT_KEYS.every(k => !characters[k]));

// ── SHARED BASE KIT — identical across all 12 ──────────────────────────────────
section("the base kit is IDENTICAL across all 12");
check("all share BASE_STATS", all.every(c => eq(c.stats, BASE_STATS)));
check("all share BASE_NORMALS (knife slashes)", all.every(c => eq(c.basic_attacks, BASE_NORMALS)));
check("all share the 3-stage knife string", all.every(c => eq(c.baseKit.knifeString, BASE_KNIFE_STRING)));
check("all share cloak-dash params", all.every(c => eq(c.baseKit.cloakDash, CLOAK_DASH)));
check("all share phone-taunt params", all.every(c => eq(c.baseKit.phoneTaunt, PHONE_TAUNT)));
// ART is now per-identity where a slice exists; the KIT (stats/normals/strings) stays identical.
const sliceless = all.filter(c => !c.identitySlice);
check("5 variants wired to identity art, 7 still neutral", all.filter(c => c.identitySlice).length === 5 && sliceless.length === 7);
check("the 7 slice-less variants still share ONE neutral animationData", sliceless.every(c => eq(c.animationData, sliceless[0].animationData)));
check("factory deep-clones (no aliasing between variants)", built.ghostface_billy.stats !== built.ghostface_stu.stats && built.ghostface_billy.animationData !== built.ghostface_stu.animationData);
check("knife string: stage3 launches, opener chains to stage2", BASE_KNIFE_STRING.gfvSlash3.launcher === true && BASE_KNIFE_STRING.gfvSlash1.rekkaNext === "gfvSlash2");
check("grab is the shared generic resolver", GRAB_CONTRACT.shared === true && GRAB_CONTRACT.resolver === "resolveGrab");

// ── ART: neutral base (slice-less) + Billy's real identity slice ──────────────
section("art — neutral base + Billy on the REAL Billy-identity slice");
const sheets = [...new Set(Object.values(sliceless[0].animationData).map(a => a && a.sheet).filter(Boolean))];
check("slice-less variants use the neutral ghostface_*_uniform base", sheets.every(s => /ghostface_.*_uniform\.png$/.test(s)));
for (const s of sheets) {
  const f = path.join(ROOT, s.replace(/^\.\//, ""));
  check(`neutral sheet exists: ${s.split("/").pop()}`, fs.existsSync(f) && fs.statSync(f).size > 0);
}
check("7 variants remain on placeholder (neutral base)", all.filter(c => c.placeholderArt).length === 7, `${all.filter(c => c.placeholderArt).length}`);
// all 5 identity-sliced variants: every declared sheet + portrait is a real __slice file on disk
const SLICED = [["ghostface_billy", "billy"], ["ghostface_mrs", "debbie"], ["ghostface_roman", "roman"], ["ghostface_jill", "jill"], ["ghostface_amber", "amber"]];
for (const [key, slice] of SLICED) {
  const c = built[key];
  const cs = [...new Set(Object.values(c.animationData).map(a => a && a.sheet).filter(Boolean))];
  const allSlice = cs.every(s => s.endsWith(`_uniform__${slice}.png`));
  const allExist = cs.every(s => fs.existsSync(path.join(ROOT, s.replace(/^\.\//, ""))));
  const portraitOK = c.portrait.endsWith(`_portrait__${slice}.png`) && fs.existsSync(path.join(ROOT, c.portrait.replace(/^\.\//, "")));
  check(`${key} → all sheets are __${slice} slices + exist on disk`, allSlice && allExist && c.placeholderArt === false, allSlice ? "" : cs[0]);
  check(`${key} portrait is the __${slice} bust`, portraitOK);
  check(`${key} KEEPS the shared kit (only ART changed)`, eq(c.stats, BASE_STATS) && eq(c.basic_attacks, BASE_NORMALS));
}
check("Mrs. maps to the canon 'debbie' identity", IDENTITY_SLICES.mrs === "debbie");

// ── KILLER AFFILIATION TINTS — all 12 (recolor targets) ─────────────────────────
section("killer tints — canon 5 reused exactly + 7 new, all distinct");
check("all 12 killers have a tint", GHOSTFACE_VARIANT_KEYS.every(k => /^#[0-9A-Fa-f]{6}$/.test(KILLER_TINT[k] || "")));
check("canon 5 reuse the original GF_IDENTITY_COLOR values EXACTLY",
  KILLER_TINT.ghostface_billy === "#6E1520" && KILLER_TINT.ghostface_mrs === "#3E2A66" &&
  KILLER_TINT.ghostface_roman === "#5A4622" && KILLER_TINT.ghostface_jill === "#701E50" && KILLER_TINT.ghostface_amber === "#1C5A30");
check("7 NEW tints assigned (Stu/Mickey/Charlie/Richie/Ethan/Quinn/Wayne)",
  ["stu", "mickey", "charlie", "richie", "ethan", "quinn", "wayne"].every(k => !!KILLER_TINT["ghostface_" + k]));
check("all 12 tints are mutually DISTINCT (no collisions)", new Set(Object.values(KILLER_TINT)).size === 12);
check("killerTint() resolves per variant + factory stamps identityTint", killerTint("ghostface_quinn") === "#8A6E1C" && built.ghostface_quinn.identityTint === "#8A6E1C");
check("slice-less variants still carry a tint (for future recolor)", sliceless.every(c => /^#[0-9A-Fa-f]{6}$/.test(c.identityTint || "")));

// ── HONEST STUBS — undesigned/blocked content is flagged, not fabricated ───────
section("per-variant special / ultimate / companions are honest stubs");
const nonBilly = all.filter(c => c.rosterKey !== "ghostface_billy");
check("11/12 SPECIALS still NEEDS_DESIGN (Billy = the worked example)", nonBilly.every(c => c.special.status === "NEEDS_DESIGN" && c.special.name && c.special.effect));
check("11/12 ULTIMATES still NEEDS_DESIGN (Billy implemented)", nonBilly.every(c => c.ultimate.status === "NEEDS_DESIGN"));
check("proposal-bearing ults keep the doc's proposal text", built.ghostface_billy.ultimate.proposed?.includes("counter window") && built.ghostface_roman.ultimate.proposed?.includes("multiple traps"));
check("companion input scheme is RESOLVED (item #3)", all.every(c => c.companions.inputScheme === "resolved"));
check("recognition wired to BOTH trigger types", all.every(c => eq(c.companions.triggerTypes, ["reposition_swap", "attack_swap"])));
check("status = COMPANIONS_READY (all 3 named slots resolve)", all.every(c => c.companions.status === "COMPANIONS_READY"));
check("no blockers remain (items #1/#2 owner-locked)", all.every(c => c.companions.blockers.length === 0));
check("slot 4 reserved BY DESIGN (item#1 = 3 final)", all.every(c => c.companions.slot4Policy === "reserved_3_final" && c.companions.motions[3].reserved === true));
check("item#2 locked → Jill+Amber slot = sukuna (full/original)", built.ghostface_jill.companions.list[1] === "sukuna" && built.ghostface_amber.companions.list[2] === "sukuna");
check("companion lists carry the doc's names", eq(built.ghostface_wayne.companions.list, ["pain", "onoki", "hiruzen", "TBD"]));
check("Roman keeps the cracked-mask identity note", /cracked mask/.test(built.ghostface_roman.costumeNote));

// ── COMPANION-SELECTION MOTIONS (item #3 resolved) ─────────────────────────────
section("companion-selection motions — 4 distinct inputs, identical across all 12");
check("4 companion motions, slots 0-3, companions 1-4", COMPANION_MOTIONS.length === 4
  && eq(COMPANION_MOTIONS.map(m => m.slot), [0, 1, 2, 3])
  && eq(COMPANION_MOTIONS.map(m => m.companion), [1, 2, 3, 4]));
check("scheme = D,B / D,B,F / D / D,F", eq(COMPANION_MOTIONS.map(m => m.motion), [["D","B"], ["D","B","F"], ["D"], ["D","F"]]));
check("slot 3 (Companion 4) is RESERVED (item #1)", COMPANION_MOTIONS[3].reserved === true && !COMPANION_MOTIONS[0].reserved);
// resolver: each motion → its slot
check("D,B → Companion 1 (slot 0)", companionSlotFromMotion(["D", "B"]) === 0);
check("D,B,F → Companion 2 (slot 1)", companionSlotFromMotion(["D", "B", "F"]) === 1);
check("D → Companion 3 (slot 2)", companionSlotFromMotion(["D"]) === 2);
check("D,F → Companion 4 (slot 3)", companionSlotFromMotion(["D", "F"]) === 3);
// strict-tail collision guards — the whole point of the scheme
check("D,B,F is NOT shadowed by D,B or D,F", companionSlotFromMotion(["U", "D", "B", "F"]) === 1);
check("noisy prefix ignored (strict tail on D,B)", companionSlotFromMotion(["F", "U", "D", "B"]) === 0);
check("bare D only when nothing longer matches", companionSlotFromMotion(["B", "D"]) === 2 && companionSlotFromMotion(["D", "F"]) === 3);
check("non-matching buffer → null", companionSlotFromMotion(["F", "F"]) === null && companionSlotFromMotion([]) === null);
check("includeReserved:false drops slot 3 (if item #1 = 3 companions)", companionSlotFromMotion(["D", "F"], { includeReserved: false }) === null && companionSlotFromMotion(["D", "B"], { includeReserved: false }) === 0);
// identical across all 12 + names paired to slots
check("every variant exposes the same 4 motions", all.every(c => eq(c.companions.motions.map(m => m.motion), COMPANION_MOTIONS.map(m => m.motion))));
check("companion NAMES paired to slots (Billy slot0=light, slot2=naoya)", built.ghostface_billy.companions.motions[0].name === "light" && built.ghostface_billy.companions.motions[2].name === "naoya");
check("reserved slot-3 name is the TBD placeholder", all.every(c => c.companions.motions[3].reserved === true));

// ── FACTORY shape ──────────────────────────────────────────────────────────────
section("factory produces a valid character-def shape");
const sample = makeGhostfaceVariantCharacter(GHOSTFACE_VARIANT_ROSTER[0]);
for (const field of ["rosterKey", "name", "universe", "stats", "basic_attacks", "animationData", "hasSprites", "spriteScale", "traits"]) {
  check(`has field: ${field}`, sample[field] !== undefined);
}
check("energyType dread (shared chassis)", sample.traits.energyType === "dread");
let threw = false; try { makeGhostfaceVariantCharacter({}) } catch (_) { threw = true; }
check("factory rejects a config without rosterKey", threw);

// ── COMPANION INVOCATION — recognition wired to BOTH trigger types ─────────────
section("companion invocation — same motion recognition drives both trigger types");
check("two trigger types defined", COMPANION_TRIGGER.reposition_swap && COMPANION_TRIGGER.attack_swap);
check("only attack_swap carries a phantom strike", COMPANION_TRIGGER.attack_swap.phantom === true && COMPANION_TRIGGER.reposition_swap.phantom === false);
// resolution: same motion → same slot for both types; modifier picks the type
{
  const atk = resolveCompanionInvocation(["D", "B"], {});                 // no grab → attack_swap
  const rep = resolveCompanionInvocation(["D", "B"], { grab: true });      // grab → reposition_swap
  check("motion D,B → slot 0 for BOTH types", atk.slot === 0 && rep.slot === 0);
  check("no-grab → attack_swap · grab → reposition_swap", atk.triggerType === "attack_swap" && rep.triggerType === "reposition_swap");
  check("D,B,F resolves slot 1 under both", resolveCompanionInvocation(["D","B","F"], {}).slot === 1 && resolveCompanionInvocation(["D","B","F"], { grab: true }).slot === 1);
  check("no motion → null invocation", resolveCompanionInvocation(["F","F"], {}) === null);
}
// invoke deps: energy + phantom damage + a companion-summon HOOK (unbuilt → returns false)
function invokeDeps(over = {}) {
  return {
    spendEnergy: (f, amt) => { if ((f.energy || 0) < amt) return false; f.energy -= amt; return true; },
    getOpponent: (f, ctx) => ctx?.opp || null,
    applyDamage: (opp, dmg) => { opp.health = (opp.health ?? 1000) - dmg; },
    summonCompanion: () => false,   // companions unbuilt (item #5) → hook is a no-op
    shakeCamera: () => {},
    ...over,
  };
}
function gfvFighter(extra = {}) {
  return { rosterKey: "ghostface_billy", facing: 1, x: 100, y: 0, w: 60, h: 100, energy: 100, attacking: false, currentMove: null, attackCooldown: 0, invulnTimer: 0, vx: 0, ...extra };
}
// attack_swap: dash + phantom strike, then emerge → summon hook
{
  const deps = invokeDeps();
  const f = gfvFighter();
  const opp = { x: 130, y: 0, w: 60, h: 100, health: 1000, isBlocking: false, hitstun: 0 };
  const inv = resolveCompanionInvocation(["D", "B"], {});
  check("attack_swap fires + spends cost", fireCompanionInvocation(f, inv, {}, deps) === true && f.energy === 100 - COMPANION_TRIGGER.attack_swap.cost);
  check("attack_swap arms a phantom, no i-frames (hittable)", !!f._gfvInvoke.phantom && (f.invulnTimer || 0) === 0);
  // run the phantom delay out → strike lands on the in-range opponent
  let landed = false;
  for (let i = 0; i < COMPANION_PHANTOM.delay + 2; i++) { updateCompanionInvocation(f, { opp }, deps); if (f._gfvInvoke?.phantomLanded) landed = true; }
  check("phantom strike damages an in-range opponent", opp.health < 1000 && landed);
  // run the rest of the dash out → emerge, summon hook fires (unbuilt → pending flag)
  let done = null;
  for (let i = 0; i < COMPANION_TRIGGER.attack_swap.dashFrames + 2 && !done; i++) done = updateCompanionInvocation(f, { opp }, deps);
  check("emerge hands off to summonCompanion hook", done && done.done === true && done.summoned === false);
  check("unbuilt companion → _gfvPendingCompanion(slot 0), no fabricated swap", f._gfvPendingCompanion?.slot === 0 && f.rosterKey === "ghostface_billy");
}
// reposition_swap: NO phantom, still reaches emerge/hook
{
  const deps = invokeDeps();
  const f = gfvFighter();
  const opp = { x: 130, y: 0, w: 60, h: 100, health: 1000, isBlocking: false, hitstun: 0 };
  fireCompanionInvocation(f, resolveCompanionInvocation(["D", "B"], { grab: true }), {}, deps);
  check("reposition_swap arms NO phantom", f._gfvInvoke.phantom === null);
  let done = null;
  for (let i = 0; i < COMPANION_TRIGGER.reposition_swap.dashFrames + 2 && !done; i++) done = updateCompanionInvocation(f, { opp }, deps);
  check("reposition_swap deals no phantom damage", opp.health === 1000);
  check("reposition_swap still reaches emerge/hook", done && done.done === true);
}
// summonCompanion hook that SUCCEEDS (simulates a built companion) → no pending flag
{
  const deps = invokeDeps({ summonCompanion: () => true });
  const f = gfvFighter();
  fireCompanionInvocation(f, resolveCompanionInvocation(["D"], {}), {}, deps);
  let done = null;
  for (let i = 0; i < COMPANION_TRIGGER.attack_swap.dashFrames + 2 && !done; i++) done = updateCompanionInvocation(f, {}, deps);
  check("built-companion hook → summoned true, no pending flag", done.summoned === true && !f._gfvPendingCompanion);
}
// family gate + energy gate
check("original ghostface is IGNORED by the invocation trigger",
  fireCompanionInvocation(gfvFighter({ rosterKey: "ghostface" }), resolveCompanionInvocation(["D", "B"], {}), {}, invokeDeps()) === false);
check("no invocation when energy insufficient",
  fireCompanionInvocation(gfvFighter({ energy: 5 }), resolveCompanionInvocation(["D", "B"], {}), {}, invokeDeps()) === false);
check("no invocation while committed to a move",
  fireCompanionInvocation(gfvFighter({ attacking: true }), resolveCompanionInvocation(["D", "B"], {}), {}, invokeDeps()) === false);

// ── SUMMON HOOK — resolved against the REAL roster (characters.js) ─────────────
section("summonCompanion — bound to real, built companions (36/36 live)");
check("companionListFor reads the variant's list", eq(companionListFor("ghostface_billy"), ["light", "toji", "naoya", "TBD"]));
// slot resolution against the actual characters map
check("Billy slot0 → light (built)", resolveCompanionSummon("ghostface_billy", 0, characters).key === "light");
check("Roman slot2 → sasuke (Sasuke confirmed built)", resolveCompanionSummon("ghostface_roman", 2, characters).key === "sasuke" && !!characters.sasuke);
check("Billy slot1 → toji (Toji confirmed built)", resolveCompanionSummon("ghostface_billy", 1, characters).key === "toji" && !!characters.toji);
check("Wayne slot0 → pain (distinct from six_paths_pain)", resolveCompanionSummon("ghostface_wayne", 0, characters).key === "pain");
check("Jill slot2 → six_paths_pain (distinct from pain)", resolveCompanionSummon("ghostface_jill", 2, characters).key === "six_paths_pain" && !!characters.six_paths_pain && characters.six_paths_pain !== characters.pain);
check("reserved slot 3 → reason reserved_slot (item#1 = 3 final, by design)", resolveCompanionSummon("ghostface_billy", 3, characters).reason === "reserved_slot");
// item#2 LOCKED — Jill/Amber Sukuna slot now resolves to sukuna (full/original)
check("Jill Sukuna slot → sukuna (locked)", resolveCompanionSummon("ghostface_jill", 1, characters).key === "sukuna");
check("Amber Sukuna slot → sukuna (locked)", resolveCompanionSummon("ghostface_amber", 2, characters).key === "sukuna");
// defensive: not_built path still guards (a name absent from the characters map)
check("not_built path guards a missing key", resolveCompanionSummon("ghostface_billy", 0, { toji: {}, naoya: {} }).reason === "not_built");
// end-to-end: real hook swaps a built companion through the invocation state machine
{
  const swapped = [];
  const deps = invokeDeps({ summonCompanion: makeSummonCompanion(characters, (f, key) => { swapped.push(key); return true; }) });
  const f = gfvFighter({ rosterKey: "ghostface_roman" });
  fireCompanionInvocation(f, resolveCompanionInvocation(["D"], {}), {}, deps);   // slot 2 → sasuke
  let done = null;
  for (let i = 0; i < COMPANION_TRIGGER.attack_swap.dashFrames + 2 && !done; i++) done = updateCompanionInvocation(f, {}, deps);
  check("attack_swap emerge → real companion swapped (sasuke)", done.summoned === true && eq(swapped, ["sasuke"]) && !f._gfvPendingCompanion);
  check("hook stamps the resolution result", f._gfvCompanionResult?.ok === true && f._gfvCompanionResult.key === "sasuke");
}
// end-to-end: reserved slot 4 defers cleanly (no companion by design, no fabricated swap)
{
  const swapped = [];
  const deps = invokeDeps({ summonCompanion: makeSummonCompanion(characters, (f, key) => { swapped.push(key); return true; }) });
  const f = gfvFighter({ rosterKey: "ghostface_jill" });
  fireCompanionInvocation(f, resolveCompanionInvocation(["D", "F"], {}), {}, deps);   // slot 3 → reserved (TBD)
  let done = null;
  for (let i = 0; i < COMPANION_TRIGGER.attack_swap.dashFrames + 2 && !done; i++) done = updateCompanionInvocation(f, {}, deps);
  check("reserved slot-4 defers (no swap, pending flag)", done.summoned === false && swapped.length === 0 && f._gfvPendingCompanion?.slot === 3);
  check("defer reason recorded = reserved_slot", f._gfvCompanionResult?.reason === "reserved_slot");
}
// coverage — ID RESOLUTION (registration-level, NOT a playability claim)
{
  const rep = companionCoverageReport(characters);
  const live = rep.reduce((n, v) => n + v.live.length, 0);
  const amb = rep.reduce((n, v) => n + v.ambiguous, 0);
  const nb = rep.reduce((n, v) => n + v.notBuilt.length, 0);
  check("36/36 named IDs RESOLVE to a registered character (items #1/#2 locked)", live === 36, `resolve=${live}`);
  check("0 ambiguous (Sukuna locked to sukuna)", amb === 0, `ambiguous=${amb}`);
  check("0 named companions unregistered", nb === 0, `notBuilt=${nb}`);
}
// completeness — the STRONGER claim: is each companion a sprite-playable full-arsenal kit?
// (specials are dispatch-based in abilities.js, so we DON'T gate on the specials field.)
section("companion KIT completeness — honest gaps flagged, not hidden");
{
  const slotKeys = [...new Set(all.flatMap(c => c.companions.list.slice(0, 3)))];
  const playable = k => { const c = characters[k], ad = c.animationData || {}, ba = c.basic_attacks || {};
    return !!c.hasSprites && !!ad.idle && !!ba.light && !!ba.heavy && !!(c.ultimate && (c.ultimate.name || c.ultimate.description)); };
  const bad = slotKeys.filter(k => !playable(k));
  const thin = slotKeys.filter(k => Object.keys(characters[k].basic_attacks || {}).length < 3);
  check("36 slots → 35 UNIQUE chars (sukuna fills Jill+Amber both)", slotKeys.length === 35, `unique=${slotKeys.length}`);
  check("frieza REMOVED (was the only sprite-less companion)", !slotKeys.includes("frieza"));
  check("Quinn slot2 is now gojo (sprite-complete replacement)", built.ghostface_quinn.companions.list[2] === "gojo" && !!characters.gojo?.hasSprites);
  check("35/35 unique companions now sprite-playable (no box-render gap)", slotKeys.filter(playable).length === 35 && bad.length === 0, `bad=${bad.join(",")}`);
  check("THIN flagged (minor, no action): light has only 2 normals", eq(thin, ["light"]));
}
// REAL-ENGINE proof — the swap actually FIRES through applyGhostfaceSwap (not a stub),
// including previously-"empty"-slot companions (Mrs.→isshiki, Roman→obito, Jill→sukuna).
section("REAL swap engine fires — fighter genuinely BECOMES the companion");
for (const [variant, slot, dirs, expect] of [
  ["ghostface_mrs",   2, ["D"],           "isshiki"],   // Mrs. Loomis slot 2 (doc's "empty" slot)
  ["ghostface_roman", 0, ["D", "B"],      "obito"],     // Roman slot 0 (doc's "empty" slot)
  ["ghostface_jill",  1, ["D", "B", "F"], "sukuna"],    // Jill slot 1 (item#2 locked)
]) {
  const swaps = [];
  const deps = invokeDeps({ summonCompanion: makeSummonCompanion(characters, (f, key, ctx) => { swaps.push(key); return applyGhostfaceSwap(f, key, ctx); }) });
  const f = gfvFighter({ rosterKey: variant, name: "GF", basic_attacks: {}, animationData: {}, energy: 100 });
  fireCompanionInvocation(f, resolveCompanionInvocation(dirs, {}), {}, deps);
  let done = null;
  for (let i = 0; i < COMPANION_TRIGGER.attack_swap.dashFrames + 2 && !done; i++) done = updateCompanionInvocation(f, {}, deps);
  check(`${variant} slot${slot} → REAL swap into ${expect}`,
    done?.summoned === true && f.rosterKey === expect && f.name === characters[expect].name,
    `rosterKey=${f.rosterKey} name=${f.name}`);
  check(`  └ fighter inherited ${expect}'s actual arsenal (normals+anim)`,
    Object.keys(f.basic_attacks).length >= 4 && Object.keys(f.animationData).length >= 5,
    `normals=${Object.keys(f.basic_attacks).length} anim=${Object.keys(f.animationData).length}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MECHANICS — state-machine behavior with stub deps (mirrors the live helpers).
// ═══════════════════════════════════════════════════════════════════════════════
function stubDeps(overrides = {}) {
  return {
    createAttack: (f, key, md) => ({ move: key, md, hasHit: false }),
    setAttackState: (f, attack, frames) => { f.attacking = true; f.currentAttack = attack; f.currentMove = attack.move; f.attackTimer = frames; },
    spendEnergy: (f, amt) => { if ((f.energy || 0) < amt) return false; f.energy -= amt; return true; },
    shakeCamera: () => {},
    getPhase: (f) => f._phase || null,
    ...overrides,
  };
}
function newFighter(extra = {}) {
  return { rosterKey: "ghostface_billy", facing: 1, grounded: true, onGround: true, energy: 100, attacking: false, currentMove: null, attackCooldown: 0, invulnTimer: 0, vx: 0, ...extra };
}

section("mechanics A — knife-string rekka (Forward+Heavy opener, cancel-on-hit)");
{
  const deps = stubDeps();
  const f = newFighter();
  // neutral heavy alone should NOT open (needs forward)
  updateVariantKnifeString(f, { heavy: true, right: false }, {}, deps);
  check("neutral Heavy does NOT open the string", f.currentMove !== "gfvSlash1", `move=${f.currentMove}`);
  // Forward+Heavy from neutral → stage 1
  const f2 = newFighter();
  const opened = updateVariantKnifeString(f2, { heavy: true, right: true }, {}, deps);
  check("Forward+Heavy opens gfvSlash1", opened && f2.currentMove === "gfvSlash1");
  check("opener arms rekkaNext=gfvSlash2 + step-in glide", f2._rekkaNext === "gfvSlash2" && f2.vx > 0);
  // in recovery, NO clean hit yet → must NOT continue
  f2._phase = "recovery"; f2._cmdPrevHeavy = false;
  updateVariantKnifeString(f2, { heavy: true }, {}, deps);
  check("no continue without a clean hit (blocked/whiff gate)", f2.currentMove === "gfvSlash1");
  // clean hit lands → fresh Heavy in recovery continues to stage 2
  f2._cmdHitLanded = true; f2._cmdPrevHeavy = false;
  updateVariantKnifeString(f2, { heavy: true }, {}, deps);
  check("clean hit + fresh Heavy → continues to gfvSlash2", f2.currentMove === "gfvSlash2");
  check("stage 2 re-arms rekkaNext=gfvSlash3 and resets hit latch", f2._rekkaNext === "gfvSlash3" && f2._cmdHitLanded === false);
  // advance to stage 3 (the launcher), which has NO rekkaNext
  f2._phase = "recovery"; f2._cmdHitLanded = true; f2._cmdPrevHeavy = false;
  updateVariantKnifeString(f2, { heavy: true }, {}, deps);
  check("continues to launcher gfvSlash3", f2.currentMove === "gfvSlash3" && f2._rekkaNext === null);
  // a non-variant fighter is ignored entirely
  const g = newFighter({ rosterKey: "ghostface" });
  updateVariantKnifeString(g, { heavy: true, right: true }, {}, deps);
  check("original ghostface is IGNORED by the variant driver", g.currentMove === null);
}

section("mechanics B — phone-taunt mixup (cancel-into-attack window)");
{
  const deps = stubDeps();
  const f = newFighter();
  check("phone-taunt starts (no attack state)", fireVariantPhoneTaunt(f, {}, deps) && f.currentMove === "gfvPhoneTaunt" && f.attacking === false);
  // before the window: attack press does NOT cancel
  let r = updateVariantPhoneTaunt(f, { light: true }, {}, deps);   // t=0, below cancelStart
  check("attack BEFORE window → no cancel", r.cancel === false && r.active === true);
  // advance to inside the window
  f._ptPrevLight = false;
  for (let i = f._phoneTaunt.t; i < PHONE_TAUNT.cancelStart; i++) updateVariantPhoneTaunt(f, {}, {}, deps);
  r = updateVariantPhoneTaunt(f, { light: true }, {}, deps);
  check("attack INSIDE window → cancels into a normal", r.cancel === true && f._phoneTaunt === null && f.currentMove === null);
  // left alone, the taunt fully expires on its own
  const f2 = newFighter(); fireVariantPhoneTaunt(f2, {}, deps);
  for (let i = 0; i < PHONE_TAUNT.total + 2; i++) updateVariantPhoneTaunt(f2, {}, {}, deps);
  check("uncanceled taunt expires cleanly", f2._phoneTaunt === null && f2.currentMove === null);
}

section("mechanics C — cloak-dash (evasive i-frame reposition)");
{
  const deps = stubDeps();
  const f = newFighter({ energy: 100 });
  const ok = fireVariantCloakDash(f, "back", {}, deps);
  check("back cloak-dash fires + grants i-frames", ok && f.invulnTimer >= CLOAK_DASH.iframes);
  check("back dash retreats (vx opposes facing)", f.vx < 0, `vx=${f.vx}`);
  check("spends dash energy", f.energy === 100 - CLOAK_DASH.cost);
  const f2 = newFighter({ energy: 100 });
  fireVariantCloakDash(f2, "forward", {}, deps);
  check("forward dash advances (vx with facing)", f2.vx > 0);
  const broke = newFighter({ energy: 5 });
  check("no dash when energy insufficient", fireVariantCloakDash(broke, "back", {}, deps) === false && broke.invulnTimer === 0);
  const busy = newFighter({ attacking: true });
  check("no dash while already attacking", fireVariantCloakDash(busy, "back", {}, deps) === false);
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKED EXAMPLE — BILLY GHOSTFACE: a real Special + Ultimate on the template.
// ═══════════════════════════════════════════════════════════════════════════════
function billyDeps(over = {}) {
  return {
    spendEnergy: (f, amt) => { if ((f.energy || 0) < amt) return false; f.energy -= amt; return true; },
    getOpponent: (f, ctx) => ctx?.opp || null,
    applyDamage: (opp, dmg) => { opp.health = (opp.health ?? 1000) - dmg; },
    shakeCamera: () => {},
    ...over,
  };
}
function billyFighter(extra = {}) {
  return { rosterKey: "ghostface_billy", facing: 1, energy: 100, attacking: false, currentMove: null, attackCooldown: 0, invulnTimer: 0, ...extra };
}
// advance a driver until it returns a terminal object (or a cap), feeding `ctx` each frame
function runUntil(fighter, driver, ctx, deps, cap = 80) {
  for (let i = 0; i < cap; i++) { const r = driver(fighter, ctx, deps); if (r && (r.done || r.landed || r.whiffed || r.riposted)) return r; }
  return null;
}

section("Billy — roster: Special + Ultimate now IMPLEMENTED (not stubs)");
check("Billy Special IMPLEMENTED (Delayed Counter-Stab)", built.ghostface_billy.special.status === "IMPLEMENTED" && built.ghostface_billy.special.name === "Delayed Counter-Stab");
check("Billy Ultimate IMPLEMENTED (The Last Reveal)", built.ghostface_billy.ultimate.status === "IMPLEMENTED" && built.ghostface_billy.ultimate.name === "The Last Reveal");
check("template still holds: Billy KEEPS the full shared base kit", eq(built.ghostface_billy.basic_attacks, BASE_NORMALS) && eq(built.ghostface_billy.baseKit.knifeString, BASE_KNIFE_STRING));
check("the OTHER 11 variants remain NEEDS_DESIGN (Billy-only)", all.filter(c => c.rosterKey !== "ghostface_billy").every(c => c.special.status === "NEEDS_DESIGN"));
check("isBillyGhostface gates to Billy only", isBillyGhostface("ghostface_billy") === true && isBillyGhostface("ghostface_stu") === false && isBillyGhostface("ghostface") === false);

section("Billy Special — Delayed Counter-Stab (read → negate → bleeding riposte)");
{
  // successful read: an incoming strike during the active window is negated + riposted
  const deps = billyDeps();
  const f = billyFighter();
  const opp = { health: 1000, isBlocking: false, hitstun: 0, eliminated: false };
  check("counter fires + spends energy", fireBillyCounter(f, {}, deps) === true && f.energy === 100 - BILLY_COUNTER.cost);
  // step through startup into the active window with NO incoming → no counter yet
  for (let i = 0; i < BILLY_COUNTER.startup + 1; i++) updateBillyCounter(f, { opp }, deps);
  // now feed an incoming strike → read is taken
  const readFrame = updateBillyCounter(f, { opp, incoming: { willHit: true } }, deps);
  check("struck read → countered + hit NEGATED", readFrame.countered === true && f._counterNegate === true);
  // resolve the delayed riposte
  const rip = runUntil(f, updateBillyCounter, { opp }, deps);
  check("delayed riposte lands damage", rip.riposted === true && opp.health < 1000, `hp=${opp.health}`);
  check("riposte applies the knife BLEED DoT", !!opp._dot && opp._dot.dmg === 6);
  check("counter state cleared after riposte", f._billyCounter == null);
}
{
  // whiff: no incoming during the window → recovery, no damage
  const deps = billyDeps();
  const f = billyFighter();
  const opp = { health: 1000 };
  fireBillyCounter(f, {}, deps);
  const end = runUntil(f, updateBillyCounter, { opp }, deps);
  check("no read → whiff (recovery, no damage)", end.countered === false && opp.health === 1000 && f._billyCounter == null);
}
check("Stu cannot fire Billy's counter (per-variant gate)", fireBillyCounter(billyFighter({ rosterKey: "ghostface_stu" }), {}, billyDeps()) === false);
check("no counter when energy insufficient", fireBillyCounter(billyFighter({ energy: 5 }), {}, billyDeps()) === false);

section("Billy Ultimate — The Last Reveal (extended read → guaranteed 198-EFF combo)");
check("combo maths to EXACTLY 198 EFF (330 raw ×0.60)", billyUltEff() === 198, `eff=${billyUltEff()}`);
{
  // successful read → guaranteed combo route + freeze
  const deps = billyDeps();
  const f = billyFighter();
  const opp = { health: 1000, eliminated: false };
  check("ult fires + spends 100", fireBillyUltimate(f, {}, deps) === true && f.energy === 0);
  for (let i = 0; i < BILLY_ULT.startup + 1; i++) updateBillyUltimate(f, { opp }, deps);
  const land = runUntil(f, updateBillyUltimate, { opp, incoming: { willHit: true } }, deps);
  check("read within extended window → combo LANDS 198 EFF", land.landed === true && land.eff === 198);
  check("combo dealt exactly 198 + froze the opponent", opp.health === 1000 - 198 && opp.frozen === true);
}
{
  // whiff: no read in the extended window → ult consumed, nothing happens
  const deps = billyDeps();
  const f = billyFighter();
  const opp = { health: 1000 };
  fireBillyUltimate(f, {}, deps);
  const end = runUntil(f, updateBillyUltimate, { opp }, deps, 120);
  check("no read → ult WHIFFS (spent, no damage) — all-or-nothing", end.whiffed === true && opp.health === 1000 && f.energy === 0);
}
check("extended window is longer than the special's", BILLY_ULT.window > BILLY_COUNTER.window);

console.log(`\n${FAIL === 0 ? "✅" : "❌"} Ghostface Variant Kit (base-kit template): ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL ? 1 : 0);
