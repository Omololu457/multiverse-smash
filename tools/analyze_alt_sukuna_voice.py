#!/usr/bin/env python3
"""Alternate Sukuna voice REUSE + tone-filter pass over the EXISTING original-Sukuna bank
(sukuna_new_000..684.mp3 + sukuna_raw_transcript.tsv). NO new audio — a selection pass only.

★ HONEST LIMITATION: this classifies tone from the TRANSCRIPT CONTENT (the words) + acoustic proxies
(duration), NOT by ear — I cannot listen to the MP3s. For Ryomen Sukuna most malice is verbal, so
content is a strong proxy, but delivery-tone of neutral WORDS ("come", "here I go") said cruelly can't be
verified acoustically → those land in ambiguous_tone for a case-by-case call.

Two axes per clip:
  content bucket: intro / taunt / exertion / hitpain / special / victory / defeat / unclear
  tone:           measured / neutral_exertion / cruel_mocking / ambiguous_tone

Goal: wire measured + neutral_exertion to Alternate Sukuna's triggers; EXCLUDE cruel_mocking (the "less
malicious" lever); ambiguous = case-by-case. Report gaps, don't force-fit.
"""
import sys, re, collections

TSV = "sukuna_raw_transcript.tsv"

# ── lexicons (content of the WORDS) ──
CRUEL = [  # contemptuous / menacing / cruelly-amused → EXCLUDE
    "maggot","fool","foolish","pathetic","apathetic","worm","insect","trash","garbage","weakling",
    "worthless","useless","know your place","kneel","beg","grovel","crawl","die","perish","scum","filth",
    "insolent","insolence","disappointing","i expected more","is that all","how boring","how dull","boring",
    "dull","get out of my sight","out of my sight","out of the way","don't waste my time","pitiful","wretch",
    "mock","shut up","silence","quiet.","detestable","kill you","you're mine","you're nothing","nothing but",
    "weak","pest","vermin","annoying","irritating","how infuriating","infuriating","stay down","know your",
    "beneath me","not worth","waste of","i'll end","begone","despicable","rot","suffer","that all you",
    "you did well","put more curse","try harder","not enough","so this is all","cry","scream","pig","dog.",
    "hah! ","laughable","pointless","futile","meaningless","disappear","vanish","trash.","enough of you",
]
TECH = ["domain","expansion","shrine","malevolent","cleave","dismantle","fuga","flame arrow","flame","arrow",
        "open.","open!","開","領域","展開","伏魔","御廚","斬","解","捌","フーガ","炎","this is my domain"]
MEASURED = [  # calm / matter-of-fact / instructional / neutral opener → PREFER
    "here i go","this is a good opportunity","first of all","let's begin","very well","i see","interesting",
    "come","ready","shall we","let us","begin","now then","i understand","understood","not bad","impressive",
    "as expected","good","fine","alright","let's go","hmm","indeed","so be it","then","this again","careful",
    "watch","hold on","wait","one moment","a moment","let me","allow me","i'll go","my turn","here","there",
    "合わせろ","いいだろ","行くぞ","いくぞ","そうか","なるほど","面白い","よし","来い","始め","まだ","さあ",
]
DEFEAT = ["impossible","how could","damn","no.","no!","not possible","curse you","this can't","i lost",
          "ridiculous","absurd","what","kutuh","kuso","くそ","馬鹿な","ありえ","そんな"]
EXERT_RE = re.compile(r"^[\W_]*((ha|he|he he|hah|haa|hmph|hmm|tch|tsk|grr|ugh|agh|gah|hng|nn+|guh|urgh|"
                      r"argh|rah|hyah|haha|hahaha|ha ha|ha!|ora|oi|oh|ooh|uh|huh|mm+|yah|hup|ngh|fuh|"
                      r"はっ|ふっ|ぐっ|くっ|うっ|はぁ|ぬん|とう|ふん|へっ|おら|ぬ|う|あ|やあ|ほう))[\W_ ]*$",
                      re.I)

def tone_and_bucket(dur, conf, text):
    t = (text or "").strip().lower()
    # neutral_exertion: short wordless effort/interjection (proxy: brief + interjection-only or low conf)
    if (dur < 0.9 and (t == "" or conf < 0.45 or EXERT_RE.match(t))) or (t == "" ):
        return "neutral_exertion", "exertion"
    # special-activation (technique callout) — measured by nature
    if any(k in t for k in TECH):
        return "measured", "special"
    # cruel / mocking (content) — EXCLUDE
    if any(k in t for k in CRUEL):
        # victory vs taunt context is fuzzy from text alone; bucket by a couple win-ish cues
        b = "victory" if any(k in t for k in ["did well","expected more","is that all","that all you","so this is all","weak","pathetic","disappointing"]) else "taunt"
        return "cruel_mocking", b
    # measured / neutral opener / instruction — PREFER
    if any(k in t for k in MEASURED):
        b = "intro" if any(k in t for k in ["first of all","let's begin","begin","come","shall we","ready","start","始め","来い","行くぞ","いくぞ","さあ"]) else "measured_generic"
        return "measured", ("intro" if b=="intro" else "exertion" if EXERT_RE.match(t) else "taunt")
    # defeat cues
    if any(k in t for k in DEFEAT):
        return "ambiguous_tone", "defeat"
    # short interjection that slipped through
    if dur < 0.9 and EXERT_RE.match(t):
        return "neutral_exertion", "exertion"
    return "ambiguous_tone", "unclear"

def main():
    rows=[]
    with open(TSV) as f:
        for line in f:
            p=line.rstrip("\n").split("\t")
            if len(p)>=6: rows.append((p[0],p[1],float(p[2]),p[3],float(p[4]),p[5]))
    tone_ct=collections.Counter(); bucket_ct=collections.Counter()
    byclass=collections.defaultdict(list)
    for cid,fn,dur,lang,conf,text in rows:
        tone,bucket=tone_and_bucket(dur,conf,text)
        tone_ct[tone]+=1; bucket_ct[(tone,bucket)]+=1
        byclass[tone].append((cid,fn,dur,lang,conf,text,bucket))
    print(f"TOTAL {len(rows)} clips\n")
    print("TONE AXIS:")
    for k in ("measured","neutral_exertion","cruel_mocking","ambiguous_tone"):
        print(f"  {k:18s} {tone_ct[k]:4d}")
    print("\nWIRABLE (measured + neutral_exertion):", tone_ct["measured"]+tone_ct["neutral_exertion"])
    print("EXCLUDED (cruel_mocking):", tone_ct["cruel_mocking"])
    print("\nBUCKET × TONE:")
    for (tone,bucket),c in sorted(bucket_ct.items()):
        print(f"  {tone:16s} {bucket:16s} {c:4d}")
    if len(sys.argv)>1 and sys.argv[1]=="dump":
        which=sys.argv[2] if len(sys.argv)>2 else "measured"
        print(f"\n──── {which} clips ────")
        for cid,fn,dur,lang,conf,text,bucket in byclass[which]:
            print(f"  {cid} [{bucket:10s}] {dur:.2f}s {lang} c{conf:.2f}  {text!r}")

if __name__=="__main__": main()
