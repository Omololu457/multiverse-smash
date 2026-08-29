// lightVoice.js — Light Yagami (Kira) voice-line pools (audio-only; ZERO gameplay effect).
//
// SOURCE: 236 clips light_yagami_line_001..236 — a single continuous ~466s recording sliced into
// per-line pieces, named by TIMESTAMP ONLY (no transcript; LIGHT_ASSET_MAP.md §0 flags the pack as
// noted-but-unaudited). Because the lines are UNIDENTIFIED spoken dialogue (JA), they are sorted the
// same principled way this project already handles unidentified packs (mayuriVoice / kibaVoice /
// orochimaruVoice "signal-sorted", jasonVoice acoustic proxy): by a per-clip DURATION proxy (the gap to
// the next clip's start timestamp — a can't-hear substitute for content). Clips are partitioned into
// DISJOINT pools so every one of the 236 is used exactly once and no pool starves:
//   SHORT (<=1.5s, quick barks)  → lowHealth / combatBark / hitReact
//   MID   (1.6-3.0s, full lines) → intro(+taunt) / taunt / specialCast / win
//   LONG  (>3.0s, dramatic)      → ultimate
// This is deliberately CONTENT-BLIND (a transcript would let lines be placed by meaning — deferred until
// one exists). Durations are a proxy; re-sort here if the pack is ever transcribed.
//
// pickLightVoice(pool) → ONE clip at random (Math.random), same shape as pickMayuriVoice/pickJasonVoice.
//
// ── TRIGGER MAP (hooks in game.js / combat.js / abilities.js) ──
//   intro       → game.js INTRO_VOICE (match start; taunt-vibe lines fold in — Light has no taunt action)
//   win         → game.js round-end WINNER block (victory line)
//   combatBark  → combat.js applyLightOffenseVoice (attacker lands a HEAVY / long-string connect)
//   hitReact    → combat.js applyLightHitVoice (Light takes a hit)
//   lowHealth   → combat.js applyLightLowHealthVoice (once, crossing the low-HP line)
//   specialCast → abilities.js executeLightSpecial (any of the 7 Kira call-ins)
//   ultimate    → abilities.js executeLightUltimate ("As Planned" writing / "I Am Kira" scythe)
//   taunt       → defined for completeness; currently folded into intro at the fire site (no taunt action).

export const LIGHT_VOICE = {
  intro: [
    "light_yagami_line_001_0000.0s.mp3",   // #001 · ~2.0s
    "light_yagami_line_003_0003.2s.mp3",   // #003 · ~2.1s
    "light_yagami_line_004_0005.3s.mp3",   // #004 · ~1.7s
    "light_yagami_line_007_0011.8s.mp3",   // #007 · ~1.8s
    "light_yagami_line_010_0018.6s.mp3",   // #010 · ~2.1s
    "light_yagami_line_012_0021.4s.mp3",   // #012 · ~2.5s
    "light_yagami_line_015_0026.1s.mp3",   // #015 · ~1.7s
    "light_yagami_line_017_0028.3s.mp3",   // #017 · ~2.4s
    "light_yagami_line_018_0030.7s.mp3",   // #018 · ~1.6s
    "light_yagami_line_019_0032.3s.mp3",   // #019 · ~1.9s
    "light_yagami_line_020_0034.2s.mp3",   // #020 · ~1.9s
    "light_yagami_line_021_0036.1s.mp3",   // #021 · ~2.0s
    "light_yagami_line_022_0038.1s.mp3",   // #022 · ~2.6s
    "light_yagami_line_027_0048.6s.mp3",   // #027 · ~2.5s
    "light_yagami_line_030_0056.0s.mp3",   // #030 · ~2.4s
    "light_yagami_line_031_0058.4s.mp3",   // #031 · ~2.0s
    "light_yagami_line_034_0065.1s.mp3",   // #034 · ~1.8s
    "light_yagami_line_035_0066.9s.mp3",   // #035 · ~1.6s
    "light_yagami_line_037_0069.6s.mp3",   // #037 · ~2.5s
    "light_yagami_line_038_0072.1s.mp3",   // #038 · ~2.7s
    "light_yagami_line_041_0077.3s.mp3",   // #041 · ~2.0s
    "light_yagami_line_042_0079.3s.mp3",   // #042 · ~2.8s
    "light_yagami_line_044_0083.5s.mp3",   // #044 · ~1.8s
    "light_yagami_line_046_0086.6s.mp3",   // #046 · ~2.6s
    "light_yagami_line_047_0089.2s.mp3",   // #047 · ~1.7s
    "light_yagami_line_048_0090.9s.mp3",   // #048 · ~2.1s
    "light_yagami_line_049_0093.0s.mp3",   // #049 · ~2.4s
    "light_yagami_line_051_0096.6s.mp3",   // #051 · ~1.8s
    "light_yagami_line_053_0101.8s.mp3",   // #053 · ~1.9s
    "light_yagami_line_054_0103.7s.mp3",   // #054 · ~2.5s
  ],
  taunt: [
    "light_yagami_line_056_0106.9s.mp3",   // #056 · ~1.7s
    "light_yagami_line_057_0108.6s.mp3",   // #057 · ~2.9s
    "light_yagami_line_058_0111.5s.mp3",   // #058 · ~1.8s
    "light_yagami_line_062_0117.1s.mp3",   // #062 · ~1.7s
    "light_yagami_line_063_0118.8s.mp3",   // #063 · ~2.4s
    "light_yagami_line_064_0121.2s.mp3",   // #064 · ~1.7s
    "light_yagami_line_066_0124.3s.mp3",   // #066 · ~2.0s
    "light_yagami_line_067_0126.3s.mp3",   // #067 · ~1.8s
    "light_yagami_line_068_0128.1s.mp3",   // #068 · ~2.9s
    "light_yagami_line_069_0131.0s.mp3",   // #069 · ~2.9s
    "light_yagami_line_070_0133.9s.mp3",   // #070 · ~2.0s
    "light_yagami_line_071_0135.9s.mp3",   // #071 · ~2.0s
    "light_yagami_line_073_0139.3s.mp3",   // #073 · ~1.6s
    "light_yagami_line_074_0140.9s.mp3",   // #074 · ~2.6s
    "light_yagami_line_075_0143.5s.mp3",   // #075 · ~2.0s
    "light_yagami_line_076_0145.5s.mp3",   // #076 · ~2.5s
    "light_yagami_line_081_0154.2s.mp3",   // #081 · ~3.0s
    "light_yagami_line_083_0158.4s.mp3",   // #083 · ~2.4s
    "light_yagami_line_084_0160.8s.mp3",   // #084 · ~2.1s
    "light_yagami_line_086_0163.7s.mp3",   // #086 · ~2.4s
    "light_yagami_line_087_0166.1s.mp3",   // #087 · ~2.7s
    "light_yagami_line_088_0168.8s.mp3",   // #088 · ~1.6s
    "light_yagami_line_089_0170.4s.mp3",   // #089 · ~1.6s
    "light_yagami_line_090_0172.0s.mp3",   // #090 · ~2.2s
  ],
  win: [
    "light_yagami_line_175_0344.5s.mp3",   // #175 · ~2.1s
    "light_yagami_line_176_0346.6s.mp3",   // #176 · ~1.7s
    "light_yagami_line_177_0348.3s.mp3",   // #177 · ~1.6s
    "light_yagami_line_179_0351.1s.mp3",   // #179 · ~3.0s
    "light_yagami_line_180_0354.1s.mp3",   // #180 · ~2.7s
    "light_yagami_line_182_0358.3s.mp3",   // #182 · ~2.6s
    "light_yagami_line_183_0360.9s.mp3",   // #183 · ~2.4s
    "light_yagami_line_187_0366.7s.mp3",   // #187 · ~2.1s
    "light_yagami_line_188_0368.8s.mp3",   // #188 · ~1.6s
    "light_yagami_line_190_0371.9s.mp3",   // #190 · ~1.9s
    "light_yagami_line_193_0376.1s.mp3",   // #193 · ~2.0s
    "light_yagami_line_194_0378.1s.mp3",   // #194 · ~1.7s
    "light_yagami_line_195_0379.8s.mp3",   // #195 · ~2.2s
    "light_yagami_line_197_0383.3s.mp3",   // #197 · ~1.9s
    "light_yagami_line_198_0385.2s.mp3",   // #198 · ~1.9s
    "light_yagami_line_199_0387.1s.mp3",   // #199 · ~1.6s
    "light_yagami_line_200_0388.7s.mp3",   // #200 · ~2.3s
    "light_yagami_line_201_0391.0s.mp3",   // #201 · ~2.4s
    "light_yagami_line_204_0396.2s.mp3",   // #204 · ~2.3s
    "light_yagami_line_206_0401.7s.mp3",   // #206 · ~2.5s
    "light_yagami_line_207_0404.2s.mp3",   // #207 · ~2.2s
    "light_yagami_line_209_0407.4s.mp3",   // #209 · ~2.1s
    "light_yagami_line_211_0410.8s.mp3",   // #211 · ~1.6s
    "light_yagami_line_212_0412.4s.mp3",   // #212 · ~2.6s
    "light_yagami_line_214_0419.2s.mp3",   // #214 · ~1.7s
    "light_yagami_line_217_0423.3s.mp3",   // #217 · ~2.0s
    "light_yagami_line_219_0426.4s.mp3",   // #219 · ~2.7s
    "light_yagami_line_220_0429.1s.mp3",   // #220 · ~2.3s
    "light_yagami_line_221_0431.4s.mp3",   // #221 · ~1.6s
    "light_yagami_line_224_0435.5s.mp3",   // #224 · ~2.4s
    "light_yagami_line_227_0443.0s.mp3",   // #227 · ~1.6s
    "light_yagami_line_228_0444.6s.mp3",   // #228 · ~1.6s
    "light_yagami_line_229_0446.2s.mp3",   // #229 · ~3.0s
    "light_yagami_line_232_0455.5s.mp3",   // #232 · ~2.7s
    "light_yagami_line_234_0459.6s.mp3",   // #234 · ~1.8s
    "light_yagami_line_236_0466.1s.mp3",   // #236 · ~2.0s
  ],
  combatBark: [
    "light_yagami_line_016_0027.8s.mp3",   // #016 · ~0.5s
    "light_yagami_line_023_0040.7s.mp3",   // #023 · ~0.9s
    "light_yagami_line_025_0046.2s.mp3",   // #025 · ~1.2s
    "light_yagami_line_026_0047.4s.mp3",   // #026 · ~1.2s
    "light_yagami_line_029_0054.7s.mp3",   // #029 · ~1.3s
    "light_yagami_line_032_0060.4s.mp3",   // #032 · ~1.2s
    "light_yagami_line_036_0068.5s.mp3",   // #036 · ~1.1s
    "light_yagami_line_039_0074.8s.mp3",   // #039 · ~1.5s
    "light_yagami_line_040_0076.3s.mp3",   // #040 · ~1.0s
    "light_yagami_line_043_0082.1s.mp3",   // #043 · ~1.4s
    "light_yagami_line_045_0085.3s.mp3",   // #045 · ~1.3s
    "light_yagami_line_050_0095.4s.mp3",   // #050 · ~1.2s
    "light_yagami_line_055_0106.2s.mp3",   // #055 · ~0.7s
    "light_yagami_line_059_0113.3s.mp3",   // #059 · ~1.0s
    "light_yagami_line_060_0114.3s.mp3",   // #060 · ~1.4s
    "light_yagami_line_061_0115.7s.mp3",   // #061 · ~1.4s
    "light_yagami_line_065_0122.9s.mp3",   // #065 · ~1.4s
    "light_yagami_line_072_0137.9s.mp3",   // #072 · ~1.4s
    "light_yagami_line_077_0148.0s.mp3",   // #077 · ~0.9s
    "light_yagami_line_079_0152.2s.mp3",   // #079 · ~1.0s
    "light_yagami_line_080_0153.2s.mp3",   // #080 · ~1.0s
    "light_yagami_line_082_0157.2s.mp3",   // #082 · ~1.2s
    "light_yagami_line_085_0162.9s.mp3",   // #085 · ~0.8s
    "light_yagami_line_098_0190.1s.mp3",   // #098 · ~1.5s
    "light_yagami_line_099_0191.6s.mp3",   // #099 · ~1.2s
    "light_yagami_line_105_0204.8s.mp3",   // #105 · ~1.0s
    "light_yagami_line_108_0210.5s.mp3",   // #108 · ~1.2s
    "light_yagami_line_111_0216.7s.mp3",   // #111 · ~1.3s
    "light_yagami_line_115_0226.2s.mp3",   // #115 · ~1.5s
    "light_yagami_line_118_0233.4s.mp3",   // #118 · ~1.5s
    "light_yagami_line_120_0237.8s.mp3",   // #120 · ~1.2s
    "light_yagami_line_121_0239.0s.mp3",   // #121 · ~1.2s
    "light_yagami_line_122_0240.2s.mp3",   // #122 · ~0.8s
    "light_yagami_line_125_0246.5s.mp3",   // #125 · ~1.2s
    "light_yagami_line_128_0253.8s.mp3",   // #128 · ~1.4s
    "light_yagami_line_133_0262.8s.mp3",   // #133 · ~1.5s
  ],
  hitReact: [
    "light_yagami_line_135_0265.9s.mp3",   // #135 · ~1.2s
    "light_yagami_line_137_0269.5s.mp3",   // #137 · ~1.3s
    "light_yagami_line_139_0272.5s.mp3",   // #139 · ~1.4s
    "light_yagami_line_140_0273.9s.mp3",   // #140 · ~1.5s
    "light_yagami_line_141_0275.4s.mp3",   // #141 · ~1.4s
    "light_yagami_line_142_0276.8s.mp3",   // #142 · ~1.5s
    "light_yagami_line_151_0298.1s.mp3",   // #151 · ~1.3s
    "light_yagami_line_152_0299.4s.mp3",   // #152 · ~1.5s
    "light_yagami_line_153_0300.9s.mp3",   // #153 · ~1.3s
    "light_yagami_line_156_0308.2s.mp3",   // #156 · ~1.1s
    "light_yagami_line_157_0309.3s.mp3",   // #157 · ~1.2s
    "light_yagami_line_158_0310.5s.mp3",   // #158 · ~1.1s
    "light_yagami_line_167_0329.7s.mp3",   // #167 · ~0.9s
    "light_yagami_line_169_0333.2s.mp3",   // #169 · ~1.2s
    "light_yagami_line_170_0334.4s.mp3",   // #170 · ~1.3s
    "light_yagami_line_178_0349.9s.mp3",   // #178 · ~1.2s
    "light_yagami_line_181_0356.8s.mp3",   // #181 · ~1.5s
    "light_yagami_line_184_0363.3s.mp3",   // #184 · ~1.0s
    "light_yagami_line_185_0364.3s.mp3",   // #185 · ~1.4s
    "light_yagami_line_186_0365.7s.mp3",   // #186 · ~1.0s
    "light_yagami_line_189_0370.4s.mp3",   // #189 · ~1.5s
    "light_yagami_line_191_0373.8s.mp3",   // #191 · ~1.1s
    "light_yagami_line_192_0374.9s.mp3",   // #192 · ~1.2s
    "light_yagami_line_196_0382.0s.mp3",   // #196 · ~1.3s
    "light_yagami_line_202_0393.4s.mp3",   // #202 · ~1.3s
    "light_yagami_line_203_0394.7s.mp3",   // #203 · ~1.5s
    "light_yagami_line_208_0406.4s.mp3",   // #208 · ~1.0s
    "light_yagami_line_210_0409.5s.mp3",   // #210 · ~1.3s
    "light_yagami_line_215_0420.9s.mp3",   // #215 · ~1.5s
    "light_yagami_line_216_0422.4s.mp3",   // #216 · ~0.9s
    "light_yagami_line_218_0425.3s.mp3",   // #218 · ~1.1s
    "light_yagami_line_222_0433.0s.mp3",   // #222 · ~1.2s
    "light_yagami_line_223_0434.2s.mp3",   // #223 · ~1.3s
    "light_yagami_line_225_0437.9s.mp3",   // #225 · ~1.3s
    "light_yagami_line_230_0449.2s.mp3",   // #230 · ~1.0s
    "light_yagami_line_233_0458.2s.mp3",   // #233 · ~1.4s
  ],
  lowHealth: [
    "light_yagami_line_002_0002.0s.mp3",   // #002 · ~1.2s
    "light_yagami_line_006_0010.3s.mp3",   // #006 · ~1.5s
    "light_yagami_line_008_0013.6s.mp3",   // #008 · ~1.4s
    "light_yagami_line_011_0020.7s.mp3",   // #011 · ~0.7s
    "light_yagami_line_013_0023.9s.mp3",   // #013 · ~0.8s
    "light_yagami_line_014_0024.7s.mp3",   // #014 · ~1.4s
  ],
  specialCast: [
    "light_yagami_line_092_0177.8s.mp3",   // #092 · ~2.3s
    "light_yagami_line_093_0180.1s.mp3",   // #093 · ~2.0s
    "light_yagami_line_094_0182.1s.mp3",   // #094 · ~2.1s
    "light_yagami_line_095_0184.2s.mp3",   // #095 · ~1.6s
    "light_yagami_line_096_0185.8s.mp3",   // #096 · ~2.4s
    "light_yagami_line_097_0188.2s.mp3",   // #097 · ~1.9s
    "light_yagami_line_100_0192.8s.mp3",   // #100 · ~1.8s
    "light_yagami_line_101_0194.6s.mp3",   // #101 · ~2.5s
    "light_yagami_line_102_0197.1s.mp3",   // #102 · ~1.6s
    "light_yagami_line_104_0202.0s.mp3",   // #104 · ~2.8s
    "light_yagami_line_106_0205.8s.mp3",   // #106 · ~2.8s
    "light_yagami_line_107_0208.6s.mp3",   // #107 · ~1.9s
    "light_yagami_line_109_0211.7s.mp3",   // #109 · ~2.0s
    "light_yagami_line_110_0213.7s.mp3",   // #110 · ~3.0s
    "light_yagami_line_112_0218.0s.mp3",   // #112 · ~2.7s
    "light_yagami_line_113_0220.7s.mp3",   // #113 · ~1.9s
    "light_yagami_line_116_0227.7s.mp3",   // #116 · ~3.0s
    "light_yagami_line_117_0230.7s.mp3",   // #117 · ~2.7s
    "light_yagami_line_119_0234.9s.mp3",   // #119 · ~2.9s
    "light_yagami_line_123_0241.0s.mp3",   // #123 · ~3.0s
    "light_yagami_line_124_0244.0s.mp3",   // #124 · ~2.5s
    "light_yagami_line_126_0247.7s.mp3",   // #126 · ~2.7s
    "light_yagami_line_129_0255.2s.mp3",   // #129 · ~2.4s
    "light_yagami_line_130_0257.6s.mp3",   // #130 · ~1.7s
    "light_yagami_line_131_0259.3s.mp3",   // #131 · ~1.7s
    "light_yagami_line_132_0261.0s.mp3",   // #132 · ~1.8s
    "light_yagami_line_134_0264.3s.mp3",   // #134 · ~1.6s
    "light_yagami_line_136_0267.1s.mp3",   // #136 · ~2.4s
    "light_yagami_line_138_0270.8s.mp3",   // #138 · ~1.7s
    "light_yagami_line_143_0278.3s.mp3",   // #143 · ~1.8s
    "light_yagami_line_144_0280.1s.mp3",   // #144 · ~2.2s
    "light_yagami_line_145_0282.3s.mp3",   // #145 · ~2.0s
    "light_yagami_line_146_0284.3s.mp3",   // #146 · ~2.5s
    "light_yagami_line_147_0286.8s.mp3",   // #147 · ~2.0s
    "light_yagami_line_149_0292.4s.mp3",   // #149 · ~2.7s
    "light_yagami_line_150_0295.1s.mp3",   // #150 · ~3.0s
    "light_yagami_line_155_0305.9s.mp3",   // #155 · ~2.3s
    "light_yagami_line_159_0311.6s.mp3",   // #159 · ~2.0s
    "light_yagami_line_160_0313.6s.mp3",   // #160 · ~2.8s
    "light_yagami_line_161_0316.4s.mp3",   // #161 · ~2.1s
    "light_yagami_line_162_0318.5s.mp3",   // #162 · ~1.6s
    "light_yagami_line_163_0320.1s.mp3",   // #163 · ~2.2s
    "light_yagami_line_164_0322.3s.mp3",   // #164 · ~2.6s
    "light_yagami_line_165_0324.9s.mp3",   // #165 · ~2.1s
    "light_yagami_line_166_0327.0s.mp3",   // #166 · ~2.7s
    "light_yagami_line_168_0330.6s.mp3",   // #168 · ~2.6s
    "light_yagami_line_171_0335.7s.mp3",   // #171 · ~2.1s
    "light_yagami_line_172_0337.8s.mp3",   // #172 · ~2.3s
    "light_yagami_line_173_0340.1s.mp3",   // #173 · ~2.3s
    "light_yagami_line_174_0342.4s.mp3",   // #174 · ~2.1s
  ],
  ultimate: [
    "light_yagami_line_005_0007.0s.mp3",   // #005 · ~3.3s
    "light_yagami_line_009_0015.0s.mp3",   // #009 · ~3.6s
    "light_yagami_line_024_0041.6s.mp3",   // #024 · ~4.6s
    "light_yagami_line_028_0051.1s.mp3",   // #028 · ~3.6s
    "light_yagami_line_033_0061.6s.mp3",   // #033 · ~3.5s
    "light_yagami_line_052_0098.4s.mp3",   // #052 · ~3.4s
    "light_yagami_line_078_0148.9s.mp3",   // #078 · ~3.3s
    "light_yagami_line_091_0174.2s.mp3",   // #091 · ~3.6s
    "light_yagami_line_103_0198.7s.mp3",   // #103 · ~3.3s
    "light_yagami_line_114_0222.6s.mp3",   // #114 · ~3.6s
    "light_yagami_line_127_0250.4s.mp3",   // #127 · ~3.4s
    "light_yagami_line_148_0288.8s.mp3",   // #148 · ~3.6s
    "light_yagami_line_154_0302.2s.mp3",   // #154 · ~3.7s
    "light_yagami_line_205_0398.5s.mp3",   // #205 · ~3.2s
    "light_yagami_line_213_0415.0s.mp3",   // #213 · ~4.2s
    "light_yagami_line_226_0439.2s.mp3",   // #226 · ~3.8s
    "light_yagami_line_231_0450.2s.mp3",   // #231 · ~5.3s
    "light_yagami_line_235_0461.4s.mp3",   // #235 · ~4.7s
  ],
}

// Pick ONE clip from a pool at random (audio-only). Returns null for an empty/unknown pool so the
// caller's playSfxFile no-ops cleanly.
export function pickLightVoice(pool) {
  const list = LIGHT_VOICE[pool]
  if (!Array.isArray(list) || list.length === 0) return null
  return list[Math.floor(Math.random() * list.length)]
}
