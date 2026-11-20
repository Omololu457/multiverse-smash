// net/upnp.mjs — MSV1-HOST: UPnP-IGD port mapping, the SECONDARY reachability route (node only, no deps).
//
// discover() sends an SSDP M-SEARCH for an Internet Gateway Device, reads its description XML, and finds the
// WANIPConnection / WANPPPConnection control URL. mapPort() adds a TCP mapping externalPort → this machine,
// getExternalIp() asks the router for its public address, unmapPort() removes the mapping on Stop/quit.
// The host controller only REPORTS a UPnP link as working after verifyReachable() fetched our own /healthz
// through the public IP:port and got this server's instance id back.

import dgram from "node:dgram"
import os from "node:os"

const SSDP_ADDR = "239.255.255.250", SSDP_PORT = 1900
const SERVICES = ["urn:schemas-upnp-org:service:WANIPConnection:2", "urn:schemas-upnp-org:service:WANIPConnection:1", "urn:schemas-upnp-org:service:WANPPPConnection:1"]

export function discover({ timeoutMs = 2500, fetchImpl = globalThis.fetch, socketFactory = () => dgram.createSocket("udp4") } = {}) {
  return new Promise((resolve) => {
    const sock = socketFactory()
    const locations = new Set()
    let done = false
    const finish = async () => {
      if (done) return
      done = true
      try { sock.close() } catch {}
      for (const loc of locations) {
        try { const gw = await readDescription(loc, fetchImpl); if (gw) return resolve(gw) } catch {}
      }
      resolve(null)
    }
    sock.on("message", (msg) => {
      const m = /^location:\s*(\S+)/im.exec(msg.toString())
      if (m && /^http:\/\//i.test(m[1])) { locations.add(m[1]); }
    })
    sock.on("error", finish)
    const req = Buffer.from([
      "M-SEARCH * HTTP/1.1", `HOST: ${SSDP_ADDR}:${SSDP_PORT}`, 'MAN: "ssdp:discover"', "MX: 2",
      "ST: urn:schemas-upnp-org:device:InternetGatewayDevice:1", "", "",
    ].join("\r\n"))
    sock.bind(() => {
      try { sock.send(req, SSDP_PORT, SSDP_ADDR) } catch { finish() }
    })
    setTimeout(finish, timeoutMs).unref?.()
  })
}

async function readDescription(location, fetchImpl) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 3000)
  const res = await fetchImpl(location, { signal: ctl.signal }); clearTimeout(t)
  const xml = await res.text()
  for (const st of SERVICES) {
    const i = xml.indexOf(st)
    if (i < 0) continue
    const after = xml.slice(i)
    const m = /<controlURL>\s*([^<]+?)\s*<\/controlURL>/i.exec(after)
    if (m) {
      const base = new URL(location)
      return { controlUrl: new URL(m[1], base).href, serviceType: st, gatewayHost: base.hostname }
    }
  }
  return null
}

async function soap(gw, action, args, fetchImpl = globalThis.fetch) {
  const body = `<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body><u:${action} xmlns:u="${gw.serviceType}">` +
    Object.entries(args).map(([k, v]) => `<${k}>${String(v).replace(/[<>&]/g, "")}</${k}>`).join("") +
    `</u:${action}></s:Body></s:Envelope>`
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 4000)
  const res = await fetchImpl(gw.controlUrl, {
    method: "POST", signal: ctl.signal,
    headers: { "content-type": 'text/xml; charset="utf-8"', soapaction: `"${gw.serviceType}#${action}"` }, body,
  })
  clearTimeout(t)
  const text = await res.text()
  if (!res.ok) throw new Error(`UPnP ${action} failed: HTTP ${res.status} ${(/<errorDescription>([^<]*)/.exec(text) || [])[1] || ""}`.trim())
  return text
}

// The LAN address on the same subnet as the gateway (what the router must forward to).
export function localAddressFor(gatewayHost) {
  const gw = String(gatewayHost).split(".").map(Number)
  let best = null
  for (const list of Object.values(os.networkInterfaces())) for (const ni of list || []) {
    if (ni.family !== "IPv4" || ni.internal) continue
    const a = ni.address.split(".").map(Number), mask = (ni.netmask || "255.255.255.0").split(".").map(Number)
    if (a.every((x, i) => (x & mask[i]) === (gw[i] & mask[i]))) return ni.address
    best = best || ni.address
  }
  return best
}

export async function mapPort(gw, { port, description = "Multiverse Smash host", leaseSeconds = 3600, fetchImpl } = {}) {
  await soap(gw, "AddPortMapping", {
    NewRemoteHost: "", NewExternalPort: port, NewProtocol: "TCP", NewInternalPort: port,
    NewInternalClient: localAddressFor(gw.gatewayHost), NewEnabled: 1, NewPortMappingDescription: description, NewLeaseDuration: leaseSeconds,
  }, fetchImpl)
  return true
}

export async function unmapPort(gw, { port, fetchImpl } = {}) {
  try { await soap(gw, "DeletePortMapping", { NewRemoteHost: "", NewExternalPort: port, NewProtocol: "TCP" }, fetchImpl); return true } catch { return false }
}

export async function getExternalIp(gw, { fetchImpl } = {}) {
  const xml = await soap(gw, "GetExternalIPAddress", {}, fetchImpl)
  const m = /<NewExternalIPAddress>\s*([^<\s]+)\s*</i.exec(xml)
  return m ? m[1] : null
}

// True only if http://ip:port/healthz answers with OUR server's instance id. Many routers do not support
// "hairpin" NAT (reaching your own public IP from inside), so a false here does not prove friends can't
// connect — but we never claim the route works unless this succeeds.
export async function verifyReachable(ip, port, instanceId, { fetchImpl = globalThis.fetch, timeoutMs = 4000 } = {}) {
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeoutMs)
    const r = await fetchImpl(`http://${ip}:${port}/healthz`, { signal: ctl.signal, cache: "no-store" }); clearTimeout(t)
    const j = await r.json()
    return !!(j && j.ok && j.id === instanceId)
  } catch { return false }
}
