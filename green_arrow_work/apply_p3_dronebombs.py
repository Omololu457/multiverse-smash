#!/usr/bin/env python3
"""PASS3 P3 — drones use the bombs. Converts drone drops to munitions. Run on worktree + base2."""
import io, sys

EDITS = [
    # Bulwark Bodyguard → MORTAR (high arc, clears walls/Aegis), longer cd
    ('    if (Math.abs((opp.x || 0) - (o.x || 0)) < GA_SCR_W * 0.20 && d.data.fireT >= 45) {',
     '    if (Math.abs((opp.x || 0) - (o.x || 0)) < GA_SCR_W * 0.20 && d.data.fireT >= 80) {'),
    ('      _gaDroneShot(o, d._ctx, { type: "gaBulwarkMissile", damage: 18, vx: dir * 11, spawnX: d.x, spawnY: d.y - 6, w: 20, h: 10, lifetime: Math.round(GA_SCR_W * 0.22 / 11), knockbackX: dir * 3, color: "#ff7a3c", sheet: "./ga_payload_bombs_sheet.png", spriteFrames: 2 })',
     '      spawnMunition(o, "dumb", { x: d.x, y: d.y - 10, vx: dir * 7, vy: -9, damage: 35, blastRadius: 72, target: opp })   // MORTAR: lobbed high arc, clears walls / an Aegis in the way'),
    # Kestrel ESCORT → also a BOMBING RUN (drop a dumb bomb when over the foe)
    ('      _gaDroneShot(o, d._ctx, { type: "gaKestrelShot", damage: 8, vx: dir * 13, vy: 4, spawnX: d.x, spawnY: d.y, w: 14, h: 8, lifetime: 40, color: "#ffd166" })',
     '      _gaDroneShot(o, d._ctx, { type: "gaKestrelShot", damage: 8, vx: dir * 13, vy: 4, spawnX: d.x, spawnY: d.y, w: 14, h: 8, lifetime: 40, color: "#ffd166" })\n      if (opp && Math.abs((opp.x || 0) - d.x) < 90) spawnMunition(o, "dumb", { x: d.x, y: d.y + 10, vx: 0, vy: 5, damage: 10, blastRadius: 54, target: opp })   // BOMBING RUN: drop a bomb in its flight path'),
    # Skyhook TOW drop → also an AIRDROP bomb on the foe
    ('      else { opp._gaHooked = false; opp.vy = 10; applyScaledDamage(opp, 90, { source: "ability", attacker: o, move: "skyhookDrop" }); opp.isLaunched = true; opp.hitstun = Math.max(opp.hitstun || 0, 24); d._retiring = "expire" }',
     '      else { opp._gaHooked = false; opp.vy = 10; applyScaledDamage(opp, 90, { source: "ability", attacker: o, move: "skyhookDrop" }); opp.isLaunched = true; opp.hitstun = Math.max(opp.hitstun || 0, 24); spawnMunition(o, "dumb", { x: (opp.x || 0) + (opp.w || 60) / 2, y: (opp.y || 0) - 120, vy: 5, damage: 60, blastRadius: 70, target: opp }); d._retiring = "expire" }   // AIRDROP a bomb on the dropped foe'),
    # Swarm rammer → each scout drops a micro-bomb
    ('      applyScaledDamage(opp, 20, { source: "ability", attacker: o, move: "swarmRam" })',
     '      applyScaledDamage(opp, 20, { source: "ability", attacker: o, move: "swarmRam" })\n      spawnMunition(o, "dumb", { x: d.x, y: d.y, vy: 4, damage: 12, blastRadius: 40, scale: 0.4, target: opp })   // SWARM: each scout carries a micro-bomb'),
    # Carpet Run (Payload bomber outside the Super) → drops real DUMB munitions
    ('    _gaDroneShot(o, d._ctx, { type: "gaPayloadBomb", damage: d.bombDmg || 35, vx: d.facing * 2, vy: 7, spawnX: d.x, spawnY: d.y + 20, w: 16, h: 16, radius: 20, lifetime: 80, knockbackY: -6, color: "#ff6a2a", sheet: "./ga_payload_bombs_sheet.png", spriteFrames: 6, impact: "explosion" })',
     '    spawnMunition(o, "dumb", { x: d.x, y: d.y + 20, vx: d.facing * 2, vy: 7, damage: d.bombDmg || 35, blastRadius: 72, target: d.target })   // Carpet Run drops real bombs'),
]

def apply(path):
    s = io.open(path, encoding="utf-8").read()
    if "MORTAR: lobbed high arc" in s:
        print(f"  SKIP {path}"); return
    for a, n in EDITS:
        c = s.count(a)
        if c != 1:
            print(f"  !! {path}: anchor {c} != 1: {a[:60]!r}"); sys.exit(1)
        s = s.replace(a, n)
    io.open(path, "w", encoding="utf-8").write(s)
    print(f"  {path}: 6 drone-bomb edits applied")

for p in sys.argv[1:]:
    apply(p)
