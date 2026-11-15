// Elastigirl (elastigirl) appearance skins — cosmetic only (identical geometry, anchors, frame data, hitboxes, audio).
// Phase 1: the supplied Supersuit only. Palette skins (precomputed by tools/elastigirl/build_skins.py) arrive in Phase 7.
import { elastigirl } from './elastigirlData.js'
const SHEET = 'Game Boy Advance — The Incredibles — Elastigirl sheet (ripped by redblueyellow), original pixels'
export const ELASTIGIRL_SKINS = [
  { id: 'default', name: 'Supersuit', unlockLevel: 0, classification: 'Default', spriteScale: elastigirl.spriteScale, portrait: elastigirl.portrait, animationData: null, source: { version: SHEET } },
]
