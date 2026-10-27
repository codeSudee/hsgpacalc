"""Builds the promo soundtrack: an original score, sound effects and the voiceover, mixed to one WAV.

Run: python3 audio/build_audio.py   (needs numpy + scipy; writes assets/mix.wav)
Scene times here must match the clip times in index.html.
"""
import numpy as np
from pathlib import Path
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, resample_poly, fftconvolve

SR = 48000
LEN = 34.0
ROOT = Path(__file__).resolve().parent.parent
rng = np.random.default_rng(7)  # fixed seed so the mix is reproducible

N = int(SR * LEN)
music = np.zeros((N, 2))
sfx = np.zeros((N, 2))


def hz(note):
    names = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
    n, o = note[:-1], int(note[-1])
    return 440.0 * 2 ** ((names[n] + 12 * (o + 1) - 69) / 12)


def t_axis(dur):
    return np.arange(int(SR * dur)) / SR


def place(buf, sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l, sig * r], axis=1) * np.sqrt(2)
    end = min(N, i + len(sig))
    if end > i:
        buf[i:end] += sig[: end - i] * gain


def lp(sig, f, order=2):
    return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), sig)


def hp(sig, f, order=2):
    return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), sig)


def piano(note, dur=3.0, vel=1.0):
    f, t = hz(note), t_axis(dur)
    s = sum((0.6 ** k) * np.sin(2 * np.pi * f * (k + 1) * t * (1 + 0.0004 * k)) * np.exp(-t * (1.2 + 1.6 * k))
            for k in range(6))
    s += 0.3 * np.sin(2 * np.pi * f * 1.002 * t) * np.exp(-t * 1.0)
    att = np.minimum(1, t / 0.004)
    return s * att * vel * 0.25


def pluck(note, dur=0.6, vel=1.0):
    f, t = hz(note), t_axis(dur)
    s = sum((0.5 ** k) * np.sin(2 * np.pi * f * (k + 1) * t) for k in range(4)) * np.exp(-t * 7)
    return s * np.minimum(1, t / 0.003) * vel * 0.18


def pad(notes, dur, vel=1.0, attack=1.2, bright=1800):
    t = t_axis(dur)
    s = np.zeros_like(t)
    for n in notes:
        f = hz(n)
        for d in (-0.06, 0.0, 0.07):  # detuned saws, chorus feel
            ph = (f * (1 + d / 100) * t) % 1.0
            s += 2 * ph - 1
    s = lp(s / (len(notes) * 3), bright)
    env = np.minimum(1, t / attack) * np.minimum(1, (dur - t) / 0.8).clip(0)
    return s * env * vel * 0.22


def sub(note, dur, vel=1.0):
    t = t_axis(dur)
    env = np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.3).clip(0)
    return np.sin(2 * np.pi * hz(note) * t) * env * vel * 0.35


def kick(vel=1.0):
    t = t_axis(0.45)
    f = 45 + 110 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * vel * 0.6


def heartbeat(vel=1.0):
    t = t_axis(0.5)
    one = np.sin(2 * np.pi * np.cumsum(38 + 40 * np.exp(-t * 30)) / SR) * np.exp(-t * 14)
    return lp(one, 200) * vel * 0.8


def clap(vel=1.0):
    t = t_axis(0.25)
    n = rng.standard_normal(len(t))
    env = sum(np.exp(-np.maximum(0, t - d) * 60) * (t >= d) for d in (0, 0.01, 0.02)) * np.exp(-t * 12)
    return hp(lp(n, 6000), 900) * env * vel * 0.18


def hat(vel=1.0):
    t = t_axis(0.06)
    return hp(rng.standard_normal(len(t)), 8000) * np.exp(-t * 80) * vel * 0.06


def tick(vel=1.0):
    t = t_axis(0.03)
    return hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 300) * vel * 0.25


def whoosh(dur=0.9, up=True, vel=1.0):
    t = t_axis(dur)
    n = rng.standard_normal(len(t))
    out = np.zeros_like(n)
    blocks = 40
    for b in range(blocks):  # sweep a band-pass through the noise
        a, z = b * len(n) // blocks, (b + 1) * len(n) // blocks
        x = b / blocks if up else 1 - b / blocks
        fc = 300 + 5000 * x ** 2
        sos = butter(2, [fc * 0.7, fc * 1.4], 'band', fs=SR, output='sos')
        out[a:z] = sosfilt(sos, n)[a:z]
    env = np.sin(np.pi * t / dur) ** 2 if not up else (t / dur) ** 2.5
    return out * env * vel * 0.5


def impact(vel=1.0):
    t = t_axis(2.5)
    boom = np.sin(2 * np.pi * np.cumsum(32 + 60 * np.exp(-t * 6)) / SR) * np.exp(-t * 2.2)
    air = lp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 4) * 0.2
    return (boom + air) * vel * 0.7


def chime(notes, vel=1.0, gap=0.07):
    out = np.zeros(int(SR * 2.5))
    for i, n in enumerate(notes):
        t = t_axis(2.0)
        f = hz(n)
        s = (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6)) * np.exp(-t * 2.5)
        a = int(i * gap * SR)
        out[a:a + len(s)] += s[: len(out) - a]
    return out * vel * 0.16


def pop(vel=1.0, pitch=900):
    t = t_axis(0.12)
    f = pitch * (1 + 1.5 * np.exp(-t * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 40) * vel * 0.22


def sparkle(dur=1.6, vel=1.0):
    out = np.zeros(int(SR * dur))
    for _ in range(26):
        at = rng.uniform(0, dur - 0.3)
        f = rng.uniform(2500, 6500)
        t = t_axis(0.25)
        s = np.sin(2 * np.pi * f * t) * np.exp(-t * 25)
        a = int(at * SR)
        out[a:a + len(s)] += s * rng.uniform(0.3, 1)
    return out * vel * 0.05


# ---------------- score ----------------
# Scene 1 (0-7): late night, uneasy. Sparse minor piano, clock, heartbeat.
for at, n, v in [(0.3, 'A3', .8), (0.9, 'E4', .6), (1.5, 'C5', .55), (2.4, 'B4', .45),
                 (3.6, 'F3', .8), (4.2, 'C4', .6), (4.8, 'A4', .55), (5.6, 'G4', .45)]:
    place(music, piano(n, 3.5, v), at, pan=rng.uniform(-.3, .3))
place(music, pad(['A2', 'E3', 'C4'], 3.6, .55, attack=2.0, bright=700), 0.0)
place(music, pad(['F2', 'C3', 'A3'], 3.4, .55, attack=1.5, bright=700), 3.6)
for k in range(13):
    place(sfx, tick(.8 if k % 2 == 0 else .5), 0.25 + k * 0.5, pan=.3)
for at in (1.2, 2.2, 3.2, 4.2, 5.2):
    place(sfx, heartbeat(.7), at)
    place(sfx, heartbeat(.45), at + 0.22)
place(sfx, whoosh(1.2, up=True, vel=.9), 5.8)  # riser into the relief

# Scene 2 (7-10): the exhale. Impact, major chord blooms.
place(sfx, impact(.8), 7.0)
place(music, pad(['C3', 'G3', 'E4', 'G4'], 3.2, .9, attack=0.6, bright=2600), 7.0)
place(music, sub('C2', 3.0, .7), 7.0)
for i, n in enumerate(['C5', 'E5', 'G5', 'C6']):
    place(music, piano(n, 3, .5), 7.4 + i * 0.35, pan=-.4 + i * .27)

# Scenes 3-6 (10-34): warm pop groove, C G Am F.
BEAT = 0.5625
prog = [('C', ['C3', 'G3', 'E4'], ['C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'C5', 'E5']),
        ('G', ['G2', 'D3', 'B3'], ['B3', 'D4', 'G4', 'B4', 'G4', 'D4', 'B4', 'D5']),
        ('A', ['A2', 'E3', 'C4'], ['A3', 'C4', 'E4', 'A4', 'E4', 'C4', 'A4', 'C5']),
        ('F', ['F2', 'C3', 'A3'], ['A3', 'C4', 'F4', 'A4', 'F4', 'C4', 'A4', 'C5'])]
bars = []  # (start, chord index, beats, intensity)
t0 = 10.0
for c in range(4):
    bars.append((t0, c, 4, 1)); t0 += 4 * BEAT       # 10.0 -> 19.0
bars += [(19.0, 0, 3.4, 2), (20.9, 1, 3.4, 2)]       # 19.0 -> 22.8
t0 = 22.8
for c in (2, 3, 0, 1):
    bars.append((t0, c, 2.3, 3)); t0 += 2.3 * BEAT   # 22.8 -> ~28
for start, ci, beats, lvl in bars:
    name, chord, arp = prog[ci]
    dur = beats * BEAT
    place(music, pad(chord, dur + 0.4, .55 + .1 * lvl, attack=0.25, bright=1600 + 400 * lvl), start)
    place(music, sub(chord[0][:-1] + '2' if chord[0][-1] != '2' else chord[0], dur, .6), start)
    steps = int(beats * 2)
    for s in range(steps):
        place(music, pluck(arp[s % 8], 0.6, .75 if s % 2 == 0 else .5), start + s * BEAT / 2,
              pan=.35 if s % 2 else -.35)
    for b in range(int(beats)):
        place(music, kick(.55 + .1 * lvl), start + b * BEAT)
        if lvl >= 2 and b % 2 == 1:
            place(music, clap(.9), start + b * BEAT)
        place(music, hat(.7), start + b * BEAT + BEAT / 2, pan=.4)
place(sfx, whoosh(1.2, up=True, vel=1.0), 26.8)  # riser into the finale

# Scene 6 (28-34): resolution. F - G - C, held.
place(sfx, impact(1.0), 28.0)
for at, chord, d in [(28.0, ['F2', 'C3', 'A3', 'C4'], 1.6), (29.6, ['G2', 'D3', 'B3', 'D4'], 1.4),
                     (31.0, ['C3', 'G3', 'E4', 'G4', 'C5'], 3.0)]:
    place(music, pad(chord, d + 0.3, 1.0, attack=0.2, bright=3000), at)
    place(music, sub(chord[0], d, .8), at)
    place(music, kick(.8), at)
for i, n in enumerate(['C5', 'E5', 'G5', 'C6', 'E6']):
    place(music, piano(n, 3, .55), 31.0 + i * 0.12, pan=-.5 + i * .25)

# ---------------- sfx synced to visuals ----------------
for k, at in enumerate([10.6, 11.15, 11.7, 12.25, 12.8]):        # class rows pop in
    place(sfx, pop(1.0, 700 + 90 * k), at, pan=-.2 + .1 * k)
for at in (13.4, 14.0, 14.6):                                     # level badges stamp
    place(sfx, pop(.9, 1300), at, pan=.3)
place(sfx, whoosh(0.8, up=False, vel=.5), 15.0)                   # gauge sweep
place(sfx, chime(['E6', 'G6', 'C7'], 1.0), 17.0)                  # GPA lands
place(sfx, whoosh(0.7, up=False, vel=.5), 18.8)
for k in range(4):                                                # trend bars
    place(sfx, pop(.7, 600 + 150 * k), 19.9 + k * 0.25)
place(sfx, chime(['G5', 'C6'], .7), 21.4)                         # target hit
place(sfx, whoosh(0.7, up=False, vel=.5), 22.6)
for k, at in enumerate([23.3, 24.4, 25.5]):                       # free / private / no sign-up
    place(sfx, chime([['C6'], ['E6'], ['G6']][k], .8), at)
place(sfx, sparkle(2.2, 1.0), 28.3)                               # confetti
place(sfx, chime(['C6', 'E6', 'G6', 'C7'], .9, gap=.09), 31.0)

# ---------------- reverb + voice + mix ----------------
ir_t = t_axis(2.2)
ir = rng.standard_normal((len(ir_t), 2)) * np.exp(-ir_t * 3.2)[:, None]
ir[:, 0], ir[:, 1] = lp(ir[:, 0], 5000), lp(ir[:, 1], 5000)
ir /= np.sqrt((ir ** 2).sum(axis=0))
wet = np.stack([fftconvolve(music[:, c], ir[:, c])[:N] for c in range(2)], axis=1)
music = music * 0.75 + wet * 0.45

voice = np.zeros(N)
VO = [(0.6, 'vo1'), (7.4, 'vo2'), (10.3, 'vo3'), (19.3, 'vo4'), (23.1, 'vo5'), (28.6, 'vo6')]
for at, name in VO:
    sr, v = wavfile.read(ROOT / 'assets' / 'vo' / f'{name}.wav')
    v = v.astype(np.float64)
    if v.ndim > 1:
        v = v.mean(axis=1)
    v /= np.abs(v).max() + 1e-9
    if sr != SR:
        v = resample_poly(v, SR, sr)
    v = hp(v, 90)
    i = int(at * SR)
    voice[i:i + len(v)] += v[: N - i] * 0.62

# duck the music under the voice (smoothed sidechain)
env = np.abs(voice)
win = int(0.25 * SR)
env = np.convolve(env, np.ones(win) / win, mode='same')
duck = 1 - 0.5 * np.clip(env / 0.08, 0, 1)

mix = music * duck[:, None] * 0.9 + sfx * 0.85 + np.stack([voice, voice], axis=1)
fade = np.ones(N)
fade[-int(1.5 * SR):] = np.linspace(1, 0, int(1.5 * SR)) ** 2
mix *= fade[:, None]
mix = np.tanh(mix * 1.1) / np.tanh(1.1)  # gentle soft-clip limiter
mix /= np.abs(mix).max() / 0.95

out = ROOT / 'assets' / 'mix.wav'
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print('wrote', out)
