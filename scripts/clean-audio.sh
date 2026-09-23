#!/usr/bin/env bash
# Cleans a BirdNET-Go clip for the web: removes traffic rumble below 1.9 kHz, light noise
# reduction, even loudness, short fades. Needs ffmpeg.
#
#   ./scripts/clean-audio.sh input.mp3 public/audio/blue.mp3
set -euo pipefail
in="$1"; out="$2"
ffmpeg -v error -y -i "$in" -af "highpass=f=1900:poles=2,highpass=f=1900:poles=2,highpass=f=1900:poles=2,highpass=f=1900:poles=2,lowpass=f=11500,afftdn=nf=-32:tn=1,loudnorm=I=-19:TP=-2:LRA=11,afade=t=in:d=0.4,areverse,afade=t=in:d=0.7,areverse" -ar 44100 -ac 1 -c:a libmp3lame -b:a 80k "$out"
echo "Wrote $out"
