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

const n=(damage,startup,active,recovery,extra={})=>({damage,startup,active,recovery,frameExact:true,damageType:'blunt',category:'light',hitstun:20,blockstun:12,rangeX:60,rangeY:46,knockbackX:2,knockbackY:0,...extra})
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
}
export const SPD_GREEN_LANDING={rise:16,heel:24}

// Frame timelines: which strip frame shows at which tick (0-based elapsed).
const timeline={light:[[0,0],[4,1]],gJ2:[[0,0],[5,1]],gJ3:[[0,0],[8,1]],heavy:[[0,0],[12,1]],up:[[0,0],[11,1]],air:[[0,0],[7,1]],
 gChain:[[0,0],[10,1]],gAway:[[0,0],[12,1]],gScan:[[0,0],[12,1],[36,0]],gShot:[[0,0],[10,1],[14,2]],
 gAcro:[[0,0],[13,1]],gAcro2:[[0,2]],gFollow:[[0,0],[5,1]],gRise:[[0,0],[8,1]],gRetreat:[[0,0],[8,1],[12,2]]}
const anim={...SPD_GREEN_ANIM,gAcro2:SPD_GREEN_ANIM.gAcro}

export const spd_green={rosterKey:'spd_green',name:'S.P.D. Green Ranger',civilianIdentity:'Bridge Carson',universe:'power_rangers',series:'Power Rangers S.P.D.',
 tagline:'I had a feeling.',archetype:'Acrobatic Read / Counterpressure',
 bio:'Bridge Carson: B-Squad Green, an unorthodox thinker and mechanic with a psychic sense for auras. Aura Read and the ground phase step are deliberate gameplay adaptations (no mind reading). Shared Zord ultimate pending integration.',
 primary:'balanced',secondary:['rushdown'],archetypes:['balanced','rushdown'],
 traits:{hasEnergy:true,energyType:'energy',energyName:'Energy',mobility:'normal',scaling:'combo',animeMovement:false},energyConfig:{label:'Energy',color:'#2fd36b'},
 stats:{maxHealth:980,maxEnergy:100,attack:80,defense:78,speed:92,jumpPower:26,maxJumps:1,weight:1,dashSpeed:14,dashDuration:10,dashCooldownMax:36},
 hasSprites:true,spriteScale:2.2/1.18,spriteSheet:anim.idle.sheet,portrait:'./assets/spd_green/portrait.png',movement:{crouchIdle:true},fatalityVictimArt:false,
 basic_attacks:{light:SPD_GREEN_MOVES.light,heavy:SPD_GREEN_MOVES.heavy,crouchLight:SPD_GREEN_MOVES.gLow,upAttack:SPD_GREEN_MOVES.up,airAttack:SPD_GREEN_MOVES.air,downAir:SPD_GREEN_MOVES.down_air,
  grab:{damage:26,startup:8,active:3,recovery:24,hitstun:20,throwForceX:5,throwForceY:-3,damageType:'grab'}},
 specials:{neutral:{name:'Deltamax Check',cost:12},forward:{name:'Acrobat Step',cost:18},down:{name:'Rising Arc',cost:18},back:{name:'Read and Retreat',cost:12},airDown:{name:'Heel Return',cost:15},charge:{name:'Aura Read',cost:0}},
 ultimate:{name:'Zord Assault — awaiting shared integration',cost:100,description:'Unavailable until the shared opt-in Ranger Zord system exists. No meter is spent and there is no fallback ultimate.'},
 animationData:Object.fromEntries(Object.entries(anim).map(([k,a])=>[k,timeline[k]?{...a,frameTimeline:timeline[k]}:a]))}
