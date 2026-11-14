// S.P.D. Green Ranger — Bridge Carson. Data only (frame data, registration, opt-in configs).
// Logic: spdGreenState.js (sim) · spdGreen.js (command layer) · spdGreenFx.js (render-only).
import {SPD_GREEN_ANIM} from './spdGreenSprites.js'
import {registerGroundTeleport} from './groundTeleport.js'

// Double-tap teleport: SPD Blue's shared opt-in contract (groundTeleport.js). Defaults already match the
// brief: 12f window, release between taps, cost 8, cooldown 36, 3/2/8, 120px swept, legal-dash fallback.
export const SPD_GREEN_TELEPORT=registerGroundTeleport('spd_green',{})

// AURA READ — scan timings (sim frames). Data, read by spdGreenState.js.
export const AURA_READ={startup:12,scan:24,recovery:12,cooldown:240,range:350,markFrames:180,followWindow:10,followCost:5}

// Shared Ranger Zord ultimate — OPT-IN CONFIGURATION ONLY. No shared Zord system exists in this project
// (checked 2026-11-13: no module, no art wiring). Ultimate press is consumed, spends nothing, no fallback.
export const SPD_GREEN_ZORD={enabled:false,dependency:'shared Ranger Zord Assault (not present in project)',cost:100,rawTotal:240,
 requiresCleanOpening:true,callAction:'ultimate',callPose:'ultimate',presentation:{primary:'#21d063',glow:'#0b7a34'},
 crossoverAssist:'Falconzord — creative MMPR crossover assist (Sega Genesis MMPR: The Movie art is in the repo but NOT wired); not Delta Runner 3, not an SPD Megazord'}

// ROSTER-PARITY PASS (2026-11-13, owner request): this kit was authored on a much lower damage scale than the roster
// (light ≈17 vs roster median 42, heavy ≈56 vs 80). One per-character lever multiplies every authored damage value;
// frame data, ratios between moves and the shared 0.60 global scale are untouched.
export const SPD_GREEN_DAMAGE_SCALE=1.7
const dmg=v=>Math.round(v*SPD_GREEN_DAMAGE_SCALE)
const n=(damage,startup,active,recovery,extra={})=>({damage:dmg(damage),startup,active,recovery,frameExact:true,damageType:'blunt',category:'light',hitstun:20,blockstun:12,rangeX:60,rangeY:46,knockbackX:2,knockbackY:0,...extra})
export const SPD_GREEN_MOVES={
 // Jab chain (fresh retaps on clean contact only)
 light:n(17,5,2,10,{hitstun:16,blockstun:11}),
 gJ2:n(20,6,2,12,{hitstun:18,rangeX:66}),
 gJ3:n(28,9,3,18,{hitstun:24,rangeX:76,rangeY:60,boxY:6,knockbackX:5}),
 heavy:n(52,13,3,25,{category:'heavy',hitstun:34,blockstun:14,rangeX:80}),
 gLow:n(25,8,2,16,{hitLevel:'low',boxY:70,rangeY:30,rangeX:72,hitstun:22}),
 up:n(42,12,3,22,{category:'launcher',launcher:true,hitstun:30,rangeX:54,rangeY:104,boxY:-38,launchVy:-28,selfVy:0}),
 air:n(30,8,3,17,{hitstun:28,rangeX:76,rangeY:70,boxY:10,knockbackY:-3}),
 down_air:n(30,8,3,17,{hitstun:28,rangeX:76,rangeY:70,boxY:10,knockbackY:-3}),
 // Forward+Heavy command string: advancing kick → Deltamax check → knock-away (confirmed Up → launcher)
 gAdvance:n(24,10,3,19,{category:'heavy',rangeX:66,rangeY:44,boxY:34,hitstun:29,travel:[2,10,6]}),
 gChain:n(32,11,3,21,{category:'heavy',rangeX:70,hitstun:32}),
 gAway:n(44,13,3,26,{category:'heavy',rangeX:80,hitstun:30,knockbackX:7}),
 // Specials
 gScan:n(0,AURA_READ.startup,AURA_READ.scan,AURA_READ.recovery,{category:'special',isSpecial:true,noBody:true,scan:true}),
 gShot:n(36,15,1,24,{category:'special',isSpecial:true,cost:12,noBody:true,shot:true}),
 gAcro:n(20,14,3,4,{category:'special',isSpecial:true,cost:18,rangeX:62,rangeY:50,boxY:30,hitstun:26,travel:[2,17,70/15]}),
 gAcro2:n(28,4,3,20,{category:'special',isSpecial:true,rangeX:66,rangeY:56,boxY:20,hitstun:30,knockbackX:3,travel:[0,4,6]}),
 gFollow:n(20,6,3,20,{category:'heavy',rangeX:74,hitstun:26,knockbackX:5}),
 gRise:n(40,10,10,24,{category:'special',isSpecial:true,cost:18,rangeX:58,rangeY:110,boxY:-14,hitstun:28}),
 gRetreat:n(0,6,8,18,{category:'special',isSpecial:true,cost:12,noBody:true,retreat:90}),
 gHeel:n(44,12,40,1,{category:'special',isSpecial:true,cost:15,rangeX:52,rangeY:60,boxY:46,hitstun:28,knockbackY:-2,heel:true}),
 // ── VARIETY PASS (S.P.D. Red as the model: command normals, an air special, an Up special, a motion special) ──
 // Down+Heavy FLOOR SWEEP: slower heavy low that knocks down (Down+Light stays the quick 8f low).
 gSweep:n(38,11,3,24,{category:'heavy',hitLevel:'low',boxY:70,rangeY:30,rangeX:88,hitstun:30,blockstun:12,knockdown:true}),
 // Back+Heavy BACKWARD ROLL: free evade, 100px back, invulnerable frames 1-7, no hitbox, long 20f recovery.
 gEvade:n(0,1,14,20,{noBody:true,retreat:100,invuln:7}),
 // Air neutral Special AIR DELTAMAX: one downward-angled shot per airtime (the airAim0 cell), finite, non-piercing.
 gAirShot:n(30,10,1,16,{category:'special',isSpecial:true,cost:10,noBody:true,shot:true,airShot:true}),
 // Up+Special SOMERSAULT READ: crouch-to-handspring anti-air launcher. No invulnerability. Jump to follow up.
 gSomer:n(44,9,4,22,{category:'special',isSpecial:true,cost:15,launcher:true,launchVy:-26,rangeX:58,rangeY:120,boxY:-44,hitstun:30,blockstun:12}),
 // ↓↘→+Special READ RUSH: the second Aura Read payoff — only against YOUR marked opponent (consumes the mark):
 // lunge punch → kick → flying kick, committed (plays out on whiff/block), last hit knocks down. Unmarked → Acrobat Step.
 gRush1:n(18,9,2,3,{category:'special',isSpecial:true,cost:25,rangeX:64,hitstun:24,blockstun:12,travel:[1,9,4]}),
 gRush2:n(18,3,2,3,{category:'special',isSpecial:true,rangeX:70,hitstun:24,blockstun:12}),
 // ↓↙←+Special ARC KICK: crouch, then a flying arc kick that carries 120px across the active frames and knocks down.
 // Stops at the opponent's body (swept travel, no cross-through). No invulnerability; very punishable on block.
 gArc:n(46,14,10,22,{category:'special',isSpecial:true,cost:20,rangeX:70,rangeY:52,boxY:8,hitstun:30,blockstun:14,knockbackX:8,knockdown:true,travel:[14,24,12]}),
 // Forward+Light STEP-IN ELBOW: 32px advancing elbow, roughly even on block — Bridge's pressure poke; special-cancellable on contact.
 gToss:n(66,6,2,32,{category:'heavy',damageType:'grab',unblockable:true,rangeX:46,rangeY:44,boxY:40,hitstun:40,blockstun:0,knockbackX:6,knockdown:true}),   // VARIETY L8 ↓↙←+Heavy PHASE SUPLEX: command throw, knockdown
 gRead:n(0,4,16,22,{category:'special',isSpecial:true,cost:10,noBody:true,counter:[4,20,150],counterInto:'gReadStrike'}),   // VARIETY L7 Charge+Back PHASE READ: f4-19 reads a melee attack -> Read Strike; whiff = 22f recovery
 gReadStrike:n(50,2,4,22,{category:'special',isSpecial:true,rangeX:84,rangeY:60,hitstun:34,blockstun:14,knockbackX:3,knockbackY:-9,invuln:6}),   // VARIETY L7 counter strike: pops the foe up
 gRam:n(56,19,4,24,{category:'heavy',cost:20,armor:18,rangeX:66,rangeY:56,boxY:10,hitstun:30,blockstun:14,knockbackX:12,travel:[4,19,3.5]}),   // VARIETY L6 Charge+Forward PHASE RAM: armored f1-18, advances ~52px
 gSnap:n(26,10,3,16,{rangeX:72,rangeY:46,boxY:14,hitstun:22,blockstun:14,knockbackX:4,pull:[1,8,5]}),   // VARIETY L5 Back+Light PHASE SNAP KICK: steps ~35px back, then a long snap kick
 gElbow:n(30,9,3,14,{rangeX:64,rangeY:46,boxY:14,hitstun:24,blockstun:16,knockbackX:2,travel:[1,9,4]}),
 // air Heavy FLYING SIDE KICK: slower, bigger downward aerial (air Light keeps the 8f kick).
 gAirH:n(40,11,4,18,{category:'heavy',rangeX:84,rangeY:76,boxY:20,hitstun:30,knockbackX:6,knockbackY:4}),
 gRush3:n(26,4,3,24,{category:'special',isSpecial:true,rangeX:76,rangeY:56,boxY:20,hitstun:30,blockstun:12,knockbackX:7,knockdown:true,travel:[0,4,6]}),
}
export const SPD_GREEN_LANDING={rise:16,heel:24}

// Frame timelines: which strip frame shows at which tick (0-based elapsed).
const timeline={light:[[0,0],[4,1]],gElbow:[[0,0],[8,1]],gSnap:[[0,0],[9,1]],gRam:[[0,0],[18,1]],gToss:[[0,0],[5,1]],gRead:[[0,0]],gReadStrike:[[0,0],[1,1]],gJ2:[[0,0],[5,1]],gJ3:[[0,0],[8,1]],heavy:[[0,0],[12,1]],up:[[0,0],[11,1]],air:[[0,0],[7,1]],
 gChain:[[0,0],[10,1]],gAway:[[0,0],[12,1]],gScan:[[0,0],[12,1],[36,0]],gShot:[[0,0],[10,1],[14,2]],
 gAcro:[[0,0],[13,1]],gAcro2:[[0,2]],gFollow:[[0,0],[5,1]],gRise:[[0,0],[8,1]],gRetreat:[[0,0],[8,1],[12,2]],
 gSweep:[[0,0],[10,1]],gEvade:[[0,0],[10,1]],gSomer:[[0,0],[8,1]],gRush2:[[0,0],[2,1]],gArc:[[0,0],[10,1],[15,2],[20,3]]}
const anim={...SPD_GREEN_ANIM,gAcro2:SPD_GREEN_ANIM.gAcro,gElbow:SPD_GREEN_ANIM.gJ3,gSnap:SPD_GREEN_ANIM.gJ2,gRam:SPD_GREEN_ANIM.gRush3,gToss:SPD_GREEN_ANIM.heavy,gRead:SPD_GREEN_ANIM.gScan,gReadStrike:SPD_GREEN_ANIM.gRush3,gAirH:SPD_GREEN_ANIM.gRush3}

export const spd_green={rosterKey:'spd_green',name:'S.P.D. Green Ranger',civilianIdentity:'Bridge Carson',universe:'power_rangers',series:'Power Rangers S.P.D.',
 tagline:'I had a feeling.',archetype:'Acrobatic Read / Counterpressure',
 bio:'Bridge Carson: B-Squad Green, an unorthodox thinker and mechanic with a psychic sense for auras. Aura Read and the ground phase step are deliberate gameplay adaptations (no mind reading). Shared Zord ultimate pending integration.',
 primary:'balanced',secondary:['rushdown'],archetypes:['balanced','rushdown'],
 traits:{hasEnergy:true,energyType:'energy',energyName:'Energy',mobility:'normal',scaling:'combo',animeMovement:false},energyConfig:{label:'Energy',color:'#2fd36b'},
 stats:{maxHealth:1120,maxEnergy:100,attack:80,defense:78,speed:92,jumpPower:26,maxJumps:1,weight:1,dashSpeed:14,dashDuration:10,dashCooldownMax:36},
 hasSprites:true,spriteScale:2.2/1.18,spriteSheet:anim.idle.sheet,portrait:'./assets/spd_green/portrait.png',movement:{crouchIdle:true},fatalityVictimArt:false,
 basic_attacks:{light:SPD_GREEN_MOVES.light,heavy:SPD_GREEN_MOVES.heavy,crouchLight:SPD_GREEN_MOVES.gLow,upAttack:SPD_GREEN_MOVES.up,airAttack:SPD_GREEN_MOVES.air,downAir:SPD_GREEN_MOVES.down_air,
  grab:{damage:dmg(26),startup:8,active:3,recovery:24,hitstun:20,throwForceX:5,throwForceY:-3,damageType:'grab'}},
 specials:{neutral:{name:'Deltamax Check',cost:12},forward:{name:'Acrobat Step',cost:18},down:{name:'Rising Arc',cost:18},back:{name:'Read and Retreat',cost:12},up:{name:'Somersault Read',cost:15},airNeutral:{name:'Air Deltamax',cost:10},airDown:{name:'Heel Return',cost:15},motion:{name:'Read Rush (↓↘→, marked foe)',cost:25},motionBack:{name:'Arc Kick (↓↙←)',cost:20},charge:{name:'Aura Read',cost:0}},
 ultimate:{name:'Zord Assault — awaiting shared integration',cost:100,description:'Unavailable until the shared opt-in Ranger Zord system exists. No meter is spent and there is no fallback ultimate.'},
 animationData:Object.fromEntries(Object.entries(anim).map(([k,a])=>[k,timeline[k]?{...a,frameTimeline:timeline[k]}:a]))}
