# Krybot

Playable as **Power Rangers → Krybot** in the existing game. ID `krybot`; Power Rangers S.P.D.; Troobian Empire; Infantry / Ranged Pressure. “One unit. A larger problem.”

900 HP, 100 maximum Energy, ordinary 50 starting Energy, speed 80 (5px/f baseline walk), jump power 26, one jump, ordinary dash. No added armor, HP regeneration, immunity, transformation, voice pack, or alternate skins. The standard Energy recharge and shared defensive systems still apply.

## Controls

Names below mean the current configured actions, including controller bindings. Forward/back are relative to facing at the press. A fresh press requires release and another press; holding a button never completes a string.

| Input | Action |
|---|---|
| Light → fresh Light → fresh Light | Servo Jab → Follow-up Strike → Driving Kick |
| Heavy | Piston Kick; marks on an unblocked hit |
| Down + Light or Heavy | Ankle Strike (low) |
| Up + Heavy / dedicated Up-Attack | Rising Intercept; release Up, then jump manually to pursue |
| Air Light / Heavy / Air Down + Special | Aerial Boot; the same attack, no extra special |
| Forward + Heavy → fresh Heavy → fresh Heavy | Advancing Strike → Kick → Knock-away |
| Up + final Heavy after a confirmed command kick | Launcher branch |
| Neutral + Special | Arm Blaster: 12 Energy |
| Forward + Special | Breach Step: 15 Energy |
| Ground Down + Special | Leap Intercept: 18 Energy |
| Back + Special | Covering Unit: 25 Energy; 480f cooldown |
| Ultimate | Troobian Crossfire: 100 Energy |

Clean-hit recovery cancels allow J1→J2→J3, J1→Heavy, normal→allowed directional special, and verified Heavy→Ultimate. The command chain uses `combat.rekkaContinue`, including its clean-hit recovery gate. Whiff and block do not continue it. Launcher pursuit uses the shared manual jump-cancel and air-hit limit. The local input buffer is eight unfrozen simulation frames; its held-input history is also recorded during hitstop.

## Allied support and counterplay

Covering Unit is a scoped, serializable character entity with one HP. The generic summons currently provide rushing/periodic-contact behaviors, not this interruptible one-shot gunner. It is therefore kept in `fighter._krybot.helper`, never inserted as a fake fighter. Its real bolt uses the existing projectile collision/damage/lifetime pipeline.

It appears behind the owner at the 24f call beat, enters for eight ticks, visibly aims for ten, fires once at age 18, starts exiting after age 45, and disappears at age 70. The shot expires by helper age 70 too. One active call or its outstanding bolt blocks another call, independently of the 480f cooldown. Stage bounds constrain entry and exit. Enemy melee and live projectile hitboxes destroy it; it does not consume those attacks or block bodies. No chase, grabs, recursive calls or resource rewards.

Heavy and the command knock-away create one target-specific mark for exactly 60 simulation updates, including owner hitstop. Refresh replaces it rather than stacking. A covering bolt consumes a live mark for **+2 horizontal pushback only**. The close Heavy→Cover route leaves an escape window: it is pressure, and the opponent can jump, block, move away or destroy the gunner. At longer spacing the mark can expire before the bolt arrives.

Breach advances at most 120px and is −25f on ordinary block. Leap has no armor, moves at most 120px, makes one contact, cannot reset jumps, and forces 18f landing recovery. Arm Blaster has one active owner shot, a 5px collision radius and 52f lifetime at 9px/f (468px travel). There is no piercing or explosion attached to it.

## Troobian Crossfire

The 30f opening blaster must hit unblocked. Miss and block only produce the opening bolt and the authored 60f recovery; no allies or capture. Crossfire contacts deal zero damage on block; ordinary Arm/Cover bolts retain shared chip. Ultimate commit clears ordinary covering support and all outstanding Krybot bolts.

On confirmation, two supplied-art allies stand at bounded positions on the same floor, 160px to each side of the initial impact. They fire ordinary finite bolts at sequence ages 8 and 18. The supplied explosion plays at ages 30–41; its single 100-raw contact begins with the largest visible cell at age 36. Raw contacts are 30 + 35 + 35 + 100. Shared damage/combo scaling remains in force. The target is never teleported, rooted or made globally hittable; the shots and the local 36px blast must intersect it. Shared breakers and defenses remain available.

The owner stays committed; a long-range confirm extends the remaining animation only enough to finish the sequence. Interruption clears unspent cinematic bolts/participants immediately, including during hitstop. KO, round/reset, rematch and identity invalidation clear owned state. There is no custom camera controller: the existing bounded combat/ultimate camera remains responsible.

## Art and interpretation

Extraction preserves the supplied file byte-for-byte. See [SPRITE_LEDGER.md](SPRITE_LEDGER.md), [source_rects.json](source_rects.json), [contact_sheet.png](contact_sheet.png), and [MOVE_FRAME_MAP.md](MOVE_FRAME_MAP.md). No generated artwork or fabricated limbs are used. Punches, kick, raised-arm jump, guard, recoil, tumble and fall art are distinct from the five effect cells and credit panel.

The low, launcher, airborne kick and recovery are authored gameplay interpretations of limited poses. The source does not supply a bespoke ankle-kick sequence, uppercut sequence, or complete rise animation. Ankle Strike reuses the supplied kick with a low gameplay box; Rising Intercept uses the visibly raised-arm jump pose. Get-up is an authored transition from a supplied fall pose through guard to idle. These are documented adaptations, not claims about the original game's animations.

Ripper credit: **The FRANKETE** (sheet text), uploader **Franketepoke2**. The in-game credit registry includes both. The WANTED illustration is excluded from body animations and the portrait comes from the robot body, not the credit panel. [Source listing](https://www.spriters-resource.com/plug_play/powerrangersspdescapeofthefivefugitives/asset/560349/) corroborates uploader, dimensions and format.

## Canon versus game design

[Power Rangers Central](https://www.rangercentral.com/database/2005_spd/villains.php) distinguishes ordinary robotic Troobian infantry from the smarter Bluehead and powerful Orangehead variants. [Wikipedia's S.P.D. character overview](https://en.wikipedia.org/wiki/List_of_Power_Rangers_S.P.D._characters) supplies series/faction context. The supplied sheet itself supports punching, kicking, arm aim, jumping/tumbling and destruction effects. The requested Fandom lead was attempted but unavailable to the research tool.

Move names, costs, damage, Coordinated Fire, the playable squad-leader role and Troobian Crossfire are original gameplay adaptations of group infantry deployment. They do not establish that every ordinary Krybot commands troops. No Bluehead command authority, Orangehead sword/shockwave, Ranger morph, Dragon Flute, Falconzord or Ranger-only shared ultimate was imported.

## Run and verify

Use the existing launch setup (`npm run serve`, `npm run dev` or the existing desktop launcher); nothing in server configuration was changed. Automated normal-launch evidence uses `PORT=8013 npm run serve` and the actual menus. The harness query only enables observation/fixtures; the visual test does not use character-selection or match-start shortcuts. KO screenshots use a controlled 1-HP/stunned opponent and an actual jab to exercise round/victory/rematch flow.

```
/opt/anaconda3/bin/python3 tools/krybot/extract.py  # Python with Pillow
node harness/krybot.test.mjs
node harness/krybot_routes.mjs
node harness/krybot_lifecycle.mjs
node harness/krybot_determinism.mjs
node harness/krybot_ai.mjs
node harness/krybot_render.mjs
node harness/krybot_visual.mjs                   # existing server on port 8013
```

See [BALANCE.md](BALANCE.md) for timings/damage/escape measurements and [VERIFICATION.md](VERIFICATION.md) for outcomes and limitations. No commits, pushes, branch operations, external publishing, generated skins or unrelated asset edits were made by Codex.
