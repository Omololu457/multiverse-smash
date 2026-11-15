// Mr. Incredible: one roster identity, two independently extracted sprite forms.
import { MR_ANIM } from './mrIncredibleSprites.js'
export const MR_KEY='mr_incredible', MR_SCALE=1.8
const n=(damage,startup,active,recovery,extra={})=>({damage,raw:damage,startup,active,recovery,frameExact:true,rangeX:85,rangeY:68,hitstun:20,blockstun:12,knockbackX:4,knockbackY:-2,...extra})
export const MR_MOVES={
 light:n(50,5,3,11,{hitstun:19}),miLight2:n(50,6,3,12,{hitstun:20,travel:[0,7,2]}),miFinish:n(70,8,4,20,{category:'heavy',knockbackX:9,knockbackY:-7}),
 heavy:n(100,14,4,24,{category:'heavy',hitstun:30,knockbackX:9,knockbackY:-5}),
 miLow:n(45,6,3,13,{hitLevel:'low',rangeY:42}),up:n(80,6,4,8,{category:'launcher',launcher:true,hitstun:30,launchVy:-24,selfVy:0,knockbackY:-9}),
 air:n(70,6,4,14,{hitstun:23,knockbackY:-3}),down_air:n(95,10,20,22,{category:'heavy',hitstun:28,knockbackY:8,dive:true}),
 miForward:n(110,12,4,24,{category:'heavy',hitstun:28,travel:[1,12,5],knockbackX:10}),
 miDownHeavy:n(90,13,4,25,{category:'heavy',hitLevel:'low',rangeY:48,knockbackX:7,knockbackY:-6}),
 miImpact:n(140,11,4,25,{isSpecial:true,category:'special',cost:18,rangeX:105,hitstun:30,knockbackX:11,knockbackY:-5}),
 miRush:n(125,9,13,29,{isSpecial:true,category:'special',cost:20,travel:[3,22,8],hitstun:28,knockbackX:10,knockbackY:-4}),
 miRise:n(90,7,9,25,{isSpecial:true,category:'special',cost:18,hitstun:24,knockbackY:-12,rise:true}),
 miSlam:n(155,18,12,28,{isSpecial:true,category:'special',cost:25,rangeX:115,rangeY:55,hitstun:32,knockbackX:8,knockbackY:-8,slam:true}),
 miSpin:n(135,10,14,27,{isSpecial:true,category:'special',cost:22,travel:[3,24,4],hitstun:27,knockbackX:8,knockbackY:-5}),
 miLift:n(145,12,1,28,{category:'grab',cost:20,noBody:true,grab:true}),
 miGrab:n(55,6,1,24,{category:'grab',noBody:true,grab:true}),
 miTransform:n(0,1,1,22,{noBody:true})
}
export const MR_PRIME={duration:900,damage:1.30,ground:1.15,air:1.10,recovery:.90,minRecovery:8,entry:24,debounce:30,visualFallback:90,specialReserve:100}
export const mr_incredible={rosterKey:MR_KEY,name:'Mr. Incredible',displayName:'Mr. Incredible',universe:'the_incredibles',series:'The Incredibles',color:'#cf3045',
 tagline:'Experience hits hard. Prime hits harder.',introTitle:'MR. INCREDIBLE',archetype:'Heavyweight / Pressure Brawler',primary:'bruiser',secondary:['grappler'],archetypes:['bruiser','grappler'],
 bio:'Bob Parr: an experienced powerhouse. Back in My Prime is an original timed game adaptation, not a canonical de-aging ability.',
 traits:{hasEnergy:true,energyType:'power',energyName:'Power',mobility:'medium',animeMovement:false},energyConfig:{label:'Power',color:'#e95753'},
 stats:{maxHealth:1380,maxEnergy:100,attack:96,defense:94,speed:94,jumpPower:26,maxJumps:2,weight:1.2,dashSpeed:22,dashDuration:10,dashCooldownMax:24},
 hasSprites:true,spriteScale:MR_SCALE,spriteSheet:MR_ANIM.veteran.idle.sheet,portrait:'./assets/mr_incredible/default/veteran/portrait.png',movement:{crouchIdle:true},fatalityVictimArt:false,
 introSequence:['intro'],introPool:['intro'],animationData:MR_ANIM.veteran,
 basic_attacks:{light:MR_MOVES.light,heavy:MR_MOVES.heavy,crouchLight:MR_MOVES.miLow,upAttack:MR_MOVES.up,airAttack:MR_MOVES.air,downAir:MR_MOVES.down_air,grab:{damage:55,startup:6,active:1,recovery:24,damageType:'grab'}},
 specials:{neutral:{name:'Incredible Impact',cost:18},forward:{name:'Freight Train',cost:20},up:{name:'Rising Power',cost:18},down:{name:'Seismic Slam',cost:25},back:{name:'Human Wrecking Ball',cost:22}},
 ultimate:{name:'BACK IN MY PRIME',cost:100,description:'15 seconds: young sprite form, 30% damage, 15% ground speed, 10% air control, 10% shorter recovery. No healing or jump reset.'}}

export function mrTimeline(a,m){const contact=Math.min(a.frames-2,Math.max(1,Math.floor(a.frames*.4)));return Array.from({length:a.frames},(_,i)=>[i<=contact?Math.round(i/contact*m.startup):m.startup+Math.round((i-contact)/(a.frames-1-contact)*(m.active+m.recovery-1)),i])}
for (const form of Object.values(MR_ANIM)) for (const [key,m] of Object.entries(MR_MOVES)) { const a=form[key]; if(a) a.frameTimeline=mrTimeline(a,m) }
