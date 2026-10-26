// The music grids the set-piece demo is fitted to: real measurements of the audition tracks (the score lane's maps,
// .work/score2/maps/*.map.json: tempo, the first downbeat, the cue windows of .work/score2/cues.json), as numbers only.
// No audio is used or shipped: the demo is silent, and each piece shows where its events landed on its stretch of
// the track. The edit lane replaces these with the locked music's map.json (TREATMENT §4.7).
//
// Each stretch starts on a measured downbeat of its track; a piece's local frame 0 is `lead` frames before the event the
// stretch is chosen for (the Drop's entrance, the climax's peak, the title's downbeat).
import { steadyGrid, type MusicGrid } from "../music";

export interface DemoStretch {
  track: string;
  label: string;
  licence: string;
  bpm: number;
  /** seconds in the track of the stretch's anchor (an entrance, a peak, a title downbeat), on a measured downbeat */
  anchorS: number;
  /** what the anchor is, from the score lane's map */
  anchor: string;
}

/** The stretches, all from the score lane's measured maps (26 Oct). */
export const STRETCH = {
  // B2 "Your Breath" (Mixkit), 119.994 BPM constant: the drop entrance window 1:24.53–1:36.53, the entrance at 1:28.53
  drop: { track: "Your Breath", label: "B2", licence: "Mixkit Stock Music Free License", bpm: 119.994, anchorS: 88.53, anchor: "the drop entrance (+5 LU class)" },
  // B4 "Techno Fest Vibes" (Mixkit), 123.995 BPM constant: the ring groove 0:46.52–1:48.45 (a bar is 1.9356 s, 116.1 frames)
  ring: { track: "Techno Fest Vibes", label: "B4", licence: "Mixkit Stock Music Free License", bpm: 123.995, anchorS: 46.515, anchor: "a phrase downbeat in the ring groove" },
  // A4 "Born Of The Sky" (Scott Buckley, CC BY 4.0), 120.014 BPM: the wall window 2:10.53–2:14.53
  wall: { track: "Born Of The Sky", label: "A4", licence: "CC BY 4.0", bpm: 120.014, anchorS: 130.529, anchor: "the wall's two bars" },
  // A1 "Starfire" (Scott Buckley, CC BY 4.0), 80 BPM: the quiet window 0:12.97–0:30.94 (a bar is 3.0 s)
  dusk: { track: "Starfire", label: "A1", licence: "CC BY 4.0", bpm: 80.0, anchorS: 12.968, anchor: "the quiet section's first downbeat" },
  // A4 "Born Of The Sky", the climax peak window 2:06.53–2:18.53
  climax: { track: "Born Of The Sky", label: "A4", licence: "CC BY 4.0", bpm: 120.014, anchorS: 130.529, anchor: "the peak's first strong downbeat" },
  // A4 "Born Of The Sky": the title window 2:44.52–2:48.52 and its diminuendo ending (the track runs 3:07.50)
  finale: { track: "Born Of The Sky", label: "A4", licence: "CC BY 4.0", bpm: 120.014, anchorS: 164.524, anchor: "the title's downbeat" },
} as const satisfies Record<string, DemoStretch>;

/**
 * The grid of a stretch in a piece's local frames: the anchor on local frame `anchorFrame`, the beats and bars of the
 * track's own tempo around it (constant-tempo tracks; the anchor is a measured downbeat), phrases every 4 bars from it.
 */
export const demoGrid = (s: DemoStretch, anchorFrame: number, length: number, fps = 60): MusicGrid =>
  steadyGrid({ bpm: s.bpm, fps, firstDownbeat: anchorFrame, from: 0, to: length, barsPerPhrase: 4, hits: [anchorFrame] });
