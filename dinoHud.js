// dinoHud.js — Dino Thunder Rangers: the in-match HUD portrait under a TEAM SKIN (render-only, no imports → no cycles).
// ui.js _resolveHudPortrait asks this first; null for every other fighter and for the start-form skins (default art).
// The active Ranger's own skinned portrait; while it loads, an empty frame (never a frame of the default colours).
const cache = new Map()
let blank = null
export function dinoHudPortrait(f) {
  const base = f?._dtSkinArt; if (!base || !/^dt_(red|blue|yellow|white)$/.test(f.rosterKey || '')) return null
  const src = `${base}/${f.rosterKey}/portrait_large.png`
  let im = cache.get(src); if (!im) { im = new Image(); im.src = src; cache.set(src, im) }
  if (im.complete && im.naturalWidth) return { src: im, isFallback: false }
  if (!blank) { blank = document.createElement('canvas'); blank.width = blank.height = 4 }
  return { src: blank, isFallback: false }
}
