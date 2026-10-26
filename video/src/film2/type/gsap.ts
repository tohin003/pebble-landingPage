// GSAP 3.15.0 for the film, driven by Remotion's frame through @remotion/gsap's useGsapTimeline() (TOOLS_TESTS §2.4):
// - build every tween with fromTo() at an absolute position (seconds), never from() or to() chains that read the
//   DOM's current state, and never callbacks (the hook throws on onUpdate and friends, random() and stray tweens);
// - split text only behind <FontGate> (type/FontGate.tsx), so every render tab splits identical lines;
// - tween DOM or SVG elements only (the hook rejects plain objects: they freeze in renders).
//
// GSAP's licence: the standard "no charge" licence, free for commercial use, plugins included (TOOLS_VIDEO §4.1).
// This module registers the plugins and the film's own curves as CustomEases, once.
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { SplitText } from "gsap/SplitText";
import { CUSTOM_EASES } from "../motion/ease";

let registered = false;
export const ensureGsap = (): typeof gsap => {
  if (!registered) {
    gsap.registerPlugin(SplitText, CustomEase);
    for (const [name, points] of Object.entries(CUSTOM_EASES)) CustomEase.create(name, points);
    registered = true;
  }
  return gsap;
};
ensureGsap();

/** Frames (at `fps`) to GSAP seconds. */
export const fs = (frames: number, fps: number): number => frames / fps;

export { gsap, SplitText, CustomEase };
