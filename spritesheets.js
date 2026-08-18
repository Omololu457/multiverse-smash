
// spritesheets.js
// ─────────────────────────────────────────────────────────────────
// PER-CHARACTER SPRITE REGISTRY
// ─────────────────────────────────────────────────────────────────
// The engine draws horizontal sprite STRIPS: one PNG per action, frames laid
// left → right, every frame the same size. SpriteHandler (sprite.js) picks the
// action from fighter state and draws frame N at (N × frameWidth).
//
// ── HOW TO GIVE A FIGHTER SPRITES ────────────────────────────────
// 1. Make one strip PNG per action (idle/walk/jump/light/heavy/hurt/…).
//      e.g. sukuna_idle_sheet.png = [f0][f1][f2][f3]
// 2. Add an entry below under the character's `rosterKey`.
//      • Array form (convention):  files are ./<prefix>_<action>_sheet.png
//      • Object form (explicit):   give each action its own path
// 3. In characters.js set `hasSprites: true` and an `animationData` block that
//    declares { frames, width, height, speed } for each action.
// Missing sheets safely fall back to the procedural drawing — partial sets work.
//
// Action names must match what SpriteHandler._resolveAction() produces. The
// always-available ones: idle, walk, run, jump, fall, hurt, dash, light, heavy,
// up, air, down_air. (Specials show idle frames unless you also map them.)
// ─────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════
// GOJO SPRITE SPEC — replacement-art contract  (DO NOT delete current sheets)
// ───────────────────────────────────────────────────────────────────
// The Gojo art is being replaced with higher-quality sheets the user supplies.
// To swap them in: overwrite each file below IN PLACE with a new strip that
// matches its { frames × width × height }. Filenames and the manifest stay the
// same, so the game keeps running on the current sheets until each is replaced.
// Frame counts / dimensions are the engine's source of truth in
// characters.js → gojo.animationData (mirrored here for the artist's reference).
// If a new sheet uses a different layout, change BOTH this list and that block.
//
//   FILE                            FRAMES  CELL (WxH)   NOTES
//   gojo_idle_sheet.png              6       128×128     breathing loop
//   gojo_walk_sheet.png              8       128×128     walk cycle
//   gojo_jump_sheet.png              4       128×128     jump/rise→fall
//   gojo_hurt_sheet.png              2       128×128     flinch
//   gojo_light_sheet.png             5       128×128     jab (startup 0-1 / active 2-3 / recovery 4)
//   gojo_heavy_sheet.png             7       128×128     heavy (0-2 / 3-4 / 5-6)
//   gojo_blue_sheet.png              6       128×128     Blue special
//   gojo_red_sheet.png               6       128×128     Red special
//   gojo_hollow_purple_sheet.png    10       256×128     Purple — WIDE cells (0-4 / 5-8 / 9)
//   gojo_infinity_sheet.png          4       128×128     Infinity aura loop
//   gojo_teleport_sheet.png          4       128×128     teleport blink
//
// Strip format: frames laid left→right, every cell identical size, transparent
// background, character centered/feet-aligned consistently across all sheets.
// (gojo_win.png is a single still, not an animation strip.)
// ═══════════════════════════════════════════════════════════════════
export const SPRITE_MANIFEST = {
  // Gojo's existing ./gojo_<action>_sheet.png strips. Replacement art must keep
  // these exact filenames + the per-action layout documented in GOJO SPRITE SPEC
  // above. Sheets that haven't been replaced yet still load fine.
  gojo: {
    prefix: "gojo",
    actions: ["idle", "walk", "jump", "light", "heavy", "hurt", "blue", "red", "hollow_purple", "infinity", "teleport"]
  },

  // Sukuna. NOTE: actual per-action rendering reads the `sheet` path from
  // characters.js → animationData (via animationProfile.js), NOT this list — this
  // manifest entry exists only so getSpriteSheets()/spritesReady() can decode the
  // idle sheet and gate Sukuna onto the SpriteHandler. The movement filenames
  // below happen to match the ./sukuna_<action>_sheet.png convention.
  sukuna: {
    prefix: "sukuna",
    actions: ["idle", "walk", "jump", "dash", "hurt"]
  },

  // Alternate Sukuna (rosterKey alt_sukuna) — a SEPARATE char from `sukuna` above, built from the
  // Cinontk/Bitsverse644 rip (sukuna_row_*). Gates spritesReady() only (decodes idle → flips it from
  // procedural box to sprite handler); per-action rendering reads characters.js → altSukuna.animationData
  // (each action carries its own reslice_alt_sukuna.py _uniform .sheet).
  alt_sukuna: {
    actions: { idle: "./alt_sukuna_idle_uniform.png" }
  },

  // Aoi Todo (rosterKey aoi_todo, JJK) — GREEN chroma-key rip by akuma animation / MichelST. Gates
  // spritesReady() only (decodes idle → flips from procedural box to sprite handler); per-action
  // rendering reads characters.js → aoiTodo.animationData (each carries its own reslice_aoi_todo.py sheet).
  aoi_todo: {
    actions: { idle: "./aoi_todo_idle_uniform.png" }
  },

  // Maki Zenin (JJK). Only gates spritesReady() by decoding idle; per-action
  // rendering reads the `sheet` paths from characters.js → maki.animationData
  // (reslice_strip'd _uniform copies). See MAKI_ASSET_MAP.md.
  maki: {
    actions: { idle: "./maki_new_idle_uniform.png" }   // NEW clean 4-frame idle (old maki_idle.png had a 96px double-frame glitch)
  },

  // Toji Fushiguro (JJK). GATES spritesReady() only (decodes idle → flips Toji from box to
  // sprite); per-action rendering reads the `sheet` paths from characters.js → toji.animationData
  // (reslice_strip'd toji_*_uniform copies; raw uploads kept in _toji_raw_backup/). See TOJI_ASSET_MAP.md.
  toji: {
    actions: { idle: "./toji_idle_uniform.png" }
  },

  // Baki Hanma (Baki the Grappler). GATES spritesReady() only (decodes idle → flips Baki from box to
  // sprite); per-action rendering reads the `sheet` paths from characters.js → baki.animationData
  // (tools/repack_baki.py'd baki_*_uniform copies from baki_sliced/). See BAKI_ASSET_MAP / BAKI_BUILD_PROMPT.
  baki: {
    actions: { idle: "./baki_idle_uniform.png" }
  },

  // Obito Uchiha (Naruto). GATES spritesReady() only (decodes idle → flips Obito from box to
  // sprite); per-action rendering reads the `sheet` paths from characters.js → obito.animationData
  // (tools/reslice_obito.py'd obito_*_uniform copies). See OBITO_ASSET_MAP.md.
  obito: {
    actions: { idle: "./obito_idle_uniform.png" }
  },

  // Tobi (masked Obito alias, Naruto). FULLY SEPARATE from obito above. GATES spritesReady() only
  // (decodes idle → flips Tobi from box to sprite); per-action rendering reads the `sheet` paths
  // from characters.js → tobi.animationData (tools/reslice_tobi.py'd masked_man_*_uniform copies).
  tobi: {
    actions: { idle: "./masked_man_idle_uniform.png" }
  },

  // Kasumi Miwa (JJK). GATES spritesReady() only (decodes idle → flips Miwa from box
  // to sprite); per-action rendering reads `sheet` paths from characters.js →
  // miwa.animationData (reslice_strip'd kasumi_*_uniform copies). See MIWA_ASSET_MAP.md.
  miwa: {
    actions: { idle: "./kasumi_idle_uniform.png" }
  },

  // Yuji Itadori (JJK). Gates spritesReady() only (decoding idle flips Yuji from box to sprite);
  // per-action rendering reads characters.js → yuji.animationData (reslice'd yuji_*_uniform copies).
  // See YUJI_ASSET_MAP.md.
  yuji: {
    actions: { idle: "./yuji_idle_uniform.png" }
  },

  // Base Goku (Dragon Ball). Sliced from goku_base_FULLSHEET_transparent.png.
  // This entry only GATES spritesReady() (decodes idle → flips Goku from box to
  // sprite); per-action rendering reads the `sheet` paths from characters.js →
  // goku.animationData. Files follow the ./goku_<action>_sheet.png convention.
  // BASE only — kept separate from the goku_ssj_god_* set.
  // MK-feel Stage 5: Goku (BASE) manifest entry REMOVED (commented, not deleted) → procedural renderer.
  // animationData intact in characters.js; restore this entry (+ hasSprites:true) to bring sprites back.
  // goku: {
  //   // ATLAS: one shared sheet; per-action source rects (sourceX/sourceY/width/height)
  //   // live in characters.js → goku.animationData. This entry only gates spritesReady()
  //   // by decoding the shared sheet once.
  //   actions: { idle: "./goku_base_FULLSHEET_transparent.png" }
  // },

  // KCM Naruto (universe: naruto — his own universe, NOT the GojoV1 JJK beta).
  // Sliced JUS strips, one PNG per action; per-action rendering reads the `sheet`
  // paths from characters.js → naruto.animationData. This entry ONLY gates
  // spritesReady() by decoding the stance (idle) strip → flips Naruto from box to
  // sprite. Non-convention filenames → object form.
  naruto: {
    actions: { idle: "./naruto_kcm_stance.png" }
  },

  // Sasuke (universe: naruto) — PHASE 1: idle only. This entry ONLY gates spritesReady() by
  // decoding the stance strip → flips Sasuke from box to sprite. Per-action rendering reads
  // characters.js → sasuke.animationData. Note the existing filename typo "saske" — as-is.
  sasuke: {
    actions: { idle: "./saske_stance_2.png" }
  },

  // Itachi (universe: naruto) — STAGE 1. Gates spritesReady() by decoding the idle strip → flips
  // Itachi from box to sprite. Per-action rendering reads characters.js → itachi.animationData
  // (each action carries its own .sheet). Object form; idle is the RE-SLICED uniform strip.
  itachi: {
    actions: { idle: "./itachi_melle_idle_uniform.png" }
  },

  // Tobirama (universe: naruto) — STAGE 1. Gates spritesReady() by decoding the idle strip → flips
  // Tobirama from box to sprite. Per-action rendering reads characters.js → tobirama.animationData
  // (each action carries its own .sheet). Object form; idle is the RE-SLICED uniform strip.
  tobirama: {
    actions: { idle: "./tobirama_idle_uniform.png" }
  },

  // Hashirama (universe: naruto) — STAGE 1. Gates spritesReady() by decoding the idle strip → flips
  // Hashirama from procedural box to sprite handler. Per-action rendering reads characters.js →
  // hashirama.animationData (each action carries its own .sheet). Object form; idle is the RE-SLICED
  // uniform strip (tools/reslice_strip.mjs).
  hashirama: {
    actions: { idle: "./hashirama_idle_uniform.png" }
  },

  // Minato (universe: naruto) — STAGE 1. Gates spritesReady() by decoding the idle strip → flips
  // Minato from box to sprite. Per-action rendering reads characters.js → minato.animationData
  // (each action carries its own .sheet). Object form; idle is the RE-SLICED uniform strip.
  minato: {
    actions: { idle: "./minato_idle_uniform.png" }
  },

  // Madara (universe: naruto) — STAGE 1. Gates spritesReady() by decoding the idle strip → flips
  // Madara from procedural box to sprite. Per-action rendering reads characters.js → madara.animationData
  // (each action carries its own .sheet). Object form; idle is the RE-SLICED uniform strip.
  madara: {
    actions: { idle: "./madara2_idle_1_uniform.png" }
  },

  // Onoki (universe: naruto), the Third Tsuchikage — STAGE 1. Gates spritesReady() by decoding the idle
  // strip → flips Onoki from procedural box to sprite handler. Per-action rendering reads characters.js →
  // onoki.animationData (each action, incl. the dedicated fly/flyMove flight art, carries its own .sheet).
  // Object form; idle is the RE-SLICED uniform strip (tools/reslice_onoki.py).
  onoki: {
    actions: { idle: "./onoki_idle_uniform.png" }
  },

  // Deathstroke (universe: dc), Slade Wilson — STAGE 1. Gates spritesReady() by decoding the idle strip
  // → flips Deathstroke from procedural box to sprite handler. Per-action rendering reads characters.js →
  // deathstroke.animationData (each action carries its own .sheet). Idle is the RE-SLICED uniform strip
  // (tools/reslice_deathstroke.py). Multi-weapon (sword/gun/martial) self-contained moveset.
  deathstroke: {
    actions: { idle: "./deathstroke_idle_uniform.png" }
  },

  // Yuta Okkotsu (universe: jujutsu_kaisen) — STAGE 1. Gates spritesReady() by decoding the idle strip
  // → flips Yuta from procedural box to sprite handler. Per-action rendering reads characters.js →
  // yuta.animationData (each action carries its own .sheet). Idle is the RE-SLICED uniform strip
  // (tools/reslice_yuta.py). Sword-and-cursed-energy technician; Rika = AI assist ult (later stage).
  yuta: {
    actions: { idle: "./yuta_idle_uniform.png" }
  },

  // Brainiac (universe: dc), Coluan all-special ZONER — STAGE 1. Gates spritesReady() by decoding the
  // idle strip → flips Brainiac from procedural box to sprite handler. Per-action rendering reads
  // characters.js → brainiac.animationData (each action carries its own .sheet). Idle is the RE-SLICED
  // uniform strip (tools/reslice_brainiac.py).
  brainiac: {
    actions: { idle: "./brainiac_idle_uniform.png" }
  },

  // Green Lantern / Hal Jordan (universe: dc), flying construct-based zoner/mixup — STAGE 1. Gates
  // spritesReady() by decoding the idle strip → flips GL from procedural box to sprite handler. Per-
  // action rendering reads characters.js → green_lantern.animationData (each action carries its own
  // .sheet). Idle is the ASSEMBLED uniform strip (tools/reslice_green_lantern.py, from frames 005–008).
  green_lantern: {
    actions: { idle: "./gl_idle_uniform.png" }
  },

  // Spider-Man (universe: marvel), acrobatic evasive web-technician — STAGE 1. Gates spritesReady()
  // by decoding the idle strip → flips Spider-Man from procedural box to sprite handler. Per-action
  // rendering reads characters.js → spiderman.animationData (each action carries its own .sheet). Idle
  // is the RE-SLICED uniform strip (tools/reslice_spiderman.py). CPS2 arcade rip (Alvin-Earthworm).
  spiderman: {
    actions: { idle: "./spiderman_idle_uniform.png" }
  },

  // Naoya Zenin (universe: jujutsu_kaisen), Projection-Sorcery frame-trap technician — STAGE 1. Gates
  // spritesReady() by decoding the idle strip → flips Naoya from procedural box to sprite handler. Per-action
  // rendering reads characters.js → naoya.animationData (each action carries its own .sheet). Idle is the
  // RE-SLICED uniform strip (tools/reslice_naoya.py).
  naoya: {
    actions: { idle: "./naoya_idle_uniform.png" }
  },

  // Kiba Inuzuka (universe: naruto), Inuzuka-clan beast-fusion rushdown — STAGE 1. Gates spritesReady()
  // by decoding the idle strip → flips Kiba from procedural box to sprite handler. Per-action rendering
  // reads characters.js → kiba.animationData (each action carries its own .sheet). Idle is the RE-SLICED
  // uniform strip (tools/reslice_kiba.py).
  kiba: {
    actions: { idle: "./kiba_idle_uniform.png" }
  },

  // Boruto Uzumaki (universe: naruto), versatile new-era shinobi — STAGE 1. Gates spritesReady() by
  // decoding the idle strip → flips Boruto from procedural box to sprite handler. Per-action rendering
  // reads characters.js → boruto.animationData (each action carries its own .sheet). Idle is the RE-SLICED
  // ping-pong uniform strip (tools/reslice_boruto.py).
  boruto: {
    actions: { idle: "./boruto_idle_uniform.png" }
  },

  // Mayuri Kurotsuchi (universe: bleach), 12th-Division captain — STAGE 1. Gates spritesReady() by
  // decoding the idle strip → flips Mayuri from procedural box to sprite handler. Per-action rendering
  // reads characters.js → mayuri.animationData (each action carries its own .sheet). Idle is the
  // RE-SLICED uniform strip (tools/reslice_mayuri.py).
  mayuri: {
    actions: { idle: "./mayuri_idle_uniform.png" }
  },

  // Yamamoto Genryūsai (universe: bleach), Captain-Commander — STAGE 1. Gates spritesReady() by decoding
  // the idle strip → flips Yamamoto from procedural box to sprite handler. Per-action rendering reads
  // characters.js → yamamoto.animationData (each action carries its own .sheet). Idle is the RE-SLICED
  // BODY+PROP composite strip (tools/reslice_yamamoto.py; cane composited in-hand at native coords).
  yamamoto: {
    actions: { idle: "./yamamoto_idle_uniform.png" }
  },

  // Byakuya Kuchiki (universe: bleach), Squad-6 captain / Shunpo swordsman — STAGE 2. Gates spritesReady()
  // by decoding the idle strip → flips Byakuya from procedural box to sprite handler. Per-action rendering
  // reads characters.js → byakuya.animationData (each action carries its own .sheet). Idle is the RE-SLICED
  // uniform strip (tools/reslice_byakuya.py).
  byakuya: {
    actions: { idle: "./byakuya_idle_uniform.png" }
  },

  // Light Yagami (universe: deathnote), Death Note's Kira / special-heavy zoner — STAGE 1. Gates
  // spritesReady() by decoding the idle strip → flips Light from procedural box to sprite. Per-action
  // rendering reads characters.js → light.animationData (each action carries its own .sheet). Idle is the
  // RE-SLICED uniform strip (tools/reslice_light.py).
  light: {
    actions: { idle: "./light_idle_uniform.png" }
  },

  // L "Ryuuzaki" (universe: deathnote) — STAGE 1. Gates spritesReady() by decoding the idle strip →
  // flips L from procedural box to sprite. Per-action rendering reads characters.js →
  // lRyuuzaki.animationData (each action carries its own .sheet). idle is the RE-SLICED uniform strip.
  l_ryuuzaki: {
    actions: { idle: "./l_ryuuzaki_idle_uniform.png" }
  },

  // Pain / Nagato's Deva Path (universe: naruto) — STAGE 1. Gates spritesReady() by decoding the idle
  // strip → flips Pain from procedural box to sprite. Per-action rendering reads characters.js →
  // pain.animationData (each action carries its own .sheet). Idle is the RE-SLICED uniform strip.
  pain: {
    actions: { idle: "./pain_idle_uniform.png" }
  },

  // Netero (universe: hunter_x_hunter) — STAGE 1. Gates spritesReady() by decoding the idle strip →
  // flips Netero from box to sprite. Per-action rendering reads characters.js → netero.animationData
  // (each action carries its own .sheet). Object form; idle is the RE-SLICED uniform strip.
  netero: {
    actions: { idle: "./netero_idle_uniform.png" }
  },

  // Chrollo Lucilfer (universe: hunter_x_hunter) — STAGE 1. Gates spritesReady() by decoding the idle
  // strip → flips Chrollo from procedural box to sprite. Per-action rendering reads characters.js →
  // chrollo.animationData (each action carries its own .sheet). idle is the RE-SLICED uniform strip.
  chrollo: {
    actions: { idle: "./chrollo_idle_uniform.png" }
  },

  // Saiki Kusuo (universe: saiki_k) — gates spritesReady() by decoding the idle strip → flips Saiki
  // from procedural box to sprite. Per-action rendering reads characters.js → saiki.animationData
  // (each action carries its own .sheet). idle is the RE-SLICED uniform strip.
  saiki: {
    actions: { idle: "./saiki_idle_u.png" }
  },

  // Killua Zoldyck (universe: hunter_x_hunter) — STAGE 1. Gates spritesReady() by decoding the idle
  // strip → flips Killua from procedural box to sprite. Per-action rendering reads characters.js →
  // killua.animationData (each action carries its own .sheet). ATLASED (Stage 22B): idle now points
  // at the packed atlas so spritesReady() decodes the SAME image the actions use — no extra request.
  killua: {
    actions: { idle: "./killua_atlas.png" }
  },

  // Gon Freecss (universe: hunter_x_hunter) — STAGE 1. Gates spritesReady() by decoding the idle strip →
  // flips Gon from procedural box to sprite. Per-action rendering reads characters.js → gon.animationData
  // (each action carries its own .sheet). idle = the STANCE row extracted from the master sheet + resliced.
  gon: {
    actions: { idle: "./gon_atlas.png" }   // ATLASED (Stage 22B) — spritesReady decodes the atlas
  },

  // The Flash (universe: dc) — STAGE 1. Gates spritesReady() by decoding the idle strip →
  // flips Flash from procedural box to sprite. Per-action rendering reads characters.js →
  // flash.animationData (each action carries its own .sheet). idle is the RE-SLICED uniform strip.
  flash: {
    actions: { idle: "./flash_atlas.png" }   // ATLASED (Stage 22B) — spritesReady decodes the atlas
  },

  // Batman (universe: dc) — STAGE 1. Gates spritesReady() by decoding the idle strip →
  // flips Batman from procedural box to sprite. Per-action rendering reads characters.js →
  // batman.animationData (each action carries its own .sheet). idle is the RE-SLICED uniform strip.
  batman: {
    actions: { idle: "./batman_idle_uniform.png" }
  },

  // Hisoka Morrow (universe: hunter_x_hunter). Gates spritesReady() by decoding the idle strip
  // → flips Hisoka from procedural box to sprite. Per-action rendering reads characters.js →
  // hisoka.animationData (each action carries its own .sheet).
  hisoka: {
    actions: { idle: "./hisoka_idle_uniform.png" }
  },

  // Superman (universe: dc) — STAGE 1. Gates spritesReady() by decoding the idle strip → flips Superman
  // from procedural box to sprite. Per-action rendering reads characters.js → superman.animationData
  // (each action carries its own .sheet). idle is the RE-SLICED floating-hover strip.
  superman: {
    actions: { idle: "./superman_idle_uniform.png" }
  },

  // Rick Sanchez (universe: rick_and_morty). Gates spritesReady() by decoding the idle strip →
  // flips Rick from procedural box to sprite. Per-action rendering reads characters.js →
  // rick.animationData (each action carries its own .sheet).
  rick: {
    actions: { idle: "./rick_stand.png" }
  },

  // Beerus (dragon_ball) — gates spritesReady() by decoding the idle strip. Per-action
  // rendering reads each sheet path from characters.js animationData.
  beerus: {
    actions: { idle: "./beerus_idle_u.png" }
  },

  // Goku Black (universe: dragon_ball) — SEPARATE character from `goku`. Gates spritesReady() by
  // decoding the idle strip → flips Goku Black from procedural box to sprite. Per-action rendering
  // reads characters.js → gokuBlack.animationData (each action carries its own .sheet).
  goku_black: {
    actions: { idle: "./black_goku_idle.png" }
  },

  // Vegeta (universe: dragon_ball) — STAGE 1. Gates spritesReady() by decoding the idle
  // strip → flips Vegeta from procedural box to sprite. Per-action rendering reads
  // characters.js → vegeta.animationData (each action carries its own .sheet). Object form
  // because the real files are ./vegeta_base_<action>.png, NOT the _sheet convention.
  vegeta: {
    actions: { idle: "./vegeta_base_idle.png" }
  },

  // Omega Ranger (universe: power_rangers) — the one real sprited ranger. Gates spritesReady()
  // by decoding the idle strip → flips it from procedural box to sprite. Per-action rendering
  // reads characters.js → omega_ranger.animationData (each action carries its own .sheet).
  omega_ranger: {
    actions: { idle: "./omega_ranger_idle.png" }
  },

  // Samurai Red Ranger (universe: power_rangers) — SECOND sprited ranger. Same idle-strip gate:
  // decoding it flips the ranger from procedural box to the sprite path. Per-action rendering reads
  // characters.js → samuraiRedRanger.animationData (each action carries its own .sheet). idle =
  // the RE-SLICED uniform strip (tools/reslice_strip.mjs). See SAMURAI_RED_RANGER_ASSET_MAP.md.
  samurai_red_ranger: {
    actions: { idle: "./samurai_ranger_idle_uniform.png" }
  },
  gold_samurai_ranger: {
    actions: { idle: "./samurai_ranger_gold_idle_uniform.png" }
  },
  green_samurai_ranger: {
    actions: { idle: "./samurai_ranger_forest_idle_uniform.png" }
  },

  // Red Ranger (Jason, Mighty Morphin — universe: power_rangers) — FOURTH sprited ranger (first of the
  // classic MMPR team). Same idle-strip gate: decoding it flips spritesReady() from procedural box to
  // the sprite path. Per-action rendering reads characters.js → redRangerMmpr.animationData (each action
  // carries its own .sheet). idle = the RE-SLICED uniform strip (tools/reslice_strip.mjs).
  red_ranger_mmpr: {
    actions: { idle: "./red_ranger_mmpr_idle_uniform.png" }
  },

  // Jason Voorhees (universe: horror) — 2nd horror sprite char (after Ghostface). Same idle-strip
  // gate: decoding it flips spritesReady() from procedural box to the sprite path. Per-action
  // rendering reads characters.js → jason.animationData (each action carries its own .sheet).
  // idle = the RE-SLICED uniform strip (tools/reslice_jason.py). See JASON_ASSET_MAP.md.
  jason: {
    actions: { idle: "./jason_idle_uniform.png" }
  },

  // Hiruzen Sarutobi (universe: naruto) — the Third Hokage. Same idle-strip gate: decoding it flips
  // spritesReady() from procedural box to the sprite path. Per-action rendering reads characters.js →
  // hiruzen.animationData (each action carries its own .sheet). idle = the RE-SLICED uniform strip
  // (tools/reslice_hiruzen.py; dash/jump/back_jump were watermark-cleaned first). See HIRUZEN_ASSET_MAP.md.
  hiruzen: {
    actions: { idle: "./hiruzen_idle_uniform.png" }
  },

  // Orochimaru (universe: naruto) — the immortal Sannin. Same idle-strip gate: decoding it flips
  // spritesReady() from procedural box to the sprite path. Per-action rendering reads characters.js →
  // orochimaru.animationData (each action carries its own .sheet). idle = the RE-SLICED uniform strip
  // (tools/reslice_orochimaru.py). See OROCHIMARU_ASSET_MAP.md.
  orochimaru: {
    actions: { idle: "./orochimaru_idle_uniform.png" }
  },

  // Isshiki Otsutsuki (universe: naruto). Same idle-strip gate: decoding it flips spritesReady()
  // from procedural box to the sprite path. Per-action rendering reads characters.js →
  // isshiki.animationData (each action carries its own .sheet). idle = the RE-SLICED uniform strip
  // (tools/reslice_isshiki.py, which also splits hit_sheet's 4 baked-in actions). See ISSHIKI_ASSET_MAP.md.
  isshiki: {
    actions: { idle: "./isshiki_idle_uniform.png" }
  },

  // Saitama (universe: one_punch_man) — FIRST One Punch Man char. Same idle-strip gate: decoding it
  // flips spritesReady() from procedural box to the sprite path. Per-action rendering reads
  // characters.js → saitama.animationData (each action carries its own .sheet). idle = the RE-SLICED
  // uniform strip (tools/reslice_saitama.py). See SAITAMA_ASSET_MAP.md.
  saitama: {
    actions: { idle: "./saitama_idle_uniform.png" }
  },

  // Omni-Man (universe: invincible) — STAGE 0. Gates spritesReady() by decoding the idle strip →
  // flips Omni-Man from procedural box to sprite. Per-action rendering reads characters.js →
  // omniMan.animationData (each action carries its own .sheet). idle = omni_man_idle.png (3 clean
  // frames, no reslice needed). NOTE: several source sheets have colons in their filenames — keep the
  // "./" prefix on those paths (see OMNI_MAN_ASSET_MAP.md).
  omniman: {
    actions: { idle: "./omni_man_idle.png" }
  },

  // Zenitsu Agatsuma (universe: demon_slayer) — FIRST Demon Slayer sprite char. Gates
  // spritesReady() by decoding the idle strip → flips Zenitsu from procedural box to sprite.
  // Per-action rendering reads characters.js → zenitsu.animationData (each action carries its
  // own .sheet). idle = the RE-SLICED uniform strip (tools/reslice_strip.mjs). See ZENITSU_ASSET_MAP.md.
  zenitsu: {
    actions: { idle: "./zenitsu_idle_uniform.png" }
  },

  // Kyojuro Rengoku (universe: demon_slayer) — SECOND Demon Slayer sprite char. Same idle-strip
  // gate: decoding it flips Rengoku from procedural box to the sprite path. Per-action rendering
  // reads characters.js → rengoku.animationData (each action carries its own .sheet). See RENGOKU_ASSET_MAP.md.
  rengoku: {
    actions: { idle: "./rengoku_idle_uniform.png" }
  },

  // Shinobu Kocho (universe: demon_slayer) — THIRD Demon Slayer sprite char. Same idle-strip gate:
  // decoding it flips Shinobu from procedural box to the sprite path. Per-action rendering reads
  // characters.js → shinobu.animationData (each action carries its own .sheet). See SHINOBU_ASSET_MAP.md.
  shinobu: {
    actions: { idle: "./shinobu_idle_uniform.png" }
  },

  // Inosuke Hashibira (universe: demon_slayer) — FOURTH Demon Slayer sprite char. Idle-strip
  // gate: decoding it flips Inosuke from procedural box to the sprite path. Per-action rendering
  // reads characters.inosuke.animationData (each action carries its own .sheet). See INOSUKE_ASSET_MAP.md.
  inosuke: {
    actions: { idle: "./inosuke_idle_uniform.png" }
  },

  // Nezuko Kamado (universe: demon_slayer) — FIFTH Demon Slayer sprite char. Idle-strip
  // gate: decoding it flips Nezuko from procedural box to the sprite path. Per-action
  // rendering reads characters.nezuko.animationData (each action carries its own .sheet).
  // See NEZUKO_ASSET_MAP.md.
  nezuko: {
    actions: { idle: "./nezuko_idle.png" }
  },

  // Ben 10 (universe: ben_10) — STAGE 1. Gates spritesReady() by decoding the Ben-human
  // idle strip → flips Ben 10 from procedural drawBen10 box to the sprite path. Once ready,
  // per-action rendering reads characters.ben10.animationData (Ben-human) OR fighter._skinAnim
  // (XLR8/Diamondhead form sets in fighters.js). idle = the RE-SLICED uniform strip
  // (harness alpha-gutter repack). See BEN10_ASSET_MAP.md.
  ben10: {
    actions: { idle: "./ben10_idle_uniform.png" }
  },

  // Ghostface (universe: horror) — FIRST horror-universe sprite char. Same idle-strip gate:
  // decoding it flips Ghostface from procedural box to the sprite path. Per-action rendering
  // reads characters.js → ghostface.animationData (each action carries its own .sheet).
  // See GHOSTFACE_ASSET_MAP.md.
  ghostface: {
    actions: { idle: "./ghostface_idle_uniform.png" }
  },

  // Ichigo Kurosaki (universe: bleach) — STAGE 1. Gates spritesReady() by decoding the idle strip →
  // flips Ichigo from procedural box to sprite. Per-action rendering reads characters.js →
  // ichigo.animationData (each action carries its own .sheet). idle is the RE-SLICED uniform strip.
  ichigo: {
    actions: { idle: "./ichigo_idle_uniform.png" }
  },

  // Zaraki Kenpachi (universe: bleach) — STAGE 1. Gates spritesReady() by decoding the idle strip →
  // flips Zaraki from procedural box to sprite. Per-action rendering reads characters.js →
  // zaraki.animationData (each action carries its own .sheet). idle is the RE-SLICED uniform strip.
  zaraki: {
    actions: { idle: "./zaraki_idle_uniform.png" }
  },

  // Zaraki Kenpachi — SHIKAI (separate select entry). Gates spritesReady() by decoding the Shikai idle
  // strip → flips zaraki_shikai from procedural box to sprite. Per-action art = characters.zaraki_shikai.animationData.
  zaraki_shikai: {
    actions: { idle: "./zaraki_shikai_idle_uniform.png" }
  },

  // Six Paths of Pain (universe: naruto) — separate from solo `pain`. Gates spritesReady() by decoding
  // the Deva (base Path) idle strip → flips six_paths_pain from procedural box to sprite. Per-action /
  // per-Path art reads characters.six_paths_pain.animationData (Deva base) OR fighter._skinAnim (the
  // swapped-in Path anim set). See tools/reslice_six_paths_pain.py.
  six_paths_pain: {
    actions: { idle: "./sixpaths_deva_stance_uniform.png" }
  },

  // Kurapika (universe: hunter_x_hunter) — gates spritesReady() by decoding the idle strip → flips Kurapika
  // from procedural box to sprite. Per-action rendering reads characters.js → kurapika.animationData (each
  // action carries its own .sheet). idle is the RE-SLICED/DESPECKLED uniform strip (reslice_kurapika_build.py).
  kurapika: {
    actions: { idle: "./kurapika_idle_uniform.png" }
  }

  // ── TEMPLATE: copy, rename, drop your PNGs in, set hasSprites in characters.js
  // sukuna: {
  //   prefix: "sukuna",
  //   actions: ["idle", "walk", "jump", "light", "heavy", "hurt"]
  // },
  //
  // ── Object form when your filenames don't follow the convention:
  // yourchar: {
  //   actions: {
  //     idle:  "./art/yourchar/idle.png",
  //     walk:  "./art/yourchar/walk.png",
  //     light: "./art/yourchar/jab.png"
  //   }
  // }
}

// rosterKey → { action: HTMLImageElement } (cached; built once per character)
const _maps = new Map()

export function loadSpriteSheets(rosterKey) {
  if (!rosterKey) return null
  if (_maps.has(rosterKey)) return _maps.get(rosterKey)

  const entry = SPRITE_MANIFEST[rosterKey]
  if (!entry) { _maps.set(rosterKey, null); return null }

  const map = {}
  const actions = entry.actions

  if (Array.isArray(actions)) {
    const prefix = entry.prefix || rosterKey
    for (const action of actions) {
      const img = new Image()
      img.src = `./${prefix}_${action}_sheet.png`
      map[action] = img
    }
  } else if (actions && typeof actions === "object") {
    for (const [action, path] of Object.entries(actions)) {
      const img = new Image()
      img.src = path
      map[action] = img
    }
  }

  _maps.set(rosterKey, map)
  return map
}

// The sheet map for a fighter (lazy-loads on first request). null if no sprites.
export function getSpriteSheets(rosterKey) {
  return _maps.has(rosterKey) ? _maps.get(rosterKey) : loadSpriteSheets(rosterKey)
}

// True once the character's idle sheet has actually decoded — the gate that
// switches a fighter from procedural drawing to sprites.
export function spritesReady(rosterKey) {
  const map = getSpriteSheets(rosterKey)
  if (!map) return false
  const idle = map.idle
  return !!(idle && idle.complete && idle.naturalWidth > 0)
}

// Does this character have sprites registered at all?
export function hasSpriteManifest(rosterKey) {
  return !!SPRITE_MANIFEST[rosterKey]
}
