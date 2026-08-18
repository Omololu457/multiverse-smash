// spidermanVoice.js
// ---------------------------------------------------------------------------
// Spider-Man (Marvel Rivals "Voice Lines & Efforts" pack) voice pools (audio-only; NO gameplay effect).
// 479 clips (spiderman_mr_001..479.mp3), silence-split from one 16:43 source. CLASSIFIED BY REAL CONTENT:
// every clip was transcribed with faster_whisper (tools/transcribe_spiderman_voice.py) and bucketed by
// what is actually said (tools/classify_spiderman_voice.py), NOT by filename/duration. The set splits
// ~456 spoken LINES (clips 1-456) + a wordless EFFORT/grunt cluster (clips ~457-479) — matching the
// "Voice Lines & Efforts" source name.
//
// pickSpidermanVoice(pool) -> ONE clip at random; callers play it via sound.playSfxFile(clip, null).
//
// ── TRIGGER MAP (hooks in game.js / combat.js / abilities.js) ──
//   intro      -> pre-match reveal beat                     game.js INTRO_VOICE table
//   quip       -> lands a STRONG/long-string hit + on TAUNT combat.applySpidermanOffenseVoice + game.js taunt-commit
//   effort     -> LIGHT-normal strike grunt (cooldown)      combat.applySpidermanAttackVoice
//   hitLight   -> takes a LIGHT hit — short pain grunt       combat.applySpidermanHitVoice
//   hitHeavy   -> takes a STRONG hit — louder pained line    combat.applySpidermanHitVoice
//   knockdown  -> knocked down — the falling scream          combat.js knockdown watcher
//   webCast    -> Web Impact / Web Throw special casts       abilities.fireSpidermanWebImpact/WebThrow
//   ultimate   -> "Maximum Web" ultimate                     abilities.executeSpidermanUltimate
//   victory    -> win                                        game.js win dispatch
//
// ── CHATTY DESIGN ── Spider-Man is canonically talkative, so the huge generic-banter `quip` pool (the
// bulk of the spoken lines) rides the STRONG-connect trigger (Batman/Gon precedent) + the taunt action,
// gated by a long _atkVoiceCd so it is occasional flavor, not spam. The short EFFORT grunts ride the fast
// light-normal trigger separately.
//
// ── FLAGGED / BANKED (NOT wired — Step 4 honesty) ──
//   * 23 clips flagged POSSIBLE CUT-MID-LINE (silence-split severed a continuous sentence —
//     most START with a conjunction "because/and/but/or…"): [6, 39, 100, 116, 179, 197, 207, 212, 218, 225, 249, 251, 271, 275, 290, 291, 357, 360, 362, 366, 377, 381, 401]
//   * 6 clips flagged whisper HALLUCINATION/run-on (esp. clip 12 = 6 sentences in 0.64s): [12, 94, 292, 303, 346, 347]
//   * These + a few UI-number/one-word fragments are EXCLUDED from active pools (usable after a manual re-listen/re-split).
//   * Marvel-Rivals TEAM-SHOOTER context lines (healing/objectives/teammates) that survived into `quip`
//     read as generic Spidey banter in 1v1 — kept (a quip is a quip), flagged here for awareness.
// ---------------------------------------------------------------------------

export const SPIDERMAN_VOICE = {
  intro: [
    "spiderman_mr_002.mp3",       // Hi neighbor.
    "spiderman_mr_004.mp3",       // Oh, hey.
    "spiderman_mr_033.mp3",       // I'll be ready soon, I swear.
    "spiderman_mr_044.mp3",       // Hey Doreen.
    "spiderman_mr_062.mp3",       // Hey, we make a pretty good team.
    "spiderman_mr_085.mp3",       // I'm your friendly neighborhood spider-man. Only my n
    "spiderman_mr_213.mp3",       // Hey, Penny.
    "spiderman_mr_263.mp3",       // Hey.
    "spiderman_mr_267.mp3",       // Hey, sorry team! There's no bad guys left!
    "spiderman_mr_334.mp3",       // Hey, Hawkeye!
    "spiderman_mr_385.mp3",       // Hey, thanks.
    "spiderman_mr_430.mp3",       // Hey, there are people who think I'm as strong as you
  ],
  quip: [
    "spiderman_mr_001.mp3", "spiderman_mr_003.mp3", "spiderman_mr_005.mp3", "spiderman_mr_007.mp3", "spiderman_mr_008.mp3", "spiderman_mr_009.mp3",
    "spiderman_mr_010.mp3", "spiderman_mr_011.mp3", "spiderman_mr_013.mp3", "spiderman_mr_014.mp3", "spiderman_mr_015.mp3", "spiderman_mr_016.mp3",
    "spiderman_mr_017.mp3", "spiderman_mr_019.mp3", "spiderman_mr_020.mp3", "spiderman_mr_021.mp3", "spiderman_mr_022.mp3", "spiderman_mr_023.mp3",
    "spiderman_mr_024.mp3", "spiderman_mr_025.mp3", "spiderman_mr_026.mp3", "spiderman_mr_027.mp3", "spiderman_mr_029.mp3", "spiderman_mr_030.mp3",
    "spiderman_mr_031.mp3", "spiderman_mr_032.mp3", "spiderman_mr_034.mp3", "spiderman_mr_035.mp3", "spiderman_mr_036.mp3", "spiderman_mr_037.mp3",
    "spiderman_mr_038.mp3", "spiderman_mr_040.mp3", "spiderman_mr_041.mp3", "spiderman_mr_042.mp3", "spiderman_mr_045.mp3", "spiderman_mr_046.mp3",
    "spiderman_mr_047.mp3", "spiderman_mr_048.mp3", "spiderman_mr_049.mp3", "spiderman_mr_050.mp3", "spiderman_mr_051.mp3", "spiderman_mr_052.mp3",
    "spiderman_mr_053.mp3", "spiderman_mr_054.mp3", "spiderman_mr_055.mp3", "spiderman_mr_056.mp3", "spiderman_mr_057.mp3", "spiderman_mr_059.mp3",
    "spiderman_mr_060.mp3", "spiderman_mr_061.mp3", "spiderman_mr_063.mp3", "spiderman_mr_064.mp3", "spiderman_mr_065.mp3", "spiderman_mr_066.mp3",
    "spiderman_mr_067.mp3", "spiderman_mr_068.mp3", "spiderman_mr_069.mp3", "spiderman_mr_070.mp3", "spiderman_mr_071.mp3", "spiderman_mr_072.mp3",
    "spiderman_mr_073.mp3", "spiderman_mr_075.mp3", "spiderman_mr_076.mp3", "spiderman_mr_077.mp3", "spiderman_mr_078.mp3", "spiderman_mr_079.mp3",
    "spiderman_mr_080.mp3", "spiderman_mr_082.mp3", "spiderman_mr_083.mp3", "spiderman_mr_084.mp3", "spiderman_mr_086.mp3", "spiderman_mr_087.mp3",
    "spiderman_mr_088.mp3", "spiderman_mr_089.mp3", "spiderman_mr_090.mp3", "spiderman_mr_092.mp3", "spiderman_mr_093.mp3", "spiderman_mr_095.mp3",
    "spiderman_mr_096.mp3", "spiderman_mr_097.mp3", "spiderman_mr_098.mp3", "spiderman_mr_099.mp3", "spiderman_mr_101.mp3", "spiderman_mr_102.mp3",
    "spiderman_mr_103.mp3", "spiderman_mr_104.mp3", "spiderman_mr_105.mp3", "spiderman_mr_106.mp3", "spiderman_mr_107.mp3", "spiderman_mr_108.mp3",
    "spiderman_mr_109.mp3", "spiderman_mr_110.mp3", "spiderman_mr_111.mp3", "spiderman_mr_112.mp3", "spiderman_mr_113.mp3", "spiderman_mr_114.mp3",
    "spiderman_mr_115.mp3", "spiderman_mr_117.mp3", "spiderman_mr_118.mp3", "spiderman_mr_119.mp3", "spiderman_mr_120.mp3", "spiderman_mr_122.mp3",
    "spiderman_mr_123.mp3", "spiderman_mr_124.mp3", "spiderman_mr_125.mp3", "spiderman_mr_126.mp3", "spiderman_mr_127.mp3", "spiderman_mr_128.mp3",
    "spiderman_mr_129.mp3", "spiderman_mr_131.mp3", "spiderman_mr_132.mp3", "spiderman_mr_135.mp3", "spiderman_mr_136.mp3", "spiderman_mr_138.mp3",
    "spiderman_mr_139.mp3", "spiderman_mr_140.mp3", "spiderman_mr_141.mp3", "spiderman_mr_142.mp3", "spiderman_mr_143.mp3", "spiderman_mr_144.mp3",
    "spiderman_mr_145.mp3", "spiderman_mr_146.mp3", "spiderman_mr_147.mp3", "spiderman_mr_148.mp3", "spiderman_mr_149.mp3", "spiderman_mr_150.mp3",
    "spiderman_mr_151.mp3", "spiderman_mr_152.mp3", "spiderman_mr_154.mp3", "spiderman_mr_155.mp3", "spiderman_mr_156.mp3", "spiderman_mr_157.mp3",
    "spiderman_mr_158.mp3", "spiderman_mr_159.mp3", "spiderman_mr_160.mp3", "spiderman_mr_161.mp3", "spiderman_mr_162.mp3", "spiderman_mr_163.mp3",
    "spiderman_mr_164.mp3", "spiderman_mr_165.mp3", "spiderman_mr_166.mp3", "spiderman_mr_167.mp3", "spiderman_mr_168.mp3", "spiderman_mr_169.mp3",
    "spiderman_mr_170.mp3", "spiderman_mr_171.mp3", "spiderman_mr_172.mp3", "spiderman_mr_173.mp3", "spiderman_mr_174.mp3", "spiderman_mr_175.mp3",
    "spiderman_mr_176.mp3", "spiderman_mr_177.mp3", "spiderman_mr_178.mp3", "spiderman_mr_180.mp3", "spiderman_mr_181.mp3", "spiderman_mr_182.mp3",
    "spiderman_mr_183.mp3", "spiderman_mr_184.mp3", "spiderman_mr_185.mp3", "spiderman_mr_186.mp3", "spiderman_mr_187.mp3", "spiderman_mr_188.mp3",
    "spiderman_mr_189.mp3", "spiderman_mr_190.mp3", "spiderman_mr_191.mp3", "spiderman_mr_192.mp3", "spiderman_mr_193.mp3", "spiderman_mr_194.mp3",
    "spiderman_mr_195.mp3", "spiderman_mr_196.mp3", "spiderman_mr_198.mp3", "spiderman_mr_199.mp3", "spiderman_mr_200.mp3", "spiderman_mr_202.mp3",
    "spiderman_mr_203.mp3", "spiderman_mr_204.mp3", "spiderman_mr_205.mp3", "spiderman_mr_206.mp3", "spiderman_mr_208.mp3", "spiderman_mr_209.mp3",
    "spiderman_mr_210.mp3", "spiderman_mr_211.mp3", "spiderman_mr_214.mp3", "spiderman_mr_215.mp3", "spiderman_mr_216.mp3", "spiderman_mr_217.mp3",
    "spiderman_mr_219.mp3", "spiderman_mr_220.mp3", "spiderman_mr_221.mp3", "spiderman_mr_222.mp3", "spiderman_mr_223.mp3", "spiderman_mr_224.mp3",
    "spiderman_mr_226.mp3", "spiderman_mr_227.mp3", "spiderman_mr_228.mp3", "spiderman_mr_229.mp3", "spiderman_mr_230.mp3", "spiderman_mr_232.mp3",
    "spiderman_mr_233.mp3", "spiderman_mr_234.mp3", "spiderman_mr_235.mp3", "spiderman_mr_237.mp3", "spiderman_mr_238.mp3", "spiderman_mr_239.mp3",
    "spiderman_mr_240.mp3", "spiderman_mr_241.mp3", "spiderman_mr_242.mp3", "spiderman_mr_243.mp3", "spiderman_mr_244.mp3", "spiderman_mr_245.mp3",
    "spiderman_mr_246.mp3", "spiderman_mr_247.mp3", "spiderman_mr_250.mp3", "spiderman_mr_252.mp3", "spiderman_mr_253.mp3", "spiderman_mr_254.mp3",
    "spiderman_mr_255.mp3", "spiderman_mr_256.mp3", "spiderman_mr_257.mp3", "spiderman_mr_258.mp3", "spiderman_mr_259.mp3", "spiderman_mr_260.mp3",
    "spiderman_mr_262.mp3", "spiderman_mr_264.mp3", "spiderman_mr_265.mp3", "spiderman_mr_266.mp3", "spiderman_mr_268.mp3", "spiderman_mr_269.mp3",
    "spiderman_mr_270.mp3", "spiderman_mr_272.mp3", "spiderman_mr_273.mp3", "spiderman_mr_276.mp3", "spiderman_mr_277.mp3", "spiderman_mr_278.mp3",
    "spiderman_mr_279.mp3", "spiderman_mr_280.mp3", "spiderman_mr_281.mp3", "spiderman_mr_282.mp3", "spiderman_mr_283.mp3", "spiderman_mr_284.mp3",
    "spiderman_mr_285.mp3", "spiderman_mr_286.mp3", "spiderman_mr_287.mp3", "spiderman_mr_288.mp3", "spiderman_mr_289.mp3", "spiderman_mr_293.mp3",
    "spiderman_mr_294.mp3", "spiderman_mr_295.mp3", "spiderman_mr_296.mp3", "spiderman_mr_297.mp3", "spiderman_mr_299.mp3", "spiderman_mr_300.mp3",
    "spiderman_mr_301.mp3", "spiderman_mr_302.mp3", "spiderman_mr_304.mp3", "spiderman_mr_305.mp3", "spiderman_mr_306.mp3", "spiderman_mr_307.mp3",
    "spiderman_mr_308.mp3", "spiderman_mr_309.mp3", "spiderman_mr_310.mp3", "spiderman_mr_312.mp3", "spiderman_mr_313.mp3", "spiderman_mr_314.mp3",
    "spiderman_mr_315.mp3", "spiderman_mr_316.mp3", "spiderman_mr_317.mp3", "spiderman_mr_318.mp3", "spiderman_mr_320.mp3", "spiderman_mr_321.mp3",
    "spiderman_mr_322.mp3", "spiderman_mr_323.mp3", "spiderman_mr_324.mp3", "spiderman_mr_325.mp3", "spiderman_mr_326.mp3", "spiderman_mr_327.mp3",
    "spiderman_mr_328.mp3", "spiderman_mr_329.mp3", "spiderman_mr_330.mp3", "spiderman_mr_331.mp3", "spiderman_mr_332.mp3", "spiderman_mr_333.mp3",
    "spiderman_mr_335.mp3", "spiderman_mr_336.mp3", "spiderman_mr_337.mp3", "spiderman_mr_338.mp3", "spiderman_mr_339.mp3", "spiderman_mr_340.mp3",
    "spiderman_mr_341.mp3", "spiderman_mr_342.mp3", "spiderman_mr_343.mp3", "spiderman_mr_344.mp3", "spiderman_mr_345.mp3", "spiderman_mr_349.mp3",
    "spiderman_mr_350.mp3", "spiderman_mr_351.mp3", "spiderman_mr_352.mp3", "spiderman_mr_354.mp3", "spiderman_mr_355.mp3", "spiderman_mr_356.mp3",
    "spiderman_mr_358.mp3", "spiderman_mr_359.mp3", "spiderman_mr_361.mp3", "spiderman_mr_363.mp3", "spiderman_mr_364.mp3", "spiderman_mr_365.mp3",
    "spiderman_mr_368.mp3", "spiderman_mr_369.mp3", "spiderman_mr_370.mp3", "spiderman_mr_371.mp3", "spiderman_mr_372.mp3", "spiderman_mr_373.mp3",
    "spiderman_mr_374.mp3", "spiderman_mr_375.mp3", "spiderman_mr_376.mp3", "spiderman_mr_379.mp3", "spiderman_mr_380.mp3", "spiderman_mr_382.mp3",
    "spiderman_mr_383.mp3", "spiderman_mr_384.mp3", "spiderman_mr_386.mp3", "spiderman_mr_387.mp3", "spiderman_mr_388.mp3", "spiderman_mr_389.mp3",
    "spiderman_mr_390.mp3", "spiderman_mr_391.mp3", "spiderman_mr_392.mp3", "spiderman_mr_393.mp3", "spiderman_mr_394.mp3", "spiderman_mr_396.mp3",
    "spiderman_mr_397.mp3", "spiderman_mr_398.mp3", "spiderman_mr_400.mp3", "spiderman_mr_402.mp3", "spiderman_mr_403.mp3", "spiderman_mr_404.mp3",
    "spiderman_mr_405.mp3", "spiderman_mr_406.mp3", "spiderman_mr_407.mp3", "spiderman_mr_408.mp3", "spiderman_mr_409.mp3", "spiderman_mr_410.mp3",
    "spiderman_mr_411.mp3", "spiderman_mr_412.mp3", "spiderman_mr_413.mp3", "spiderman_mr_414.mp3", "spiderman_mr_416.mp3", "spiderman_mr_417.mp3",
    "spiderman_mr_418.mp3", "spiderman_mr_419.mp3", "spiderman_mr_420.mp3", "spiderman_mr_421.mp3", "spiderman_mr_422.mp3", "spiderman_mr_423.mp3",
    "spiderman_mr_424.mp3", "spiderman_mr_425.mp3", "spiderman_mr_426.mp3", "spiderman_mr_428.mp3", "spiderman_mr_429.mp3", "spiderman_mr_431.mp3",
    "spiderman_mr_432.mp3", "spiderman_mr_433.mp3", "spiderman_mr_434.mp3", "spiderman_mr_435.mp3", "spiderman_mr_436.mp3", "spiderman_mr_437.mp3",
    "spiderman_mr_438.mp3", "spiderman_mr_439.mp3", "spiderman_mr_440.mp3", "spiderman_mr_441.mp3", "spiderman_mr_442.mp3", "spiderman_mr_443.mp3",
    "spiderman_mr_444.mp3", "spiderman_mr_445.mp3", "spiderman_mr_446.mp3", "spiderman_mr_447.mp3", "spiderman_mr_448.mp3", "spiderman_mr_449.mp3",
    "spiderman_mr_450.mp3", "spiderman_mr_451.mp3", "spiderman_mr_452.mp3", "spiderman_mr_453.mp3", "spiderman_mr_454.mp3", "spiderman_mr_456.mp3",
  ],
  effort: [
    "spiderman_mr_457.mp3",       // HUH?
    "spiderman_mr_458.mp3",       // Ha!
    "spiderman_mr_461.mp3",       // Yeah!
    "spiderman_mr_464.mp3",       // HUH
    "spiderman_mr_465.mp3",       // Yeah!
    "spiderman_mr_468.mp3",       // Yeah.
    "spiderman_mr_469.mp3",       // Yeah!
    "spiderman_mr_471.mp3",       // Hah!
    "spiderman_mr_472.mp3",       // Ha!
    "spiderman_mr_473.mp3",       // HUH!
    "spiderman_mr_153.mp3",       // Yeah.
    "spiderman_mr_353.mp3",       // Yeah.
  ],
  hitLight: [
    "spiderman_mr_460.mp3",       // Ugh!
    "spiderman_mr_462.mp3",       // Oh.
    "spiderman_mr_466.mp3",       // Ugh!
    "spiderman_mr_474.mp3",       // Ugh!
    "spiderman_mr_476.mp3",       // Oh.
    "spiderman_mr_477.mp3",       // Ugh!
    "spiderman_mr_478.mp3",       // Ugh!
    "spiderman_mr_479.mp3",       // Ugh!
  ],
  hitHeavy: [
    "spiderman_mr_236.mp3",       // Ouch!
    "spiderman_mr_367.mp3",       // I'm hurt.
    "spiderman_mr_133.mp3",       // Jeez, that must have hurt.
    "spiderman_mr_360.mp3",       // If I get hit it's gonna hurt
  ],
  knockdown: [
    "spiderman_mr_463.mp3",       // AHHHHH!
    "spiderman_mr_467.mp3",       // AHHHHH!
    "spiderman_mr_470.mp3",       // AHHH!
    "spiderman_mr_475.mp3",       // No!
  ],
  webCast: [
    "spiderman_mr_134.mp3",       // Yo web whip!
    "spiderman_mr_094.mp3",       // What do you say we hit the webs?
    "spiderman_mr_261.mp3",       // Web shooters locked and loaded.
    "spiderman_mr_427.mp3",       // Alright, time to get my web on!
    "spiderman_mr_028.mp3",       // Spider-Nest, watch out!
    "spiderman_mr_121.mp3",       // Spider-Nest is empty!
    "spiderman_mr_201.mp3",       // Whoo hoo! No webs needed!
  ],
  ultimate: [
    "spiderman_mr_081.mp3",       // You get a web and you get a web and you get a web.
    "spiderman_mr_248.mp3",       // I'm protecting this web of life and destiny now.
    "spiderman_mr_399.mp3",       // Don't mess with the amazing Spider-Man!
  ],
  victory: [
    "spiderman_mr_043.mp3",       // Game over.
    "spiderman_mr_074.mp3",       // See you, CYA!
    "spiderman_mr_137.mp3",       // Don't mess with Empire State University!
    "spiderman_mr_298.mp3",       // Ha ha! Gotcha back!
    "spiderman_mr_348.mp3",       // Woo see ya!
    "spiderman_mr_377.mp3",       // and stay down.
    "spiderman_mr_399.mp3",       // Don't mess with the amazing Spider-Man!
    "spiderman_mr_415.mp3",       // The truth is, I can do some amazing stuff.
    "spiderman_mr_455.mp3",       // I have never felt worse about a win.
  ],
}

// One random clip from a pool (empty-safe). Callers: sound.playSfxFile(clip, null).
export function pickSpidermanVoice(pool) {
  const a = SPIDERMAN_VOICE[pool]
  if (!a || !a.length) return null
  return a[Math.floor(Math.random() * a.length)]
}
