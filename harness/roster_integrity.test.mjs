// harness/roster_integrity.test.mjs — proves the load-path duplicate-character guard works.
// The guard itself lives in characters.js and RUNS ON IMPORT (standard load path, not opt-in):
// importing the module below would THROW if the working tree had a duplicate declaration.
// This test additionally proves the guard fires on synthetic duplicates. Usage: node harness/roster_integrity.test.mjs
let fail = 0; const ok = (c,m)=>{ console.log(`  ${c?"✅":"❌"} ${m}`); if(!c) fail++; };

// 1) IMPORT = the standard load path. If characters.js has a duplicate, THIS LINE throws.
let characters, characterList, assertNoDuplicateCharacters;
try {
  ({ characters, characterList, assertNoDuplicateCharacters } = await import("../characters.js"));
  ok(true, "characters.js imported cleanly — load-path guard PASSED (no duplicate in the working tree)");
} catch (e) {
  ok(false, `characters.js FAILED to load — ${e.message.split("\n")[0]}`);
  console.log("\n❌ working tree is CORRUPT (duplicate declaration). Guard/parse blocked the load.");
  process.exit(1);
}

// 2) Report the current frieza state directly (the reported corruption).
const friezaEntries = Object.entries(characters).filter(([k,v]) => v && v.rosterKey === "frieza");
ok(friezaEntries.length === 1, `exactly ONE frieza declaration present (found ${friezaEntries.length}: ${friezaEntries.map(([k])=>k).join(", ") || "none"})`);
console.log(`  roster size: ${characterList.length}`);

// 3) Prove the guard FIRES LOUDLY on a duplicate rosterKey (the silent-corruption mode).
const dupRosterKey = { ...characters, __dupFrieza: { rosterKey: "frieza", name: "Frieza (dup)" } };
let threw = false, msg = "";
try { assertNoDuplicateCharacters(dupRosterKey); } catch (e) { threw = true; msg = e.message; }
ok(threw, "guard THROWS on a duplicate rosterKey (does not warn-and-continue)");
ok(threw && /DUPLICATE CHARACTER DECLARATION/.test(msg), "guard error message names the failure clearly");
if (threw) console.log("     ↳ " + msg.split("\n").slice(0,2).join("  "));

// 4) Prove it fires when the SAME object is exported under two keys.
const anyChar = characterList[0];
threw = false;
try { assertNoDuplicateCharacters({ a: anyChar, b: anyChar }); } catch { threw = true; }
ok(threw, "guard THROWS when one character object is exported under two keys");

console.log(fail ? `\n❌ ${fail} check(s) failed` : "\n✅ roster integrity guard verified");
process.exit(fail ? 1 : 0);
