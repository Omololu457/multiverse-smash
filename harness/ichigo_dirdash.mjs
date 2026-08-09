// harness/ichigo_dirdash.mjs — UNIT test for Ichigo's 8-way aerial dash (physics.moveFighter).
// Exercises the real physics code path directly (no browser): an airborne fighter with
// traits.directionalDash, given a held direction + dash, should get velocity in THAT direction
// and a matching _dashDirIdx. A fighter WITHOUT the trait keeps the plain horizontal air-dash.
// Usage: node harness/ichigo_dirdash.mjs
import { physics } from "../physics.js";

const controls = { left: "L", right: "R", up: "U", down: "D", jump: "U", dash: "DASH" };
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { (cond ? (pass++) : (fail++)); console.log(`${cond ? "✓" : "✗"} ${name}${extra ? "  " + extra : ""}`); };

function mkFighter(directionalDash) {
  return {
    x: 400, y: 100, vx: 0, vy: 0, facing: 1,
    onGround: false, grounded: false,
    airDashCount: 0, airDashing: false, airDashTimer: 0,
    dashCooldown: 0, dashSpeed: 18, dashDuration: 11, dashCooldownMax: 34,
    // jumpHeld:true models "already airborne from a jump" so holding Up doesn't re-trigger a jump
    // (Up shares the jump key) — isolates the air-dash velocity for the assertion.
    stun: 0, hitstun: 0, blockstun: 0, jumpCount: 1, jumpHeld: true,
    maxJumps: 2, jumpForce: -22,
    stats: { mobility: "high" },
    traits: { directionalDash },
    externalForces: []
  };
}

// helper: one physics tick with the given held keys (+ dash)
function dash(fighter, held) {
  const keys = { DASH: true };
  for (const k of held) keys[k] = true;
  physics.moveFighter(fighter, keys, controls);
  return fighter;
}

// ── Ichigo (directionalDash: true) — each held direction maps to velocity + strip index ──
// strip order: 0 up · 1 down · 2 down-fwd · 3 up-fwd · 4 level-fwd · 5 back  (facing = +1/right)
{
  let f = dash(mkFighter(true), ["U"]);           // straight up
  ok("up: negative vy",        f.vy < 0 && Math.abs(f.vx) < 0.01, `vx=${f.vx.toFixed(1)} vy=${f.vy.toFixed(1)}`);
  ok("up: _dashDirIdx=0",      f._dashDirIdx === 0, `idx=${f._dashDirIdx}`);

  f = dash(mkFighter(true), ["D"]);               // straight down
  ok("down: positive vy",      f.vy > 0 && Math.abs(f.vx) < 0.01, `vx=${f.vx.toFixed(1)} vy=${f.vy.toFixed(1)}`);
  ok("down: _dashDirIdx=1",    f._dashDirIdx === 1, `idx=${f._dashDirIdx}`);

  f = dash(mkFighter(true), ["D", "R"]);          // down-forward (facing right)
  ok("down-fwd: +vx +vy",      f.vx > 0 && f.vy > 0, `vx=${f.vx.toFixed(1)} vy=${f.vy.toFixed(1)}`);
  ok("down-fwd: _dashDirIdx=2",f._dashDirIdx === 2, `idx=${f._dashDirIdx}`);
  ok("down-fwd: normalized",   Math.abs(Math.hypot(f.vx, f.vy) - 18 * 0.8) < 0.2, `speed=${Math.hypot(f.vx,f.vy).toFixed(2)} (expect ${(18*0.8).toFixed(2)})`);

  f = dash(mkFighter(true), ["U", "R"]);          // up-forward
  ok("up-fwd: +vx -vy",        f.vx > 0 && f.vy < 0, `vx=${f.vx.toFixed(1)} vy=${f.vy.toFixed(1)}`);
  ok("up-fwd: _dashDirIdx=3",  f._dashDirIdx === 3, `idx=${f._dashDirIdx}`);

  f = dash(mkFighter(true), ["R"]);               // level forward
  ok("level-fwd: +vx, vy=0",   f.vx > 0 && Math.abs(f.vy) < 0.01, `vx=${f.vx.toFixed(1)} vy=${f.vy.toFixed(1)}`);
  ok("level-fwd: _dashDirIdx=4",f._dashDirIdx === 4, `idx=${f._dashDirIdx}`);

  f = dash(mkFighter(true), ["L"]);               // back (facing right, pressing left)
  ok("back: -vx (retreat)",    f.vx < 0, `vx=${f.vx.toFixed(1)}`);
  ok("back: _dashDirIdx=5",    f._dashDirIdx === 5, `idx=${f._dashDirIdx}`);

  f = dash(mkFighter(true), []);                  // no direction → dash forward (facing)
  ok("no-dir: dashes forward", f.vx > 0 && Math.abs(f.vy) < 0.01, `vx=${f.vx.toFixed(1)} vy=${f.vy.toFixed(1)}`);
}

// ── Control: a fighter WITHOUT the trait keeps the plain horizontal air-dash (no _dashDirIdx) ──
// Hold Down (not Up — Up shares the jump key) so a held vertical input can't come from a jump.
{
  const f = dash(mkFighter(false), ["D"]);        // held down, but no directionalDash
  ok("no-trait: horizontal only", Math.abs(f.vy) < 0.01 && f.vx > 0, `vx=${f.vx.toFixed(1)} vy=${f.vy.toFixed(1)}`);
  ok("no-trait: no _dashDirIdx",  f._dashDirIdx == null, `idx=${f._dashDirIdx}`);
}

console.log(`\n${fail ? "❌" : "✅"} ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
