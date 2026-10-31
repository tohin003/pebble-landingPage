// The music lane's style-test beat map (.work/reel/music/style-test.beatmap.json, its timing fields only; the audio is
// never in git). Excerpt of the reel score 3.0–18.0 s: Starfire's pad, Vanguard's build from 1.5 s, the suck-back on
// 3.3 s, the pickup on 5.1 s, THE DROP on 6.0 s, then Vanguard's driving montage at 133.33 BPM (27 frames a beat).
// Tracks: Starfire, Vanguard (Scott Buckley, CC BY 4.0). Regenerate by copying the JSON's fields when the lane revises it.
export const STYLE_TEST_RAW = {
 "name": "style-test.beatmap.json (music lane, 2026-11-01T02:46:51+05:30)",
 "fps": 60,
 "tempo_bpm": 133.333,
 "duration_s": 15.0,
 "beats": [
  {
   "t": 0.007,
   "frame": 0,
   "downbeat": true,
   "track": "Starfire"
  },
  {
   "t": 0.7849,
   "frame": 47,
   "downbeat": false,
   "track": "Starfire"
  },
  {
   "t": 1.4998,
   "frame": 90,
   "downbeat": true,
   "track": "Vanguard"
  },
  {
   "t": 1.9498,
   "frame": 117,
   "downbeat": false,
   "track": "Vanguard"
  },
  {
   "t": 2.3998,
   "frame": 144,
   "downbeat": false,
   "track": "Vanguard"
  },
  {
   "t": 2.8498,
   "frame": 171,
   "downbeat": false,
   "track": "Vanguard"
  },
  {
   "t": 3.2998,
   "frame": 198,
   "downbeat": true,
   "track": "Vanguard"
  },
  {
   "t": 3.7498,
   "frame": 225,
   "downbeat": false,
   "track": "Vanguard"
  },
  {
   "t": 4.1998,
   "frame": 252,
   "downbeat": false,
   "track": "Vanguard"
  },
  {
   "t": 4.6498,
   "frame": 279,
   "downbeat": false,
   "track": "Vanguard"
  },
  {
   "t": 5.0998,
   "frame": 306,
   "downbeat": true,
   "track": "Vanguard"
  },
  {
   "t": 5.5497,
   "frame": 333,
   "downbeat": false,
   "track": "Vanguard"
  },
  {
   "t": 5.9997,
   "frame": 360,
   "downbeat": true,
   "track": "Vanguard"
  },
  {
   "t": 6.4497,
   "frame": 387,
   "downbeat": false,
   "track": "Vanguard"
  },
  {
   "t": 6.8997,
   "frame": 414,
   "downbeat": false,
   "track": "Vanguard"
  },
  {
   "t": 7.3497,
   "frame": 441,
   "downbeat": false,
   "track": "Vanguard"
  },
  {
   "t": 7.7997,
   "frame": 468,
   "downbeat": true,
   "track": "Vanguard"
  },
  {
   "t": 8.2497,
   "frame": 495,
   "downbeat": false,
   "track": "Vanguard"
  },
  {
   "t": 8.6997,
   "frame": 522,
   "downbeat": false,
   "track": "Vanguard"
  },
  {
   "t": 9.1497,
   "frame": 549,
   "downbeat": false,
   "track": "Vanguard"
  },
  {
   "t": 9.5997,
   "frame": 576,
   "downbeat": true,
   "track": "Vanguard"
  },
  {
   "t": 10.0497,
   "frame": 603,
   "downbeat": false,
   "track": "Vanguard"
  },
  {
   "t": 10.4997,
   "frame": 630,
   "downbeat": false,
   "track": "Vanguard"
  },
  {
   "t": 10.9497,
   "frame": 657,
   "downbeat": false,
   "track": "Vanguard"
  },
  {
   "t": 11.3997,
   "frame": 684,
   "downbeat": true,
   "track": "Vanguard"
  },
  {
   "t": 11.8497,
   "frame": 711,
   "downbeat": false,
   "track": "Vanguard"
  },
  {
   "t": 12.2997,
   "frame": 738,
   "downbeat": false,
   "track": "Vanguard"
  },
  {
   "t": 12.7497,
   "frame": 765,
   "downbeat": false,
   "track": "Vanguard"
  },
  {
   "t": 13.1997,
   "frame": 792,
   "downbeat": true,
   "track": "Vanguard"
  },
  {
   "t": 13.6497,
   "frame": 819,
   "downbeat": false,
   "track": "Vanguard"
  },
  {
   "t": 14.0997,
   "frame": 846,
   "downbeat": false,
   "track": "Vanguard"
  },
  {
   "t": 14.5497,
   "frame": 873,
   "downbeat": false,
   "track": "Vanguard"
  },
  {
   "t": 14.9997,
   "frame": 900,
   "downbeat": true,
   "track": "Vanguard"
  }
 ],
 "downbeats": [
  {
   "t": 0.007,
   "frame": 0
  },
  {
   "t": 1.4998,
   "frame": 90
  },
  {
   "t": 3.2998,
   "frame": 198
  },
  {
   "t": 5.0998,
   "frame": 306
  },
  {
   "t": 5.9997,
   "frame": 360
  },
  {
   "t": 7.7997,
   "frame": 468
  },
  {
   "t": 9.5997,
   "frame": 576
  },
  {
   "t": 11.3997,
   "frame": 684
  },
  {
   "t": 13.1997,
   "frame": 792
  },
  {
   "t": 14.9997,
   "frame": 900
  }
 ],
 "hits": [
  {
   "name": "vanguard_in",
   "t": 1.5,
   "frame": 90,
   "what": "Vanguard's build enters (bar 37), Starfire gone"
  },
  {
   "name": "suck_back",
   "t": 3.3,
   "frame": 198,
   "what": "bar 38: the music sucks back (filter-down, quietest at about 8.0 s)"
  },
  {
   "name": "pickup",
   "t": 5.1,
   "frame": 306,
   "what": "the 2-beat pickup into the drop"
  },
  {
   "name": "DROP",
   "t": 6.0,
   "frame": 360,
   "what": "the drop: the reveal (B major, +9 LU)"
  }
 ],
 "sections": [
  {
   "name": "tension",
   "from_s": 0.0,
   "to_s": 6.0
  },
  {
   "name": "reveal_drop",
   "from_s": 6.0,
   "to_s": 7.8
  },
  {
   "name": "montage",
   "from_s": 6.0,
   "to_s": 15.0
  }
 ]
} as const;
