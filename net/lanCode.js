// net/lanCode.js — short, human-friendly LAN JOIN CODE  <->  ws://<ip>:<port>.
//
// STRICTLY ADDITIVE / OPT-IN. Pure functions, no I/O, no game state — just a reversible encoding so the host
// can show a friend a 5-6 character code instead of a raw ws://192.168.1.20:8787 address, and the joiner can
// type that code to reconstruct the exact same address. The host still binds its real local IP/port; this is
// only a friendlier *representation* of it.
//
// WHY A CODE (not mDNS / UDP broadcast): a code is reliable on ANY LAN with zero assumptions and zero extra
// dependencies — no multicast, no discovery daemon, nothing a firewall or a locked-down network can block.
// It's a deterministic pure transform, so it's trivially unit-testable. Browsers also can't do mDNS directly.
//
// COMPACTNESS: private-range LAN IPs are the overwhelmingly common case, so we tag them and store only the
// variable octets; the default relay port (8787) is omitted entirely. That makes the everyday
// 192.168.x.y:8787 code ~5-6 chars. Anything unusual (public IP / custom port) still encodes correctly, just
// a few chars longer. A trailing checksum char catches most typos before we even try to connect.

export const DEFAULT_PORT = 8787

// Crockford base32 — no I, L, O, U (removes the classic 1/I, 0/O, etc. read-aloud confusions).
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

function _ipToOctets(ip) {
  const m = String(ip || "").trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return null
  const o = [+m[1], +m[2], +m[3], +m[4]]
  return o.every((n) => n >= 0 && n <= 255) ? o : null
}

// Pack {ip, port} into a minimal byte array. Byte 0 is a header: (tag<<1)|portDefault.
//   tag 0 = 192.168.x.y  → body [x, y]
//   tag 1 = 10.a.b.c     → body [a, b, c]
//   tag 2 = 172.(16-31).b.c → body [a-16, b, c]
//   tag 3 = full IPv4    → body [o0, o1, o2, o3]
// portDefault 1 → port is 8787, omitted. portDefault 0 → 2 extra bytes hold the port.
function _pack(ip, port) {
  const o = _ipToOctets(ip)
  if (!o) return null
  let tag, body
  if (o[0] === 192 && o[1] === 168)                       { tag = 0; body = [o[2], o[3]] }
  else if (o[0] === 10)                                    { tag = 1; body = [o[1], o[2], o[3]] }
  else if (o[0] === 172 && o[1] >= 16 && o[1] <= 31)       { tag = 2; body = [o[1] - 16, o[2], o[3]] }
  else                                                     { tag = 3; body = [o[0], o[1], o[2], o[3]] }
  const portDefault = (+port === DEFAULT_PORT) ? 1 : 0
  const bytes = [(tag << 1) | portDefault, ...body]
  if (!portDefault) { const p = +port & 0xffff; bytes.push((p >> 8) & 0xff, p & 0xff) }
  return bytes
}

function _unpack(bytes) {
  if (!bytes || bytes.length < 1) return null
  const header = bytes[0], tag = header >> 1, portDefault = header & 1
  let i = 1, ip
  if (tag === 0)      { if (bytes.length < i + 2) return null; ip = `192.168.${bytes[i]}.${bytes[i + 1]}`; i += 2 }
  else if (tag === 1) { if (bytes.length < i + 3) return null; ip = `10.${bytes[i]}.${bytes[i + 1]}.${bytes[i + 2]}`; i += 3 }
  else if (tag === 2) { if (bytes.length < i + 3) return null; ip = `172.${16 + bytes[i]}.${bytes[i + 1]}.${bytes[i + 2]}`; i += 3 }
  else                { if (bytes.length < i + 4) return null; ip = `${bytes[i]}.${bytes[i + 1]}.${bytes[i + 2]}.${bytes[i + 3]}`; i += 4 }
  let port = DEFAULT_PORT
  if (!portDefault) { if (bytes.length < i + 2) return null; port = (bytes[i] << 8) | bytes[i + 1]; i += 2 }
  return { ip, port }
}

function _b32encode(bytes) {
  let bits = 0, val = 0, out = ""
  for (const b of bytes) {
    val = (val << 8) | b; bits += 8
    while (bits >= 5) { out += ALPHABET[(val >>> (bits - 5)) & 31]; bits -= 5 }
  }
  if (bits > 0) out += ALPHABET[(val << (5 - bits)) & 31]
  return out
}

function _b32decode(str) {
  let bits = 0, val = 0; const out = []
  for (const ch of str) {
    const idx = ALPHABET.indexOf(ch)
    if (idx < 0) return null
    val = (val << 5) | idx; bits += 5
    if (bits >= 8) { out.push((val >>> (bits - 8)) & 0xff); bits -= 8 }
  }
  return out
}

function _checksumChar(bytes) { return ALPHABET[bytes.reduce((a, b) => a + b, 0) % 32] }

// Normalize a user-typed code: strip separators/whitespace, uppercase, and forgive the look-alikes that the
// Crockford alphabet intentionally omits (I/L→1, O→0, U→V).
function _normalize(code) {
  return String(code || "").toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/[IL]/g, "1").replace(/O/g, "0").replace(/U/g, "V")
}

// PUBLIC: {ip, port} → short uppercase code (payload + 1 checksum char). Returns null on a bad IP.
export function encodeLanCode(ip, port = DEFAULT_PORT) {
  const bytes = _pack(ip, port)
  if (!bytes) return null
  return _b32encode(bytes) + _checksumChar(bytes)
}

// PUBLIC: code → { ip, port } or null (bad format / checksum mismatch).
export function decodeLanCode(code) {
  const s = _normalize(code)
  if (s.length < 2) return null
  const body = s.slice(0, -1), cs = s.slice(-1)
  const bytes = _b32decode(body)
  if (!bytes || bytes.length < 1) return null
  if (_checksumChar(bytes) !== cs) return null
  return _unpack(bytes)
}
