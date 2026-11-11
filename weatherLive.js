// weatherLive.js — FEEL PASS (Phase 4): REAL-WORLD weather → our cosmetic weather types.
//
// Fetches current conditions ONCE per match from Open-Meteo (free, NO API key) and maps them to the
// weather.js types. LAN-safe by construction: ONLY the standalone player / LAN HOST ever calls this; the
// resolved TYPE is what gets used (and, in LAN, replicated via MATCH_SETUP — clients never fetch). The
// game NEVER waits on the network — every path has a 3s timeout and silently falls back to Random.
//
// Privacy: the user's location (lat/lon or a typed city) is stored ONLY in localStorage and sent ONLY to
// Open-Meteo to look up the forecast — never anywhere else. No keys/secrets live in the repo.
//
// The network + geolocation are INJECTABLE (opts.fetchJson / opts.geolocate / opts.now) so the mapping,
// caching, timeout and fallback are all unit-testable with mocked responses.

import { WEATHER } from "./weather.js"

const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search"
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
const CACHE_KEY = "ms_weather_live_cache"
const LOC_KEY = "ms_weather_location"
export const CACHE_TTL_MS = 30 * 60 * 1000   // 30 minutes
export const FETCH_TIMEOUT_MS = 3000
export const WIND_KMH_THRESHOLD = 35
export const HEAT_C_THRESHOLD = 32

// ── WMO weather-code + wind + temp → our type (PURE, testable) ────────────────
// Precipitation wins; then high wind; then heat; else fog/clear. (We group hail under thunderstorm — the
// WMO "with hail" codes are 96/99 — and keep snow distinct, matching the brief's hail/snow family.)
export function mapOpenMeteo(code, windKmh = 0, tempC = 20) {
  const c = code | 0
  // fog
  if (c === 45 || c === 48) return WEATHER.FOG
  // thunderstorm (95 plain, 96/99 with hail)
  if (c === 95 || c === 96 || c === 99) return WEATHER.THUNDERSTORM
  // snow (71/73/75 snowfall, 77 grains, 85/86 showers, 66/67 freezing → treat as snow-cold)
  if (c === 71 || c === 73 || c === 75 || c === 77 || c === 85 || c === 86) return WEATHER.SNOW
  if (c === 66 || c === 67) return WEATHER.HAIL   // freezing rain → icy → hail family
  // rain (drizzle 51-57, rain 61-65, showers 80-82)
  if ((c >= 51 && c <= 65) || c === 80 || c === 81 || c === 82 || c === 56 || c === 57) return WEATHER.RAIN
  // no precipitation → wind / heat / clear
  if ((windKmh || 0) >= WIND_KMH_THRESHOLD) return WEATHER.WIND
  if ((tempC || 0) >= HEAT_C_THRESHOLD) return WEATHER.HEATWAVE
  return WEATHER.CLEAR   // 0-3 clear/cloudy
}

// ── cache (localStorage, 30-min TTL) ──────────────────────────────────────────
export function cacheGet(now) {
  try { const raw = localStorage.getItem(CACHE_KEY); if (!raw) return null; const o = JSON.parse(raw); if (!o || (now - o.t) > CACHE_TTL_MS) return null; return o } catch (_) { return null }
}
export function cacheSet(type, label, now) { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ type, label, t: now })) } catch (_) {} }

// ── stored location choice (lat/lon OR city) ──────────────────────────────────
export function getLocation() { try { const raw = localStorage.getItem(LOC_KEY); return raw ? JSON.parse(raw) : null } catch (_) { return null } }
export function setLocation(loc) { try { loc ? localStorage.setItem(LOC_KEY, JSON.stringify(loc)) : localStorage.removeItem(LOC_KEY) } catch (_) {} }

// ── injectable network ────────────────────────────────────────────────────────
function _defaultFetchJson(url, ms) {
  if (typeof fetch !== "function") return Promise.reject(new Error("no fetch"))
  let ctrl = null, timer = null
  try { ctrl = new AbortController(); timer = setTimeout(() => ctrl.abort(), ms) } catch (_) {}
  return fetch(url, ctrl ? { signal: ctrl.signal, cache: "no-store" } : { cache: "no-store" })
    .then(r => { if (!r.ok) throw new Error("http " + r.status); return r.json() })
    .finally(() => { if (timer) clearTimeout(timer) })
}
// Browser geolocation wrapped as a Promise with its own timeout. Rejects on deny/unavailable.
function _defaultGeolocate(ms) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return reject(new Error("no geolocation"))
    let done = false
    const t = setTimeout(() => { if (!done) { done = true; reject(new Error("geo timeout")) } }, ms)
    navigator.geolocation.getCurrentPosition(
      p => { if (!done) { done = true; clearTimeout(t); resolve({ lat: p.coords.latitude, lon: p.coords.longitude }) } },
      e => { if (!done) { done = true; clearTimeout(t); reject(e || new Error("geo denied")) } },
      { timeout: ms, maximumAge: CACHE_TTL_MS }
    )
  })
}

// Geocode a typed city → {lat, lon, name}. Throws on no match.
export async function geocodeCity(city, fetchJson = _defaultFetchJson) {
  const url = `${GEO_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
  const j = await fetchJson(url, FETCH_TIMEOUT_MS)
  const r = j && j.results && j.results[0]
  if (!r) throw new Error("city not found")
  return { lat: r.latitude, lon: r.longitude, name: r.name }
}

// Fetch the current conditions for a lat/lon → { code, wind, temp }.
export async function fetchCurrent(lat, lon, fetchJson = _defaultFetchJson) {
  const url = `${FORECAST_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&wind_speed_unit=kmh`
  const j = await fetchJson(url, FETCH_TIMEOUT_MS)
  const cu = j && j.current
  if (!cu) throw new Error("no current data")
  return { code: cu.weather_code, wind: cu.wind_speed_10m, temp: cu.temperature_2m }
}

// Resolve live weather to one of our TYPES. Returns { type, label, live:true } on success, or throws so the
// caller falls back to Random. Uses the 30-min cache first; never blocks longer than the timeouts.
//   opts: { location:{lat,lon}|{city}, now, fetchJson, geolocate, useGeolocation }
export async function resolveLive(opts = {}) {
  const now = opts.now != null ? opts.now : (typeof performance !== "undefined" ? 0 : 0)   // caller passes a real timestamp
  const fetchJson = opts.fetchJson || _defaultFetchJson
  const geolocate = opts.geolocate || _defaultGeolocate
  const cached = cacheGet(now)
  if (cached) return { type: cached.type, label: cached.label, live: true, cached: true }

  let lat, lon, label
  const loc = opts.location || getLocation()
  if (loc && loc.lat != null && loc.lon != null) { lat = loc.lat; lon = loc.lon; label = loc.name || "live" }
  else if (loc && loc.city) { const g = await geocodeCity(loc.city, fetchJson); lat = g.lat; lon = g.lon; label = g.name }
  else if (opts.useGeolocation !== false) { const g = await geolocate(FETCH_TIMEOUT_MS); lat = g.lat; lon = g.lon; label = "live" }
  else throw new Error("no location")

  const { code, wind, temp } = await fetchCurrent(lat, lon, fetchJson)
  const type = mapOpenMeteo(code, wind, temp)
  cacheSet(type, label, now)
  return { type, label, live: true, cached: false }
}
