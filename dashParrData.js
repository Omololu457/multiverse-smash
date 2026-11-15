// Dash Parr (The Incredibles) — data only: stats, frame data, registration.
// Logic: dashParrState.js (sim) · dashParr.js (command layer) · dashParrFx.js (render-only) · dashParrSound.js (audio).
// rosterKey is `dash_parr`: "dash" is a movement term across input.js / physics.js / game.js (double-tap dash,
// dashTimer, _dashTap), so a bare `dash` id would collide with that vocabulary.
import {DASH_PARR_ANIM} from './dashParrSprites.js'

export const DASH_PARR_KEY='dash_parr'
// Damage authoring: the brief's numbers are the HP a fresh, unscaled hit removes. The shared melee path multiplies
// by GLOBAL_DAMAGE_SCALE (0.60), so authored = brief / 0.60 → a fresh Jab removes exactly 14 HP.
export const DASH_PARR_DAMAGE_SCALE=1/0.6
const dmg=v=>Math.ceil(v*DASH_PARR_DAMAGE_SCALE-1e-9)   // ceil: floor(raw×0.6) in combat.js lands exactly on the brief value

// MOMENTUM (unique mechanic) — all values in sim frames / gauge points. State lives on f._dashParr (GAME_STATE).
// Movement stats = Killua Zoldyck's (`killua`): speed 95, dash 19/10/34 (owner request 2026-11-15).
export const DASH_STATS={speed:97,dashSpeed:22,dashDuration:10,dashCooldownMax:34}
export const MOMENTUM={max:100,runFill:1.5,hitGain:6,lapsGain:20,stillFrames:30,sprintAt:50,blurAt:100,
 speedMul:{jog:1,sprint:1.1,blur:1.2},startupBonus:{sprint:1},runMinSpeed:4.5}
// Energy ("Super Speed"): 4/s passive, +4 per damaging hit landed, +3 per damaging hit taken.
export const DASH_ENERGY={regenPerFrame:4/60,onHit:4,onTaken:3}
// Combo scaling: 85% per combo STEP (a multi-hit special counts as one step), engine's 90f combo timer resets it.
export const DASH_COMBO_SCALE=0.85
// Defense
export const SIDESTEP={iStart:2,iEnd:10,cooldown:240,behindRange:150,awayPx:110}
export const PANIC_RUN={cost:40,minHitsTaken:3,invuln:24,distance:190}
// FLASH TIME (Back + Special, grounded toggle): the foe runs at ~1/3 speed (the engine's shared per-opponent
// time-slow, same numbers as The Flash) while Dash moves normally. Needs 90 Super Speed to start, drains 0.22/frame
// (no passive regen while on), ends at 0 energy or on a second Back + Special. Dash cannot block while it's on.
export const FLASH_TIME={threshold:90,drain:0.22,oppSlow:0.34}
export const CANT_CATCH_ME=0.7
// Ultimate: 3 s storm, 12 hits = 200 HP unscaled (8×17 + 4×16), 90f recovery lockout.
export const INCREDI_RUSH={cost:100,startup:10,storm:180,hits:12,damage:[17,17,16,17,17,16,17,17,16,17,17,16],recovery:90,range:340}

// onBlock = frame advantage when the FIRST active frame is blocked (dashParrBlock sets blockstun = attacker's
// remaining frames + onBlock, so it holds for any hit frame). hitTicks = elapsed ticks that (re)arm a hit.
const n=(damage,startup,active,recovery,onBlock,extra={})=>({damage:dmg(extra.per??damage),briefDamage:damage,startup,active,recovery,onBlock,frameExact:true,damageType:'blunt',
 category:'light',hitstun:18,rangeX:52,rangeY:56,boxY:20,knockbackX:2,knockbackY:0,...extra})
export const DASH_PARR_MOVES={
 // NORMALS (brief: startup / dmg / on-block)
 jab:n(14,4,2,8,+1,{hitstun:16,rangeX:50,sprintFast:true}),
 heavy:n(40,10,3,18,-4,{category:'heavy',hitstun:26,rangeX:62,knockbackX:4,sprintFast:true,travel:[2,10,3]}),
 low:n(20,6,3,14,-3,{hitLevel:'low',hitstun:20,rangeX:66,rangeY:26,boxY:62,travel:[3,9,5]}),
 launcher:n(38,10,3,22,-8,{category:'launcher',launcher:true,launchVy:-26,selfVy:0,hitstun:30,rangeX:50,rangeY:96,boxY:-30}),
 air:n(24,6,4,12,+2,{hitstun:24,rangeX:58,rangeY:60,boxY:16,knockbackY:-3,air:true}),
 // SPECIALS
 flurry:n(56,8,29,14,-6,{category:'special',isSpecial:true,cost:15,per:7,hitTicks:[8,12,16,20,24,28,32,36],chainHitstop:3,hitstun:16,rangeX:56,knockbackX:0.6,airOk:true}),
 blurDash:n(44,6,10,20,-10,{category:'special',isSpecial:true,cost:10,hitstun:28,rangeX:44,rangeY:70,boxY:12,knockbackX:3,dashPx:400,phase:true}),
 laps:n(64,6,32,14,-8,{category:'special',isSpecial:true,cost:20,per:16,hitTicks:[6,14,22,30],chainHitstop:5,hitstun:20,lapRange:260,knockbackX:0,phase:true,momentumGain:20}),
 hydro:n(36,10,24,16,-8,{category:'special',isSpecial:true,cost:12,hitLevel:'low',hitstun:26,rangeX:60,rangeY:30,boxY:62,knockbackX:5,skimPx:300,lowProfile:[10,30]}),
 // ULTIMATE (sim timeline owned by dashParrState.js; this entry exists so startMove gives it a timer)
 rush:{damage:0,briefDamage:200,startup:INCREDI_RUSH.startup,active:INCREDI_RUSH.storm,recovery:INCREDI_RUSH.recovery,onBlock:0,frameExact:true,category:'ultimate',
  isUltimate:true,cost:INCREDI_RUSH.cost,noBody:true,rangeX:1,rangeY:1,hitstun:1},
 // DEFENSE
 sidestep:{damage:0,startup:1,active:12,recovery:6,onBlock:0,frameExact:true,category:'light',noBody:true,rangeX:1,rangeY:1,hitstun:1},
 panic:{damage:0,startup:1,active:16,recovery:4,onBlock:0,frameExact:true,category:'light',noBody:true,rangeX:1,rangeY:1,hitstun:1},
}
export const SPECIAL_KEYS=['flurry','blurDash','laps','hydro']

// Frame timelines: which strip frame shows at which elapsed tick (render only).
const timeline={jab:[[0,0],[4,1]],heavy:[[0,0],[10,1]],low:[[0,0],[6,1]],up:[[0,0],[10,1]],air:[[0,0],[6,1]],
 blurDash:[[0,0],[6,1],[11,2],[16,3]],hydro:[[0,0],[10,1],[18,2],[26,3],[34,4]],sidestep:[[0,0],[10,1]],panic:[[0,0],[8,1]]}
const A=DASH_PARR_ANIM
const anim={...A,jab:A.light,up:A.up,launcher:A.up,rush:A.ultimate,down_air:A.air,grab:A.light}

export const dash_parr={rosterKey:DASH_PARR_KEY,name:'Dash',displayName:'Dash',civilianIdentity:'Dashiell "Dash" Parr',
 universe:'the_incredibles',series:'The Incredibles (Pixar)',color:'#d81038',difficulty:4,
 tagline:'Ready, set, already gone.',archetype:'Speedster / Rushdown',
 bio:"The Parrs' hyperactive son and the fastest kid alive, Dash spent years being told to hold back so nobody would notice. Now the suit is on and he is finally allowed to run as fast as he wants.",
 primary:'rushdown',secondary:['speedster'],archetypes:['rushdown','speedster'],
 traits:{hasEnergy:true,energyType:'energy',energyName:'Super Speed',mobility:'high',scaling:'combo',animeMovement:false},
 energyConfig:{label:'Super Speed',color:'#ffd21f'},
 // Stats = Killua Zoldyck's (owner request): HP 1030, energy 180, atk 84, def 78, speed 95, jump 33, 2 jumps, dash 19.
 // spriteScale 2.5/1.18: sprite.js multiplies by GLOBAL_SPRITE_SCALE (1.18) → a ×2.5 render (~70% of Violet, ~80% of Elastigirl,
 // kid-sized vs the adults). jumpPower 33 (Killua; was 25 from the brief).
 stats:{maxHealth:1100,maxEnergy:180,attack:84,defense:78,jumpPower:33,maxJumps:2,...DASH_STATS},
 hasSprites:true,spriteScale:2.5/1.18,spriteSheet:anim.idle.sheet,portrait:'./assets/dash_parr/portrait.png',movement:{crouchIdle:true},fatalityVictimArt:false,
 basic_attacks:{light:DASH_PARR_MOVES.jab,heavy:DASH_PARR_MOVES.heavy,crouchLight:DASH_PARR_MOVES.low,upAttack:DASH_PARR_MOVES.launcher,airAttack:DASH_PARR_MOVES.air,downAir:DASH_PARR_MOVES.air,
  grab:{damage:dmg(18),startup:6,active:3,recovery:22,hitstun:20,throwForceX:6,throwForceY:-3,damageType:'grab'}},
 specials:{motion:{name:'Flurry (↓↘→ + Special)',cost:15},forward:{name:'Blur Dash (→→ + Special)',cost:10},down:{name:'Laps (↓↓ + Special)',cost:20},back:{name:'Hydroplane (←↙↓ + Special)',cost:12},
  flashTime:{name:'Flash Time (← + Special)',cost:0,description:'Toggle (needs 90 Super Speed): the opponent runs at ~1/3 speed while Dash moves normally. Drains 0.22/frame, no regen, no blocking; press again or run dry to end.'}},
 ultimate:{name:'INCREDI-RUSH',cost:100,description:'↓↘→↓↘→ + Special (or Ultimate): a 3-second blur storm of 12 hits from every side, 200 damage unscaled, then a 90-frame recovery.'},
 animationData:Object.fromEntries(Object.entries(anim).map(([k,a])=>[k,timeline[k]?{...a,frameTimeline:timeline[k]}:a]))}
