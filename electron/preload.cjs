// electron/preload.cjs — MSV1-HOST: the ONLY bridge between the game page and the main process.
//
// contextIsolation is on and nodeIntegration is off, so the page never sees Node, the filesystem, a shell or
// Electron itself. It gets this small, fixed API (window.msDesktop) and nothing else. The main process also
// re-checks every IPC call's sender (only our own window, only our own local origin).
const { contextBridge, ipcRenderer } = require("electron")

const listeners = { state: new Set(), join: new Set() }
ipcRenderer.on("host:state", (_e, s) => { for (const f of listeners.state) { try { f(s) } catch {} } })
ipcRenderer.on("host:join-request", (_e, r) => { for (const f of listeners.join) { try { f(r) } catch {} } })

contextBridge.exposeInMainWorld("msDesktop", Object.freeze({
  isDesktop: true,
  getState:     () => ipcRenderer.invoke("host:get-state"),
  startHosting: () => ipcRenderer.invoke("host:start"),
  stopHosting:  () => ipcRenderer.invoke("host:stop"),
  getSettings:  () => ipcRenderer.invoke("host:get-settings"),
  setAutoHost:  (on) => ipcRenderer.invoke("host:set-auto-host", !!on),
  ackNotice:    () => ipcRenderer.invoke("host:ack-notice"),
  copyText:     (text) => ipcRenderer.invoke("host:copy", String(text || "").slice(0, 2048)),
  checkRoom:    (link) => ipcRenderer.invoke("host:check-room", String(link || "").slice(0, 2048)),
  openReleases: () => ipcRenderer.invoke("host:open-releases"),
  takePendingJoin: () => ipcRenderer.invoke("host:take-pending-join"),
  onState: (f) => { if (typeof f === "function") listeners.state.add(f) },
  onJoinRequest: (f) => { if (typeof f === "function") listeners.join.add(f) },
}))
