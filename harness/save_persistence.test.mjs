// harness/save_persistence.test.mjs — GUEST-SAFE PERSISTENCE + force-quit/relaunch round-trip.
//
// Proves the real gap this feature closes: before, a player with NO named account kept progression /
// unlocks / personality in memory only (progression.js `if (!acct) return`), so it was lost on restart.
// Now ensureDefaultAccount() guarantees a local profile at boot, and every event-based save writes
// SYNCHRONOUSLY to localStorage — so a crash / force-quit (no clean exit) loses nothing.
//
// "Force-quit + relaunch" is modelled faithfully at the persistence layer: account.js hydrates from
// localStorage at MODULE INIT, so re-importing it with a fresh cache key = a brand-new app boot reading
// only what was already flushed to disk. No clean shutdown hook is involved (there isn't one to rely on).
import assert from "node:assert";

// ── a Map-backed localStorage shim, installed BEFORE account.js imports (it reads storage at init) ──
const _backing = new Map();
globalThis.localStorage = {
  getItem: k => (_backing.has(k) ? _backing.get(k) : null),
  setItem: (k, v) => { _backing.set(k, String(v)); },
  removeItem: k => { _backing.delete(k); },
  clear: () => { _backing.clear(); },
};
globalThis.window = globalThis.window || {};

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const boot = (n) => import(`../account.js?boot=${n}`);   // fresh module instance → re-hydrates from localStorage

try {
  // ── BOOT 1: a true guest (empty storage). ensureDefaultAccount must create + persist a profile. ──
  console.log("\n── boot 1: guest with empty storage ─────────────");
  const a1 = await boot(1);
  check("guest starts with NO current account", a1.getCurrentAccount() === null);
  const acct1 = a1.ensureDefaultAccount();
  check("ensureDefaultAccount() creates a default local profile", !!acct1 && acct1.username === a1.DEFAULT_USERNAME, acct1?.username);
  check("it is now the current account", a1.getCurrentAccount()?.accountId === acct1.accountId);
  check("it was written to localStorage immediately", !!_backing.get("multiverse-smash-save"));

  // Make PROGRESS the way the game does — mutate the account's own schema fields + persist (exactly what
  // progression.awardMatchXp / personality.recordGameplayEvent do under the hood).
  const acc = a1.getCurrentAccount();
  acc.progression = { xp: 640, matches: 5, wins: 3, level: a1.getCurrentAccount().progression.level || 4 };
  acc.unlocks = { devUnlock: false, betaUnlock: false, featuresUnlocked: [] };
  acc.personality = { tipiComplete: true, traits: { O: { mu: 0.7 }, C: { mu: 0.4 } }, events: [{ t: "aggressive_open" }, { t: "retry_after_loss" }] };
  acc.tower = { clearedTiers: { t3: true } };
  acc.stats = { wins: 3, losses: 2, matches: 5, favoriteCharacter: "goku" };
  a1.persistence.save(acc);
  check("progress saved (xp/personality/tower) — synchronous to localStorage", JSON.parse(_backing.get("multiverse-smash-save")).accounts.length === 1);

  const savedRaw = _backing.get("multiverse-smash-save");   // this is the "disk" state at the crash moment

  // ── FORCE-QUIT: drop every in-memory reference. No clean exit, no flush-on-quit. ──
  console.log("\n── force-quit (no clean exit) → relaunch ─────────────");
  check("localStorage still holds the save after the 'crash'", _backing.get("multiverse-smash-save") === savedRaw);

  // ── BOOT 2: brand-new module instance, same storage. Progress must be intact. ──
  const a2 = await boot(2);
  const restored = a2.getCurrentAccount();
  check("relaunch auto-restores the current account (no action needed)", !!restored, restored?.username);
  check("XP / level survived the force-quit", restored?.progression?.xp === 640 && restored?.progression?.matches === 5, JSON.stringify(restored?.progression));
  check("personality profile survived (O/C/E/A/N + events)", restored?.personality?.tipiComplete === true && restored?.personality?.events?.length === 2);
  check("tower clears survived", restored?.tower?.clearedTiers?.t3 === true);
  check("stats survived", restored?.stats?.favoriteCharacter === "goku");

  // ensureDefaultAccount on relaunch must ADOPT the restored profile, never duplicate it.
  const before = a2.listAccounts().length;
  const adopted = a2.ensureDefaultAccount();
  check("ensureDefaultAccount() adopts the restored profile (no duplicate)", a2.listAccounts().length === before && adopted.accountId === restored.accountId, `count=${a2.listAccounts().length}`);

  // ── BOOT 3: a named profile created on top must also round-trip and become the restored current. ──
  console.log("\n── named profile on top of the default ─────────────");
  const named = a2.createAccount("Omololu");
  named.progression = { xp: 100, matches: 1, wins: 1, level: 2 };
  a2.persistence.save(named);
  const a3 = await boot(3);
  check("named profile round-trips as the current account", a3.getCurrentAccount()?.username === "Omololu", a3.getCurrentAccount()?.username);
  check("both profiles persisted (default + named)", a3.listAccounts().length === 2, `count=${a3.listAccounts().length}`);
} catch (e) {
  console.error("FATAL", e); FAIL++;
}
console.log(`\n  SAVE-PERSISTENCE: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL ? 1 : 0);
