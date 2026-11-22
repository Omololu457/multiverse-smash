import { KEVIN_CELLS, KEVIN_PALETTES } from './kevinAtlas.js'

export const COATING_TICKS = 720
export const SHOT_TICKS = 480
export const FORM_TICKS = 720
export const KEVIN_SCALE = 1.9
export const MATERIALS = {
  steel: { name: 'Steel', icon: 'Fe', color: '#becbd8', move: 'Wrecking Ram', property: 'One light hit of armor during the rush. Kevin still takes damage.' },
  alloy: { name: 'Car alloy', icon: 'Al', color: '#66e38a', move: 'Green Machine', property: 'Fastest rush and longest travel. Clean hit can cancel into Launcher.' },
  taydenite: { name: 'Taydenite', icon: '◆', color: '#a8f4e3', move: 'Crystal Guillotine', property: 'Extended guardstun on cutting attacks.' },
  rubber: { name: 'Rubber', icon: '↶', color: '#a3a9be', move: 'Ricochet Riot', property: 'Clean rush hit rebounds once and can cancel into Air Light.' },
  armor: { name: 'Alien armor', icon: '⬟', color: '#e98de8', move: 'Bounty Breaker', property: 'Half projectile chip while facing ordinary energy shots up to 110 raw.' },
  stone: { name: 'Stone', icon: '▰', color: '#e5bd80', move: 'Quarry Breaker', property: 'One light hit of armor during grounded heavy commitment. Low impact.' }
}
export const SAMPLE_IDS = Object.keys(MATERIALS)
export const OPPONENT_SURFACES = {
  iron_man: 'steel', iron_man_2: 'steel', cyborg: 'steel', elastigirl: 'rubber', vilgax: 'armor'
}
export const SHOT_FAMILIES = {
  mana: { icon: '◉', label: 'Mana', color: '#f574f5', speed: 15, radius: 19 },
  ki: { icon: '✦', label: 'Ki', color: '#ffd064', speed: 17, radius: 15 },
  cyanKi: { icon: '✦', label: 'Ki', color: '#22d3ee', speed: 17, radius: 15 },
  star: { icon: '✧', label: 'Starbolt', color: '#7cff4a', speed: 16, radius: 17 }
}

const strike = (damage,startup,active,recovery,options={}) => ({
  damage,startup,active,recovery,frameExact:true,category:'light',rangeX:57,
  hitstun:24,knockbackX:2,knockbackY:0,...options
})
const heavy = (damage,st,ac,rc,options) =>
  strike(damage,st,ac,rc,{category:'heavy',hitstun:29,knockbackX:8,knockbackY:-3,...options})
const special = (damage,st,ac,rc,options) =>
  strike(damage,st,ac,rc,{category:'special',isSpecial:true,hitstun:26,...options})
const cast = (st,ac,rc,options) => special(0,st,ac,rc,{noBody:true,...options})
const human = {
  light: strike(48,6,2,11,{travel:[1,6,2]}),
  kLight2: strike(48,6,2,12,{travel:[1,7,3]}),
  kLight3: heavy(64,7,3,18,{rangeX:67,travel:[1,8,3]}),
  heavy: heavy(95,12,4,22,{rangeX:69}),
  kReach: heavy(110,13,3,24,{rangeX:104,cut:true}),
  up: strike(78,8,4,9,{category:'launcher',rangeX:63,hitstun:33,launcher:true,launchVy:-20,selfVy:0}),
  kSweep: heavy(65,11,4,20,{rangeX:65,hitLevel:'low',low:true,knockbackY:5}),
  air: strike(60,6,4,12,{rangeX:63,knockbackY:-2}),
  down_air: heavy(105,12,17,20,{rangeX:57,dive:true,knockbackY:8}),
  kGrab: cast(6,1,23,{category:'grab',isSpecial:false,throwDamage:100}),
  kMine: cast(4,10,18),
  kReturn: cast(10,1,19,{shot:'return'}),
  kThunder: heavy(155,15,4,25,{rangeX:73}),
  kQuarry: cast(19,1,26,{cost:15,shot:'quarry'}),
  kApply: cast(14,1,16,{cost:8}),
  kField: cast(12,1,16),
  kCarSample: cast(16,1,31),
  kRush: special(112,11,5,24,{rangeX:69,travel:[3,15,6],knockbackX:7}),
  kSteel: special(134,12,6,25,{rangeX:67,travel:[4,17,7],knockbackX:4,hitstun:32}),
  kAlloy: special(122,9,7,23,{rangeX:78,travel:[2,15,11],knockbackX:2,hitstun:34}),
  kCrystal: special(143,14,4,25,{rangeX:112,travel:[5,14,4],cut:true,knockbackX:5}),
  kRubber: special(120,9,6,24,{rangeX:73,travel:[3,14,8],knockbackX:2,hitstun:37}),
  kArmor: special(138,14,4,25,{rangeX:89,travel:[5,14,5],knockbackX:9}),
  kStone: special(150,16,5,27,{rangeX:96,travel:[5,15,4],low:true,hitLevel:'low',knockbackX:8}),
  kAirRush: special(91,11,4,21,{rangeX:74,travel:[3,15,5],knockbackY:4,airAction:true}),
  kTransform: cast(28,1,0)
}
export const KEVIN_RUSH = {
  steel:'kSteel', alloy:'kAlloy', taydenite:'kCrystal', rubber:'kRubber', armor:'kArmor', stone:'kStone'
}
const ultimate = {
  light: strike(63,5,3,10,{rangeX:68,travel:[1,6,3]}),
  kLight2: strike(65,6,3,11,{rangeX:72,travel:[1,7,3]}),
  kLight3: heavy(82,7,4,17,{rangeX:82,travel:[1,8,4]}),
  heavy: heavy(118,11,5,21,{rangeX:83}),
  kReach: heavy(133,12,4,23,{rangeX:100,travel:[4,12,5]}),
  up: strike(96,7,4,9,{category:'launcher',rangeX:74,hitstun:33,launcher:true,launchVy:-20,selfVy:0}),
  kSweep: heavy(84,10,4,19,{rangeX:77,hitLevel:'low',low:true}),
  air: strike(79,6,4,11,{rangeX:74,knockbackY:-2}),
  down_air: heavy(128,11,17,19,{rangeX:75,dive:true,knockbackY:9}),
  kGrab: cast(6,1,22,{category:'grab',isSpecial:false,throwDamage:122}),
  kMine: human.kMine,
  kReturn: human.kReturn,
  kThunder: heavy(178,15,4,24,{rangeX:86}),
  kArc: special(174,20,10,28,{rangeX:275,beam:true,knockbackX:10}),
  kHalo: special(148,14,10,22,{rangeX:75,launcher:true,launchVy:-23,selfVy:0,hitstun:34}),
  kShards: cast(13,13,24,{shot:'shards'}),
  kFurnace: special(156,15,8,23,{rangeX:94,airAction:true,dive:true,diveAt:8,knockbackY:8}),
  kCounter: cast(5,8,24),
  kRiposte: special(138,6,4,22,{rangeX:96,knockbackX:10}),
  kCash: heavy(360,16,3,38,{category:'ultimate',isUltimate:true,rangeX:86,hitstun:40,knockbackX:12,knockbackY:-10}),
  kRevert: cast(30,1,0)
}
export const KEVIN_MOVES = { human, ultimate }

function cell(sheet, group, { from=0, count, speed, loop=false, starts, anchorY=0 }={}) {
  const base = KEVIN_CELLS[group]
  return {
    ...base,sheet,sourceX:base.sourceX+from*base.width,frames:count ?? base.frames-from,
    speed:speed ?? base.speed,anchorY,loop,lockLastFrame:!loop,
    ...(starts ? {frameTimeline:starts.map((tick,i)=>[tick,i])} : {})
  }
}

function atlasFor(id) {
  const sheet = './assets/kevin/'+id+'-v1.png'
  const c = (group,options)=>cell(sheet,group,options)
  const attack = (move,group,from=0,count=KEVIN_CELLS[group].frames-from,contact=1) => {
    const m = move
    const span = m.startup+m.active+m.recovery-1
    const starts = Array.from({length:count},(_,i)=>i<=contact
      ? Math.round(i*m.startup/Math.max(1,contact))
      : m.startup+Math.round((i-contact)*(span-m.startup)/Math.max(1,count-1-contact)))
    return c(group,{from,count,starts})
  }
  const common = {
    intro:c('intro'), win:c('win'), kTransform:attack(human.kTransform,'transform',0,6,5), kRevert:c('revert'),
    fxBoulder:c('boulder'), fxDebris:c('debris'), fxShard:c('shard'), fxFlame:c('flame'), fxCar:c('sampleCar')
  }
  const buildHuman = material => {
    const suffix = material && material !== 'taydenite' ? '_'+material : ''
    const g = (humanName,coatName) => material ? coatName+suffix : humanName
    const p=g('punch','coatPunch'), kick=g('kick','coatKick'), launch=g('launch','coatLaunch')
    const sweep=g('sweep','coatSweep'), air=g('air','coatAir'), jump=g('jump','coatJump')
    const hurt='hurtSet'+(material?'_'+material:'')
    const guard='guard'+(material?'_'+material:'')
    const coatApply = material ? 'apply'+suffix : 'apply'
    const m = human
    return {
      ...common,idle:material?c(coatApply,{from:6,count:2,loop:true}):c('idle',{loop:true}),
      walk:c(g('run','coatRun'),{loop:true,speed:6}),run:c(g('run','coatRun'),{loop:true}),dash:c(g('run','coatRun'),{loop:true,speed:3}),
      jump:c(jump,{count:3}),fall:c(jump,{from:3}),crouch:c(coatApply,{count:1}),
      guard:c(guard,{from:4,count:2}),charge:c('carFlash',{count:3,loop:true}),
      hurt:c(hurt,{count:1}),hurt_air:c(hurt,{from:1,count:1}),
      knockdown:c(hurt,{from:2,count:1}),getup:c(hurt,{from:3}),lose:c('lose'+(material?'_'+material:'')),
      light:attack(m.light,p,0,3,1),kLight2:attack(m.kLight2,p,1,3,1),kLight3:attack(m.kLight3,kick,0,3,2),
      heavy:attack(m.heavy,p,0,5,2),kReach:attack(m.kReach,p,0,5,2),up:attack(m.up,launch),
      kSweep:attack(m.kSweep,sweep),air:attack(m.air,air,0,4,2),down_air:attack(m.down_air,air,4,5,2),
      kGrab:attack(m.kGrab,guard,0,3),kGrabHold:c(hurt,{from:3}),kMine:c(guard,{count:4,starts:[0,4,8,13]}),
      kReturn:attack(m.kReturn,p,1,3),kThunder:attack(m.kThunder,p,0,5,2),
      kQuarry:attack(m.kQuarry,g('quarry_human','quarry'),0,4,2),kApply:material==='alloy'?attack(m.kApply,'carFlash',0,7,4):attack(m.kApply,coatApply,0,8,4),
      kField:attack(m.kField,coatApply,0,7,4),kCarSample:attack(m.kCarSample,'carSample',0,12,5),
      kRush:attack(m.kRush,kick,0,3,2),kSteel:attack(m.kSteel,p,0,5,2),
      kAlloy:attack(m.kAlloy,'carSample',7,5,3),kCrystal:attack(m.kCrystal,p,0,5,2),
      kRubber:attack(m.kRubber,kick,0,3,2),kArmor:attack(m.kArmor,p,0,5,2),
      kStone:attack(m.kStone,sweep,0,3,1),kAirRush:attack(m.kAirRush,air,1,4,2),
      kShed:c('shed'+suffix)
    }
  }
  const m = ultimate, cl = 'mutantClaw', ma = 'mutantAir', mi = 'mutantIdle'
  return {
    human:buildHuman(null),
    ...Object.fromEntries(SAMPLE_IDS.map(k=>[k,buildHuman(k)])),
    ultimate:{
      ...common,idle:c(mi,{loop:true}),walk:c('mutantMove',{speed:6,loop:true}),run:c('mutantMove',{loop:true}),
      dash:c('mutantMove',{speed:3,loop:true}),jump:c('mutantMove',{count:2}),fall:c('mutantMove',{from:2}),
      crouch:c('mutantShard',{count:1}),guard:c('mutantHalo',{count:2}),hurt:c('revert',{count:1}),
      hurt_air:c('revert',{count:1}),knockdown:c('revert',{from:4,count:1}),getup:c('revert',{from:6}),lose:c('revert'),
      light:attack(m.light,cl),kLight2:attack(m.kLight2,cl,0,3,2),kLight3:attack(m.kLight3,cl,0,3,2),
      heavy:attack(m.heavy,cl,0,3,2),kReach:attack(m.kReach,'mutantShard',0,4,2),
      up:attack(m.up,cl,0,3,2),kSweep:attack(m.kSweep,cl,0,3,1),
      air:attack(m.air,ma,0,4,2),down_air:attack(m.down_air,ma,1,4,2),
      kGrab:attack(m.kGrab,cl),kGrabHold:c('mutantHalo',{from:1,count:1}),kMine:attack(m.kMine,'mutantHalo',0,3),
      kReturn:attack(m.kReturn,'mutantShard',0,4,2),kThunder:attack(m.kThunder,cl,0,3,2),
      kArc:c('mutantArc',{starts:[0,20,23,28,36]}),kHalo:c('mutantHalo',{starts:[0,5,9,14,18,22,26]}),
      kShards:attack(m.kShards,'mutantShard',0,4,2),kFurnace:attack(m.kFurnace,ma,0,5,2),
      kCounter:attack(m.kCounter,'mutantHalo',0,3),kRiposte:attack(m.kRiposte,cl,0,3,2),
      kCash:attack(m.kCash,cl,0,3,2),kCashLift:c('mutantHalo'),kCashArc:c('mutantArc')
    }
  }
}
export const KEVIN_ART = Object.fromEntries(KEVIN_PALETTES.map(([id])=>[id,atlasFor(id)]))
export const KEVIN_SKINS = KEVIN_PALETTES.map(([id,name,ramp])=>({
  id,name,unlockLevel:0,spriteScale:KEVIN_SCALE,portrait:'./assets/kevin/'+id+'-portrait.png',
  animationData:KEVIN_ART[id].human,accent:ramp?'#'+ramp.split(' ').at(-1):'#b2ddd4',
  source:{version:'Supplied Kevin Ethan Levin JUS sheet by regulardor8go',inspiration:name.split(' — ')[0],
    caveat:id==='default'?'Source palette.':'Non-canon cosmetic adaptation using supplied pixels.'}
}))

export const kevin_levin = {
  rosterKey:'kevin_levin',name:'Kevin Levin',displayName:'Kevin Ethan Levin',universe:'ben_10',
  color:'#4b9d75',introTitle:'KEVIN LEVIN',tagline:'That belongs to me now.',
  archetype:'Mobile Bruiser',primary:'bruiser',secondary:['grappler'],archetypes:['bruiser','grappler'],
  bio:'Kevin reshapes material coatings and catches discrete energy shots. Absorption Overload unleashes his Ultimate Alien mutation.',
  isPlayable:true,hasSprites:true,spriteScale:KEVIN_SCALE,portrait:KEVIN_SKINS[0].portrait,spriteSheet:KEVIN_ART.default.human.idle.sheet,
  stats:{maxHealth:1050,maxEnergy:100,attack:100,defense:100,speed:106,jumpPower:26,maxJumps:2,weight:1.08,dashSpeed:22,dashDuration:9,dashCooldownMax:24},
  traits:{hasEnergy:true,energyType:'power',energyName:'Power',mobility:'high',animeMovement:false},
  energyConfig:{label:'Power',color:'#7ce0ab'},
  movement:{crouchIdle:true},introSequence:['intro'],introPool:['intro'],animationData:KEVIN_ART.default.human,
  basic_attacks:{light:human.light,heavy:human.heavy,crouchLight:human.light,upAttack:human.up,airAttack:human.air,downAir:human.down_air,grab:{...human.kGrab,damage:100}},
  specials:{neutral:{name:'Mine Now / Return to Sender',cost:0},forward:{name:'Material Rush',cost:0},
    up:{name:'Scrap Quarry',cost:15},down:{name:'Apply Sample',cost:8},back:{name:'Field Absorption',cost:0}},
  ultimate:{name:'Absorption Overload',cost:100,description:'Twelve seconds as Ultimate Kevin, with a new move table and an optional time-scaled cash-out.'}
}
