// net/hostConfig.js — MSV1-HOST shared constants + pure helpers (browser AND node safe; no I/O, no game state).
//
// Used by the public host server (net/hostServer.mjs), the Electron host controller (electron/host.js) and
// the in-page host UI (net/hostLink.js), so all three agree on room codes, link formats and limits.

export const PROTOCOL_SCHEME = "multiversesmash"
export const RELEASES_URL = "https://github.com/Omololu457/multiverse-smash/releases/latest"

// Room codes: 6 characters from an alphabet with no look-alikes (no 0/O, no 1/I). 32 symbols → 32^6 ≈ 1.07e9
// codes, and join attempts are rate-limited per IP, so brute-forcing a live room is not practical.
export const ROOM_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
export const ROOM_CODE_LEN = 6
export const ROOM_CODE_RE = new RegExp(`^[${ROOM_ALPHABET}]{${ROOM_CODE_LEN}}$`)

// The game's real limit: LanSession is 1-vs-1 lockstep (exactly one remote side), so a room holds 2 players.
// Spectating is not supported by the netcode (a third client could not follow the input stream).
export const MAX_PLAYERS_PER_ROOM = 4   // the host + up to 3 friends (3–4 players = free-for-all)

export function normalizeRoomCode(s) {
  const c = String(s || "").trim().toUpperCase().replace(/[\s-]/g, "")
  return ROOM_CODE_RE.test(c) ? c : null
}

// What the user pasted → { kind: "link", origin, room } | { kind: "code", room } | { kind: "bad", reason }.
// Accepts: https://<host>/join?room=CODE, https://<host>/?room=CODE, http://<lan-ip>:<port>/join?room=CODE,
// and multiversesmash://join?link=<url>&room=CODE. A BARE code has no host address, so the caller must ask
// for the link (a room code alone cannot be resolved to a computer).
export function parseJoinInput(raw) {
  const s = String(raw || "").trim()
  if (!s) return { kind: "bad", reason: "Paste the join link your friend sent you." }
  const bare = normalizeRoomCode(s)
  if (bare && !/[:/.]/.test(s)) return { kind: "code", room: bare }
  let u
  try { u = new URL(s) } catch { return { kind: "bad", reason: "That is not a join link or a room code." } }
  if (u.protocol === `${PROTOCOL_SCHEME}:`) {
    const inner = u.searchParams.get("link")
    const room = normalizeRoomCode(u.searchParams.get("room"))
    if (!inner) return { kind: "bad", reason: "That desktop link has no host address." }
    const p = parseJoinInput(inner)
    if (p.kind !== "link") return p
    if (room && p.room !== room) return { kind: "bad", reason: "Link and room code disagree." }
    return p
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { kind: "bad", reason: "Only http(s) join links are supported." }
  const room = normalizeRoomCode(u.searchParams.get("room"))
  if (!room) return { kind: "bad", reason: "That link has no valid room code (6 letters/digits)." }
  return { kind: "link", origin: u.origin, room }
}

// http(s) origin → the room's WebSocket URL. The explicit port is always written out (the game's join box
// only accepts ws addresses with a port).
export function relayUrlFor(origin, room) {
  const u = new URL(origin)
  const secure = u.protocol === "https:"
  const port = u.port || (secure ? "443" : "80")
  return `${secure ? "wss" : "ws"}://${u.hostname}:${port}/ws?room=${encodeURIComponent(room)}`
}

export function joinLinkFor(origin, room) { return `${String(origin).replace(/\/+$/, "")}/join?room=${room}` }
export function playLinkFor(origin, room) { return `${String(origin).replace(/\/+$/, "")}/?room=${room}` }
export function desktopJoinUrl(origin, room) {
  return `${PROTOCOL_SCHEME}://join?link=${encodeURIComponent(joinLinkFor(origin, room))}&room=${room}`
}
