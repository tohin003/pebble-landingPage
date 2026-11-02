// The launch film's music (docs/launch/TREATMENT.md §4 "Sound": the music is the spine). Copied from the beat maps beside
// the edits in video/public/launch/audio/music/*.beatmap.json (gitignored with the audio), so the master edit can be
// built and checked without the raw files. Regenerate from the JSON if an edit is rebuilt; never hand-edit the numbers.
//
// Keyed A, B and C: the director's pick is A (MUSIC_PICK); the owner may still choose B or C by ear. The master reads
// MUSIC[pick]; the scene timeline in master/timeline.ts is written for A's landmarks.
// Times are seconds from the edit's start. Sources: .work/launch/music/MUSIC.md, .work/handoffs/launch-music.md.

export type MusicId = "A" | "B" | "C";

export interface MusicSection {
  name: string;
  start: number;
  end: number;
  music: string;
}

export interface MusicHit {
  s: number;
  kind: string;
}

export interface Music {
  id: MusicId;
  /** the edit's WAV, under video/public (gitignored) */
  file: string;
  title: string;
  bpm: number;
  beatS: number;
  durationS: number;
  beats: readonly number[];
  downbeats: readonly number[];
  sections: readonly MusicSection[];
  hits: readonly MusicHit[];
  landmarks: Readonly<Record<string, number>>;
  /** what the licence asks for on screen ("" = no credit required) */
  credit: string;
  /** true while the file still needs the owner's own download (the licence's terms) before any deliverable */
  needsOwnerDownload: boolean;
}

export const MUSIC_A: Music = {
  id: "A",
  file: "launch/audio/music/launch-music-A-your-breath.wav",
  title: "Pebble 2.0 launch film, music edit A: Your Breath (Eugenio Mininni, Mixkit), edited",
  bpm: 119.994,
  beatS: 0.50003,
  durationS: 100.0,
  beats: [0.0504, 0.5504, 1.0504, 1.5504, 2.0505, 2.5505, 3.0505, 3.5505, 4.0505, 4.5506, 5.0506, 5.5506, 6.0506, 6.5507, 7.0507, 7.5507, 8.0507, 8.5508, 9.0508, 9.5508, 10.0508, 10.5509, 11.0509, 11.5509, 12.0509, 12.551, 13.051, 13.551, 14.051, 14.551, 15.0511, 15.5511, 16.0511, 16.5511, 17.0512, 17.5512, 18.0512, 18.5512, 19.0513, 19.5513, 20.0513, 20.5513, 21.0514, 21.5514, 22.0514, 22.5514, 23.0514, 23.5515, 24.0515, 24.5515, 25.0515, 25.5516, 26.0516, 26.5516, 27.0516, 27.5517, 28.0517, 28.5517, 29.0517, 29.5518, 30.0518, 30.5518, 31.0518, 31.5519, 32.0519, 32.5519, 33.0519, 33.5519, 34.052, 34.552, 35.052, 35.552, 36.0521, 36.5521, 37.0521, 37.5521, 38.0522, 38.5522, 39.0522, 39.5522, 40.0523, 40.5523, 41.0523, 41.5523, 42.0524, 42.5524, 43.0524, 43.5524, 44.0524, 44.5525, 45.0525, 45.5525, 46.0525, 46.5526, 47.0526, 47.5526, 48.0526, 48.5527, 49.0527, 49.5527, 50.0527, 50.5528, 51.0528, 51.5528, 52.0528, 52.5529, 53.0529, 53.5529, 54.0529, 54.5529, 55.053, 55.553, 56.053, 56.553, 57.0531, 57.5531, 58.0531, 58.5531, 59.0532, 59.5532, 60.0532, 60.5532, 61.0533, 61.5533, 62.0533, 62.5533, 63.0533, 63.5534, 64.0534, 64.5534, 65.0534, 65.5535, 66.0535, 66.5535, 67.0535, 67.5536, 68.0536, 68.5536, 69.0536, 69.5537, 70.0537, 70.5537, 71.0537, 71.5538, 72.0538, 72.5538, 73.0538, 73.5538, 74.0539, 74.5539, 75.0539, 75.5539, 76.054, 76.554, 77.054, 77.554, 78.0541, 78.5541, 79.0541, 79.5541, 80.0542, 80.5542, 81.0542, 81.5542, 82.0543, 82.5543, 83.0543, 83.5543, 84.0543, 84.5544, 85.0544, 85.5544, 86.0544, 86.5545, 87.0545, 87.5545, 88.0545, 88.5546, 89.0546, 89.5546, 90.0546, 90.5547, 91.0547, 91.5547, 92.0547, 92.5548, 93.0548, 93.5545, 94.0545, 94.5545, 95.0546, 95.5546, 96.0546, 96.5546, 97.0547, 97.5547, 98.0547, 98.5547, 99.0548, 99.5548],
  downbeats: [0.0504, 2.0505, 4.0505, 6.0506, 8.0507, 10.0508, 12.0509, 14.051, 16.0511, 18.0512, 20.0513, 22.0514, 24.0515, 26.0516, 28.0517, 30.0518, 32.0519, 34.052, 36.0521, 38.0522, 40.0523, 42.0524, 44.0524, 46.0525, 48.0526, 50.0527, 52.0528, 54.0529, 56.053, 58.0531, 60.0532, 62.0533, 64.0534, 66.0535, 68.0536, 70.0537, 72.0538, 74.0539, 76.054, 78.0541, 80.0542, 81.0542, 83.0543, 85.0544, 87.0545, 89.0546, 91.0547, 93.0548, 95.0546, 97.0547, 99.0548],
  sections: [
    {"name": "hook", "start": 0.0, "end": 8.051, "music": "intro: sparse plucks on a D drone, about 8 LU under the montage"},
    {"name": "drop", "start": 8.051, "end": 24.051, "music": "the track's drop: bass and full kit enter (+5 LU)"},
    {"name": "montage-1", "start": 24.051, "end": 40.051, "music": "groove, rising"},
    {"name": "montage-2", "start": 40.051, "end": 72.051, "music": "the strongest groove (two 8-bar phrases), bass dips every 2 bars"},
    {"name": "breath", "start": 72.051, "end": 81.051, "music": "the groove thins (72.05) and stops (73.07); sparse breakdown plucks; a 0.3 s near-silence at 80.7"},
    {"name": "payoff", "start": 81.051, "end": 93.055, "music": "the lift: the loudest, fullest section (+7 LU)"},
    {"name": "resolve", "start": 93.055, "end": 100.0, "music": "drums out after two hits; pads F then D (home), ringing out"},
  ],
  hits: [{"s": 8.051, "kind": "drop"}, {"s": 24.051, "kind": "phrase"}, {"s": 40.051, "kind": "phrase"}, {"s": 56.051, "kind": "phrase"}, {"s": 72.051, "kind": "breath"}, {"s": 73.411, "kind": "breakdown-hit"}, {"s": 81.051, "kind": "payoff"}, {"s": 89.051, "kind": "phrase"}, {"s": 93.055, "kind": "button"}, {"s": 93.303, "kind": "button-2"}, {"s": 95.055, "kind": "pad"}, {"s": 97.055, "kind": "final-chord"}, {"s": 100.0, "kind": "end"}],
  landmarks: {"drop": 8.051, "breath": 72.051, "payoff": 81.051, "button": 93.055, "final_chord": 97.055, "end": 100.0},
  credit: "",
  needsOwnerDownload: false, // the source is the owner's own download from Mixkit, 28 Oct 2026 (docs/media-provenance.json launch_film.music)
};

export const MUSIC_B: Music = {
  id: "B",
  file: "launch/audio/music/launch-music-B-masking-the-masters.wav",
  title: "Pebble 2.0 launch film, music edit B: Masking the Masters (Eugenio Mininni, Mixkit), edited",
  bpm: 99.997,
  beatS: 0.60002,
  durationS: 100.0,
  beats: [0.0499, 0.6499, 1.2499, 1.8499, 2.4499, 3.0499, 3.6499, 4.25, 4.85, 5.45, 6.05, 6.65, 7.25, 7.8501, 8.4501, 9.0501, 9.6501, 10.2501, 10.8501, 11.4502, 12.0502, 12.6502, 13.2502, 13.8502, 14.4502, 15.0503, 15.6503, 16.2503, 16.8503, 17.4503, 18.0503, 18.6503, 19.2504, 19.8504, 20.4504, 21.0504, 21.6504, 22.2504, 22.8505, 23.4505, 24.0505, 24.6505, 25.2505, 25.8505, 26.4506, 27.0506, 27.6506, 28.2506, 28.8506, 29.4506, 30.0507, 30.6507, 31.2507, 31.8507, 32.4507, 33.0507, 33.6507, 34.2508, 34.8508, 35.4508, 36.0508, 36.6508, 37.2508, 37.8509, 37.8511, 38.4512, 39.0512, 39.6512, 40.2512, 40.8512, 41.4512, 42.0513, 42.6513, 43.2513, 43.8513, 44.4513, 45.0513, 45.6513, 46.2514, 46.8514, 47.4514, 48.0514, 48.6514, 49.2514, 49.8515, 50.4515, 51.0515, 51.6515, 52.2515, 52.8515, 53.4516, 54.0516, 54.6516, 55.2516, 55.8516, 56.4516, 57.0517, 57.6517, 58.2517, 58.8517, 59.4517, 60.0517, 60.6517, 61.2518, 61.8518, 62.4518, 63.0518, 63.6518, 64.2518, 64.8519, 65.4519, 66.0519, 66.6519, 67.2519, 67.8519, 68.452, 69.052, 69.652, 70.252, 70.852, 71.452, 72.0521, 72.6521, 73.2521, 73.8521, 74.4521, 75.0521, 75.6521, 76.2522, 76.8522, 77.4522, 78.0522, 78.6522, 79.2522, 79.8523, 80.4523, 81.0523, 81.6523, 82.2523, 82.8523, 83.4524, 84.0524, 84.6524, 85.2524, 85.8524, 86.4524, 87.0525, 87.6525, 88.2525, 88.8525, 89.4525, 90.0525, 90.6525, 91.2527, 91.8527, 92.4527, 93.0527, 93.6528, 94.2528, 94.8528, 95.4528, 96.0528, 96.6528, 97.2529, 97.8529, 98.4529, 99.0529, 99.6529],
  downbeats: [1.2499, 3.6499, 6.05, 8.4501, 10.8501, 13.2502, 15.6503, 18.0503, 20.4504, 22.8505, 25.2505, 27.6506, 30.6507, 33.0507, 35.4508, 37.8509, 37.8511, 40.2512, 42.6513, 45.0513, 47.4514, 49.8515, 52.2515, 54.6516, 57.0517, 59.4517, 61.8518, 64.2518, 66.6519, 69.052, 71.452, 73.8521, 76.2522, 78.6522, 81.0523, 83.4524, 85.8524, 88.2525, 90.6525, 93.0527, 95.4528, 97.8529],
  sections: [
    {"name": "hook", "start": 0.0, "end": 8.45, "music": "the breakdown's pulsing plucks on a D drone, then its own riser (the last bar)"},
    {"name": "drop", "start": 8.45, "end": 18.05, "music": "the track's drop (+7 LU): full kit and bass"},
    {"name": "montage-1", "start": 18.05, "end": 37.851, "music": "the groove rising to its first peak"},
    {"name": "montage-2", "start": 37.851, "end": 71.451, "music": "a reset (about 3 LU down), then the rebuild rising to the peak"},
    {"name": "breath", "start": 71.451, "end": 81.051, "music": "the drums drop out under a held chord; filtered to 1.4 kHz and 3 dB down, opening over the last bar as the build"},
    {"name": "payoff", "start": 81.051, "end": 95.453, "music": "the drums back at full level"},
    {"name": "resolve", "start": 95.453, "end": 100.0, "music": "the track's own final hit and its decay"},
  ],
  hits: [{"s": 8.45, "kind": "drop"}, {"s": 18.05, "kind": "phrase"}, {"s": 27.65, "kind": "phrase"}, {"s": 37.851, "kind": "phrase"}, {"s": 47.451, "kind": "phrase"}, {"s": 57.051, "kind": "phrase"}, {"s": 66.651, "kind": "phrase"}, {"s": 71.451, "kind": "breath"}, {"s": 78.651, "kind": "build"}, {"s": 81.051, "kind": "payoff"}, {"s": 90.653, "kind": "phrase"}, {"s": 95.453, "kind": "button"}, {"s": 100.0, "kind": "end"}],
  landmarks: {"drop": 8.45, "breath": 71.451, "payoff": 81.051, "button": 95.453, "end": 100.0},
  credit: "",
  needsOwnerDownload: true,
};

export const MUSIC_C: Music = {
  id: "C",
  file: "launch/audio/music/launch-music-C-techno-fest-vibes.wav",
  title: "Pebble 2.0 launch film, music edit C: Techno Fest Vibes (Alejandro Magana, Mixkit), edited",
  bpm: 123.995,
  beatS: 0.48389,
  durationS: 99.0,
  beats: [0.0505, 0.5344, 1.0183, 1.5022, 1.9861, 2.4699, 2.9538, 3.4377, 3.9216, 4.4055, 4.8894, 5.3733, 5.8572, 6.3411, 6.825, 7.3088, 7.7927, 8.2766, 8.7605, 9.2444, 9.7283, 10.2122, 10.6961, 11.18, 11.6639, 12.1478, 12.6316, 13.1155, 13.5994, 14.0833, 14.5672, 15.0511, 15.535, 16.0189, 16.5028, 16.9867, 17.4705, 17.9544, 18.4383, 18.9222, 19.4061, 19.89, 20.3739, 20.8578, 21.3417, 21.8256, 22.3094, 22.7933, 23.2772, 23.7611, 24.245, 24.7289, 25.2128, 25.6967, 26.1806, 26.6645, 27.1483, 27.6322, 28.1161, 28.6, 29.0839, 29.5678, 30.0517, 30.5356, 31.0195, 31.5034, 31.9873, 32.4711, 32.955, 33.4389, 33.9228, 34.4067, 34.8906, 35.3745, 35.8584, 36.3423, 36.8262, 37.31, 37.7939, 38.2778, 38.7617, 39.2456, 39.7295, 40.2134, 40.6973, 41.1812, 41.6651, 42.1489, 42.6328, 43.1167, 43.6006, 44.0845, 44.5684, 45.0523, 45.5362, 46.0201, 46.504, 46.9878, 47.4717, 47.9556, 48.4395, 48.9234, 49.4073, 49.8912, 50.3751, 50.859, 51.3429, 51.8268, 52.3106, 52.7945, 53.2784, 53.7623, 54.2462, 54.7301, 55.214, 55.6979, 56.1818, 56.6657, 57.1495, 57.6334, 58.1173, 58.6012, 59.0851, 59.569, 60.0529, 60.5368, 61.0207, 61.5046, 61.9884, 62.4723, 62.9562, 63.4401, 63.924, 64.4079, 64.8918, 65.3757, 65.8596, 66.3435, 66.8274, 67.3112, 67.7951, 68.279, 68.7629, 69.2468, 69.7307, 70.2146, 70.6985, 71.1824, 71.6663, 72.1501, 72.634, 73.1179, 73.6018, 74.0858, 74.5697, 75.0536, 75.5375, 76.0214, 76.5053, 76.9892, 77.4731, 77.9569, 78.4408, 78.9247, 79.4086, 79.8925, 80.3764, 80.8603, 81.3442, 81.8281, 82.312, 82.7959, 83.2797, 83.7636, 84.2475, 84.7314, 85.2153, 85.6992, 86.1831, 86.667, 87.1509, 87.6348, 88.1186, 88.6025, 89.086, 89.5699, 90.0538, 90.5377, 91.0216, 91.5055, 91.9894, 92.4733, 92.9572, 93.441, 93.9249, 94.4088, 94.8927, 95.3766, 95.8605, 96.3444, 96.8283, 97.3122, 97.7961, 98.2799, 98.7638],
  downbeats: [0.0505, 1.9861, 3.9216, 5.8572, 7.7927, 9.7283, 11.6639, 13.5994, 15.535, 17.4705, 19.4061, 21.3417, 23.2772, 25.2128, 27.1483, 29.0839, 31.0195, 32.955, 34.8906, 36.8262, 38.7617, 40.6973, 42.6328, 44.5684, 46.504, 48.4395, 50.3751, 52.3106, 54.2462, 56.1818, 58.1173, 60.0529, 61.9884, 63.924, 65.8596, 67.7951, 69.7307, 71.6663, 73.6018, 75.5375, 77.4731, 79.4086, 81.3442, 83.2797, 85.2153, 87.1509, 89.086, 91.0216, 92.9572, 94.8927, 96.8283, 98.7638],
  sections: [
    {"name": "hook", "start": 0.0, "end": 7.793, "music": "the groove high-passed: hats and claps only, opening down over the last bar"},
    {"name": "drop", "start": 7.793, "end": 23.277, "music": "kick and bass arrive (the filter opens on the downbeat)"},
    {"name": "montage", "start": 23.277, "end": 73.602, "music": "four-on-the-floor house, 8-bar phrases alternating a darker and a brighter texture"},
    {"name": "breath", "start": 73.602, "end": 81.344, "music": "filtered down to 900 Hz, opening over the last 2 bars; one beat of silence before the payoff"},
    {"name": "payoff", "start": 81.344, "end": 92.957, "music": "the bright phrase at full level, then the last two bars"},
    {"name": "resolve", "start": 92.957, "end": 99.0, "music": "the track's own stop on the downbeat and its ring-out"},
  ],
  hits: [{"s": 7.793, "kind": "drop"}, {"s": 23.277, "kind": "phrase"}, {"s": 38.761, "kind": "phrase"}, {"s": 54.245, "kind": "phrase"}, {"s": 69.729, "kind": "phrase"}, {"s": 73.602, "kind": "breath"}, {"s": 80.86, "kind": "stop"}, {"s": 81.344, "kind": "payoff"}, {"s": 89.086, "kind": "phrase"}, {"s": 92.957, "kind": "button"}, {"s": 99.0, "kind": "end"}],
  landmarks: {"drop": 7.793, "breath": 73.602, "stop": 80.86, "payoff": 81.344, "button": 92.957, "end": 99.0},
  credit: "",
  needsOwnerDownload: true,
};

export const MUSIC: Readonly<Record<MusicId, Music>> = { A: MUSIC_A, B: MUSIC_B, C: MUSIC_C };

/** The director's pick (1 Nov 2026); the owner's choice by ear replaces it. */
export const MUSIC_PICK: MusicId = "A";

/** The hit of `kind` (first match), seconds; throws when the edit has none, so a timeline never silently drifts. */
export const hitOf = (m: Music, kind: string): number => {
  const h = m.hits.find((x) => x.kind === kind);
  if (!h) throw new Error(`music ${m.id}: no hit "${kind}"`);
  return h.s;
};
