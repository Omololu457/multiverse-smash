// S.P.D. Pink Ranger — Sydney "Syd" Drew. Data only (frame data, registration, opt-in configs).
// Logic: spdPinkState.js (sim) · spdPink.js (command layer) · spdPinkFx.js (render-only).
import {SPD_PINK_ANIM} from './spdPinkSprites.js'
import {registerGroundTeleport} from './groundTeleport.js'

// Double-tap teleport: SPD Blue's shared opt-in contract (groundTeleport.js), unchanged defaults:
// 12f window with release between taps, cost 8, cooldown 36, 3/2/8, 120px swept, legal-dash fallback.
export const SPD_PINK_TELEPORT=registerGroundTeleport('spd_pink',{})

// IRON RESERVE — material preparation (Charge). One stored charge, consumed by the NEXT Heavy / Iron Breaker start.
// The charged versions cost +3 startup and +6 recovery; no armor, no invulnerability, no guard break.
export const IRON_RESERVE={startup:12,prep:24,recovery:12,cooldown:180,lifetime:300,max:1,heavyRaw:70,breakerRaw:72,startupPenalty:3,recoveryPenalty:6}
// BATON REPRISAL — counter stance (Back Special). One eligible close frontal ordinary melee hit is consumed
// (shared negate-in-resolveAttackHit contract) and answered with ONE ordinary, blockable raw 40 response.
export const BATON_REPRISAL={startup:8,window:12,recovery:26,cooldown:180,cost:18,range:140,responseRaw:40}

// Shared Ranger Zord ultimate — OPT-IN CONFIGURATION ONLY. No shared Zord system exists in this project
// (checked 2026-11-13: no module, no art wiring). Ultimate press is consumed, spends nothing, no fallback.
export const SPD_PINK_ZORD={enabled:false,dependency:'shared Ranger Zord Assault (not present in project)',cost:100,rawTotal:240,
 requiresCleanOpening:true,ironReserveBuff:false,callAction:'ultimate',callPose:'ultimate (fire0-2: Deltamax cannon call/ready poses)',presentation:{primary:'#ff4fa3',glow:'#c0136b'},
 crossoverAssist:'Falconzord — creative MMPR crossover assist only if its supplied assets are integrated (they are not wired); not Delta Runner 5, not the SPD Megazord'}

// ROSTER-PARITY PASS (2026-11-13, owner request): this kit was authored on a much lower damage scale than the roster
// (light ≈17 vs roster median 42, heavy ≈56 vs 80). One per-character lever multiplies every authored damage value;
// frame data, ratios between moves and the shared 0.60 global scale are untouched.
export const SPD_PINK_DAMAGE_SCALE=1.7
const dmg=v=>Math.round(v*SPD_PINK_DAMAGE_SCALE)
const n=(damage,startup,active,recovery,extra={})=>({damage:dmg(damage),startup,active,recovery,frameExact:true,damageType:'blunt',category:'light',hitstun:20,blockstun:12,rangeX:60,rangeY:46,knockbackX:2,knockbackY:0,...extra})
const R=IRON_RESERVE
const heavy=n(58,15,3,26,{category:'heavy',hitstun:36,blockstun:14,rangeX:84,rangeY:44,boxY:18,knockbackX:4})
const breaker=n(56,17,3,28,{category:'special',isSpecial:true,cost:20,rangeX:58,rangeY:44,boxY:22,hitstun:34,blockstun:16,knockbackX:6,travel:[2,17,6]})
export const SPD_PINK_MOVES={
 // Baton jab chain (fresh retaps on clean contact only; three Light stages maximum)
 light:n(17,5,2,10,{hitstun:16,blockstun:11,rangeX:62}),
 pJ2:n(21,6,2,12,{hitstun:18,rangeX:68}),
 pJ3:n(29,10,3,18,{hitstun:24,rangeX:74,boxY:12,knockbackX:5}),
 heavy,
 pLow:n(25,8,2,16,{hitLevel:'low',boxY:70,rangeY:30,rangeX:76,hitstun:22}),
 up:n(42,12,3,22,{category:'launcher',launcher:true,hitstun:30,rangeX:54,rangeY:104,boxY:-38,launchVy:-28,selfVy:0}),
 air:n(30,8,3,17,{hitstun:28,rangeX:76,rangeY:70,boxY:10,knockbackY:-3}),
 down_air:n(30,8,3,17,{hitstun:28,rangeX:76,rangeY:70,boxY:10,knockbackY:-3}),
 // Forward+Heavy string: baton weapon check → fresh Heavy side kick → fresh Heavy knock-away (confirmed Up → launcher)
 pCheck:n(24,10,3,19,{category:'heavy',rangeX:70,rangeY:44,boxY:14,hitstun:29,travel:[2,10,5]}),
 pKick:n(32,12,3,21,{category:'heavy',rangeX:82,hitstun:32}),
 pAway:n(44,14,3,26,{category:'heavy',rangeX:76,rangeY:56,boxY:20,hitstun:30,knockbackX:8}),
 // IRON RESERVE consumers (charged forms: +3 startup, +6 recovery; same boxes; no armor/invuln/guard break)
 heavyIron:{...heavy,damage:dmg(R.heavyRaw),startup:heavy.startup+R.startupPenalty,recovery:heavy.recovery+R.recoveryPenalty,iron:true},
 pBreaker:breaker,
 pBreakerIron:{...breaker,damage:dmg(R.breakerRaw),startup:breaker.startup+R.startupPenalty,recovery:breaker.recovery+R.recoveryPenalty,travel:[2,20,90/18],iron:true},
 // Specials
 pPrep:n(0,R.startup,R.prep,R.recovery,{category:'special',isSpecial:true,noBody:true,prep:true}),
 pShot:n(38,16,1,24,{category:'special',isSpecial:true,cost:12,noBody:true,shot:true}),
 pRise:n(42,11,10,24,{category:'special',isSpecial:true,cost:18,rangeX:56,rangeY:110,boxY:-14,hitstun:28}),
 pStance:n(0,BATON_REPRISAL.startup,BATON_REPRISAL.window,BATON_REPRISAL.recovery,{category:'special',isSpecial:true,cost:BATON_REPRISAL.cost,noBody:true,stance:true}),
 pReprisal:n(BATON_REPRISAL.responseRaw,6,3,20,{category:'special',isSpecial:true,rangeX:78,rangeY:50,boxY:14,hitstun:26,blockstun:14,knockbackX:6,response:true,counterBypass:true}),
 pRose:n(44,12,40,1,{category:'special',isSpecial:true,cost:15,rangeX:58,rangeY:60,boxY:46,hitstun:28,knockbackY:-2,rose:true}),
 // ── VARIETY PASS (S.P.D. Red as the model: command normals, an air special, an Up special, a motion special) ──
 // Down+Heavy CARTWHEEL SWEEP: slower heavy low that knocks down (Down+Light stays the quick 8f sweep).
 pSweep:n(40,12,3,24,{category:'heavy',hitLevel:'low',boxY:66,rangeY:34,rangeX:86,hitstun:30,blockstun:12,knockdown:true}),
 // Back+Heavy HANDSPRING AWAY: free evade, 100px back, invulnerable frames 1-7, no hitbox, 20f recovery.
 pEvade:n(0,1,14,20,{noBody:true,retreat:100,invuln:7}),
 // Air neutral Special AIR DELTAMAX: one downward-angled shot per airtime (airAim0 cell), finite, non-piercing.
 pAirShot:n(32,10,1,16,{category:'special',isSpecial:true,cost:10,noBody:true,shot:true,airShot:true}),
 // Up+Special VAULT KICK: hop-forward aerial kick that hits OVERHEAD (must be blocked standing) — the mix-up partner
 // to her lows. Grounded start, ~60px forward, no invulnerability, punishable.
 pVault:n(40,16,3,20,{category:'special',isSpecial:true,cost:15,hitLevel:'overhead',rangeX:62,rangeY:56,boxY:10,hitstun:26,blockstun:12,travel:[2,16,4]}),
 // ↓↘→+Special IRON BARRAGE: the motion variant of Iron Breaker, available only WITH an Iron Reserve charge (spent on
 // start, like Heavy/Iron Breaker): body punch → straight → baton finisher (knockdown). Committed. Without a charge,
 // the same input is the ordinary Iron Breaker.
 pBar1:n(20,10,2,3,{category:'special',isSpecial:true,cost:20,rangeX:62,hitstun:24,blockstun:12,travel:[1,10,4],iron:true}),
 pBar2:n(20,3,2,3,{category:'special',isSpecial:true,rangeX:72,hitstun:24,blockstun:12}),
 // ↓↘→ … ↓↙←+Special FLIP SHOT (Red's ↓↙← Deltamax, Syd style): backflip 80px away (invulnerable 5f, no hitbox), then
 // fires one Deltamax shot from the landing pose. Grounded, from neutral only; shares the one-shot-per-owner cap.
 pFlip:n(30,6,12,18,{category:'special',isSpecial:true,cost:16,noBody:true,shot:true,shotAtEnd:true,retreat:80,invuln:5}),
 // Forward+Light ROSE KNEE: rising knee that pops the foe up (knockbackY −9) for an air follow-up. Jump-cancel is NOT
 // granted — she has to jump manually; slow enough to be a read, not a jab replacement.
 pBackfist:n(26,10,3,16,{rangeX:72,rangeY:46,boxY:10,hitstun:22,blockstun:14,knockbackX:4,pull:[1,8,5]}),   // VARIETY L5 Back+Light RETREATING BACKFIST: steps ~35px back, then a long swat
 pToss:n(70,6,2,32,{category:'heavy',damageType:'grab',unblockable:true,rangeX:46,rangeY:44,boxY:40,hitstun:40,blockstun:0,knockbackX:6,knockdown:true}),   // VARIETY L8 ↓↙←+Heavy IRON HIP TOSS: command throw (unblockable, grounded reach only), knockdown; whiff = 32f recovery
 pShoulder:n(60,20,4,26,{category:'heavy',cost:20,armor:19,rangeX:66,rangeY:56,boxY:10,hitstun:30,blockstun:14,knockbackX:12,travel:[4,20,3.5]}),   // VARIETY L6 Charge+Forward DIAMOND SHOULDER: armored f1-19, advances 56px
 pKnee:n(34,11,3,20,{category:'heavy',rangeX:58,rangeY:62,boxY:16,hitstun:32,blockstun:12,knockbackX:2,knockbackY:-9}),
 // air Heavy ROSE AXE KICK: slower, bigger downward aerial (air Light keeps the 8f kick).
 pAirH:n(42,11,4,18,{category:'heavy',rangeX:80,rangeY:80,boxY:20,hitstun:30,knockbackX:5,knockbackY:4}),
 pBar3:n(38,4,3,24,{category:'special',isSpecial:true,rangeX:78,rangeY:52,boxY:14,hitstun:30,blockstun:12,knockbackX:7,knockdown:true,travel:[0,4,6]}),
}
export const SPD_PINK_LANDING={rise:16,rose:24}

// Frame timelines: which strip frame shows at which tick (0-based elapsed).
const timeline={light:[[0,0],[4,1]],pKnee:[[0,0],[10,1]],pBackfist:[[0,0],[9,1]],pShoulder:[[0,0],[19,1]],pToss:[[0,0],[5,1]],pJ2:[[0,0],[5,1]],pJ3:[[0,0],[9,1]],heavy:[[0,0],[14,1]],heavyIron:[[0,0],[17,1]],up:[[0,0],[11,1]],air:[[0,0],[7,1]],
 pCheck:[[0,0],[9,1]],pKick:[[0,0],[11,1]],pAway:[[0,0],[13,1]],pPrep:[[0,0],[12,1],[36,0]],pShot:[[0,0],[11,1],[15,2]],
 pBreaker:[[0,0],[16,1]],pBreakerIron:[[0,0],[19,1]],pRise:[[0,0],[10,1]],pStance:[[0,0],[8,1],[20,0]],pReprisal:[[0,0],[5,1]],pRose:[[0,0],[11,1]],
 pSweep:[[0,0],[11,1]],pEvade:[[0,0],[10,1]],pVault:[[0,0],[15,1]],pBar3:[[0,0],[3,1]],pFlip:[[0,0],[6,1],[17,2]]}
const anim={...SPD_PINK_ANIM,heavyIron:SPD_PINK_ANIM.heavy,pBreakerIron:SPD_PINK_ANIM.pBreaker,pKnee:SPD_PINK_ANIM.up,pBackfist:SPD_PINK_ANIM.pJ3,pShoulder:SPD_PINK_ANIM.pBreaker,pToss:SPD_PINK_ANIM.heavy,pAirH:SPD_PINK_ANIM.pRose}

export const spd_pink={rosterKey:'spd_pink',name:'S.P.D. Pink Ranger',civilianIdentity:'Sydney "Syd" Drew',universe:'power_rangers',series:'Power Rangers S.P.D.',
 tagline:'Pretty decisive.',archetype:'Precision Striker / Material Pressure',
 bio:'Syd Drew: B-Squad Pink, whose genetic power turns her hand into the material she touches. Iron Reserve (using it while morphed) and the ground phase step are deliberate gameplay adaptations; no full-body metal armor. Shared Zord ultimate pending integration.',
 primary:'balanced',secondary:['rushdown'],archetypes:['balanced','rushdown'],
 traits:{hasEnergy:true,energyType:'energy',energyName:'Energy',mobility:'normal',scaling:'combo',animeMovement:false},energyConfig:{label:'Energy',color:'#ff5fae'},
 stats:{maxHealth:1120,maxEnergy:100,attack:82,defense:76,speed:92,jumpPower:26,maxJumps:1,weight:1,dashSpeed:14,dashDuration:10,dashCooldownMax:36},
 hasSprites:true,spriteScale:2.2/1.18,spriteSheet:anim.idle.sheet,portrait:'./assets/spd_pink/portrait.png',movement:{crouchIdle:true},fatalityVictimArt:false,
 basic_attacks:{light:SPD_PINK_MOVES.light,heavy:SPD_PINK_MOVES.heavy,crouchLight:SPD_PINK_MOVES.pLow,upAttack:SPD_PINK_MOVES.up,airAttack:SPD_PINK_MOVES.air,downAir:SPD_PINK_MOVES.down_air,
  grab:{damage:dmg(26),startup:8,active:3,recovery:24,hitstun:20,throwForceX:5,throwForceY:-3,damageType:'grab'}},
 specials:{neutral:{name:'Deltamax Shot',cost:12},forward:{name:'Iron Breaker',cost:20},down:{name:'Rising Check',cost:18},back:{name:'Baton Reprisal',cost:18},up:{name:'Vault Kick',cost:15},airNeutral:{name:'Air Deltamax',cost:10},airDown:{name:'Falling Rose',cost:15},motion:{name:'Iron Barrage (↓↘→, with Iron Reserve)',cost:20},motionBack:{name:'Flip Shot (↓↙←)',cost:16},charge:{name:'Iron Reserve',cost:0}},
 ultimate:{name:'Zord Assault — awaiting shared integration',cost:100,description:'Unavailable until the shared opt-in Ranger Zord system exists. No meter is spent and there is no fallback ultimate.'},
 animationData:Object.fromEntries(Object.entries(anim).map(([k,a])=>[k,timeline[k]?{...a,frameTimeline:timeline[k]}:a]))}
