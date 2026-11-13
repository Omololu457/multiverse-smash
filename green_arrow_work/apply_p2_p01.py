#!/usr/bin/env python3
"""PASS2 P0+P1 abilities.js edits — run on BOTH the worktree copy (for testing) and the clean
branch-tip base2 copy (for committing). Adds nativeFacing/faceMode to the 6 drone profiles and
spriteScale support so arrows (esp. the tiny 15x17 plain arrow) are visible."""
import io, sys

PROFILE_EDITS = [
    # (unique anchor line, appended)
    ('techCost: 20, hurtbox: { w: 54, h: 30 }, scale: 2.0, frontFacing: true,',
     'techCost: 20, hurtbox: { w: 54, h: 30 }, scale: 2.0, frontFacing: true, nativeFacing: "front",'),          # overwatch
    ('techCost: 25, hurtbox: { w: 46, h: 30 }, scale: 2.0, frontFacing: false,',
     'techCost: 25, hurtbox: { w: 46, h: 30 }, scale: 2.0, frontFacing: false, nativeFacing: "left", faceMode: "target",'),  # bulwark
    ('techCost: 20, hurtbox: { w: 52, h: 40 }, scale: 2.2, frontFacing: true,',
     'techCost: 20, hurtbox: { w: 52, h: 40 }, scale: 2.2, frontFacing: true, nativeFacing: "front",'),          # aegis
    ('techCost: 30, hurtbox: { w: 60, h: 24 }, scale: 2.2, frontFacing: false,',
     'techCost: 30, hurtbox: { w: 60, h: 24 }, scale: 2.2, frontFacing: false, nativeFacing: "left", faceMode: "target",'),  # kestrel
    ('techCost: 25, hurtbox: { w: 70, h: 46 }, scale: 1.9, frontFacing: true,',
     'techCost: 25, hurtbox: { w: 70, h: 46 }, scale: 1.9, frontFacing: true, nativeFacing: "front",'),          # skyhook
    ('techCost: 0, hurtbox: { w: 120, h: 40 }, scale: 2.2, frontFacing: false,',
     'techCost: 0, hurtbox: { w: 120, h: 40 }, scale: 2.2, frontFacing: false, nativeFacing: "left", faceMode: "travel",'),  # payload
]
ARROW_EDITS = [
    # spriteScale support in the shared arrow md
    ('    sheet: o.sheet || "./green_arrow_plainarrow.png", spriteFrames: o.spriteFrames || 1,',
     '    sheet: o.sheet || "./green_arrow_plainarrow.png", spriteFrames: o.spriteFrames || 1, spriteScale: o.spriteScale || 1,'),
    # plain shot: scale the tiny 15x17 arrow up so it is clearly visible
    ('    speed: 20, piercing: pierce, w: 18 + charge * 2, h: 8, sheet: "./green_arrow_plainarrow.png" })',
     '    speed: 20, piercing: pierce, w: 18 + charge * 2, h: 8, sheet: "./green_arrow_plainarrow.png", spriteScale: 2.6 })'),
    # anti-air shot (also uses the plain-arrow sheet)
    ('    vx: face * 12, vy: -16, w: 18, h: 8, lifetime: 90, sheet: "./green_arrow_plainarrow.png" })',
     '    vx: face * 12, vy: -16, w: 18, h: 8, lifetime: 90, sheet: "./green_arrow_plainarrow.png", spriteScale: 2.6 })'),
    # trick-shot fan
    ('      vx: face * 15, vy, w: 18, h: 8, lifetime: 80, sheet: "./green_arrow_plainarrow.png" })',
     '      vx: face * 15, vy, w: 18, h: 8, lifetime: 80, sheet: "./green_arrow_plainarrow.png", spriteScale: 2.3 })'),
]

def apply(path):
    s = io.open(path, encoding="utf-8").read()
    changed = 0
    for old, new in PROFILE_EDITS + ARROW_EDITS:
        if new in s:
            continue  # idempotent
        n = s.count(old)
        if n != 1:
            print(f"  !! {path}: anchor count {n} != 1: {old[:50]!r}"); sys.exit(1)
        s = s.replace(old, new); changed += 1
    io.open(path, "w", encoding="utf-8").write(s)
    print(f"  {path}: {changed} edits applied")

for p in sys.argv[1:]:
    apply(p)
