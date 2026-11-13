#!/usr/bin/env python3
"""Phase 2 core: register Green Arrow (characters.js), SPRITE_MANIFEST (spritesheets.js),
Tech energy label (ui.js), passive Tech regen (abilities.js). Idempotent-ish: refuses if
the marker already present. Operates on the live worktree files (verified == branch base)."""
import sys, io

def patch(path, anchor, insert, where="before", must_absent=None):
    s = io.open(path, encoding="utf-8").read()
    if must_absent and must_absent in s:
        print(f"  SKIP {path}: marker already present ({must_absent!r})"); return
    n = s.count(anchor)
    if n != 1:
        print(f"  !! {path}: anchor count {n} != 1 for {anchor!r}"); sys.exit(1)
    if where == "before":
        s = s.replace(anchor, insert + anchor)
    else:
        s = s.replace(anchor, anchor + insert)
    io.open(path, "w", encoding="utf-8").write(s)
    print(f"  patched {path}")

GREEN_ARROW = r'''// ─────────────────────────────────────────────────────────────────
// GREEN ARROW  (rosterKey "green_arrow", universe "dc") — OVERWATCH tech build
// (feat/green-arrow). Art re-sliced from the SNES Justice League Task Force sheet
// (white alpha-0 bg → alpha key; see docs/greenarrow/SPRITE_LEDGER.md). Oliver Queen
// is a fragile TECH ZONER / SUMMONER: a 920-HP archer whose quiver (plain + fire/ice/
// explosive/EMP trick arrows) is backed by deployable DRONES (drones.js, 6 types via
// Special+direction) funded by the TECH meter (energyType "tech"). No flight.
// spriteScale 1.8: idle content 61px × 1.8 ≈ 110px (roster mid-band). anchorY 0 plants feet.
// ─────────────────────────────────────────────────────────────────
const greenArrow = {
  rosterKey: "green_arrow", name: "Green Arrow", displayName: "Green Arrow", universe: "dc", color: "#2e9e3a",
  portrait: "./green_arrow_portrait.png",
  tagline: "You have failed this city.",
  difficulty: 4,
  archetype: "Tech Zoner / Summoner",
  archetypes: ["zoner", "summoner"],
  primary: "zoner", secondary: ["summoner"],
  bio: "Oliver Queen. Billionaire, archer, and the man who came back from Lian Yu. Five years in hell taught him the bow; Star City taught him he needs a team. Now his quiver comes with air support.",
  traits: { hasEnergy: true, energyType: "tech", energyName: "Tech", mobility: "medium", scaling: "versatile", animeMovement: false },
  energyConfig: { label: "Tech", color: "#39d353" },
  passive: { name: "Overwatch Net", effect: "Tech regenerates +3/s passively, +4 per arrow hit and +2 per drone hit (combat income capped at +12/s). Below 15 Tech he is a pure 920-HP archer with no drones." },
  // Fragile tech zoner: 920 HP (low), speed 79 → walk ≈4.8 (physics maps 78→4.5…98→9.5), weight 0.95
  // (slightly light), modest jump. maxEnergy 100 = the Tech pool.
  stats: { maxHealth: 920, maxEnergy: 100, attack: 82, defense: 74, speed: 79, maxJumps: 2, jumpPower: 27, dashSpeed: 22, dashDuration: 11, dashCooldownMax: 24, weight: 0.95 },
  basic_attacks: {
    light:    { damage: 35, startup: 4, active: 3, recovery: 8,  hitstun: 13, knockbackX: 4,  knockbackY: 0 },
    heavy:    { damage: 65, startup: 9, active: 4, recovery: 16, hitstun: 20, knockbackX: 11, knockbackY: 2 },
    upAttack: { type: "launcher", damage: 85, startup: 12, active: 4, recovery: 16, hitstun: 22, knockbackX: 2, knockbackY: -12, launch: 14, launchVy: -32, selfVy: -9, airOK: false },
    airAttack:{ damage: 40, startup: 5, active: 3, recovery: 11, hitstun: 14, knockbackX: 5, knockbackY: -2 },
    downAir:  { damage: 50, startup: 6, active: 4, recovery: 13, hitstun: 16, knockbackX: 2, knockbackY: 11 },
    grab:     { damage: 28, startup: 6, active: 3, recovery: 14, hitstun: 18, throwForceX: 8, throwForceY: -3 }
  },
  specials: {
    plainShot:   { cost: 0,  damage: 45, effect: "Plain shot (↓↘→+L). Fast full-screen arrow; hold to charge up to 70 + piercing." },
    antiAirShot: { cost: 0,  damage: 45, effect: "Anti-air shot (↓↘→+M). Fires at 60°." },
    fireArrow:   { cost: 15, damage: 60, effect: "Fire arrow (↓↘→+H). +burn 3/20f for 2s." },
    iceArrow:    { cost: 20, damage: 40, effect: "Ice arrow (↓↙←+L). Freeze 0.7s. 7s cooldown." },
    explosiveArrow:{ cost: 25, damage: 80, effect: "Explosive arrow (↓↓+H). Lobbed arc, OTG, explosion." },
    empArrow:    { cost: 20, damage: 25, effect: "EMP arrow (↓↙←+H). Disables enemy summons/drones 3s; drains tech-tagged foes. 10s cd." },
    drones:      { cost: 20, damage: 0,  effect: "Drones (Special + direction): Overwatch / Bulwark / Aegis / Kestrel / Skyhook. Max 2 (3 in Super). Double-tap Special = recall." }
  },
  ultimate: { name: "Arrowstorm Protocol", cost: 100, description: "↓↘→↓↘→+Special. Every live drone fires at once, a Payload bomber carpet-bombs the screen, and Oliver closes with a 3-arrow explosive volley. ~380 if everything connects (300 base), then a 3s Tech lockout and all drones recalled." },
  hasSprites: true,
  spriteScale: 1.8,
  animationData: {
    idle:      { frames: 3, width: 61, height: 84, speed: 10, anchorY: 0, sheet: "./green_arrow_idle_uniform.png" },
    walk:      { frames: 6, width: 62, height: 85, speed: 6, anchorY: 0, sheet: "./green_arrow_walk_uniform.png" },
    run:       { frames: 6, width: 62, height: 85, speed: 4, anchorY: 0, sheet: "./green_arrow_walk_uniform.png" },
    dash:      { frames: 3, width: 80, height: 85, speed: 4, anchorY: 0, sheet: "./green_arrow_dash_uniform.png" },
    jump:      { frames: 3, width: 77, height: 95, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./green_arrow_jump_uniform.png" },
    fall:      { frames: 1, width: 77, height: 95, speed: 7, anchorY: 0, sheet: "./green_arrow_fall_uniform.png" },
    crouch:    { frames: 1, width: 58, height: 73, speed: 6, anchorY: 0, loop: true, sheet: "./green_arrow_crouch_uniform.png" },
    flip:      { frames: 4, width: 61, height: 65, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./green_arrow_flip_uniform.png" },
    hurt:      { frames: 2, width: 64, height: 90, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./green_arrow_hurt_uniform.png" },
    stagger:   { frames: 9, width: 82, height: 90, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./green_arrow_stagger_uniform.png" },
    knockdown: { frames: 7, width: 108, height: 72, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./green_arrow_knockdown_uniform.png" },
    block:     { frames: 1, width: 51, height: 92, speed: 6, anchorY: 0, loop: true, sheet: "./green_arrow_block_uniform.png" },
    guard:     { frames: 1, width: 51, height: 92, speed: 6, anchorY: 0, loop: true, sheet: "./green_arrow_guard_uniform.png" },
    light:     { frames: 2, width: 69, height: 92, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./green_arrow_light_uniform.png" },
    heavy:     { frames: 3, width: 79, height: 87, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./green_arrow_heavy_uniform.png" },
    up:        { frames: 3, width: 82, height: 83, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./green_arrow_up_uniform.png" },
    highkick:  { frames: 3, width: 77, height: 86, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./green_arrow_highkick_uniform.png" },
    crouchatk: { frames: 2, width: 74, height: 71, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./green_arrow_crouchatk_uniform.png" },
    lowarrow:  { frames: 4, width: 82, height: 65, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./green_arrow_lowarrow_uniform.png" },
    slide:     { frames: 2, width: 107, height: 57, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./green_arrow_slide_uniform.png" },
    rising:    { frames: 2, width: 95, height: 56, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./green_arrow_rising_uniform.png" },
    air:       { frames: 2, width: 77, height: 89, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./green_arrow_air_uniform.png" },
    bowslash:  { frames: 3, width: 124, height: 74, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./green_arrow_bowslash_uniform.png" },
    draw:      { frames: 7, width: 107, height: 112, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./green_arrow_draw_uniform.png" },
    aim:       { frames: 2, width: 107, height: 92, speed: 5, anchorY: 0, loop: true, sheet: "./green_arrow_aim_uniform.png" },
    antiair:   { frames: 4, width: 105, height: 109, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./green_arrow_antiair_uniform.png" },
    firecast:  { frames: 3, width: 107, height: 112, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./green_arrow_firecast_uniform.png" },
    icecast:   { frames: 3, width: 107, height: 112, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./green_arrow_icecast_uniform.png" },
    airdraw:   { frames: 4, width: 77, height: 91, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./green_arrow_airdraw_uniform.png" },
    dive:      { frames: 4, width: 48, height: 48, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./green_arrow_dive_uniform.png" },
    win:       { frames: 2, width: 59, height: 108, speed: 8, anchorY: 0, loop: true, sheet: "./green_arrow_win_uniform.png" },
    skyward:   { frames: 1, width: 68, height: 108, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./green_arrow_skyward_uniform.png" }
  }
}

'''

# 1) characters.js — insert the const before supermanDcuc, register in the roster object
patch("characters.js", "const supermanDcuc = {", GREEN_ARROW, where="before",
      must_absent="const greenArrow = {")
patch("characters.js", "  superman_fighter: supermanFighter,\n",
      "  green_arrow: greenArrow,\n", where="after", must_absent="green_arrow: greenArrow")

# 2) spritesheets.js — SPRITE_MANIFEST idle entry (gates spritesReady)
MANIFEST = '''  // Green Arrow (universe: dc) — gates spritesReady() by decoding the idle strip → flips from
  // procedural box to sprite. Per-action rendering reads characters.js → greenArrow.animationData.
  green_arrow: {
    actions: { idle: "./green_arrow_idle_uniform.png" }
  },

'''
patch("spritesheets.js", "  superman: {\n", MANIFEST, where="before",
      must_absent="green_arrow: {")

# 3) ui.js — Tech energy label
patch("ui.js", '  solar_energy:     "Solar Energy",',
      '  tech:             "Tech",                     // DC (Green Arrow) — the drone/trick-arrow meter\n',
      where="before", must_absent='  tech:             "Tech"')

# 4) abilities.js — passive Tech regen = 3/s (0.05/frame), like Soldier Boy
patch("abilities.js", '  if (key === "soldier_boy") regen = 0.05\n',
      '  // Green Arrow — Tech regen 3/s (0.05/f); in-combat hit income (+4 arrow / +2 drone, capped\n'
      '  // +12/s) is applied in combat.applyScaledDamage so drones cannot self-fund forever.\n'
      '  if (key === "green_arrow") regen = 0.05\n',
      where="after", must_absent='if (key === "green_arrow") regen = 0.05')

print("Phase 2 core applied.")
