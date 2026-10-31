// The full reel's beat map (the locked score) and its energy curve, normalized to reel frames.
import { normalizeBeatMap, type BeatMap } from "../beats";
import { REEL_RAW } from "./reel.map";
import { REEL_ENERGY } from "./reel.energy";

export const REEL_MAP: BeatMap = normalizeBeatMap(REEL_RAW, "reel.beatmap.json");

/** The score's smoothed loudness at frame f, 0..1. */
export const reelEnergy = (f: number): number => REEL_ENERGY.level[Math.max(0, Math.min(REEL_ENERGY.level.length - 1, Math.round(f)))];
