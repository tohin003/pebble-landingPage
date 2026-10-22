// One shared, passive document `pointermove` listener for every pebble that follows the pointer, throttled to one
// update per animation frame (Pebble's companionPointer.ts, ported from Vue). Touch pointers are ignored: on phones the
// pebble just lives its idle life. The pointer leaving the window rests the eyes.
import { gazeToward, type Gaze } from "@pebble/index";

/** The eyes turn fully when the pointer is this many rendered widths from the pebble's centre (MASTER_PLAN §4.2). */
export const REACH_WIDTHS = 1.5;

export interface PointerFollower {
  element(): Element | null;
  /** `gaze` is quantised (17 steps per axis) or null; `moved` says the pointer itself moved since the last update */
  update(gaze: Gaze | null, moved: boolean): void;
}

const followers = new Set<PointerFollower>();
let listening = false;
let frame = 0;
let moved = false;
let pointer: { x: number; y: number } | null = null;

function flush() {
  frame = 0;
  const didMove = moved;
  moved = false;
  for (const f of followers) {
    const el = f.element();
    const box = el ? el.getBoundingClientRect() : null;
    f.update(pointer && box ? gazeToward(pointer.x, pointer.y, box, REACH_WIDTHS * box.width) : null, didMove);
  }
}
function schedule() {
  if (!frame) frame = requestAnimationFrame(flush);
}
function onMove(e: PointerEvent) {
  if (e.pointerType === "touch") return;
  pointer = { x: e.clientX, y: e.clientY };
  moved = true;
  schedule();
}
function onOut(e: PointerEvent) {
  if (e.relatedTarget) return; // still inside the window
  pointer = null;
  schedule();
}
// The page scrolls under a still pointer: the direction to the pebble changes, so look again (without counting it as a
// pointer move).
function onScroll() {
  if (pointer) schedule();
}

function start() {
  if (listening) return;
  listening = true;
  document.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerout", onOut, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
}
function stop() {
  if (!listening || followers.size) return;
  listening = false;
  document.removeEventListener("pointermove", onMove);
  document.removeEventListener("pointerout", onOut);
  window.removeEventListener("scroll", onScroll);
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  pointer = null;
}

/** Start following the pointer; returns the function that stops. */
export function followPointer(follower: PointerFollower): () => void {
  followers.add(follower);
  start();
  if (pointer) schedule();
  return () => {
    followers.delete(follower);
    stop();
  };
}
