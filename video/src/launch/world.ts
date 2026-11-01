// The film's three worlds (TREATMENT §4, rulings v1.1): never one dark canvas.
// - night: the ink stage (the cold open, the title, act cards, Remote, Stealth's dusk, the outro);
// - desktop: the real Mac recordings, full-bleed or floating over a soft blur of themselves (acts 2, 3, 9);
// - daylight: warm stone with ink type (acts 4-7 and the benchmark payoff: the evidence).
// The arc reads night → desktop → daylight → night. <Stage world=…> provides the palette; every component reads its
// default colours from useWorld(), so the same Headline or BarCompare is right on any ground. Never cut between night
// and daylight: carry the change with an object (scaleThrough, pebbleWipe) or a soft wipe (softWipe).
import { createContext, useContext } from "react";
import { PEBBLE_DARK, PEBBLE_LIGHT, type PebbleColors } from "../pebble/PebbleSvg";
import { C } from "./tokens";

export type World = "night" | "desktop" | "daylight";

export interface WorldPalette {
  id: World;
  /** a dark ground (type is light on it) */
  dark: boolean;
  /** the ground's base colour */
  ground: string;
  /** headline type */
  ink: string;
  /** secondary type */
  ink2: string;
  /** footnotes and small print (contrast-safe on this ground) */
  small: string;
  /** Pebble's accent: accent words, Pebble's bars and values */
  accent: string;
  /** rival bars */
  rival: string;
  /** a rival's value and name */
  rivalInk: string;
  /** chart tracks, panels */
  track: string;
  /** hairlines */
  line: string;
  /** shadow colour as "r, g, b" and its strength (1 = the night's) */
  shade: string;
  shadeK: number;
  /** the pebble's own theme colours on this ground (never recoloured) */
  pebble: PebbleColors;
}

/** Daylight's tokens (rulings v1.1): warm stone, ink type, Pebble in deep sage, rivals in mute. */
export const DAY = {
  ground: "#ECE8DF",
  ink: "#141A16",
  ink2: "#3E4640",
  small: "#686E69",
  sage: "#506E54",
  mute: "#9A9F98",
  track: "#DDD8CC",
  line: "#CBC5B8",
} as const;

export const WORLDS: Record<World, WorldPalette> = {
  night: {
    id: "night",
    dark: true,
    ground: C.ink1,
    ink: C.stone0,
    ink2: C.stone1,
    small: C.mute,
    accent: C.sage,
    rival: C.mute,
    rivalInk: C.stone1,
    track: C.ink2,
    line: C.line,
    shade: "3, 6, 4",
    shadeK: 1,
    pebble: PEBBLE_DARK,
  },
  desktop: {
    id: "desktop",
    dark: true,
    ground: C.ink0,
    ink: C.stone0,
    ink2: C.stone1,
    small: C.stone1,
    accent: C.sage,
    rival: C.mute,
    rivalInk: C.stone1,
    track: C.ink2,
    line: C.line,
    shade: "2, 4, 3",
    shadeK: 1.1,
    pebble: PEBBLE_DARK,
  },
  daylight: {
    id: "daylight",
    dark: false,
    ground: DAY.ground,
    ink: DAY.ink,
    ink2: DAY.ink2,
    small: DAY.small,
    accent: DAY.sage,
    rival: DAY.mute,
    rivalInk: DAY.ink2,
    track: DAY.track,
    line: DAY.line,
    shade: "74, 62, 44",
    shadeK: 0.55,
    pebble: PEBBLE_LIGHT,
  },
};

const WorldContext = createContext<WorldPalette>(WORLDS.night);
export const WorldProvider = WorldContext.Provider;
/** The palette of the enclosing <Stage> (night outside one). */
export const useWorld = (): WorldPalette => useContext(WorldContext);
