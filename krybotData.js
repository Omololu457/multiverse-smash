import { KRYBOT_ANIM } from './krybotSprites.js'

// 60 Hz ticks. Raw damage goes through the shared 0.60 damage scale, defense,
// starter/combo decay, chip, hitstop and juggle rules. No private scaling curve.
// ROSTER-PARITY PASS (2026-11-13, owner request): this kit was authored on a much lower damage scale than the roster
// (light ≈17 vs roster median 42, heavy ≈56 vs 80). One per-character lever multiplies every authored damage value;
// frame data, ratios between moves and the shared 0.60 global scale are untouched.
export const KRYBOT_DAMAGE_SCALE = 1.7
export const krybotDmg = v => Math.round(v * KRYBOT_DAMAGE_SCALE)
const n = (damage, startup, active, recovery, extra = {}) => ({ damage: krybotDmg(damage), startup, active, recovery,
  frameExact: true, damageType: 'blunt', category: 'light', hitstun: 20, blockstun: 10,
  rangeX: 52, rangeY: 42, knockbackX: 2, knockbackY: 0, ...extra })
export const KRYBOT_MOVES = {
  light: n(16,5,2,10,{hitstun:15,blockstun:12}),
  kJ2: n(18,6,2,12,{hitstun:15,blockstun:10,rangeX:56}),
  kJ3: n(28,10,3,18,{hitstun:23,blockstun:12,rangeX:64,knockbackX:5}),
  heavy: n(50,14,3,25,{category:'heavy',hitstun:34,blockstun:13,rangeX:66,knockbackX:3,mark:true}),
  kLow: n(24,8,2,16,{hitLevel:'low',hitstun:21,blockstun:10,rangeX:54,rangeY:28,boxY:70}),
  up: n(40,12,3,22,{category:'launcher',hitstun:28,blockstun:12,rangeX:52,rangeY:98,boxY:-36,launchVy:-28,selfVy:0}),
  air: n(28,9,3,17,{hitstun:25,blockstun:12,rangeX:64,rangeY:68,boxY:8,knockbackX:3,knockbackY:-3}),
  // Same supplied extended boot; no invented aerial dive or fifth special.
  down_air: n(28,9,3,17,{hitstun:25,blockstun:12,rangeX:64,rangeY:68,boxY:8,knockbackX:3,knockbackY:-3}),
  kAdvance: n(24,10,3,19,{category:'heavy',hitstun:28,blockstun:12,rangeX:58,travel:[2,10,3]}),
  kChainKick: n(32,11,3,21,{category:'heavy',hitstun:30,blockstun:12,rangeX:66,knockbackX:2}),
  kAway: n(44,13,3,26,{category:'heavy',hitstun:27,blockstun:12,rangeX:70,knockbackX:7,mark:true}),
  kBlaster: n(36,15,1,24,{category:'special',isSpecial:true,cost:12,noBody:true,shot:'arm'}),
  kBreach: n(46,13,6,30,{category:'special',isSpecial:true,cost:15,hitstun:26,blockstun:12,rangeX:58,travel:[3,18,8]}),
  kLeap: n(40,11,12,26,{category:'special',isSpecial:true,cost:18,hitstun:26,blockstun:12,rangeX:52,rangeY:66,boxY:4}),
  kCover: n(1,24,1,26,{category:'special',isSpecial:true,cost:25,noBody:true}),
  ultimate: n(30,30,1,60,{category:'ultimate',isUltimate:true,cost:100,noBody:true,shot:'opening'}),
}
const timelines = {
  light:[[0,0],[4,1]], kJ2:[[0,0],[5,1]], kJ3:[[0,0],[9,1]], heavy:[[0,0],[13,1]],
  kLow:[[0,0],[7,1]], up:[[0,0],[11,1]], air:[[0,0],[8,1]], down_air:[[0,0]],
  kAdvance:[[0,0],[9,1]], kChainKick:[[0,0],[10,1]], kAway:[[0,0],[12,1]],
  kBlaster:[[0,0],[13,1],[21,2]], kBreach:[[0,0],[12,1]],
  kLeap:[[0,0],[6,1],[11,2],[16,3],[21,4],[26,5]], kCover:[[0,0],[20,1]], ultimate:[[0,0],[27,1]],
}
export const krybot = {
  rosterKey:'krybot', name:'Krybot', universe:'power_rangers', series:'Power Rangers S.P.D.', faction:'Troobian Empire',
  tagline:'One unit. A larger problem.', archetype:'Infantry / Ranged Pressure',
  bio:'Troobian robotic infantry. This playable squad-leader role and Coordinated Fire are original gameplay adaptations; ordinary Krybots are not established troop commanders.',
  primary:'zoner', secondary:['rushdown'], archetypes:['zoner','rushdown'],
  traits:{hasEnergy:true,energyType:'energy',energyName:'Energy',mobility:'normal',scaling:'combo',animeMovement:false},
  energyConfig:{label:'Energy',color:'#e0a44e'},
  stats:{maxHealth:1080,maxEnergy:100,attack:80,defense:80,speed:80,jumpPower:26,maxJumps:1,weight:1,
    dashSpeed:14,dashDuration:10,dashCooldownMax:36},
  hasSprites:true,spriteScale:2.2/1.18,spriteSheet:KRYBOT_ANIM.idle.sheet,portrait:'./assets/krybot/portrait.png',
  movement:{crouchIdle:true},fatalityVictimArt:false,
  basic_attacks:{light:KRYBOT_MOVES.light,heavy:KRYBOT_MOVES.heavy,crouchLight:KRYBOT_MOVES.kLow,
    upAttack:KRYBOT_MOVES.up,airAttack:KRYBOT_MOVES.air,downAir:KRYBOT_MOVES.down_air,
    grab:{damage:krybotDmg(24),startup:8,active:3,recovery:24,hitstun:20,throwForceX:5,throwForceY:-3,damageType:'grab'}},
  specials:{neutral:{name:'Arm Blaster',cost:12,description:'One finite horizontal shot.'},forward:{name:'Breach Step',cost:15,description:'Committed 120px advancing strike.'},
    down:{name:'Leap Intercept',cost:18,description:'One committed forward leap per airtime; 18f landing recovery.'},back:{name:'Covering Unit',cost:25,description:'One fragile allied gunner, one shot. 480f cooldown.'}},
  ultimate:{name:'Troobian Crossfire',cost:100,description:'Opening blaster must hit unblocked. Two scripted allies fire, then a local explosion. Raw contacts 30+35+35+100; no capture on miss or block.'},
  animationData:Object.fromEntries(Object.entries(KRYBOT_ANIM).map(([k,a])=>[k,timelines[k]?{...a,frameTimeline:timelines[k]}:a])),
}
