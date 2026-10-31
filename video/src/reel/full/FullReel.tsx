// THE FULL REEL: Pebble 2.0's 50.1-s launch reel on the locked score (timeline.ts), composed for 16:9, 9:16 and 1:1.
// Every screen is a real 2.0.0 take (takes.ts) or a drawn explainer (explainers.tsx; diagrams, never product screens);
// every cut lands on the score's beat; the pebble is Pebble's own engine and its aura follows the music.
// The lead's review of the style test, built in: the frame stays clean (the credits live on the end card), the
// montage's screens are close, big and bright, and no type is clipped mid-move.
import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import "../../fonts";
import { FONT } from "../../fonts";
import { REEL_MAP, reelEnergy as E } from "../maps/reelMap";
import { CROPS, type CropId } from "../takes";
import { Card, type CardPose } from "../fx/Card";
import { Ground } from "../fx/Ground";
import { Hero, ShockRing } from "../fx/Hero";
import { Aura } from "../fx/Aura";
import { INTER_HEAVY, REEL, c01, expoIn, expoOut, hitEnv, inOut } from "../fx/look";
import { Word, fitSize } from "../fx/Word";
import { WorkshopExplainer, workshopStages } from "../fx/WorkshopExplainer";
import { AgentGuardExplainer, ChipRow, LongTasksExplainer, MemoryChips, PaceDial, RemoteExplainer, StealthSplit, VisualExplainer } from "./explainers";
import { buildFullPlan, END_CARD, segmentAt, STEALTH_HONEST, TEASE_LINES, type Flash, type FullPlan, type Hero as HeroSeg, type Rival, type Segment, type TypeBeat } from "./timeline";

type Aspect = "16x9" | "9x16" | "1x1";
const aspectOf = (W: number, H: number): Aspect => (H > W * 1.2 ? "9x16" : Math.abs(W - H) < 8 ? "1x1" : "16x9");
const TYPED: readonly (readonly [string, number])[] = [
  ["W", 232], ["h", 249], ["a", 258], ["t", 270], [" ", 285], ["c", 300], ["a", 316], ["n", 330], [" ", 341],
  ["y", 352], ["o", 365], ["u", 377], [" ", 395], ["d", 410], ["o", 425], [" ", 440], ["n", 455], ["o", 467], ["w", 480], ["?", 491],
];
const typedAt = (src: number) => TYPED.filter(([, f]) => f <= src).map(([c]) => c).join("");
const TAKE_PEBBLE = { x: 2750, y: 1625, r: 88 };

/** Where the companion pebble stands through the montage, per aspect (9:16: inside the platforms' safe zone). */
const companionSpot = (a: Aspect, W: number, H: number) => (a === "9x16" ? { x: W / 2, y: H * 0.745, size: 210 } : a === "1x1" ? { x: W * 0.9, y: H * 0.94, size: 150 } : { x: W * 0.925, y: H * 0.94, size: 170 });

/* ------------------------------------------------------------------------------------------------ the hook ---- */

const HookScene: React.FC<{ seg: Extract<Segment, { kind: "hook" }>; f: number; W: number; H: number; a: Aspect }> = ({ seg, f, W, H, a }) => {
  const crop = CROPS.askHook.rect;
  const src = Math.round(seg.src.at(f));
  const tall = a !== "16x9";
  const kCard = a === "9x16" ? (W * 0.72) / crop.w : a === "1x1" ? (H * 0.6) / crop.h : (H * 0.8) / crop.h;
  const home = a === "9x16" ? { x: W / 2, y: H * 0.55 } : a === "1x1" ? { x: W / 2, y: H * 0.62 } : { x: W * 0.67, y: H * 0.5 };
  const input = { x: 2470, y: 1385 };
  const centre = { x: crop.x + crop.w / 2, y: crop.y + crop.h / 2 };
  const eye = { x: 2731, y: 1618 };
  // a close-up that pulls back to the whole card by the send (the camera moves the card, never crops inside it)
  const pull = inOut(c01(f / Math.max(1, seg.send * 0.7)));
  const Z0 = a === "16x9" ? 1.75 : 1.35;
  const Z = Z0 - (Z0 - 1) * pull;
  const kz = kCard * Z;
  const inputHome = { x: home.x + (input.x - centre.x) * kCard, y: home.y + (input.y - centre.y) * kCard };
  const inputClose = a === "9x16" ? { x: W * 0.6, y: H * 0.66 } : a === "1x1" ? { x: W * 0.6, y: H * 0.7 } : { x: W * 0.53 + (722 * kz) / 2, y: H * 0.56 };
  const ip = { x: inputClose.x + (inputHome.x - inputClose.x) * pull, y: inputClose.y + (inputHome.y - inputClose.y) * pull };
  let zoom = 1;
  let at = centre;
  // the suck-back (accents[1]) holds its breath: a slow push toward the pebble until the send
  const hold = inOut(c01((f - (seg.accents[1] ?? seg.send)) / Math.max(1, seg.send - (seg.accents[1] ?? seg.send))));
  let pose: CardPose = { x: ip.x - (input.x - centre.x) * kz, y: ip.y - (input.y - centre.y) * kz, k: kz * (1 + 0.06 * hold), rotY: tall ? 0 : -9 + 4 * pull, rotX: tall ? 6 - 3 * pull : 3 };
  const punch = hitEnv(f - seg.send, 2, 8) + seg.accents.reduce((s, h) => s + 0.6 * hitEnv(f - h, 2, 9), 0);
  const beatGlow = seg.pulses.reduce((s, p) => s + 0.22 * hitEnv(f - p, 1, 7), 0);
  const lastAccent = Math.max(-999, ...seg.accents.filter((h) => h <= f));
  const sweep = f < 40 ? f / 40 : f - lastAccent < 26 ? (f - lastAccent) / 26 : f >= seg.send && f < seg.send + 24 ? (f - seg.send) / 24 : undefined;
  pose = { ...pose, k: pose.k * (1 + 0.07 * punch) };
  let trail;
  if (f >= seg.zoomFrom) {
    const u = c01((f - seg.zoomFrom) / Math.max(1, seg.to - seg.zoomFrom));
    const e = expoIn(u);
    const m = inOut(c01(u * 1.6));
    pose = { x: home.x + (W / 2 - home.x) * m, y: home.y + (H / 2 - home.y) * m, k: kCard * (1 + 2.2 * e), rotY: (pose.rotY ?? 0) * (1 - m), rotX: (pose.rotX ?? 0) * (1 - m) };
    zoom = 1 + 15 * e;
    at = { x: centre.x + (eye.x - centre.x) * m, y: centre.y + (eye.y - centre.y) * m };
    const e2 = expoIn(c01(u + 1 / Math.max(1, seg.to - seg.zoomFrom)));
    trail = { vx: 0, vy: 0, vlk: -Math.log((1 + 15 * e2) / (1 + 15 * e)), n: u > 0.25 ? 5 : 0, span: 1.2 };
  }
  // the aura: breathing with Starfire's pad (a breath every 45 frames, on its beats), then on Vanguard's build's beats
  const drums = seg.accents[0] ?? seg.send;
  let level = f < drums ? 0.22 + 0.42 * (0.5 + 0.5 * Math.cos((2 * Math.PI * f) / 45)) + 0.2 * E(f) : 0.15 + 0.5 * E(f) + seg.pulses.reduce((s, p) => s + 0.28 * hitEnv(f - p, 1, 11), 0);
  let rays = 0;
  if (f >= seg.zoomFrom) {
    const u = c01((f - seg.zoomFrom) / Math.max(1, seg.to - seg.zoomFrom));
    level += 0.9 * u;
    rays = 0.55 * u;
  }
  const pebbleAt = { x: pose.x + (TAKE_PEBBLE.x - centre.x) * pose.k, y: pose.y + (TAKE_PEBBLE.y - centre.y) * pose.k };
  // the echo: the question as typed, huge
  const typed = typedAt(src);
  const lines = typed.length <= 8 ? [typed] : [typed.slice(0, 9).trimEnd(), typed.slice(9)];
  const settled = tall ? fitSize("you do now?", W * 0.86, 170) : fitSize("you do now?", W * 0.5, 200);
  const size = settled * (1 + 0.55 * (1 - c01((typed.length - 4) / 4)));
  // the echo leaves IN PLACE (a blur and a fade over 10 frames), never sliding past the frame's edge half-read
  const leave = f >= seg.zoomFrom ? c01((f - seg.zoomFrom) / 10) : 0;
  const sent = f >= seg.send;
  const caretOn = !sent && Math.floor(f / 18) % 2 === 0;
  return (
    <AbsoluteFill>
      <Ground tint="sage" focus={{ x: c01(pebbleAt.x / W), y: c01(pebbleAt.y / H) }} energy={0.4 + 0.75 * level + 0.4 * punch + 0.6 * leave} />
      {leave < 1 && (
        <div
          style={{
            position: "absolute",
            left: tall ? W / 2 : W * 0.065,
            top: a === "9x16" ? H * 0.2 : a === "1x1" ? H * 0.17 : H * 0.5,
            transform: `translate(${tall ? "-50%" : "0"}, -50%) scale(${1 + 0.04 * punch - 0.06 * leave})`,
            transformOrigin: tall ? "50% 50%" : "0% 50%",
            ...INTER_HEAVY,
            fontSize: size,
            lineHeight: 1.0,
            color: sent ? REEL.accent : REEL.ink,
            textShadow: `0 0 ${size * 0.4}px rgba(${REEL.sage}, ${0.35 + 0.4 * Math.min(1, punch)})`,
            textAlign: tall ? "center" : "left",
            whiteSpace: "pre",
            opacity: 1 - leave,
            filter: leave > 0 ? `blur(${leave * 26}px)` : undefined,
          }}
        >
          {lines.map((l, i) => (
            <div key={i}>
              {l}
              {i === lines.length - 1 && <span style={{ color: REEL.accent, opacity: caretOn ? 1 : 0, marginLeft: size * 0.04 }}>|</span>}
            </div>
          ))}
        </div>
      )}
      {f < seg.zoomFrom && <Aura x={pebbleAt.x} y={pebbleAt.y} r={TAKE_PEBBLE.r * pose.k * 2.4} state={{ level: level * 1.15 }} frame={f} motes={0} />}
      <Card
        crop="askHook"
        src={src}
        pose={pose}
        inner={{ zoom, at }}
        trail={trail}
        sweep={sweep}
        glow={0.7 + beatGlow}
        radiusPx={28}
        overlay={(to, scale) => {
          const p = to(TAKE_PEBBLE.x, TAKE_PEBBLE.y);
          return <Aura x={p.x} y={p.y} r={TAKE_PEBBLE.r * scale} state={{ level: level * 0.6, rays }} frame={f} motes={0} />;
        }}
      />
      {f < seg.zoomFrom && <Aura x={pebbleAt.x} y={pebbleAt.y} r={TAKE_PEBBLE.r * pose.k * 1.6} state={{ level }} frame={f} motes={14} glow={false} />}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------------------------- the lockup (shared) ---- */

const Lockup: React.FC<{ f: number; w1: number; w2: number; x: number; y: number; size: number; align: "left" | "center"; dim?: number }> = ({ f, w1, w2, x, y, size, align, dim = 0 }) => {
  const piece = (text: string, at: number, color: string) => {
    const dt = f - at;
    if (dt < 0) return <span style={{ opacity: 0 }}>{text}</span>;
    const p = expoOut(dt / 8);
    return (
      <span style={{ display: "inline-block", transform: `scale(${1.35 - 0.35 * p}) translateY(${(1 - p) * 20}px)`, transformOrigin: "50% 60%", filter: dt < 5 ? `blur(${14 * (1 - dt / 5)}px)` : undefined, opacity: c01((dt + 1) / 2), color }}>
        {text}
      </span>
    );
  };
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(${align === "center" ? "-50%" : "0"}, -50%)`, ...INTER_HEAVY, fontSize: size, lineHeight: 1, whiteSpace: "pre", textShadow: `0 0 ${size * 0.4}px rgba(${REEL.sage}, 0.4)`, opacity: 1 - 0.7 * dim }}>
      {piece("Pebble", w1, REEL.ink)}
      {piece(" 2.0", w2, REEL.accent)}
    </div>
  );
};

/* ---------------------------------------------------------------------------------------------- the reveal ---- */

const RevealScene: React.FC<{ seg: Extract<Segment, { kind: "reveal" }>; f: number; W: number; H: number; a: Aspect }> = ({ seg, f, W, H, a }) => {
  const D = seg.from;
  const tall = a !== "16x9";
  const size = a === "9x16" ? 820 : a === "1x1" ? 620 : 780;
  const glide = tall ? 0 : inOut(c01((f - seg.w1 + 12) / 14));
  const lockSize = tall ? fitSize("Pebble 2.0", W * 0.86, a === "1x1" ? 170 : 190) : 236;
  const footX = tall ? W / 2 : W / 2 - glide * W * 0.25;
  const footY = a === "9x16" ? H * 0.47 : a === "1x1" ? H * 0.56 : H * 0.5 + size * 0.3;
  const cy = footY - size * 0.3;
  const energy = 1 + 0.9 * hitEnv(f - D, 1, 14) + 0.3 * hitEnv(f - seg.w1, 1, 10) + 0.3 * hitEnv(f - seg.w2, 1, 10);
  return (
    <AbsoluteFill>
      <Ground tint="sage" focus={{ x: footX / W, y: cy / H }} energy={energy} />
      <div style={{ position: "absolute", left: 0, top: cy - 2, width: W, height: 4, background: `linear-gradient(90deg, transparent, rgba(${REEL.sageCore}, ${0.9 * hitEnv(f - D, 1, 10)}), transparent)`, filter: "blur(2px)", transform: `scaleX(${0.3 + 0.7 * expoOut((f - D) / 10)})` }} />
      <ShockRing x={footX} y={cy} dt={f - D - 5} r0={size * 0.2} r1={Math.max(W, H) * 0.6} frames={30} />
      <ShockRing x={footX} y={cy} dt={f - seg.w2} r0={size * 0.25} r1={size * 1.2} frames={20} />
      <Hero
        cues={[
          { at: D / 60, pose: "viewing" },
          { at: seg.w1 / 60, look: { x: tall ? 0 : 0.6, y: tall ? 0.6 : -0.05 } },
          { at: seg.w1 / 60 + 0.9, look: null },
        ]}
        x={footX}
        y={footY}
        size={size}
        landAt={D}
        pulses={[seg.w1, seg.w2]}
        aura={{ level: 0.55 + 0.45 * E(f) + 0.9 * Math.exp(-(f - D) / 18) + 0.3 * hitEnv(f - seg.w1, 1, 10) + 0.3 * hitEnv(f - seg.w2, 1, 10), burstAge: f - D, rays: 0.12 + 0.88 * Math.exp(-(f - D) / 30) }}
      />
      <Lockup f={f} w1={seg.w1} w2={seg.w2} x={tall ? W / 2 : W * 0.4} y={a === "9x16" ? H * 0.68 : a === "1x1" ? H * 0.8 : cy} size={lockSize} align={tall ? "center" : "left"} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------------------------------- quick flashes ---- */

const VEC = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } } as const;
const DIRS = ["left", "up", "right", "down"] as const;

/** A big, bright real screen: close, filling most of the frame (the lead: "one hero screen per beat"). */
function bigCard(crop: CropId, a: Aspect, W: number, H: number) {
  const r = CROPS[crop].rect;
  const portrait = r.w / r.h < 1.2;
  if (a === "9x16") return { k: Math.min((W * 0.9) / r.w, (H * 0.42) / r.h, 2.6), x: W / 2, y: H * 0.45, lineAt: { x: W / 2, y: H * 0.165, w: W * 0.86, align: "center" as const } };
  if (a === "1x1") return { k: Math.min((W * 0.86) / r.w, (H * 0.6) / r.h, 2.6), x: W / 2, y: H * 0.42, lineAt: { x: W / 2, y: H * 0.85, w: W * 0.74, align: "center" as const } };
  if (portrait) return { k: Math.min((W * 0.5) / r.w, (H * 0.84) / r.h, 2.6), x: W * 0.66, y: H * 0.5, lineAt: { x: W * 0.06, y: H * 0.5, w: W * 0.42, align: "left" as const } };
  return { k: Math.min((W * 0.8) / r.w, (H * 0.64) / r.h, 2.6), x: W * 0.5, y: H * 0.42, lineAt: { x: W * 0.5, y: H * 0.86, w: W * 0.8, align: "center" as const } };
}

/** One real screen arriving mid-whip on its beat, punched on the beats inside it, and leaving with the next. */
const ScreenCard: React.FC<{ crop: CropId; src: number; f: number; from: number; to: number; i: number; a: Aspect; W: number; H: number; punches?: readonly number[]; leaveTo?: keyof typeof VEC; scale?: number; at?: { x: number; y: number } }> = ({ crop, src, f, from, to, i, a, W, H, punches = [], leaveTo, scale = 1, at }) => {
  const dt = f - from;
  const left = to - f;
  const g = bigCard(crop, a, W, H);
  const inV = VEC[DIRS[i % 4]];
  const outV = leaveTo ? VEC[leaveTo] : { x: 0, y: 0 };
  const dist = Math.max(W, H) * 0.75;
  const arrive = (d: number) => 0.45 * (1 - expoOut((d + 1) / 6));
  const go = (l: number) => (l <= 5 ? expoIn(1 - l / 5) : 0);
  const ox = inV.x * dist * arrive(dt) - outV.x * dist * go(left);
  const oy = inV.y * dist * arrive(dt) - outV.y * dist * go(left);
  const vx = inV.x * dist * arrive(dt + 1) - outV.x * dist * go(left - 1) - ox;
  const vy = inV.y * dist * arrive(dt + 1) - outV.y * dist * go(left - 1) - oy;
  const speed = Math.hypot(vx, vy);
  let k = g.k * scale * (1 + 0.03 * (dt / Math.max(1, to - from)));
  for (const p of punches) k *= 1 + 0.08 * hitEnv(f - p, 2, 8);
  k *= 1 + 0.05 * hitEnv(dt, 1, 6);
  const settle = expoOut(dt / 18);
  const pos = at ?? { x: g.x, y: g.y };
  const pose: CardPose = { x: pos.x + ox, y: pos.y + oy, k, rotY: (i % 2 ? 1 : -1) * 7 * (1 - 0.5 * settle), rotX: 3 * (1 - settle) + 1 };
  return <Card crop={crop} src={src} pose={pose} trail={speed > 6 ? { vx, vy, n: 8, span: 1.6 } : undefined} blurPx={Math.min(10, speed / 14)} sweep={dt >= 3 && dt <= 23 ? (dt - 3) / 20 : undefined} fadeRight={crop === "keepCard"} glow={0.9} bright={1.12} />;
};

const FlashScene: React.FC<{ seg: Flash; f: number; W: number; H: number; a: Aspect; index: number }> = ({ seg, f, W, H, a, index }) => {
  const shot = seg.shots.find((s) => f >= s.from && f < s.to) ?? seg.shots[seg.shots.length - 1];
  const si = seg.shots.indexOf(shot);
  const g = bigCard(shot.crop, a, W, H);
  const src = Math.round(shot.src.at(f - shot.from));
  const size = fitSize(seg.line, g.lineAt.w, a === "16x9" ? (g.lineAt.align === "left" ? 150 : 128) : a === "9x16" ? 140 : 120);
  const energy = 1.05 + 0.35 * hitEnv(f - shot.from, 1, 10) + seg.punches.reduce((s, p) => s + 0.25 * hitEnv(f - p, 1, 10), 0);
  return (
    <AbsoluteFill>
      <Ground tint={seg.tint} focus={{ x: g.x / W, y: g.y / H }} energy={energy} />
      <ScreenCard crop={shot.crop} src={src} f={f} from={shot.from} to={shot.to} i={index + si} a={a} W={W} H={H} punches={seg.punches} leaveTo={DIRS[(index + si + 1) % 4]} />
      <Word text={seg.line} dt={f - seg.from} left={seg.to - f} size={size} x={g.lineAt.x} y={g.lineAt.y} align={g.lineAt.align} sweep={f - seg.from >= 8 && f - seg.from <= 32 ? (f - seg.from - 8) / 24 : undefined} />
    </AbsoluteFill>
  );
};

/* -------------------------------------------------------------------------------------------- type beats ---- */

const TypeScene: React.FC<{ seg: TypeBeat; f: number; W: number; H: number; a: Aspect; B: number }> = ({ seg, f, W, H, a, B }) => {
  const dt = f - seg.from;
  const tall = a !== "16x9";
  const size = fitSize(seg.line, W * (tall ? 0.86 : 0.7), tall ? 170 : 200);
  const lineY = a === "9x16" ? H * 0.3 : a === "1x1" ? H * 0.32 : H * 0.36;
  const motifY = a === "9x16" ? H * 0.52 : a === "1x1" ? H * 0.66 : H * 0.7;
  const mw = W * (tall ? 0.9 : 0.66);
  const mx = (W - mw) / 2;
  const downs = 0.3 * Math.max(0, ...Array.from({ length: 8 }, (_, i) => hitEnv(dt - i * B, 1, 10)));
  return (
    <AbsoluteFill>
      <Ground tint={seg.tint} focus={{ x: 0.5, y: 0.45 }} energy={1.05 + downs + 0.3 * E(f)} />
      <Word text={seg.line} dt={dt} left={seg.to - f} size={size} x={W / 2} y={lineY} align="center" sweep={dt >= 8 && dt <= 34 ? (dt - 8) / 26 : undefined} />
      {seg.id === "pace" && <PaceDial x={mx} y={motifY} w={mw} dt={dt - 6} B={B} />}
      {seg.id === "memory" && <MemoryChips x={mx} y={motifY} w={mw} dt={dt - 4} B={B} />}
      {seg.id === "model" && <ChipRow x={mx} y={a === "9x16" ? motifY - 40 : motifY} w={mw} dt={dt} B={B} items={["ChatGPT", "API key", "Local model"]} vertical={a === "9x16"} />}
    </AbsoluteFill>
  );
};

/* -------------------------------------------------------------------------------------------- hero beats ---- */

function heroBox(a: Aspect, W: number, H: number) {
  if (a === "9x16") return { name: { x: W / 2, y: H * 0.13, w: W * 0.84, align: "center" as const }, box: { x: W * 0.05, y: H * 0.25, w: W * 0.9, h: H * 0.4 } };
  if (a === "1x1") return { name: { x: W / 2, y: H * 0.11, w: W * 0.86, align: "center" as const }, box: { x: W * 0.05, y: H * 0.24, w: W * 0.9, h: H * 0.6 } };
  return { name: { x: W * 0.055, y: H * 0.36, w: W * 0.34, align: "left" as const }, box: { x: W * 0.41, y: H * 0.08, w: W * 0.56, h: H * 0.64 } };
}

const HeroScene: React.FC<{ seg: HeroSeg; f: number; W: number; H: number; a: Aspect; B: number }> = ({ seg, f, W, H, a, B }) => {
  const dt = f - seg.from;
  const L = heroBox(a, W, H);
  const twoLine = seg.name.includes("\n");
  const size = fitSize(seg.name, L.name.w, a === "16x9" ? 128 : a === "9x16" ? 112 : 100);
  const subSize = Math.round(size * 0.5);
  const nameY = L.name.y - (a === "16x9" ? 0 : twoLine ? 0 : 0);
  const subY = nameY + size * (twoLine ? 1.12 : 0.62) + subSize * 0.9;
  const e = E(f);
  const box = L.box;
  const stage = (n: number) => dt >= n * B;
  const energy = 1.05 + 0.3 * e + 0.35 * Math.max(0, ...[0, 1, 2, 3, 4, 5].map((i) => hitEnv(dt - i * B, 1, 10)));
  // the real screens inside a hero: the Workshop's card; Stealth's palette, then its menu-bar icon
  let real: React.ReactNode = null;
  if (seg.id === "workshop") {
    const askAt = Math.round(workshopStages(B).ask);
    const pos = a === "9x16" ? { x: W / 2, y: H * 0.6 } : a === "1x1" ? { x: W / 2, y: H * 0.74 } : { x: W * 0.72, y: H * 0.68 };
    const k = (a === "9x16" ? W * 0.82 : a === "1x1" ? W * 0.66 : W * 0.34) / CROPS.keepCard.rect.w;
    if (dt >= askAt) real = <Card crop="keepCard" src={5400 + Math.min(200, dt)} pose={{ x: pos.x, y: pos.y, k: k * (1 + 0.06 * hitEnv(dt - askAt, 1, 8) + 0.05 * hitEnv(dt - 4 * B, 2, 8)), rotY: a === "16x9" ? -8 : 0, rotX: 3, opacity: c01((dt - askAt + 1) / 3) }} fadeRight glow={0.8} bright={1.1} sweep={dt - askAt >= 2 && dt - askAt <= 22 ? (dt - askAt - 2) / 20 : undefined} />;
  }
  if (seg.id === "stealth") {
    const center = a === "16x9" ? { x: W * 0.68, y: H * 0.4 } : a === "9x16" ? { x: W / 2, y: H * 0.42 } : { x: W / 2, y: H * 0.48 };
    if (!stage(4)) {
      const onMenu = stage(2);
      const crop: CropId = onMenu ? "stealthMenu" : "stealthPalette";
      // the palette: "stealth" typed and the row lit, Return on the second beat (never past 433); then the icon turns
      const src = onMenu ? Math.min(1185, 426 + (dt - 2 * B)) : Math.min(433, Math.round(300 + (132 * Math.min(dt, 2 * B - 2)) / (2 * B - 2)));
      const w = a === "16x9" ? W * 0.56 : W * 0.9;
      real = <ScreenCard crop={crop} src={src} f={f} from={seg.from + (onMenu ? 2 * B : 0)} to={seg.from + (onMenu ? 4 * B : 2 * B)} i={onMenu ? 1 : 0} a={a} W={W} H={H} punches={[seg.from + B, seg.from + 3 * B]} at={center} scale={(w / CROPS[crop].rect.w) / bigCard(crop, a, W, H).k} leaveTo={onMenu ? "left" : "up"} />;
    }
  }
  return (
    <AbsoluteFill>
      <Ground tint={seg.tint} focus={{ x: (box.x + box.w / 2) / W, y: (box.y + box.h * 0.45) / H }} energy={energy} />
      {seg.id === "agentguard" && <AgentGuardExplainer {...box} dt={dt} B={B} energy={e} />}
      {seg.id === "workshop" && <WorkshopExplainer {...box} dt={dt} B={B} energy={e} />}
      {seg.id === "visual" && <VisualExplainer {...box} dt={dt} B={B} energy={e} />}
      {seg.id === "longtasks" && <LongTasksExplainer {...box} dt={dt} B={B} energy={e} />}
      {seg.id === "remote" && <RemoteExplainer {...box} dt={dt} B={B} energy={e} />}
      {seg.id === "stealth" && stage(4) && <StealthSplit {...box} dt={dt - 4 * B} B={B} vertical={a === "9x16"} />}
      {real}
      <Word text={seg.name} dt={dt} left={seg.to - f} size={size} x={L.name.x} y={nameY} align={L.name.align} sweep={dt >= 10 && dt <= 36 ? (dt - 10) / 26 : undefined} />
      {seg.sub && <Word text={seg.sub} dt={dt - 8} left={seg.to - f} size={subSize} x={L.name.x} y={subY} align={L.name.align} color={REEL.inkSoft} style={{ fontWeight: 600, letterSpacing: "-0.02em", textShadow: "none" }} />}
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------------------------------- the rival beat ---- */

const RivalScene: React.FC<{ seg: Rival; f: number; W: number; H: number; a: Aspect }> = ({ seg, f, W, H, a }) => {
  const tall = a !== "16x9";
  if (f < seg.ask.to) {
    // the ask, close: the typed line and the send, real (RS9A-01)
    const dt = f - seg.ask.from;
    const src = Math.round(seg.ask.src.at(dt));
    const r = CROPS.rivalAsk.rect;
    const k = tall ? (W * 0.92) / r.w : (H * 0.86) / r.h;
    const input = { x: 1640, y: 790 };
    const zoom = 1.35 - 0.2 * inOut(c01(dt / (seg.ask.to - seg.ask.from)));
    return (
      <AbsoluteFill>
        <Ground tint="deep" focus={{ x: 0.5, y: 0.5 }} energy={1 + 0.3 * hitEnv(dt, 1, 8)} />
        <Card crop="rivalAsk" src={src} pose={{ x: W / 2, y: H * (a === "9x16" ? 0.45 : 0.5), k: k * (1 + 0.05 * hitEnv(dt, 1, 6)), rotX: 2 }} inner={{ zoom, at: { x: r.x + r.w / 2 + (input.x - r.x - r.w / 2) * 0.5, y: r.y + r.h / 2 + (input.y - r.y - r.h / 2) * 0.5 } }} glow={0.8} bright={1.1} />
      </AbsoluteFill>
    );
  }
  // the play: Pebble's own tab (its green group) and Anthropic's video playing in it (RS9B-02), cut in on motion
  const dt = f - seg.play.from;
  const src = Math.round(seg.play.src.at(dt));
  const pr = CROPS.rivalPlay.rect;
  const kp = tall ? (W * 0.94) / pr.w : (W * 0.62) / pr.w;
  const py = a === "9x16" ? H * 0.44 : H * 0.52;
  const tr = CROPS.rivalTab.rect;
  const kt = kp * 1.15;
  const arrive = 1 - expoOut((dt + 1) / 7);
  return (
    <AbsoluteFill>
      <Ground tint="deep" focus={{ x: 0.5, y: py / H }} energy={1.05} />
      <Card crop="rivalPlay" src={src} pose={{ x: W / 2 + arrive * W * 0.3, y: py, k: kp * (1 + 0.025 * (dt / 80)), rotY: -4 * arrive }} trail={arrive > 0.05 ? { vx: -W * 0.3 * 0.2, vy: 0, n: 6, span: 1.4 } : undefined} glow={0.7} bright={1.04} />
      <Card crop="rivalTab" src={src} pose={{ x: W / 2 + arrive * W * 0.3 - (pr.w * kp) / 2 + (tr.w * kt) / 2, y: py - (pr.h * kp) / 2 - (tr.h * kt) / 2 - 18, k: kt }} glow={0.3} shadow radiusPx={10} bright={1.06} />
    </AbsoluteFill>
  );
};

const SilenceScene: React.FC<{ seg: Extract<Segment, { kind: "silence" }>; f: number; W: number; H: number; a: Aspect; lastPlaySrc: number }> = ({ seg, f, W, H, a, lastPlaySrc }) => {
  // total stillness: a hard punch-in on the title, nothing moves; then "Anyway.", dry
  const tr = CROPS.rivalTitle.rect;
  const k = (a === "16x9" ? W * 0.62 : W * 0.9) / tr.w;
  const show = f >= seg.anyway;
  return (
    <AbsoluteFill>
      <Ground tint="deep" focus={{ x: 0.5, y: 0.45 }} energy={0.55} />
      <Card crop="rivalTitle" src={lastPlaySrc} pose={{ x: W / 2, y: H * (a === "9x16" ? 0.4 : 0.42), k }} glow={0.2} radiusPx={14} />
      {show && (
        <div style={{ position: "absolute", left: 0, right: 0, top: H * (a === "9x16" ? 0.56 : 0.66), textAlign: "center", fontFamily: FONT.sans, fontWeight: 600, fontSize: Math.round(Math.min(W, H) * 0.06), color: REEL.ink, letterSpacing: "-0.01em" }}>
          Anyway.
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------------------------ the rush and the merge ---- */

const RUSH: readonly CropId[] = ["calculator", "finder", "keepCard", "stealthPalette", "calendar", "rivalAsk", "reply"];
const RUSH_SRC: Record<string, number> = { calculator: 3420, finder: 2900, keepCard: 5500, stealthPalette: 420, calendar: 6250, rivalAsk: 1700, reply: 1000, spaces: 300 };

const RushScene: React.FC<{ seg: Extract<Segment, { kind: "rush" }>; f: number; W: number; H: number; a: Aspect }> = ({ seg, f, W, H, a }) => {
  const i = Math.max(0, seg.flashes.filter((x) => x <= f).length - 1);
  const from = seg.flashes[i];
  const to = seg.flashes[i + 1] ?? seg.to;
  const crop = RUSH[i % RUSH.length];
  const g = bigCard(crop, a, W, H);
  return (
    <AbsoluteFill>
      <Ground tint={i % 2 ? "deep" : "sage"} focus={{ x: g.x / W, y: g.y / H }} energy={1.2 + 0.4 * hitEnv(f - from, 1, 6)} />
      <ScreenCard crop={crop} src={RUSH_SRC[crop]} f={f} from={from} to={to} i={i} a={a} W={W} H={H} leaveTo={DIRS[(i + 1) % 4]} scale={0.92} />
    </AbsoluteFill>
  );
};

const MERGE: readonly CropId[] = ["calculator", "calendar", "finder", "keepCard", "reply", "stealthPalette", "rivalAsk", "spaces"];

/** The merge's pebble: where it stands (the logo's pebble glides from here). */
const mergeSpot = (a: Aspect, W: number, H: number) => {
  const size = a === "9x16" ? 640 : a === "1x1" ? 520 : 600;
  return { x: W / 2, y: a === "9x16" ? H * 0.44 : a === "1x1" ? H * 0.5 : H * 0.5 + size * 0.3, size };
};

const MergeScene: React.FC<{ seg: Extract<Segment, { kind: "merge" }>; f: number; W: number; H: number; a: Aspect }> = ({ seg, f, W, H, a }) => {
  const ms = mergeSpot(a, W, H);
  const size = ms.size;
  const cx = ms.x;
  const footY = ms.y;
  const cy = footY - size * 0.3;
  const rx = a === "9x16" ? W * 0.42 : a === "1x1" ? W * 0.4 : W * 0.36;
  const ry = a === "9x16" ? H * 0.22 : a === "1x1" ? H * 0.32 : H * 0.36;
  const n = seg.pulls.length;
  const spin = ((f - seg.from) / 60) * 1.4;
  const pull = 16;
  const absorbed = seg.pulls.filter((p) => p <= f).length;
  const cards = seg.pulls.map((at, i) => {
    const crop = MERGE[i % MERGE.length];
    const u = (f - (at - pull)) / pull;
    if (u > 1) return null;
    const pos = (q: number) => {
      const e = expoIn(c01(q));
      const ang = (i / n) * Math.PI * 2 + spin + e * 1.6;
      return { x: cx + Math.cos(ang) * rx * (1 - e), y: cy + Math.sin(ang) * ry * (1 - e), e };
    };
    const p0 = pos(u);
    const p1 = pos(u + 1 / pull);
    const k0 = Math.min((Math.min(W, H) * 0.34) / Math.max(CROPS[crop].rect.w, CROPS[crop].rect.h), 1.5);
    const appear = c01(0.6 + (f - seg.from) / 6 - i * 0.03);
    const behind = Math.sin((i / n) * Math.PI * 2 + spin) < 0 && p0.e < 0.5;
    return {
      behind,
      el: <Card key={i} crop={crop} src={RUSH_SRC[crop] ?? CROPS[crop].allowed[0]} pose={{ x: p0.x, y: p0.y, k: k0 * (1 - 0.94 * p0.e) * (0.5 + 0.5 * appear), rotY: Math.cos((i / n) * Math.PI * 2 + spin) * 22, rotX: 8, opacity: appear }} trail={p0.e > 0.05 ? { vx: p1.x - p0.x, vy: p1.y - p0.y, vlk: Math.log((1 - 0.94 * p1.e) / (1 - 0.94 * p0.e)), n: 7, span: 1.6 } : undefined} blurPx={behind ? 3 : 0} glow={0.35} bright={1.08} />,
    };
  });
  return (
    <AbsoluteFill>
      <Ground tint="sage" focus={{ x: 0.5, y: cy / H }} energy={1.05 + 0.6 * (absorbed / Math.max(1, n)) + seg.pulls.reduce((s, p) => s + 0.15 * hitEnv(f - p, 1, 5), 0)} />
      {cards.filter((c) => c && c.behind).map((c) => c!.el)}
      <Hero cues={[{ at: seg.from / 60, pose: "viewing" }]} x={cx} y={footY} size={size} landAt={seg.from} enter="pop" pulses={seg.pulls} pulseGain={0.5} aura={{ level: 0.5 + 0.7 * (absorbed / Math.max(1, n)) + 0.25 * E(f), rays: 0.3 * (absorbed / Math.max(1, n)) }} />
      {cards.filter((c) => c && !c.behind).map((c) => c!.el)}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------------------------- the logo and the tease ---- */

const EndScene: React.FC<{ plan: FullPlan; f: number; W: number; H: number; a: Aspect }> = ({ plan, f, W, H, a }) => {
  const logo = plan.logo;
  const tease = plan.segments.find((s) => s.kind === "tease") as Extract<Segment, { kind: "tease" }>;
  const tall = a !== "16x9";
  const size = a === "9x16" ? 560 : a === "1x1" ? 380 : 520;
  const footX = tall ? W / 2 : W * 0.33;
  const footY = a === "9x16" ? H * 0.34 : a === "1x1" ? H * 0.33 : H * 0.5;
  const cy = footY - size * 0.3;
  const teaseOn = f >= tease.from;
  const dimLock = teaseOn ? inOut(c01((f - tease.from) / 20)) : 0;
  const lockSize = tall ? fitSize("Pebble 2.0", W * 0.8, a === "1x1" ? 150 : 170) : 210;
  const lock = { x: tall ? W / 2 : W * 0.43, y: a === "9x16" ? H * 0.43 : a === "1x1" ? H * 0.42 : H * 0.36 };
  const lineSize = Math.round(Math.min(W, H) * (tall ? 0.048 : 0.05));
  const tagY = lock.y + lockSize * 0.78;
  // the aura: a grand, warm radiance on the logo chord, then calm and sleepy for the tease
  const sinceLogo = f - logo;
  const level = teaseOn ? 0.45 + 0.1 * Math.sin((f - tease.from) / 40) : 0.7 + 0.9 * Math.exp(-sinceLogo / 40) + 0.3 * E(f);
  return (
    <AbsoluteFill>
      <Ground tint="sage" focus={{ x: footX / W, y: cy / H }} energy={teaseOn ? 0.75 : 1.1 + 0.8 * Math.exp(-sinceLogo / 30)} />
      <ShockRing x={footX} y={cy} dt={sinceLogo} r0={size * 0.25} r1={Math.max(W, H) * 0.65} frames={34} />
      <Hero
        cues={[
          { at: logo / 60, pose: "happy" },
          { at: tease.from / 60 + 0.3, pose: "sleepy" },
        ]}
        x={footX}
        y={footY}
        size={size}
        landAt={logo}
        enter={{ from: mergeSpot(a, W, H), frames: 16 }}
        pulses={[logo]}
        aura={{ level, burstAge: sinceLogo, rays: teaseOn ? 0.05 : 0.15 + 0.6 * Math.exp(-sinceLogo / 40), warmth: teaseOn ? 0.2 : 0.55 }}
      />
      <Lockup f={f} w1={logo} w2={logo + 6} x={lock.x} y={lock.y} size={lockSize} align={tall ? "center" : "left"} dim={dimLock} />
      {/* the tagline, then the tease in its place */}
      {!teaseOn && <Word text={END_CARD.tagline} dt={f - logo - 10} size={lineSize * 1.15} x={lock.x} y={tagY} align={tall ? "center" : "left"} color={REEL.inkSoft} style={{ fontWeight: 600, letterSpacing: "-0.015em", textShadow: "none" }} />}
      {teaseOn &&
        TEASE_LINES.map((t, i) => (
          <Word key={t} text={t} dt={f - tease.lines[i]} size={lineSize * 1.15} x={lock.x} y={tagY + i * lineSize * (tall ? 1.3 : 1.45)} align={tall ? "center" : "left"} color={i === 2 ? REEL.inkSoft : REEL.ink} style={{ fontWeight: i === 0 ? 700 : 600, letterSpacing: "-0.015em", textShadow: "none" }} />
        ))}
    </AbsoluteFill>
  );
};

/* ----------------------------------------------------------------------------------------- the overlays ---- */

/** Stealth Lockdown's honest line, word for word, legible (AA on its band) from the slam's next beat to the end. */
const HonestLine: React.FC<{ plan: FullPlan; f: number; W: number; H: number; a: Aspect }> = ({ plan, f, W, H, a }) => {
  if (f < plan.honest.from) return null;
  const p = expoOut(c01((f - plan.honest.from) / 12));
  const end = f >= plan.logo ? inOut(c01((f - plan.logo) / 20)) : 0; // on the end card it rises into its place
  const size = Math.round(Math.min(W, H) * (a === "16x9" ? 0.03 : 0.032));
  const yBand = a === "9x16" ? H * 0.69 : a === "1x1" ? H * 0.88 : H * 0.885;
  const yEnd = a === "9x16" ? H * 0.655 : a === "1x1" ? H * 0.72 : H * 0.72;
  const y = yBand + (yEnd - yBand) * end;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, transform: "translateY(-50%)", display: "flex", justifyContent: "center", opacity: p }}>
      <div style={{ maxWidth: a === "16x9" ? W * 0.62 : W * 0.86, padding: `${size * 0.5}px ${size * 0.9}px`, borderRadius: size * 0.6, background: `rgba(${REEL.shadeRgb}, ${0.72 * (1 - end)})`, fontFamily: FONT.sans, fontWeight: 500, fontSize: size, lineHeight: 1.35, color: REEL.ink, textAlign: "center", textWrap: "balance" as React.CSSProperties["textWrap"] }}>
        {STEALTH_HONEST}
      </div>
    </div>
  );
};

/** The end card's small print: sample data and editing, the music's credit, the RS-9 line, the engine's credit. */
const Credits: React.FC<{ plan: FullPlan; f: number; W: number; H: number; a: Aspect }> = ({ plan, f, W, H, a }) => {
  const logo = plan.segments.find((s) => s.kind === "logo") as Extract<Segment, { kind: "logo" }>;
  if (f < logo.credits) return null;
  const p = expoOut(c01((f - logo.credits) / 14));
  const size = Math.round(Math.min(W, H) * (a === "16x9" ? 0.017 : 0.019));
  const top = a === "9x16" ? H * 0.715 : a === "1x1" ? H * 0.815 : H * 0.81;
  return (
    <div style={{ position: "absolute", left: W * 0.06, right: W * 0.06, top, opacity: p, fontFamily: FONT.sans, fontWeight: 500, fontSize: size, lineHeight: 1.45, color: REEL.inkSoft, textAlign: "center" }}>
      <div style={{ color: REEL.ink, fontWeight: 600 }}>{END_CARD.honestSmall}</div>
      {END_CARD.credits.map((c) => (
        <div key={c}>{c}</div>
      ))}
    </div>
  );
};

/** The companion through the montage: watching each screen, its glow pulsing on the downbeats (brighter after the
 *  step-up), still and dim through the silence (it waits), a little bounce on the slam; then it hands over. */
const Companion: React.FC<{ plan: FullPlan; f: number; W: number; H: number; a: Aspect }> = ({ plan, f, W, H, a }) => {
  const reveal = plan.segments.find((s) => s.kind === "reveal")!;
  const silence = plan.segments.find((s) => s.kind === "silence")!;
  const from = reveal.to;
  const until = plan.slam + Math.round(plan.B);
  if (f < from || f >= until) return null;
  const spot = companionSpot(a, W, H);
  const downs = plan.map.downbeats.filter((d) => d >= from - 0.5 && d < silence.from - 0.5).map(Math.round);
  const beats = plan.map.beats.filter((b) => b >= from - 0.5 && b < silence.from - 0.5).map(Math.round);
  const quiet = f >= silence.from && f < plan.slam;
  const lift = f >= plan.stepUp ? 0.25 : 0;
  const level = quiet ? 0.25 : 0.3 + lift + 0.35 * E(f) + downs.reduce((s, d) => s + (0.5 + lift) * hitEnv(f - d, 1, 12), 0) + beats.reduce((s, b) => s + 0.12 * hitEnv(f - b, 1, 7), 0);
  const fade = f >= plan.slam ? 1 - c01((f - plan.slam - 14) / 12) : 1;
  return (
    <Hero
      cues={[
        { at: from / 60, pose: "viewing" },
        { at: from / 60 + 0.1, look: { x: a === "9x16" ? 0 : -0.7, y: -0.6 } },
        { at: silence.from / 60, pose: "paused" },
        { at: silence.from / 60 + 0.05, look: { x: a === "9x16" ? 0 : -0.5, y: -0.3 } },
        { at: plan.slam / 60, pose: "happy" },
      ]}
      x={spot.x}
      y={spot.y}
      size={spot.size}
      landAt={from}
      enter="pop"
      pulses={quiet ? [] : downs}
      pulseGain={0.55}
      bounceAt={plan.slam}
      aura={{ level, dim: quiet ? 0.6 : 0 }}
      opacity={fade}
    />
  );
};

/* ----------------------------------------------------------------------------------------------- the whole ---- */

export const FullReel: React.FC = () => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const a = aspectOf(W, H);
  const plan = useMemo(() => buildFullPlan(REEL_MAP), []);
  const seg = segmentAt(plan, f);
  const B = plan.B;
  const rival = plan.segments.find((s) => s.kind === "rival") as Rival;
  const lastPlaySrc = Math.round(rival.play.src.at(rival.play.to - rival.play.from - 1));
  const montageIndex = (s: Flash) => plan.segments.filter((x): x is Flash => x.kind === "flash").indexOf(s);
  // the camera kicks on the big hits: the drop, the slam, the logo
  const kick = hitEnv(f - plan.drop, 1, 9) + 0.7 * hitEnv(f - plan.slam, 1, 8) + 0.6 * hitEnv(f - plan.logo, 1, 10);
  const amp = Math.min(W, H) * 0.012 * kick;
  const shake = `translate(${amp * Math.sin(f * 2.1)}px, ${amp * Math.cos(f * 2.9 + 1)}px) scale(${1 + 0.02 * kick})`;
  // one white flash on the drop, one warm one on the logo
  const flash = f >= plan.drop && f < plan.drop + 30 ? 0.85 * Math.exp(-(f - plan.drop) / 4.5) : 0;
  const warmFlash = f >= plan.logo && f < plan.logo + 30 ? 0.45 * Math.exp(-(f - plan.logo) / 6) : 0;
  let scene: React.ReactNode = null;
  if (seg) {
    switch (seg.kind) {
      case "hook":
        scene = <HookScene seg={seg} f={f} W={W} H={H} a={a} />;
        break;
      case "breath":
        scene = <AbsoluteFill style={{ background: "#020805" }} />;
        break;
      case "reveal":
        scene = <RevealScene seg={seg} f={f} W={W} H={H} a={a} />;
        break;
      case "flash":
        scene = <FlashScene seg={seg} f={f} W={W} H={H} a={a} index={montageIndex(seg)} />;
        break;
      case "type":
        scene = <TypeScene seg={seg} f={f} W={W} H={H} a={a} B={B} />;
        break;
      case "hero":
        scene = <HeroScene seg={seg} f={f} W={W} H={H} a={a} B={B} />;
        break;
      case "rival":
        scene = <RivalScene seg={seg} f={f} W={W} H={H} a={a} />;
        break;
      case "silence":
        scene = <SilenceScene seg={seg} f={f} W={W} H={H} a={a} lastPlaySrc={lastPlaySrc} />;
        break;
      case "rush":
        scene = <RushScene seg={seg} f={f} W={W} H={H} a={a} />;
        break;
      case "merge":
        scene = <MergeScene seg={seg} f={f} W={W} H={H} a={a} />;
        break;
      case "logo":
      case "tease":
        scene = <EndScene plan={plan} f={f} W={W} H={H} a={a} />;
        break;
    }
  }
  return (
    <AbsoluteFill style={{ background: REEL.base }}>
      <AbsoluteFill style={{ transform: shake }}>
        {scene}
        <Companion plan={plan} f={f} W={W} H={H} a={a} />
      </AbsoluteFill>
      <HonestLine plan={plan} f={f} W={W} H={H} a={a} />
      <Credits plan={plan} f={f} W={W} H={H} a={a} />
      {flash > 0.01 && <AbsoluteFill style={{ background: `rgba(226, 248, 222, ${flash})` }} />}
      {warmFlash > 0.01 && <AbsoluteFill style={{ background: `rgba(255, 232, 205, ${warmFlash})` }} />}
    </AbsoluteFill>
  );
};

export const fullReelLength = (): number => buildFullPlan(REEL_MAP).length;
