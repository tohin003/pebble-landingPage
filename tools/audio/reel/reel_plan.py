"""reel music lane: the edit plan of the Pebble 2.0 launch reel's score (1 Nov 2026). Plain data, read by reel_score.py.

The score is edited, never synthesised: three tracks by Scott Buckley (CC BY 4.0), cut at bar lines and overlapped in
key, with no time-stretch and no added sound effects.

  Starfire        (A1, 80 bpm, an F# pedal: the dominant of B)        the tension
  Vanguard        (133.33 bpm, B major/minor; 27 frames a beat at 60 fps) the drop, the montage, the composer's own stop
                                                                       and slam, the tag and the final chord (the logo)
  Born Of The Sky (A4, a soft B-major pad)                             the tease

Times: 'src' is seconds in the track as decoded (the maps' times), 'at' is the reel time where the segment's 'anchor'
(a source time, usually a downbeat) lands. Every Vanguard anchor sits on the reel's 0.45 s beat grid, so every Vanguard
beat lands on a whole frame at 60 fps (27 frames a beat). Fades: 'in' and 'out' are reel-time windows [from, to];
'eqp' is an equal-power (sine) fade, 'cos' a raised cosine. A segment plays its source from 'src_from' to 'src_to'.
"""

FPS = 60
BEAT = 0.45  # Vanguard: 133.333 bpm (its grid: 0.1975 + 0.45 n s; measured attacks within +-15 ms of it)

TRACKS = {
    "Starfire": {"file": ".work/music-audition/Starfire.mp3", "map": ".work/score2/maps/Starfire.map.json",
                 "curves": ".work/score2/curves/Starfire.npz", "label": "A1", "title": "Starfire",
                 "page": "https://www.scottbuckley.com.au/library/starfire/"},
    "Vanguard": {"file": ".work/reel/music/dl/Vanguard/Vanguard.mp3", "map": ".work/reel/music/maps/Vanguard.map.json",
                 "curves": ".work/reel/music/curves/Vanguard.npz", "label": "C1", "title": "Vanguard",
                 "page": "https://www.scottbuckley.com.au/library/vanguard/"},
    "BornOfTheSky": {"file": ".work/music-audition/BornOfTheSky.mp3", "map": ".work/score2/maps/BornOfTheSky.map.json",
                     "curves": ".work/score2/curves/BornOfTheSky.npz", "label": "A4", "title": "Born Of The Sky",
                     "page": "https://www.scottbuckley.com.au/library/born-of-the-sky/"},
}

# The reel's landmarks (reel seconds). All on the Vanguard grid except the tease.
VAN_IN = 4.5      # Vanguard bar 37 (67.2475): the build's drums under the last of Starfire
DROP = 9.0        # Vanguard bar 40 (71.7475): the drop, B major, after the bar-38 suck-back and the 2-beat pickup
SPLICE = 21.6     # end of Vanguard bar 46 (84.3475) -> bar 113 (203.1475): bar 113 sounds like bar 47 (chroma 0.95)
STOP = 36.0       # end of Vanguard bar 120 (217.5475): the music stops dead (the composer's own stop, cleaned)
SLAM = 37.8       # Vanguard bar 123 (221.1475): the composer's own slam back in, one silent bar later
LOGO = 43.2       # Vanguard bar 126 (226.5475): the tag's final chord, then its ring-out
TEASE = 46.35     # Born Of The Sky bar 4 (8.543): the soft B-major pad under the ring-out
END = 50.1

SEGMENTS = [
    {"id": "T1", "track": "Starfire", "anchor": 6.78, "at": 0.0, "src_from": 6.78, "src_to": 6.78 + VAN_IN,
     "gain_db": 5.0, "in": [0.0, 0.03, "cos"], "out": [VAN_IN - BEAT, VAN_IN, "eqp"], "anchor_snap": "downbeat",
     "why": "the tension: Starfire's opening pad on F#, the dominant of Vanguard's B; its bar 2 downbeat starts the reel"},
    {"id": "V1", "track": "Vanguard", "anchor": 67.2475, "at": VAN_IN, "src_from": 67.2475 - BEAT,
     "src_to": 84.3475 - 0.015, "gain_db": 0.0, "in": [VAN_IN - BEAT, VAN_IN, "eqp"],
     "out": [SPLICE - 0.095, SPLICE - 0.015, "eqp"],
     "why": "bars 37-46: the build, the bar-38 suck-back, the bar-39 pickup, the drop on bar 40, the first montage "
            "phrase; a one-beat pre-roll crossfade from Starfire that ends on bar 37's downbeat"},
    {"id": "V2", "track": "Vanguard", "anchor": 203.1475, "at": SPLICE, "src_from": 203.1475 - 0.095,
     "src_to": 217.5475 - 0.005, "gain_db": -1.0, "in": [SPLICE - 0.095, SPLICE - 0.015, "eqp"],
     "out": [STOP - 0.015, STOP - 0.005, "cos"],
     "why": "bars 113-120: the peak, joined at a bar line where the harmony matches (bar 112 ~ bar 46 0.98, bar 113 ~ "
            "bar 47 0.95), 1 dB down so the lift is +2 LU, not +3; it stops dead before bar 121"},
    {"id": "V3", "track": "Vanguard", "anchor": 221.1475, "at": SLAM, "src_from": None, "src_to": 233.4,
     "gain_db": 0.0, "in": "attack", "out": [TEASE + 0.9, END - 0.3, "cos"],
     "why": "bar 123: the slam out of silence (the source's own re-entry, +20 LU), the tag's swell (bars 123-125), the "
            "final chord on bar 126 and its ring-out; it starts 8 ms before its measured attack"},
    {"id": "Z1", "track": "BornOfTheSky", "anchor": 8.543, "at": TEASE, "src_from": 8.543 - 0.3, "src_to": 12.5,
     "gain_db": 9.0, "in": [TEASE - 0.3, TEASE, "eqp"], "out": [END - 1.35, END - 0.15, "cos"],
     "anchor_snap": "downbeat",
     "why": "the tease: Born Of The Sky's quiet B-major pad (its bar 4) under the final chord's ring-out"},
]

# true digital silence (the rival beat): from the end of V2 to the start of V3
SILENCE = {"from": STOP - 0.005, "to": "V3.start", "why": "the rival beat: about a second of nothing, 'Anyway.', then "
           "the slam on the next downbeat (one whole bar of the grid)"}

SECTIONS = [
    ("tension", 0.0, DROP), ("reveal_drop", DROP, DROP + 4 * BEAT), ("montage", DROP, STOP),
    ("rival_silence", STOP, SLAM), ("return", SLAM, LOGO), ("logo", LOGO, TEASE), ("tease", TEASE, END),
]

STYLE_TEST = {"from": 3.0, "to": 18.0, "fade_in": 0.3, "fade_out": 0.3,
              "why": "the last seconds of the tension (Starfire into Vanguard's build and suck-back), the drop at 9.0 "
                     "(6.0 in the excerpt) and the first five montage bars"}

MASTERS = {
    "social": {"target_lufs": -14.0, "ceiling_dbtp": -2.0, "aac_kbps": 192, "gate_dbtp": -1.0},
    "web": {"target_lufs": -16.0, "ceiling_dbtp": -2.0, "aac_kbps": 160, "gate_dbtp": -1.0},
}
