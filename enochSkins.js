// Enoch (enoch) — the DEFAULT appearance only (the brief: no skins beyond the default). A skins.js entry is still needed so
// applySkin keeps his presentation scale (without one it falls back to spriteScale 1).
import { enoch as EN } from './enochData.js'
export const ENOCH_SKINS = [
  { id: 'default', name: 'Default', classification: 'Default', unlockLevel: 0, spriteScale: EN.spriteScale, portrait: EN.portrait, animationData: null,
    source: { version: 'Region recolour of the supplied GBA Frozone sheet (tools/enoch/build_sprites.py)' } },
]
