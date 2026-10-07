// Multiverse Smash — SECOND-SCREEN controller (game-side transport + window placement).
// OPT-IN: this module is DYNAMICALLY imported by game.js only when the "Second Screen" setting is
// turned ON. When OFF it is never loaded → the default game graph is unchanged.
//
// It is a thin, ONE-WAY sender: game.js builds plain read-only snapshot/meta objects and hands them
// to post(); this module forwards them over BroadcastChannel("mv-companion") and manages the companion
// window's placement. It holds NO game state, imports NO game code, and NEVER receives on the channel
// (there is no inbound path — the companion can never write back).

const CHANNEL = "mv-companion";
const COMPANION_URL = "index.html?view=companion";

export const SecondScreen = {
  _chan: null,
  _win: null,
  _enabled: false,

  isEnabled() { return this._enabled; },

  // Open the channel (+ companion window). Safe to call repeatedly.
  async enable({ openWindow = true } = {}) {
    if (this._enabled) { if (openWindow) this.openCompanion(); return; }
    try { this._chan = new BroadcastChannel(CHANNEL); } catch (_) { this._chan = null; }
    this._enabled = true;
    if (openWindow) this.openCompanion();
  },

  // Tear everything down → companion shows "disconnected"; standalone returns to exactly prior behavior.
  disable() {
    try { this._chan && this._chan.postMessage({ k: "bye" }); } catch (_) {}
    this.closeCompanion();
    try { this._chan && this._chan.close(); } catch (_) {}
    this._chan = null;
    this._enabled = false;
  },

  // Forward a pre-built, read-only message. No-op unless enabled.
  post(msg) {
    if (!this._enabled || !this._chan) return;
    try { this._chan.postMessage(msg); } catch (_) {}
  },

  // Open the companion window and (best-effort) place it on a secondary display.
  openCompanion() {
    if (typeof window === "undefined" || !window.open) return;
    if (this._win && !this._win.closed) { try { this._win.focus(); } catch (_) {} return; }

    // Browser: use the Window Management API for precise placement on an external screen, if granted.
    // Everything else (no API / permission denied / Electron) falls through to a plain window.open —
    // in Electron the main process's window-open handler positions it on display #2; in a browser the
    // user drags it to the other monitor.
    if (window.getScreenDetails) {
      window.getScreenDetails().then(sd => {
        const ext = (sd.screens || []).find(s => !s.isPrimary) || sd.currentScreen;
        if (ext && ext.availWidth) {
          const feat = `popup=yes,left=${ext.availLeft},top=${ext.availTop},width=${ext.availWidth},height=${ext.availHeight}`;
          this._win = window.open(COMPANION_URL, "mv-companion", feat);
        } else {
          this._win = window.open(COMPANION_URL, "mv-companion");
        }
      }).catch(() => { this._win = window.open(COMPANION_URL, "mv-companion"); });
    } else {
      this._win = window.open(COMPANION_URL, "mv-companion");
    }
  },

  closeCompanion() {
    try { if (this._win && !this._win.closed) this._win.close(); } catch (_) {}
    this._win = null;
  }
};

export default SecondScreen;
