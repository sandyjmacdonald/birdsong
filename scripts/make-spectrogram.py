#!/usr/bin/env python3
"""Draws an ink-on-paper spectrogram (1.5 to 11 kHz) for the "Three songs" section.

    python3 scripts/make-spectrogram.py public/audio/blue.mp3 public/spectrograms/blue.png

Needs: ffmpeg, and Python packages numpy, scipy and pillow.
"""
import subprocess, sys
import numpy as np
from scipy.signal import spectrogram
from scipy.ndimage import gaussian_filter, median_filter
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
raw = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', src, '-f', 'f32le', '-ac', '1', '-ar', '44100', '-'], capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32)
fr, t, S = spectrogram(x, 44100, nperseg=1024, noverlap=920, window='hann')
keep = (fr >= 1500) & (fr <= 11000)
S = 10 * np.log10(S[keep] + 1e-14)
S = S - np.percentile(S, 60, axis=1, keepdims=True)      # remove steady background noise
S = gaussian_filter(median_filter(S, size=(3, 3)), (1.0, 0.8))
a = np.clip((S - 6.5) / 17, 0, 1) ** 0.8
a[a < 0.1] = 0
img = Image.fromarray((a[::-1] * 255).astype(np.uint8)).resize((1600, 340), Image.LANCZOS)
out = Image.new('RGBA', img.size, (24, 20, 18, 0)); out.putalpha(img)
out.save(dst, optimize=True)
print('Wrote', dst)
