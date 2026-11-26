// heroArt.js — MENU SPOTLIGHT data: a proper (non-pixel) art picture for every fighter, the colour sampled from that
// picture (tints the menu so the art melts into its background), who counts as a villain, and per-fighter play counts
// so the menus can spotlight the player's MAIN (most-played fighter; Gojo until they've played).
// Pictures: assets/hero_art/*.webp (fetched from each series' fan wiki, ≤720px). Render-only; no gameplay effect.

export const HERO_ART = {
  "albedo": { src: "./assets/hero_art/albedo.webp", color: "#a25c58", cutout: true },
  "alt_sukuna": { src: "./assets/hero_art/alt_sukuna.webp", color: "#ab6e64", cutout: true },
  "aoi_todo": { src: "./assets/hero_art/aoi_todo.webp", color: "#83626b", cutout: true },
  "arlong": { src: "./assets/hero_art/arlong.webp", color: "#79716f", cutout: false },
  "baki": { src: "./assets/hero_art/baki.webp", color: "#b25c37", cutout: false },
  "batman": { src: "./assets/hero_art/batman.webp", color: "#844f26", cutout: false },
  "beast_boy": { src: "./assets/hero_art/beast_boy.webp", color: "#603d55", cutout: true },
  "beerus": { src: "./assets/hero_art/beerus.webp", color: "#807573", cutout: false },
  "ben10": { src: "./assets/hero_art/ben10.webp", color: "#6a8a5a", cutout: true },
  "buggy": { src: "./assets/hero_art/buggy.webp", color: "#b0725f", cutout: false },
  "byakuya": { src: "./assets/hero_art/byakuya.webp", color: "#7e818d", cutout: false },
  "chrollo": { src: "./assets/hero_art/chrollo.webp", color: "#82777f", cutout: true },
  "cyborg": { src: "./assets/hero_art/cyborg.webp", color: "#688392", cutout: true },
  "dash_parr": { src: "./assets/hero_art/dash_parr.webp", color: "#bf4f3a", cutout: true },
  "dinothunder": { src: "./assets/hero_art/dinothunder.webp", color: "#cea56d", cutout: false },
  "elastigirl": { src: "./assets/hero_art/elastigirl.webp", color: "#aa302b", cutout: true },
  "flash": { src: "./assets/hero_art/flash.webp", color: "#c26d30", cutout: false },
  "frozone": { src: "./assets/hero_art/frozone.webp", color: "#508e9a", cutout: true },
  "gaara": { src: "./assets/hero_art/gaara.webp", color: "#917067", cutout: false },
  "genos": { src: "./assets/hero_art/genos.webp", color: "#938764", cutout: false },
  "ghostface": { src: "./assets/hero_art/ghostface.webp", color: "#65572f", cutout: false },
  "gojo": { src: "./assets/hero_art/gojo.webp", color: "#b1a4a8", cutout: false },
  "gojo_shinjuku": { src: "./assets/hero_art/gojo_shinjuku.webp", color: "#52474e", cutout: true },
  "goku": { src: "./assets/hero_art/goku.webp", color: "#b17627", cutout: true },
  "goku_black": { src: "./assets/hero_art/goku_black.webp", color: "#bb5c96", cutout: false },
  "gold_samurai_ranger": { src: "./assets/hero_art/gold_samurai_ranger.webp", color: "#d7bb8d", cutout: false },
  "green_arrow": { src: "./assets/hero_art/green_arrow.webp", color: "#a66b4b", cutout: false },
  "green_samurai_ranger": { src: "./assets/hero_art/green_samurai_ranger.webp", color: "#40997d", cutout: true },
  "gwen": { src: "./assets/hero_art/gwen.webp", color: "#827778", cutout: false },
  "hashirama": { src: "./assets/hero_art/hashirama.webp", color: "#cf9440", cutout: true },
  "higuruma": { src: "./assets/hero_art/higuruma.webp", color: "#656055", cutout: true },
  "hinata": { src: "./assets/hero_art/hinata.webp", color: "#988a89", cutout: false },
  "hisoka": { src: "./assets/hero_art/hisoka.webp", color: "#605f81", cutout: false },
  "homelander": { src: "./assets/hero_art/homelander.webp", color: "#71534a", cutout: true },
  "ichigo": { src: "./assets/hero_art/ichigo.webp", color: "#ac846b", cutout: true },
  "inosuke": { src: "./assets/hero_art/inosuke.webp", color: "#b09582", cutout: true },
  "invincible": { src: "./assets/hero_art/invincible.webp", color: "#8a9f78", cutout: true },
  "ippo": { src: "./assets/hero_art/ippo.webp", color: "#b7554d", cutout: true },
  "isshiki": { src: "./assets/hero_art/isshiki.webp", color: "#8e726a", cutout: false },
  "itachi": { src: "./assets/hero_art/itachi.webp", color: "#87757d", cutout: false },
  "jason": { src: "./assets/hero_art/jason.webp", color: "#4d4f4f", cutout: false },
  "jiraiya": { src: "./assets/hero_art/jiraiya.webp", color: "#8d6651", cutout: true },
  "kakashi": { src: "./assets/hero_art/kakashi.webp", color: "#8d8c89", cutout: true },
  "kakashi_anbu": { src: "./assets/hero_art/kakashi_anbu.webp", color: "#989d9f", cutout: false },
  "kakashi_war": { src: "./assets/hero_art/kakashi_war.webp", color: "#656659", cutout: false },
  "kevin_levin": { src: "./assets/hero_art/kevin_levin.webp", color: "#3e4350", cutout: true },
  "killua": { src: "./assets/hero_art/killua.webp", color: "#a39fb0", cutout: false },
  "krybot": { src: "./assets/hero_art/krybot.webp", color: "#83a1b6", cutout: false },
  "l_ryuuzaki": { src: "./assets/hero_art/l_ryuuzaki.webp", color: "#bc9b81", cutout: false },
  "light": { src: "./assets/hero_art/light.webp", color: "#b78d65", cutout: false },
  "luffy": { src: "./assets/hero_art/luffy.webp", color: "#9daaa9", cutout: false },
  "madara": { src: "./assets/hero_art/madara.webp", color: "#6d503e", cutout: true },
  "maki": { src: "./assets/hero_art/maki.webp", color: "#565450", cutout: true },
  "mayuri": { src: "./assets/hero_art/mayuri.webp", color: "#b54423", cutout: false },
  "megumi_fushiguro": { src: "./assets/hero_art/megumi_fushiguro.webp", color: "#44444b", cutout: true },
  "minato": { src: "./assets/hero_art/minato.webp", color: "#4d685d", cutout: true },
  "miwa": { src: "./assets/hero_art/miwa.webp", color: "#655f62", cutout: true },
  "mmpr_rangers": { src: "./assets/hero_art/mmpr_rangers.webp", color: "#5c504e", cutout: false },
  "mr_incredible": { src: "./assets/hero_art/mr_incredible.webp", color: "#c75e54", cutout: false },
  "naruto": { src: "./assets/hero_art/naruto.webp", color: "#b5a36e", cutout: false },
  "naruto_seventh": { src: "./assets/hero_art/naruto_seventh.webp", color: "#b8876f", cutout: true },
  "netero": { src: "./assets/hero_art/netero.webp", color: "#c4c0b8", cutout: false },
  "nezuko": { src: "./assets/hero_art/nezuko.webp", color: "#a37273", cutout: true },
  "ninja_storm_cgpt": { src: "./assets/hero_art/ninja_storm_cgpt.webp", color: "#e29281", cutout: false },
  "ninja_storm_rangers": { src: "./assets/hero_art/ninja_storm_rangers.webp", color: "#b9a091", cutout: false },
  "ns_squad": { src: "./assets/hero_art/ns_squad.webp", color: "#b9a091", cutout: false },
  "obito": { src: "./assets/hero_art/obito.webp", color: "#5d5f6e", cutout: false },
  "omniman_viltrum": { src: "./assets/hero_art/omniman_viltrum.webp", color: "#7e3f2b", cutout: false },
  "pain": { src: "./assets/hero_art/pain.webp", color: "#966042", cutout: true },
  "raven": { src: "./assets/hero_art/raven.webp", color: "#383177", cutout: true },
  "rengoku": { src: "./assets/hero_art/rengoku.webp", color: "#a9564e", cutout: true },
  "rick": { src: "./assets/hero_art/rick.webp", color: "#bcccce", cutout: false },
  "rickPrime": { src: "./assets/hero_art/rickPrime.webp", color: "#9d9561", cutout: false },
  "robin": { src: "./assets/hero_art/robin.webp", color: "#507e49", cutout: true },
  "saiki": { src: "./assets/hero_art/saiki.webp", color: "#dc9ba7", cutout: false },
  "saitama": { src: "./assets/hero_art/saitama.webp", color: "#c88d69", cutout: false },
  "sakura": { src: "./assets/hero_art/sakura.webp", color: "#c0a398", cutout: false },
  "samurai_red_ranger": { src: "./assets/hero_art/samurai_red_ranger.webp", color: "#7f5553", cutout: false },
  "sanji": { src: "./assets/hero_art/sanji.webp", color: "#8ba7c2", cutout: false },
  "sasuke": { src: "./assets/hero_art/sasuke.webp", color: "#687d8d", cutout: false },
  "sasuke_adult": { src: "./assets/hero_art/sasuke_adult.webp", color: "#615d72", cutout: true },
  "sasuke_sensei": { src: "./assets/hero_art/sasuke_sensei.webp", color: "#918b70", cutout: true },
  "shinobu": { src: "./assets/hero_art/shinobu.webp", color: "#937f87", cutout: true },
  "shisui_fallen": { src: "./assets/hero_art/shisui_fallen.webp", color: "#91816b", cutout: true },
  "six_paths_pain": { src: "./assets/hero_art/six_paths_pain.webp", color: "#4f3637", cutout: false },
  "soldier_boy": { src: "./assets/hero_art/soldier_boy.webp", color: "#46493f", cutout: true },
  "spd_rangers": { src: "./assets/hero_art/spd_rangers.webp", color: "#7d5944", cutout: false },
  "spiderman": { src: "./assets/hero_art/spiderman.webp", color: "#775055", cutout: false },
  "starfire": { src: "./assets/hero_art/starfire.webp", color: "#733c41", cutout: true },
  "sukuna": { src: "./assets/hero_art/sukuna.webp", color: "#aa5f60", cutout: false },
  "sukuna_shinjuku": { src: "./assets/hero_art/sukuna_shinjuku.webp", color: "#ab6e64", cutout: true },
  "superman": { src: "./assets/hero_art/superman.webp", color: "#b69e7e", cutout: false },
  "syndrome": { src: "./assets/hero_art/syndrome.webp", color: "#a6817f", cutout: false },
  "tobi": { src: "./assets/hero_art/tobi.webp", color: "#4b4837", cutout: true },
  "tobirama": { src: "./assets/hero_art/tobirama.webp", color: "#3270a1", cutout: true },
  "toji": { src: "./assets/hero_art/toji.webp", color: "#a89f9a", cutout: true },
  "vegeta": { src: "./assets/hero_art/vegeta.webp", color: "#5d7cac", cutout: false },
  "vegeta_dark": { src: "./assets/hero_art/vegeta_dark.webp", color: "#9a8275", cutout: true },
  "vilgax": { src: "./assets/hero_art/vilgax.webp", color: "#bc8982", cutout: false },
  "violet": { src: "./assets/hero_art/violet.webp", color: "#9b692f", cutout: false },
  "yuji": { src: "./assets/hero_art/yuji.webp", color: "#6e5652", cutout: true },
  "yuta": { src: "./assets/hero_art/yuta.webp", color: "#8f8a84", cutout: true },
  "zaraki": { src: "./assets/hero_art/zaraki.webp", color: "#592438", cutout: false },
  "zaraki_shikai": { src: "./assets/hero_art/zaraki_shikai.webp", color: "#592438", cutout: false },
  "zenitsu": { src: "./assets/hero_art/zenitsu.webp", color: "#c99052", cutout: true },
  "zoro": { src: "./assets/hero_art/zoro.webp", color: "#976246", cutout: false },
}

// Fighters shown with the VILLAIN tag (everyone else is HERO).
export const VILLAINS = new Set(["albedo", "alt_sukuna", "arlong", "buggy", "chrollo", "ghostface", "goku_black", "hisoka", "homelander", "isshiki", "jason", "krybot", "light", "madara", "mayuri", "obito", "omniman_viltrum", "pain", "rickPrime", "six_paths_pain", "soldier_boy", "sukuna", "sukuna_shinjuku", "syndrome", "tobi", "toji", "vegeta_dark", "vilgax"])
export function isVillain(key) { return VILLAINS.has(key) }

export const DEFAULT_SPOTLIGHT = "gojo"
const LS_KEY = "ms_char_usage"   // { [rosterKey]: { m: matches, w: wins, t: lastPlayedMs } }

function _read() { try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}") || {} } catch (_) { return {} } }
function _write(d) { try { localStorage.setItem(LS_KEY, JSON.stringify(d)) } catch (_) {} }
let _cache = null
function _usage() { if (!_cache) _cache = _read(); return _cache }

// Called when a match starts (every mode but AI vs AI, training included) with the player's (P1) fighter …
export function recordFighterPick(key) {
  if (!key || !HERO_ART[key]) return
  const d = _usage(), e = d[key] || (d[key] = { m: 0, w: 0, t: 0, f: Date.now() })
  e.m++; e.t = Date.now(); if (!e.f) e.f = e.t; _write(d)
}
// … and when a non-training match is won with it.
export function recordFighterWin(key) {
  if (!key || !HERO_ART[key]) return
  const d = _usage(), e = d[key] || (d[key] = { m: 1, w: 0, t: Date.now() })
  e.w = Math.min(e.m, e.w + 1); _write(d)
}
export function fighterUsage(key) { const e = _usage()[key]; return e ? { matches: e.m, wins: e.w } : { matches: 0, wins: 0 } }

// The player's main = the fighter with the MOST matches (not the last one played). Ties → more wins, then the
// one played first (so a one-off match with someone new never steals the spotlight). Falls back to Gojo.
export function spotlightKey() {
  let best = null, b = null
  for (const [k, e] of Object.entries(_usage())) {
    if (!HERO_ART[k] || !(e.m > 0)) continue
    const f = e.f || e.t || 0
    if (!b || e.m > b.m || (e.m === b.m && ((e.w || 0) > (b.w || 0) || ((e.w || 0) === (b.w || 0) && f < (b.f || b.t || 0))))) { best = k; b = e }
  }
  return best || DEFAULT_SPOTLIGHT
}

const _imgs = new Map()
export function heroArtImage(key) {
  const a = HERO_ART[key]; if (!a) return null
  let img = _imgs.get(key)
  if (!img) { img = new Image(); img.decoding = "async"; img.src = a.src; _imgs.set(key, img) }
  return img
}
export function heroArtColor(key) { return HERO_ART[key]?.color || "#7a6cff" }
