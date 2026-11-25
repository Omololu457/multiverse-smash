// benAlienUlts.js — one row per Ben 10 alien: the cinematic wrapper's title card, colours and motif (benAlienUltKit.js does the
// staging). Every alien KEEPS its own ultimate (same input / cost / damage / phases); the kit freezes the world around it for an
// Omnitrix activation, hit-stops on its big contacts and an aftermath stamp. Ben AND Albedo (shared device path); human Ben /
// Albedo keep the all-aliens sequence (ben10AlienSequence.js). Unknown forms (DNA-scanned copies) are left untouched.
import { makeBenAlienUlts } from './benAlienUltKit.js'

// key (activeAlien without the "_ov" suffix) → { name, ult, c1 main, c2 highlight, dark outline, rgb glow, motif }
export const BEN_ALIEN_ULTS = {
  heatblast:    { name: 'Heatblast',    ult: 'Pyronite Meteor',   c1: '#ff6a00', c2: '#ffd23f', dark: '#3a0d00', rgb: '255,120,20',  motif: 'fire' },
  megawhatt:    { name: 'Megawhatt',    ult: 'Blackout',          c1: '#ffe14a', c2: '#fffbe0', dark: '#2b2200', rgb: '255,230,90',  motif: 'electric' },
  goop:         { name: 'Goop',         ult: 'Meltdown Flood',    c1: '#6fe03a', c2: '#c6ff8a', dark: '#0f2a05', rgb: '120,230,60',  motif: 'goo' },
  xlr8:         { name: 'XLR8',         ult: 'Time Sprint',       c1: '#3fa9ff', c2: '#e8f6ff', dark: '#04162b', rgb: '70,170,255',  motif: 'speed' },
  eyeguy:       { name: 'Eye Guy',      ult: 'All-Seeing Eye',    c1: '#9be535', c2: '#fff3a0', dark: '#1b2a05', rgb: '170,230,60',  motif: 'eyes' },
  ghostfreak:   { name: 'Ghostfreak',   ult: 'Fear Feast',        c1: '#b9a6ff', c2: '#f0ecff', dark: '#120a24', rgb: '170,150,255', motif: 'ghost' },
  alienx:       { name: 'Alien X',      ult: 'Absolute Decree',   c1: '#7f8cff', c2: '#ffffff', dark: '#000000', rgb: '160,170,255', motif: 'cosmic', win: 260 },
  brainstorm:   { name: 'Brainstorm',   ult: 'Neural Tempest',    c1: '#ffd84a', c2: '#ffffff', dark: '#2a1f00', rgb: '255,220,80',  motif: 'electric' },
  terraspin:    { name: 'Terraspin',    ult: 'Eye of the Storm',  c1: '#7fd6c8', c2: '#f2fffc', dark: '#0a2420', rgb: '140,220,210', motif: 'wind' },
  jetray:       { name: 'Jetray',       ult: 'Cosmic Drag',       c1: '#ff3d5a', c2: '#ffe14a', dark: '#2a0008', rgb: '255,70,100',  motif: 'speed' },
  wildvine:     { name: 'Wildvine',     ult: 'Overgrowth',        c1: '#3fae3a', c2: '#b4f06a', dark: '#0b2408', rgb: '90,200,70',   motif: 'vines' },
  diamondhead:  { name: 'Diamondhead',  ult: 'Diamond Cathedral', c1: '#3ee6c8', c2: '#e6fffa', dark: '#032a24', rgb: '80,240,210',  motif: 'crystal' },
  upgrade:      { name: 'Upgrade',      ult: 'System Takeover',   c1: '#39d353', c2: '#d8ffe0', dark: '#031006', rgb: '60,220,90',   motif: 'circuit' },
  humongousaur: { name: 'Humungousaur', ult: 'Extinction Event',  c1: '#c98a4a', c2: '#ffe0b0', dark: '#2a1404', rgb: '220,150,80',  motif: 'quake' },
  feedback:     { name: 'Feedback',     ult: 'Full Feedback',     c1: '#22d3ee', c2: '#e0fbff', dark: '#031a20', rgb: '40,210,240',  motif: 'electric' },
  arcticguana:  { name: 'Arctiguana',   ult: 'Absolute Popsicle', c1: '#8fd8ff', c2: '#ffffff', dark: '#06202e', rgb: '150,220,255', motif: 'ice' },
  benwolf:      { name: 'Benwolf',      ult: 'Howling Moon',      c1: '#9fb7ff', c2: '#f4f0d8', dark: '#0a0f24', rgb: '170,190,255', motif: 'moon' },
  bigchill:     { name: 'Big Chill',    ult: 'Frozen Sky',        c1: '#5ab4ff', c2: '#e8f6ff', dark: '#041a30', rgb: '100,180,255', motif: 'frost' },
  ripjaws:      { name: 'Ripjaws',      ult: 'Maelstrom Feast',   c1: '#2f8fd8', c2: '#bfe9ff', dark: '#021426', rgb: '50,150,220',  motif: 'water' },
  rath:         { name: 'Rath',         ult: "Rath's Fury",       c1: '#ff7a1a', c2: '#fff0d8', dark: '#2a0a00', rgb: '255,120,40',  motif: 'rage' },
  waterhazard:  { name: 'Water Hazard', ult: 'Tidal Discharge',   c1: '#3aa0ff', c2: '#d8f2ff', dark: '#03142a', rgb: '70,160,255',  motif: 'water' },
  highbreed:    { name: 'Highbreed',    ult: 'Genetic Purge',     c1: '#b86bff', c2: '#f3e6ff', dark: '#1a0730', rgb: '185,110,255', motif: 'purge' },
  wildmutt:     { name: 'Wildmutt',     ult: 'Primal Takedown',   c1: '#ff8a2a', c2: '#ffe2c0', dark: '#2a1000', rgb: '255,140,50',  motif: 'rage' },
  swampfire:    { name: 'Swampfire',    ult: 'Inferno',           c1: '#ff7a1a', c2: '#9be535', dark: '#142a05', rgb: '255,140,40',  motif: 'swamp', win: 160 },
  // the older (experimental) forms that still use abilities.js's legacy fire* ultimates
  cannonbolt:   { name: 'Cannonbolt',   ult: 'Pinball Rampage',   c1: '#ffcf3a', c2: '#ffffff', dark: '#2a2000', rgb: '255,210,70',  motif: 'speed', win: 90 },
  chromastone:  { name: 'Chromastone',  ult: 'Prism Overload',    c1: '#b24bff', c2: '#ffe6ff', dark: '#1a0430', rgb: '180,80,255',  motif: 'crystal', win: 60 },
  fourarms:     { name: 'Four Arms',    ult: 'Quaking Fists',     c1: '#ff4a3a', c2: '#ffe0d8', dark: '#2a0600', rgb: '255,80,60',   motif: 'quake', win: 60 },
  clockwork:    { name: 'Clockwork',    ult: 'Time Stop',         c1: '#e0b24a', c2: '#fff4d0', dark: '#2a1a00', rgb: '230,180,80',  motif: 'psychic', win: 120 },
}

export const benAlienUlt = makeBenAlienUlts(BEN_ALIEN_ULTS)
