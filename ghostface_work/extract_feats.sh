#!/bin/bash
cd /Users/omololu/Desktop/project/multiverse-smash
OUT=ghostface_work/sfx_features.tsv
echo -e "file\tfolder\tdur\tmean_db\tmax_db\tlow_rms\thigh_rms" > "$OUT"
for f in ghostface_sfx/voice_lines_a/*.ogg ghostface_sfx/voice_lines_b/*.ogg ghostface_sfx/voice_lines_c/*.ogg ghostface_sfx/sfx_short/*.ogg; do
  dur=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$f" 2>/dev/null)
  vd=$(ffmpeg -hide_banner -nostats -i "$f" -af volumedetect -f null /dev/null 2>&1)
  mean=$(echo "$vd" | grep -oE 'mean_volume: -?[0-9.]+' | grep -oE '\-?[0-9.]+')
  max=$(echo "$vd" | grep -oE 'max_volume: -?[0-9.]+' | grep -oE '\-?[0-9.]+')
  # low-band (<800Hz) and high-band (>3000Hz) RMS via lowpass/highpass + volumedetect mean
  low=$(ffmpeg -hide_banner -nostats -i "$f" -af "lowpass=f=800,volumedetect" -f null /dev/null 2>&1 | grep -oE 'mean_volume: -?[0-9.]+' | grep -oE '\-?[0-9.]+')
  high=$(ffmpeg -hide_banner -nostats -i "$f" -af "highpass=f=3000,volumedetect" -f null /dev/null 2>&1 | grep -oE 'mean_volume: -?[0-9.]+' | grep -oE '\-?[0-9.]+')
  folder=$(basename $(dirname "$f"))
  echo -e "$f\t$folder\t$dur\t$mean\t$max\t$low\t$high" >> "$OUT"
done
echo "DONE $(wc -l < $OUT) rows"
