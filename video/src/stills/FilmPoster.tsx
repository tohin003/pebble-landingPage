// The film's poster (1280 × 720) is T0's frame 0 (docs/FILM_SPEC.md §2, §15): the riverbed desktop and Pebble's real
// window at m 0.75 (870 × 600, x 205–1075, y 60–660), with the edit card waiting and Apply edit active
// (main-live-film at 8.30 s). No pebble: the teaser starts on this exact picture and has none (the page shows one
// animated pebble at a time; FILM_SPEC §15). No play button and no text: the page draws the galet play button and the
// label in HTML. (Lane G1's first poster, built from a still with a pebble beside the window, is replaced: lane G2b.)
//
// Registered as a one-frame composition at 30 fps (a <Still> runs at 1 fps, which would put the teaser's timing off).
// Render at --scale=2 for the page's retina slot (critic H3); tools/assets/posters.mjs then encodes AVIF/WebP.
import { FilmTeaser } from "../teaser/FilmTeaser";

export const FilmPoster: React.FC = () => <FilmTeaser />;
