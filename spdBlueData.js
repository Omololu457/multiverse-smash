import {SPD_BLUE_ANIM} from './spdBlueSprites.js'
import {registerGroundTeleport} from './groundTeleport.js'
export const SPD_BLUE_TELEPORT=registerGroundTeleport('spd_blue',{})
// Configuration only: activate through the shared implementation once it exists.
export const SPD_BLUE_ZORD={enabled:false,dependency:'shared Ranger Zord Assault',cost:100,startup:30,rawTotal:240,requiresCleanOpening:true,callAction:'ultimate',crossoverAssist:'Falconzord (MMPR crossover, not Delta Runner 2)'}
// ROSTER-PARITY PASS (2026-11-13, owner request): this kit was authored on a much lower damage scale than the roster
// (light ≈17 vs roster median 42, heavy ≈56 vs 80). One per-character lever multiplies every authored damage value;
// frame data, ratios between moves and the shared 0.60 global scale are untouched.
export const SPD_BLUE_DAMAGE_SCALE=1.7
const dmg=v=>Math.round(v*SPD_BLUE_DAMAGE_SCALE)
const n=(damage,startup,active,recovery,extra={})=>({damage:dmg(damage),startup,active,recovery,frameExact:true,damageType:'blunt',category:'light',hitstun:20,blockstun:12,rangeX:60,rangeY:46,knockbackX:2,knockbackY:0,...extra})
export const SPD_BLUE_MOVES={
 light:n(18,5,2,10,{hitstun:16,blockstun:12}),bJ2:n(20,6,2,12,{hitstun:18,rangeX:70}),bJ3:n(30,10,3,18,{hitstun:25,rangeX:76,knockbackX:5}),
 heavy:n(56,14,3,25,{category:'heavy',hitstun:35,blockstun:14,rangeX:76,stepConfirm:true}),
 bLow:n(26,8,2,16,{hitLevel:'low',boxY:68,rangeY:32,rangeX:58,hitstun:22}),
 up:n(42,12,3,22,{category:'launcher',launcher:true,hitstun:30,rangeX:52,rangeY:102,boxY:-36,launchVy:-28,selfVy:0}),
 air:n(30,8,3,17,{hitstun:29,rangeX:74,rangeY:76,boxY:4,knockbackY:-3}),down_air:n(30,8,3,17,{hitstun:29,rangeX:74,rangeY:76,boxY:4,knockbackY:-3}),
 bAdvance:n(24,10,3,19,{category:'heavy',rangeX:64,hitstun:29,travel:[2,10,3]}),bChain:n(34,11,3,21,{category:'heavy',rangeX:74,hitstun:32}),
 bAway:n(46,13,3,26,{category:'heavy',rangeX:78,hitstun:30,knockbackX:7,stepConfirm:true}),
 bShot:n(38,15,1,24,{category:'special',isSpecial:true,cost:12,noBody:true,shot:true}),
 bPursuit:n(22,14,3,28,{category:'special',isSpecial:true,cost:18,rangeX:70,hitstun:30,travel:[2,16,110/14]}),
 bPursuitFinish:n(32,7,3,25,{category:'special',isSpecial:true,rangeX:78,hitstun:26,knockbackX:5}),
 bRise:n(44,10,12,26,{category:'special',isSpecial:true,cost:18,rangeX:60,rangeY:94,boxY:-16,hitstun:28}),
 bBarrier:n(0,8,18,24,{category:'special',isSpecial:true,cost:20,noBody:true}),
 bAirShot:n(34,12,1,22,{category:'special',isSpecial:true,cost:15,noBody:true,shot:true}),
 // ── VARIETY PASS (Claude, at the owner's request; S.P.D. Red as the model). Additive: existing moves unchanged.
 // New moves reuse Blue's OWN existing strips by alias (no new art, assets untouched).
 bSweep:n(38,11,3,24,{category:'heavy',hitLevel:'low',boxY:68,rangeY:32,rangeX:78,hitstun:30,blockstun:12,knockdown:true}),   // Down+Heavy: knockdown sweep
 bBackstep:n(0,1,12,18,{noBody:true,retreat:90,invuln:6}),                                                                     // Back+Heavy: evasive backstep, inv 1-6
 bAirDive:n(36,10,30,1,{category:'special',isSpecial:true,cost:12,rangeX:60,rangeY:62,boxY:36,hitstun:26,blockstun:12,dive:true}), // Air neutral/fwd Special: angled dive kick
 bDrive1:n(18,9,2,3,{category:'special',isSpecial:true,cost:22,rangeX:66,hitstun:24,blockstun:12,travel:[1,9,4]}),             // ↓↘→+Special INTERCEPT DRIVE
 bDrive2:n(20,3,2,3,{category:'special',isSpecial:true,rangeX:72,hitstun:24,blockstun:12}),
 bBash:n(44,13,4,24,{category:'special',isSpecial:true,cost:18,rangeX:60,rangeY:64,boxY:8,hitstun:28,blockstun:16,knockbackX:20,travel:[3,17,5]}),   // ↓↙←+Special BARRIER BASH: 70px shoulder charge behind a raised field; big knock-away
 bArrest:n(72,6,2,32,{category:'heavy',damageType:'grab',unblockable:true,rangeX:46,rangeY:44,boxY:40,hitstun:40,blockstun:0,knockbackX:6,knockdown:true}),   // VARIETY L8 ↓↙←+Heavy S.P.D. ARREST THROW: command throw, knockdown
 bParry:n(0,4,16,22,{category:'special',isSpecial:true,cost:10,noBody:true,counter:[4,20,150],counterInto:'bParryStrike'}),   // VARIETY L7 Charge+Back BARRIER PARRY: f4-19 reads a melee attack -> Parry Strike; whiff = 22f recovery
 bParryStrike:n(55,2,4,22,{category:'special',isSpecial:true,rangeX:84,rangeY:60,hitstun:30,blockstun:14,knockbackX:18,invuln:6}),   // VARIETY L7 counter strike: field palm blasts the foe away
 bRam:n(60,21,4,26,{category:'heavy',cost:20,armor:20,rangeX:70,rangeY:56,boxY:10,hitstun:30,blockstun:14,knockbackX:12,travel:[4,21,3.5]}),   // VARIETY L6 Charge+Forward BARRIER CHARGE: field-armored f1-20, advances ~60px
 bWithdraw:n(28,11,3,18,{rangeX:74,rangeY:50,boxY:10,hitstun:24,blockstun:14,knockbackX:6,pull:[1,9,4.5]}),   // VARIETY L5 Back+Light WITHDRAWING STRIKE: steps ~36px back, then a long baton strike
 bPalm:n(36,13,3,22,{category:'heavy',rangeX:70,rangeY:56,boxY:10,hitstun:26,blockstun:14,knockbackX:16}),   // Forward+Light BARRIER PALM: field-charged palm; heavy knockback slides the foe ≈40px away after hitstun
 bSky:n(44,8,4,24,{category:'special',isSpecial:true,cost:15,launcher:true,launchVy:-26,selfVy:0,rangeX:56,rangeY:120,boxY:-44,hitstun:30,blockstun:12,invuln:5}),   // Up+Special SKY BARRIER: 8f anti-air launcher, invulnerable 1-5 (Red's Sky Uppercut slot); very punishable on block
 bAirH:n(40,11,4,18,{category:'heavy',rangeX:80,rangeY:78,boxY:22,hitstun:30,knockbackX:5,knockbackY:4}),   // air Heavy: slower, bigger downward aerial (air Light keeps the 8f kick)
 bDrive3:n(32,4,3,24,{category:'special',isSpecial:true,rangeX:78,hitstun:30,blockstun:12,knockbackX:7,knockdown:true,travel:[0,4,6]}),
}
const timeline={light:[[0,0],[4,1]],bPalm:[[0,0],[12,1]],bWithdraw:[[0,0],[10,1]],bRam:[[0,0],[20,1]],bArrest:[[0,0],[5,1]],bParry:[[0,0]],bParryStrike:[[0,0],[1,1]],bJ3:[[0,0],[9,1]],heavy:[[0,0],[13,1]],bLow:[[0,0],[7,1]],up:[[0,0],[11,1]],air:[[0,0],[7,1]],bAdvance:[[0,0],[9,1]],bChain:[[0,0],[10,1]],bAway:[[0,0],[12,1]],bShot:[[0,0],[13,1],[23,2]],bPursuit:[[0,0],[13,1],[18,2]],bPursuitFinish:[[0,0],[6,1]],bRise:[[0,0],[5,1],[9,2]]}
const anim={...SPD_BLUE_ANIM,bPursuitFinish:SPD_BLUE_ANIM.bChain,
 bSweep:SPD_BLUE_ANIM.bLow,bBackstep:SPD_BLUE_ANIM.walk_back,bAirDive:SPD_BLUE_ANIM.air,bDrive1:SPD_BLUE_ANIM.light,bDrive2:SPD_BLUE_ANIM.bJ2,bDrive3:SPD_BLUE_ANIM.bChain,bBash:SPD_BLUE_ANIM.bAdvance,bPalm:SPD_BLUE_ANIM.heavy,bWithdraw:SPD_BLUE_ANIM.bJ3,bRam:SPD_BLUE_ANIM.bAdvance,bArrest:SPD_BLUE_ANIM.heavy,bParry:SPD_BLUE_ANIM.bBarrier,bParryStrike:SPD_BLUE_ANIM.heavy,bSky:SPD_BLUE_ANIM.up,bAirH:SPD_BLUE_ANIM.down_air}   // variety-pass aliases (existing strips)
export const spd_blue={rosterKey:'spd_blue',name:'S.P.D. Blue Ranger',civilianIdentity:'Sky Tate',universe:'power_rangers',series:'Power Rangers S.P.D.',tagline:'Hold the line. Close the distance.',archetype:'Interceptor / Defensive Counterpressure',
 bio:'Sky Tate: precise B-Squad martial artist with Deltamax Striker and force-field projection. Ground teleport and Intercept Step are requested gameplay adaptations. Shared Zord ultimate pending integration.',primary:'balanced',secondary:['zoner'],archetypes:['balanced','zoner'],
 traits:{hasEnergy:true,energyType:'energy',energyName:'Energy',mobility:'normal',scaling:'combo',animeMovement:false},energyConfig:{label:'Energy',color:'#428dff'},
 stats:{maxHealth:1150,maxEnergy:100,attack:80,defense:80,speed:88,jumpPower:26,maxJumps:1,weight:1,dashSpeed:14,dashDuration:10,dashCooldownMax:36},
 hasSprites:true,spriteScale:2.2/1.18,spriteSheet:anim.idle.sheet,portrait:'./assets/spd_blue/portrait.png',movement:{crouchIdle:true},fatalityVictimArt:false,
 basic_attacks:{light:SPD_BLUE_MOVES.light,heavy:SPD_BLUE_MOVES.heavy,crouchLight:SPD_BLUE_MOVES.bLow,upAttack:SPD_BLUE_MOVES.up,airAttack:SPD_BLUE_MOVES.air,downAir:SPD_BLUE_MOVES.down_air,grab:{damage:dmg(26),startup:8,active:3,recovery:24,hitstun:20,throwForceX:5,throwForceY:-3,damageType:'grab'}},
 specials:{neutral:{name:'Deltamax Shot',cost:12},forward:{name:'Baton Pursuit',cost:18},down:{name:'Rising Intercept',cost:18},back:{name:'Blue Barrier',cost:20},airNeutral:{name:'Delta Dive',cost:12},motion:{name:'Intercept Drive (↓↘→)',cost:22},motionBack:{name:'Barrier Bash (↓↙←)',cost:18},up:{name:'Sky Barrier',cost:15}},ultimate:{name:'Zord Assault — awaiting shared integration',cost:100,description:'Unavailable until the shared opt-in Ranger Zord system is integrated. No meter is spent.'},
 animationData:Object.fromEntries(Object.entries(anim).map(([k,a])=>[k,timeline[k]?{...a,frameTimeline:timeline[k]}:a]))}
