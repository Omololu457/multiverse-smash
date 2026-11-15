// Violet Parr (violet) appearance skins — cosmetic only (identical geometry, pivots, frame data, hitboxes, audio, damage).
// Phase 1: the default "Supersuit" (the sheet's own colours). Phase 7 adds the precomputed palette-swap skins.
import { violet } from './violetData.js'
const SHEET = 'Supplied GBA "The Incredibles" Violet sheet (ripped by redblueyellow)'
const common = { unlockLevel: 0, spriteScale: violet.spriteScale }
export const VIOLET_SKINS = [
  { ...common, id: 'default', name: 'Supersuit', classification: 'Default', portrait: violet.portrait, animationData: null, source: { version: SHEET } },
]
