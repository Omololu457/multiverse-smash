// electron/host.js — MSV1-HOST: the desktop app as an ONLINE HOST (main process).
//
// start():  public host server (net/hostServer.mjs) on a free port (8790 preferred, never crashes on
//           EADDRINUSE) → one room → LAN links immediately → then reachability, first route that works:
//             1. Cloudflare quick tunnel (net/tunnel.mjs; bundled / PATH / verified download)
//             2. UPnP port mapping, reported only if verified end-to-end (net/upnp.mjs)
//             3. LAN only (always available), with a clear message why the internet route failed
// stop():   closes the room(s) and the public listener, kills cloudflared, removes any UPnP mapping.
//
// No Electron imports here: main.mjs injects paths and wires IPC, so this module stays testable headless.
// Test switches (env): MS_HOST_TUNNEL=off, MS_HOST_UPNP=off, MS_CLOUDFLARED=<binary>, MS_CLOUDFLARED_DOWNLOAD=off,
// MS_HOST_PORT=<port>.

import os from "node:os"
import { createHostServer, DEFAULT_HOST_PORT } from "../net/hostServer.mjs"
import { findCloudflared, downloadCloudflared, QuickTunnel } from "../net/tunnel.mjs"
import * as upnp from "../net/upnp.mjs"
import { joinLinkFor, RELEASES_URL } from "../net/hostConfig.js"

export function lanIPv4() {
  const out = []
  for (const [name, list] of Object.entries(os.networkInterfaces())) for (const ni of list || []) {
    if (ni.family === "IPv4" && !ni.internal && !/^169\.254\./.test(ni.address)) out.push({ iface: name, address: ni.address })
  }
  // en0/eth0/Wi-Fi first: the interface a friend on the same network most likely shares
  return out.sort((a, b) => (/^(en0|eth0|wlan0|Wi-Fi)/i.test(b.iface) ? 1 : 0) - (/^(en0|eth0|wlan0|Wi-Fi)/i.test(a.iface) ? 1 : 0))
}

export function createHostController({
  root, manifest, renderIndex, buildInfo, cacheDir, bundledCloudflaredDir = null, prepare = () => {},
  log = () => {}, onState = () => {}, env = process.env,
}) {
  let srv = null, tunnel = null, upnpGw = null, gen = 0
  const state = {
    status: "offline",           // offline | starting | online
    route: null,                 // tunnel | upnp | lan
    port: null, room: null, hostToken: null,
    publicLink: null, publicOrigin: null, lanLinks: [],
    message: "", progress: null, players: [], connections: 0,
    tunnelSource: null, appVersion: buildInfo.appVersion, codeHash: buildInfo.codeHash, releasesUrl: RELEASES_URL,
  }
  const emit = () => { try { onState(publicState()) } catch {} }
  const set = (patch) => { Object.assign(state, patch); emit() }

  // What the renderer may see. The host token goes ONLY to the local app window (main.mjs checks the sender).
  function publicState() { return { ...state, players: state.players.map((p) => ({ ...p })), lanLinks: [...state.lanLinks] } }

  async function start() {
    if (state.status !== "offline") return publicState()
    const my = ++gen
    set({ status: "starting", route: null, message: "Starting the host server…", progress: null, publicLink: null, publicOrigin: null, players: [] })
    await new Promise((r) => setTimeout(r, 0))
    try { prepare() } catch (e) { set({ status: "offline", message: `Could not prepare the game files: ${e.message}` }); return publicState() }
    state.codeHash = buildInfo.codeHash
    srv = createHostServer({
      root, manifest, renderIndex, buildInfo, log,
      legacyLanRoom: () => state.room,
    })
    srv.onChange((snap) => {
      const room = snap.rooms.find((r) => r.code === state.room)
      set({ players: room ? room.players : [], connections: snap.connections })
    })
    let port
    try { port = await srv.listen(env.MS_HOST_PORT != null && env.MS_HOST_PORT !== "" ? +env.MS_HOST_PORT : DEFAULT_HOST_PORT, "0.0.0.0") }
    catch (e) { srv = null; set({ status: "offline", message: `Could not open a network port: ${e.message}` }); return publicState() }
    if (my !== gen) return publicState()
    const { code, hostToken } = srv.createRoom()
    const lanLinks = lanIPv4().map((a) => joinLinkFor(`http://${a.address}:${port}`, code))
    set({ status: "online", route: "lan", port, room: code, hostToken, lanLinks,
      message: lanLinks.length ? "LAN ready — connecting to the internet…" : "Connecting to the internet…" })

    // ── route 1: Cloudflare quick tunnel ──────────────────────────────────────
    let tunnelErr = null
    if (env.MS_HOST_TUNNEL !== "off") {
      try {
        let found = findCloudflared({ bundledDir: bundledCloudflaredDir, cacheDir, env })
        if (!found && env.MS_CLOUDFLARED) throw new Error(`MS_CLOUDFLARED points at a missing file`)
        if (!found && env.MS_CLOUDFLARED_DOWNLOAD === "off") throw new Error("cloudflared not installed (download disabled)")
        if (!found) found = await downloadCloudflared({ cacheDir, onProgress: (p) => { if (my === gen) set({ progress: p, message: p.text }) } })
        if (my !== gen) return publicState()
        set({ message: "Opening a Cloudflare tunnel…", progress: null, tunnelSource: found.source })
        tunnel = new QuickTunnel({ bin: found.bin, port })
        tunnel.on("log", (l) => log(`[cloudflared] ${l}`))
        tunnel.on("url", (url) => {
          if (my !== gen) return
          srv.setPublicOrigins([url])
          set({ route: "tunnel", publicOrigin: url, publicLink: joinLinkFor(url, state.room), message: "Online — anyone with the link can join." })
        })
        tunnel.on("down", () => { if (my === gen && state.route === "tunnel") set({ message: "Tunnel dropped — reconnecting (the link will change)…" }) })
        await tunnel.start()
        return publicState()
      } catch (e) {
        tunnelErr = e.message
        log(`[host] tunnel unavailable: ${e.message}`)
        if (tunnel) { tunnel.killNow(); tunnel = null }
        if (my !== gen) return publicState()
      }
    } else tunnelErr = "disabled"

    // ── route 2: UPnP (only claimed if verified) ──────────────────────────────
    let upnpErr = null
    if (env.MS_HOST_UPNP !== "off") {
      set({ message: "Tunnel unavailable — trying router port mapping (UPnP)…" })
      try {
        const gw = await upnp.discover()
        if (!gw) throw new Error("no UPnP router found")
        await upnp.mapPort(gw, { port })
        upnpGw = gw
        const ip = await upnp.getExternalIp(gw)
        if (!ip) throw new Error("router did not report a public IP")
        const ok = await upnp.verifyReachable(ip, port, srv.instanceId)
        if (my !== gen) return publicState()
        if (!ok) throw new Error(`mapped ${ip}:${port} but could not verify it from here (router may lack hairpin NAT)`)
        const origin = `http://${ip}:${port}`
        srv.setPublicOrigins([origin])
        set({ route: "upnp", publicOrigin: origin, publicLink: joinLinkFor(origin, state.room), message: "Online via router port mapping (verified)." })
        return publicState()
      } catch (e) {
        upnpErr = e.message
        if (upnpGw) { await upnp.unmapPort(upnpGw, { port }); upnpGw = null }
      }
    } else upnpErr = "disabled"

    if (my === gen) {
      set({ route: "lan", message: `Internet hosting unavailable (tunnel: ${tunnelErr}; UPnP: ${upnpErr}). People on your own network can still join with the LAN link.` })
    }
    return publicState()
  }

  async function stop() {
    gen++
    const t = tunnel, s = srv, gw = upnpGw, p = state.port
    tunnel = null; srv = null; upnpGw = null
    if (t) await t.stop()
    if (gw) await upnp.unmapPort(gw, { port: p })
    if (s) await s.close()
    set({ status: "offline", route: null, port: null, room: null, hostToken: null, publicLink: null, publicOrigin: null, lanLinks: [], players: [], connections: 0, progress: null, message: "Hosting stopped." })
    return publicState()
  }

  // Synchronous last-resort cleanup for app exit (no orphaned cloudflared even if async stop can't finish).
  function killNow() {
    gen++
    if (tunnel) tunnel.killNow()
    if (srv) { try { srv.server.closeAllConnections?.(); srv.server.close() } catch {} }
  }

  return { start, stop, killNow, state: publicState, server: () => srv, tunnel: () => tunnel }
}
