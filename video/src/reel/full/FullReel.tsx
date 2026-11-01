// THE FULL REEL, round 2: Pebble 2.0's launch reel on the locked score (timeline.ts), composed for 16:9, 9:16 and 1:1,
// each on its own grid (REVIEW B3). Every screen is a real 2.0.0 take (takes.ts) or a drawn explainer (explainers.tsx:
// diagrams, never product screens or look-alike controls); every cut lands on the score's beat or eighth; the pebble is
// Pebble's own engine and its aura follows the music.
//
// Round 2 (REVIEW.md, the lead's 10:15 rulings): the montage cuts or punches on every beat, with whips and pushes from
// the pebble instead of a uniform dim-and-blur (B1); the step-up at 21.6 s lifts in scale, speed and grade; hero names
// are big; heroes open or close on real screens where a take shows one; the explainers carry one idea each (B2); the
// hook cuts on 3.0, 4.5 and 6.3 s (S2); the rival ask is echoed and lands (B4); the features converge into the pebble on
// curved paths (S3); the honest line starts on the slam (S8); the end card keeps its tagline through the tease (B5).
// Photosensitivity: no ghost trails, no white flashes, no sweeps on bright screens (the flash scan of round 1).
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
import { AgentGuardExplainer, LongTasksExplainer, RemoteExplainer, VisualExplainer, WorkshopExplainer2 } from "./explainers";
import { buildFullPlan, END_CARD, segmentAt, STEALTH_HONEST, TEASE_LINES, type Flash, type FullPlan, type Hero as HeroSeg, type Rival, type Segment, type TypeBeat } from "./timeline";

type Aspect = "16x9" | "9x16" | "1x1";
const aspectOf = (W: number, H: number): Aspect => (H > W * 1.2 ? "9x16" : Math.abs(W - H) < 8 ? "1x1" : "16x9");

/** Each aspect's grid: where type and key action may go (9:16: inside the platforms' safe zone, B3; others title-safe). */
interface Safe {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  cx: number;
  w: number;
}
function safeOf(a: Aspect, W: number, H: number): Safe {
  const s = a === "9x16" ? { x0: 54, x1: 900, y0: 270, y1: 1490 } : a === "1x1" ? { x0: W * 0.06, x1: W * 0.94, y0: H * 0.06, y1: H * 0.94 } : { x0: W * 0.05, x1: W * 0.95, y0: H * 0.06, y1: H * 0.94 };
  return { ...s, cx: (s.x0 + s.x1) / 2, w: s.x1 - s.x0 };
}

// the hook's question as typed in RS15-01, and the rival's ask as typed in RS9A-01 (file frames, read off the input box)
const TYPED: readonly (readonly [string, number])[] = [
  ["W", 232], ["h", 249], ["a", 258], ["t", 270], [" ", 285], ["c", 300], ["a", 316], ["n", 330], [" ", 341],
  ["y", 352], ["o", 365], ["u", 377], [" ", 395], ["d", 410], ["o", 425], [" ", 440], ["n", 455], ["o", 467], ["w", 480], ["?", 491],
];
const ASK: readonly number[] = [1352, 1366, 1378, 1388, 1404, 1417, 1426, 1437, 1452, 1464, 1478, 1487, 1501, 1512, 1525, 1543, 1557, 1568, 1584, 1598, 1608, 1619, 1629, 1641, 1652, 1665, 1674, 1685, 1693];
const ASK_TEXT = "Show me a clip of your rival.";
const typedAt = (src: number) => TYPED.filter(([, f]) => f <= src).map(([c]) => c).join("");
const askAt = (src: number) => ASK_TEXT.slice(0, ASK.filter((f) => f <= src).length);
const TAKE_PEBBLE = { x: 2750, y: 1625, r: 88 };

/** Where the companion pebble stands through the montage (9:16: inside the safe zone, right of centre, at its foot). */
const companionSpot = (a: Aspect, W: number, H: number) => (a === "9x16" ? { x: 820, y: 1475, size: 170 } : a === "1x1" ? { x: W * 0.9, y: H * 0.93, size: 140 } : { x: W * 0.925, y: H * 0.94, size: 170 });

/** The punch every beat makes inside a montage scene: a downbeat's is bigger (+8–14 %), the step-up's bigger still. */
function beatPunch(plan: FullPlan, f: number): number {
  const lifted = f >= plan.stepUp;
  let p = 0;
  for (const b of plan.map.beats) {
    if (b > f + 0.5 || b < f - 30) continue;
    const down = plan.map.downbeats.some((d) => Math.abs(d - b) < 1);
    p += (down ? (lifted ? 0.13 : 0.1) : lifted ? 0.06 : 0.04) * hitEnv(f - b, 2, 7);
  }
  return p;
}

/** A segment's entrance (REVIEW B1: whips and pushes, never a uniform dim-and-blur): `whip` from a side, `push` out of the companion pebble (the match shape). */
function entrance(kind: "whipL" | "whipR" | "push" | "cut", dt: number, W: number, H: number, a: Aspect) {
  if (kind === "cut" || dt >= 7) return {};
  const e = 1 - expoOut((dt + 1) / 7);
  if (kind === "push") {
    const c = companionSpot(a, W, H);
    return { transform: `scale(${1 + 0.35 * e})`, transformOrigin: `${c.x}px ${c.y}px`, filter: e > 0.05 ? `blur(${10 * e}px)` : undefined };
  }
  const s = kind === "whipL" ? -1 : 1;
  return { transform: `translateX(${s * W * 0.3 * e}px)`, filter: e > 0.05 ? `blur(${12 * e}px)` : undefined };
}

/* ------------------------------------------------------------------------------------------------ the hook ---- */

/**
 * The hook and the tension: the real question typed in the quick chat, echoed huge. Cuts on the bar lines (S2): a
 * punch-in on the typed line at 3.0 s, a cut to the pebble itself when Vanguard's drums enter (4.5 s), back to the whole
 * card on the suck-back (6.3 s) with a slow push to the send; the dive into the pebble's eye after the send.
 */
const HookScene: React.FC<{ seg: Extract<Segment, { kind: "hook" }>; f: number; W: number; H: number; a: Aspect; S: Safe }> = ({ seg, f, W, H, a, S }) => {
  const crop = CROPS.askHook.rect;
  const src = Math.round(seg.src.at(f));
  const tall = a !== "16x9";
  const kCard = a === "9x16" ? (S.w * 0.78) / crop.w : a === "1x1" ? (H * 0.56) / crop.h : (H * 0.8) / crop.h;
  const home = a === "9x16" ? { x: S.cx, y: 1060 } : a === "1x1" ? { x: W / 2, y: H * 0.64 } : { x: W * 0.67, y: H * 0.5 };
  const input = { x: 2470, y: 1385 };
  const centre = { x: crop.x + crop.w / 2, y: crop.y + crop.h / 2 };
  const eye = { x: 2731, y: 1618 };
  const [drums, suck] = [seg.accents[0] ?? 270, seg.accents[1] ?? 378];
  const bar3 = 180; // Starfire's third-second downbeat
  // the framing: which point of the card sits where, how big
  let focus = input;
  let at = home;
  let Z = 1;
  let rot = { y: tall ? 0 : -8, x: tall ? 4 : 3 };
  if (f < bar3) {
    const pull = inOut(c01(f / bar3));
    Z = (a === "16x9" ? 1.75 : a === "9x16" ? 1.2 : 1.4) - (a === "9x16" ? 0.15 : 0.3) * pull;
    focus = input;
    at = a === "9x16" ? { x: S.cx + 60, y: 1140 } : a === "1x1" ? { x: W * 0.6, y: H * 0.7 } : { x: W * 0.53 + (722 * kCard * Z) / 2, y: H * 0.56 };
  } else if (f < drums) {
    // the punch-in on 3.0 s: tighter on the typed line, easing back a little
    const u = c01((f - bar3) / (drums - bar3));
    Z = (a === "16x9" ? 2.1 : a === "9x16" ? 1.3 : 1.75) - 0.1 * u;
    focus = { x: 2360, y: 1385 };
    at = a === "9x16" ? { x: S.cx, y: 1120 } : a === "1x1" ? { x: W * 0.52, y: H * 0.68 } : { x: W * 0.72, y: H * 0.56 };
  } else if (f < suck) {
    // the drums: a cut to the pebble itself on the desktop, its light breathing on every beat
    const u = c01((f - drums) / (suck - drums));
    Z = (a === "16x9" ? 2.6 : a === "9x16" ? 1.8 : 2.2) + 0.2 * u;
    focus = TAKE_PEBBLE;
    at = a === "9x16" ? { x: S.cx, y: 1080 } : a === "1x1" ? { x: W / 2, y: H * 0.66 } : { x: W * 0.7, y: H * 0.52 };
    rot = { y: 0, x: 0 };
  } else {
    // the suck-back: the whole card, holding its breath, a slow push toward the send
    const u = inOut(c01((f - suck) / Math.max(1, seg.send - suck)));
    Z = 1 + 0.18 * u;
    focus = { x: centre.x + (2790 - centre.x) * 0.25 * u, y: centre.y + (1490 - centre.y) * 0.25 * u };
    at = home;
  }
  const kz = kCard * Z;
  const punch = hitEnv(f - seg.send, 2, 8) + seg.accents.reduce((s, h) => s + 0.5 * hitEnv(f - h, 2, 9), 0) + 0.4 * hitEnv(f - bar3, 2, 9);
  let pose: CardPose = { x: at.x - (focus.x - centre.x) * kz, y: at.y - (focus.y - centre.y) * kz, k: kz * (1 + 0.06 * punch), rotY: rot.y, rotX: rot.x };
  let zoom = 1;
  let inner = centre;
  let diveBlur = 0;
  if (f >= seg.zoomFrom) {
    const u = c01((f - seg.zoomFrom) / Math.max(1, seg.to - seg.zoomFrom));
    const e = expoIn(u);
    const m = inOut(c01(u * 1.6));
    pose = { x: home.x + (W / 2 - home.x) * m, y: home.y + (H / 2 - home.y) * m, k: kCard * (1 + 2.2 * e), rotY: 0, rotX: 0 };
    zoom = 1 + 15 * e;
    inner = { x: centre.x + (eye.x - centre.x) * m, y: centre.y + (eye.y - centre.y) * m };
    const e2 = expoIn(c01(u + 1 / Math.max(1, seg.to - seg.zoomFrom)));
    diveBlur = Math.min(14, 60 * Math.log((1 + 15 * e2) / (1 + 15 * e)));
  }
  // the aura: breathing with Starfire's pad, then on Vanguard's build's beats
  let level = f < drums ? 0.22 + 0.42 * (0.5 + 0.5 * Math.cos((2 * Math.PI * f) / 45)) + 0.2 * E(f) : 0.15 + 0.5 * E(f) + seg.pulses.reduce((s, p) => s + 0.28 * hitEnv(f - p, 1, 11), 0);
  let rays = 0;
  if (f >= seg.zoomFrom) {
    const u = c01((f - seg.zoomFrom) / Math.max(1, seg.to - seg.zoomFrom));
    level += 0.9 * u;
    rays = 0.55 * u;
  }
  const pebbleAt = { x: pose.x + (TAKE_PEBBLE.x - centre.x) * pose.k, y: pose.y + (TAKE_PEBBLE.y - centre.y) * pose.k };
  // the echo: the question as typed, huge; it leaves in place (no half-read slide past the edge)
  const typed = typedAt(src);
  const lines = typed.length <= 8 ? [typed] : [typed.slice(0, 9).trimEnd(), typed.slice(9)];
  const settled = a === "9x16" ? fitSize("you do now?", S.w, 150) : a === "1x1" ? fitSize("you do now?", S.w * 0.72, 116) : fitSize("you do now?", W * 0.4, 200);
  const size = settled * (1 + 0.45 * (1 - c01((typed.length - 4) / 4)));
  const leave = f >= seg.zoomFrom ? c01((f - seg.zoomFrom) / 10) : 0;
  const sent = f >= seg.send;
  const caretOn = !sent && Math.floor(f / 18) % 2 === 0;
  const lastAccent = Math.max(-999, bar3, ...seg.accents.filter((h) => h <= f));
  const sweep = f < 40 ? f / 40 : f - lastAccent < 26 && f >= lastAccent ? (f - lastAccent) / 26 : undefined;
  const echoNode = (
    <>
      {leave < 1 && (
        <div
          style={{
            position: "absolute",
            left: tall ? S.cx : S.x0 + W * 0.015,
            top: tall ? S.y0 : H * 0.5,
            transform: `translate(${tall ? "-50%" : "0"}, ${tall ? "0" : "-50%"}) scale(${1 + 0.04 * Math.min(1, punch) - 0.06 * leave})`,
            transformOrigin: tall ? "50% 0%" : "0% 50%",
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
    </>
  );
  return (
    <AbsoluteFill>
      <Ground tint="sage" focus={{ x: c01(pebbleAt.x / W), y: c01(pebbleAt.y / H) }} energy={0.4 + 0.75 * Math.min(level, 1.1) + 0.4 * punch} />
      {!tall && echoNode}
      {f < seg.zoomFrom && <Aura x={pebbleAt.x} y={pebbleAt.y} r={TAKE_PEBBLE.r * pose.k * 2.4} state={{ level: level * 1.15 }} frame={f} motes={0} />}
      <Card
        crop="askHook"
        src={src}
        pose={pose}
        inner={{ zoom, at: inner }}
        blurPx={diveBlur}
        bright={f >= seg.zoomFrom ? 1 - 0.85 * inOut(c01((f - seg.zoomFrom) / Math.max(1, seg.to - seg.zoomFrom))) : 1}
        sweep={sweep}
        glow={0.7}
        radiusPx={28}
        overlay={(to, scale) => {
          const p = to(TAKE_PEBBLE.x, TAKE_PEBBLE.y);
          return <Aura x={p.x} y={p.y} r={TAKE_PEBBLE.r * scale} state={{ level: level * 0.6, rays }} frame={f} motes={0} />;
        }}
      />
      {f < seg.zoomFrom && <Aura x={pebbleAt.x} y={pebbleAt.y} r={TAKE_PEBBLE.r * pose.k * 1.6} state={{ level }} frame={f} motes={14} glow={false} />}
      {tall && echoNode}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------------------------- the lockup (shared) ---- */

const Lockup: React.FC<{ f: number; w1: number; w2: number; x: number; y: number; size: number; align: "left" | "center"; dim?: number }> = ({ f, w1, w2, x, y, size, align, dim = 0 }) => {
  const piece = (text: string, at: number, color: string) => {
    const dt = f - at;
    if (dt < 0) return <span style={{ opacity: 0 }}>{text}</span>;
    const p = expoOut(dt / 7);
    return (
      <span style={{ display: "inline-block", transform: `scale(${1.3 - 0.3 * p}) translateY(${(1 - p) * 16}px)`, transformOrigin: "50% 60%", filter: dt < 3 ? `blur(${8 * (1 - dt / 3)}px)` : undefined, opacity: c01((dt + 1) / 2), color }}>
        {text}
      </span>
    );
  };
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(${align === "center" ? "-50%" : "0"}, -50%)`, ...INTER_HEAVY, fontSize: size, lineHeight: 1, whiteSpace: "pre", textShadow: `0 0 ${size * 0.4}px rgba(${REEL.sage}, 0.4)`, opacity: 1 - 0.6 * dim }}>
      {piece("Pebble", w1, REEL.ink)}
      {piece(" 2.0", w2, REEL.accent)}
    </div>
  );
};

/* ---------------------------------------------------------------------------------------------- the reveal ---- */

const RevealScene: React.FC<{ seg: Extract<Segment, { kind: "reveal" }>; f: number; W: number; H: number; a: Aspect; S: Safe }> = ({ seg, f, W, H, a, S }) => {
  const D = seg.from;
  const tall = a !== "16x9";
  const size = a === "9x16" ? 700 : a === "1x1" ? 560 : 780;
  const lockSize = tall ? fitSize("Pebble 2.0", S.w * 0.92, a === "1x1" ? 170 : 170) : 220;
  // 16:9: it lands where it stays, left of its name (a glide swept its bright body through the frame: round 1's scan)
  const footX = tall ? S.cx : W / 2 - W * 0.25;
  const footY = a === "9x16" ? 900 : a === "1x1" ? H * 0.58 : H * 0.5 + size * 0.3;
  const cy = footY - size * 0.3;
  const energy = 1 + 0.7 * hitEnv(f - D, 1, 20);
  return (
    <AbsoluteFill>
      <Ground tint="sage" focus={{ x: footX / W, y: cy / H }} energy={energy} />
      <div style={{ position: "absolute", left: 0, top: cy - 2, width: W, height: 4, background: `linear-gradient(90deg, transparent, rgba(${REEL.sageCore}, ${0.7 * hitEnv(f - D, 1, 10)}), transparent)`, filter: "blur(2px)", transform: `scaleX(${0.3 + 0.7 * expoOut((f - D) / 10)})` }} />
      <ShockRing x={footX} y={cy} dt={f - D - 5} r0={size * 0.2} r1={Math.max(W, H) * 0.6} frames={30} />
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
        aura={{ level: 0.6 + 0.3 * E(f) + 0.8 * Math.exp(-(f - D) / 24), burstAge: f - D, rays: 0.12 + 0.7 * Math.exp(-(f - D) / 30) }}
      />
      <Lockup f={f} w1={seg.w1} w2={seg.w2} x={tall ? S.cx : W * 0.4} y={a === "9x16" ? 1080 : a === "1x1" ? H * 0.8 : cy} size={lockSize} align={tall ? "center" : "left"} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------------------------------- real screens ---- */

const VEC = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } } as const;
const DIRS = ["left", "up", "right", "down"] as const;
const LIGHT = new Set<CropId>(["stealthMenu", "stealthDock", "spaces", "finder"]);

/** A big, bright real screen, close and filling most of the frame, inside the aspect's grid. */
function bigCard(crop: CropId, a: Aspect, W: number, H: number, S: Safe) {
  const r = CROPS[crop].rect;
  const portrait = r.w / r.h < 1.2;
  const cap = crop === "calendar" ? 3.0 : 2.6;
  if (a === "9x16") return { k: Math.min((S.w * 0.88) / r.w, 640 / r.h, cap), x: S.cx, y: 920, lineAt: { x: S.cx, y: S.y0, w: S.w, align: "center" as const, top: true } };
  if (a === "1x1") return { k: Math.min((S.w * 0.86) / r.w, (H * 0.52) / r.h, cap), x: W / 2, y: H * 0.45, lineAt: { x: W / 2, y: H * 0.84, w: S.w * 0.84, align: "center" as const, top: false } };
  if (portrait) return { k: Math.min((W * 0.5) / r.w, (H * 0.84) / r.h, cap), x: W * 0.66, y: H * 0.5, lineAt: { x: S.x0 + W * 0.01, y: H * 0.5, w: W * 0.42, align: "left" as const, top: false } };
  return { k: Math.min((W * 0.8) / r.w, (H * 0.64) / r.h, cap), x: W * 0.5, y: H * 0.42, lineAt: { x: W * 0.5, y: H * 0.86, w: W * 0.8, align: "center" as const, top: false } };
}

/** One real screen arriving mid-whip on its beat (or held in place for a match cut), punched on the beats. */
const ScreenCard: React.FC<{ crop: CropId; src: number; f: number; from: number; to: number; i: number; a: Aspect; W: number; H: number; S: Safe; punch: number; scale?: number; at?: { x: number; y: number }; still?: boolean }> = ({ crop, src, f, from, i, a, W, H, S, punch, scale = 1, at, still }) => {
  const dt = f - from;
  const g = bigCard(crop, a, W, H, S);
  const inV = VEC[DIRS[i % 4]];
  const dist = Math.max(W, H) * 0.6;
  const arrive = (d: number) => (still ? 0 : 0.4 * (1 - expoOut((d + 1) / 6)));
  const ox = inV.x * dist * arrive(dt);
  const oy = inV.y * dist * arrive(dt);
  const speed = Math.hypot(inV.x * dist * (arrive(dt + 1) - arrive(dt)), inV.y * dist * (arrive(dt + 1) - arrive(dt)));
  const k = g.k * scale * (1 + 0.03 * Math.min(1, dt / 90)) * (1 + punch);
  const settle = expoOut(dt / 16);
  const pos = at ?? { x: g.x, y: g.y };
  const pose: CardPose = { x: pos.x + ox, y: pos.y + oy, k, rotY: (i % 2 ? 1 : -1) * 6 * (1 - 0.5 * settle), rotX: 2 * (1 - settle) + 1 };
  const light = LIGHT.has(crop);
  return <Card crop={crop} src={src} pose={pose} blurPx={Math.min(10, speed / 12)} sweep={!light && dt >= 3 && dt <= 21 ? (dt - 3) / 18 : undefined} fadeRight={crop === "keepCard" || crop === "keepAsk"} glow={light ? 0.3 : 0.9} bright={light ? 0.84 : 1.12} />;
};

/* ------------------------------------------------------------------------------------------------ flashes ---- */

const FlashScene: React.FC<{ plan: FullPlan; seg: Flash; f: number; W: number; H: number; a: Aspect; S: Safe; index: number }> = ({ plan, seg, f, W, H, a, S, index }) => {
  const shot = seg.shots.find((s) => f >= s.from && f < s.to) ?? seg.shots[seg.shots.length - 1];
  const si = seg.shots.indexOf(shot);
  const g = bigCard(shot.crop, a, W, H, S);
  const src = Math.round(shot.src.at(f - shot.from));
  const size = fitSize(seg.line, g.lineAt.w, a === "16x9" ? (g.lineAt.align === "left" ? 150 : 128) : a === "9x16" ? 128 : 110);
  const punch = beatPunch(plan, f);
  // a hard match cut inside "Every Space." (the same place, a different Space); otherwise each screen whips in
  const match = seg.id === "spaces" && si > 0;
  // a two-line line under a card keeps its last line inside title-safe ("Your model, your choice." fell below it on 16:9)
  const lines = seg.line.split("\n").length;
  const lineY = g.lineAt.top ? g.lineAt.y : Math.min(g.lineAt.y, S.y1 - (lines * size) / 2 - size * 0.12);
  return (
    <AbsoluteFill>
      <Ground tint={seg.tint} focus={{ x: g.x / W, y: g.y / H }} energy={1.1 + 0.9 * punch} />
      <ScreenCard crop={shot.crop} src={src} f={f} from={match ? seg.from : shot.from} to={shot.to} i={index + si} a={a} W={W} H={H} S={S} punch={punch} still={match} />
      {/* the line: on the cut, held through the flash (N1), a short slam and no exit */}
      <Word text={seg.line} dt={f - seg.from + 2} size={size} x={g.lineAt.x} y={lineY} align={g.lineAt.align} valign={g.lineAt.top ? "top" : "center"} sweep={f - seg.from >= 8 && f - seg.from <= 30 ? (f - seg.from - 8) / 22 : undefined} />
    </AbsoluteFill>
  );
};

/* -------------------------------------------------------------------------------------------- type beats ---- */

const MODES = ["Ask for approval", "Auto in project", "Full access"] as const;

const TypeScene: React.FC<{ plan: FullPlan; seg: TypeBeat; f: number; W: number; H: number; a: Aspect; S: Safe; B: number }> = ({ plan, seg, f, W, H, a, S, B }) => {
  const dt = f - seg.from;
  const tall = a !== "16x9";
  const punch = beatPunch(plan, f);
  const size = fitSize(seg.line, tall ? S.w : W * 0.7, tall ? 150 : 200);
  const lineY = seg.id === "pace" ? (a === "9x16" ? S.y0 + 60 : H * (tall ? 0.28 : 0.3)) : a === "9x16" ? 760 : H * 0.48;
  const modeSize = Math.round(size * 0.42);
  return (
    <AbsoluteFill>
      <Ground tint={seg.tint} focus={{ x: 0.5, y: 0.45 }} energy={1.1 + 0.9 * punch + 0.3 * E(f)} />
      <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + punch})`, transformOrigin: `${tall ? S.cx : W / 2}px ${lineY}px` }}>
        <Word text={seg.line} dt={dt + 2} size={size} x={tall ? S.cx : W / 2} y={lineY} align="center" valign={a === "9x16" && seg.id === "pace" ? "top" : "center"} sweep={dt >= 8 && dt <= 30 ? (dt - 8) / 22 : undefined} />
        {seg.id === "pace" &&
          MODES.map((m, i) => (
            // the three modes' names as kinetic type on the eighths: no control chrome (N5)
            <Word key={m} text={m} dt={dt - Math.round((0.5 + 0.5 * i) * B)} size={modeSize} x={tall ? S.cx : W / 2} y={(a === "9x16" ? S.y0 + 60 + size * 2.5 : H * 0.6) + i * modeSize * 1.35} align="center" color={i === 0 ? REEL.accent : REEL.ink} style={{ fontWeight: 700, letterSpacing: "-0.02em" }} />
          ))}
      </div>
    </AbsoluteFill>
  );
};

/* -------------------------------------------------------------------------------------------- hero beats ---- */

/** A hero's grid: its name (big, B1) and its explainer's box, per aspect; 9:16 stacks inside the safe zone (B3). */
function heroLayout(a: Aspect, W: number, H: number, S: Safe, name: string, sub?: string) {
  const lines = name.split("\n").length;
  const subLines = sub ? sub.split("\n").length : 0;
  if (a === "16x9") {
    const size = fitSize(name, W * 0.44, 170);
    const sz = Math.round(size * 0.42);
    const blockH = size * 1.05 * lines + (sub ? sz * 1.25 * subLines + size * 0.3 : 0);
    const top = H * 0.46 - blockH / 2;
    return { size, subSize: sz, x: S.x0 + W * 0.005, nameTop: top, subTop: top + size * 1.08 * lines + size * 0.22, align: "left" as const, box: { x: W * 0.52, y: H * 0.13, w: W * 0.4, h: H * 0.73 } };
  }
  const size = fitSize(name, S.w, a === "9x16" ? 150 : 120);
  const sz = Math.round(size * 0.44);
  const nameTop = S.y0;
  const subTop = nameTop + size * 1.12 * lines + size * 0.12;
  const textBottom = sub ? subTop + sz * 1.22 * subLines : nameTop + size * 1.12 * lines;
  const boxTop = textBottom + (a === "9x16" ? 40 : 20);
  const boxBottom = a === "9x16" ? 1360 : H * 0.8;
  // (inset: on tall frames the step-up's lift and the beat punches (up to ×1.2) grow the box from its top edge, so it
  // never rises into the name, and its foot stays inside the grid)
  return { size, subSize: sz, x: S.cx, nameTop, subTop, align: "center" as const, box: { x: S.x0 + S.w * 0.08, y: boxTop, w: S.w * 0.84, h: Math.max(200, boxBottom - boxTop) } };
}

const HeroScene: React.FC<{ plan: FullPlan; seg: HeroSeg; f: number; W: number; H: number; a: Aspect; S: Safe; B: number }> = ({ plan, seg, f, W, H, a, S, B }) => {
  const dt = f - seg.from;
  const L = heroLayout(a, W, H, S, seg.name, seg.sub);
  const e = E(f);
  const lifted = f >= plan.stepUp;
  const punch = beatPunch(plan, f);
  const box = L.box;
  const vertical = a === "9x16";
  // the step-up: a bigger scale and a brighter grade from 21.6 s
  const lift = lifted ? 1.06 : 1;
  const energy = (lifted ? 1.35 : 1.08) + 0.3 * e + 0.9 * punch;
  const bcx = box.x + box.w / 2;
  const bcy = box.y + box.h / 2;
  // the light sweep on each downbeat's hit (subtle: within the flash limit)
  const lastDown = Math.max(-999, ...plan.map.downbeats.filter((d) => d <= f && d >= seg.from));
  const sweep = f - lastDown < 20 ? (f - lastDown) / 20 : -1;
  let real: React.ReactNode = null;
  let stepBack = 0;
  if (seg.id === "workshop") {
    // the tool, the blind check, then RSW-01's real card on beat 3, cropped to its question and Keep, legible
    const askAt = 3 * B;
    stepBack = inOut(c01((dt - askAt + 4) / 10));
    const pos = a === "9x16" ? { x: S.cx, y: box.y + box.h * 0.62 } : a === "1x1" ? { x: W / 2, y: box.y + box.h * 0.6 } : { x: bcx, y: box.y + box.h * 0.62 };
    const k = (a === "16x9" ? box.w * 1.12 : box.w) / CROPS.keepAsk.rect.w;
    if (dt >= askAt) real = <Card crop="keepAsk" src={5400 + Math.min(200, dt)} pose={{ x: pos.x, y: pos.y + (1 - expoOut((dt - askAt + 1) / 7)) * 60, k: k * (1 + 0.6 * punch), rotY: a === "16x9" ? -5 : 0, rotX: 2, opacity: c01((dt - askAt + 1) / 3) }} fadeRight glow={0.85} bright={1.12} sweep={dt - askAt >= 2 && dt - askAt <= 20 ? (dt - askAt - 2) / 18 : undefined} />;
  }
  if (seg.id === "stealth") {
    // RS13-03 alone (the lead, 04:10 and 10:15): the palette to Return (never past 433), the menu-bar icon turning (a
    // gentler magnification, N3), the Dock icon leaving; tight crops only, never a full frame past 433
    const phase = dt < 2 * B ? 0 : dt < 4 * B ? 1 : 2;
    const crop: CropId = phase === 0 ? "stealthPalette" : phase === 1 ? "stealthMenu" : "stealthDock";
    const t0 = phase * 2 * B;
    const src = phase === 0 ? Math.min(433, Math.round(300 + (132 * Math.min(dt, 2 * B - 2)) / (2 * B - 2))) : phase === 1 ? Math.min(1185, 426 + (dt - t0)) : Math.min(1185, 434 + (dt - t0));
    // (the scene's wrapper already punches on the beats: the card itself doesn't, or the slam doubled it past the frame)
    const center = a === "16x9" ? { x: bcx, y: H * 0.42 } : a === "9x16" ? { x: S.cx, y: box.y + box.h * 0.35 } : { x: W / 2, y: box.y + box.h * 0.33 };
    const width = a === "16x9" ? (phase === 1 ? W * 0.26 : W * 0.38) : phase === 1 ? S.w * 0.55 : S.w * 0.8;
    real = <ScreenCard crop={crop} src={src} f={f} from={seg.from + t0} to={seg.from + t0 + 2 * B} i={phase} a={a} W={W} H={H} S={S} punch={0} at={center} scale={width / CROPS[crop].rect.w / bigCard(crop, a, W, H, S).k} />;
  }
  return (
    <AbsoluteFill>
      <Ground tint={seg.tint} focus={{ x: bcx / W, y: (box.y + box.h * 0.45) / H }} energy={energy} />
      <div style={{ position: "absolute", inset: 0, transform: `scale(${lift * (1 + punch)})`, transformOrigin: `${bcx}px ${a === "16x9" ? bcy : box.y}px` }}>
        {seg.id === "agentguard" && <AgentGuardExplainer {...box} dt={dt} B={B} energy={e} vertical={vertical} />}
        {seg.id === "workshop" && <WorkshopExplainer2 {...box} dt={dt} B={B} energy={e} vertical={vertical} stepBack={stepBack} />}
        {seg.id === "visual" && <VisualExplainer {...box} dt={dt} B={B} energy={e} vertical={vertical} />}
        {seg.id === "longtasks" && <LongTasksExplainer {...box} dt={dt} B={B} energy={e} vertical={vertical} />}
        {seg.id === "remote" && <RemoteExplainer {...box} dt={dt} B={B} energy={e} vertical={vertical} />}
        {real}
      </div>
      {sweep >= 0 && <AbsoluteFill style={{ background: `linear-gradient(105deg, transparent ${sweep * 150 - 40}%, rgba(${REEL.sageCore}, 0.07) ${sweep * 150 - 20}%, transparent ${sweep * 150}%)`, mixBlendMode: "screen", pointerEvents: "none" }} />}
      <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + 0.5 * punch})`, transformOrigin: `${L.x}px ${L.nameTop}px` }}>
        <Word text={seg.name} dt={dt + 2} left={seg.to - f} size={L.size} x={L.x} y={L.nameTop} align={L.align} valign="top" sweep={dt >= 8 && dt <= 32 ? (dt - 8) / 24 : undefined} />
        {seg.sub && <Word text={seg.sub} dt={dt - 4} left={seg.to - f} size={L.subSize} x={L.x} y={L.subTop} align={L.align} valign="top" color={REEL.inkSoft} style={{ fontWeight: 650, letterSpacing: "-0.02em", textShadow: "none" }} />}
      </div>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------------------------------- the rival beat ---- */

/** The ask's echo: the question as typed, in the reel's kinetic type (as the hook does), held over the video (B4). */
const AskEcho: React.FC<{ text: string; a: Aspect; W: number; H: number; S: Safe; sent: boolean; f: number }> = ({ text, a, W, H, S, sent, f }) => {
  const lines = a === "1x1" ? [text.slice(0, 15).trimEnd(), text.slice(15)] : [text.slice(0, 10).trimEnd(), text.slice(10, 22).trimEnd(), text.slice(22)];
  const size = a === "9x16" ? fitSize("clip of your", S.w, 120) : a === "1x1" ? fitSize("Show me a clip", S.w, 110) : fitSize("clip of your", W * 0.34, 120);
  const caretOn = !sent && Math.floor(f / 18) % 2 === 0;
  return (
    <div
      style={{
        position: "absolute",
        left: a === "16x9" ? S.x0 + W * 0.005 : S.cx,
        top: a === "16x9" ? H * 0.5 : S.y0,
        transform: `translate(${a === "16x9" ? "0" : "-50%"}, ${a === "16x9" ? "-50%" : "0"})`,
        ...INTER_HEAVY,
        fontSize: size,
        lineHeight: 1.02,
        color: sent ? REEL.accent : REEL.ink,
        textAlign: a === "16x9" ? "left" : "center",
        whiteSpace: "pre",
        textShadow: `0 0 ${size * 0.4}px rgba(${REEL.sage}, 0.4)`,
      }}
    >
      {lines.filter((l) => l.length).map((l, i, arr) => (
        <div key={i}>
          {l}
          {i === arr.length - 1 && <span style={{ color: REEL.accent, opacity: caretOn ? 1 : 0, marginLeft: size * 0.04 }}>|</span>}
        </div>
      ))}
    </div>
  );
};

const RivalScene: React.FC<{ seg: Rival; f: number; W: number; H: number; a: Aspect; S: Safe }> = ({ seg, f, W, H, a, S }) => {
  const askSrc = Math.round(seg.ask.src.at(Math.min(f, seg.ask.to - 1) - seg.ask.from));
  const echo = askAt(Math.min(askSrc, 1693));
  const sent = askSrc >= 1722;
  if (f < seg.ask.to) {
    // the ask, real (RS9A-01), the quick chat right (16:9) or below its echo (tall frames)
    const dt = f - seg.ask.from;
    const r = CROPS.rivalAsk.rect;
    const k = a === "16x9" ? (H * 0.74) / r.h : a === "9x16" ? (S.w * 0.84) / r.w : (H * 0.52) / r.h;
    const pos = a === "16x9" ? { x: W * 0.66, y: H * 0.47 } : a === "9x16" ? { x: S.cx, y: 1020 } : { x: W / 2, y: H * 0.635 };
    return (
      <AbsoluteFill style={entrance("whipR", dt, W, H, a)}>
        <Ground tint="deep" focus={{ x: pos.x / W, y: pos.y / H }} energy={1.1 + 0.3 * hitEnv(dt, 1, 8)} />
        <Card crop="rivalAsk" src={askSrc} pose={{ x: pos.x, y: pos.y, k: k * (1 + 0.05 * hitEnv(dt, 1, 6) + 0.04 * (dt / (seg.ask.to - seg.ask.from)) + 0.06 * hitEnv(f - (seg.ask.from + 140), 2, 8)), rotY: a === "16x9" ? -6 : 0, rotX: 2 }} glow={0.8} bright={1.1} />
        <AskEcho text={echo} a={a} W={W} H={H} S={S} sent={sent} f={f} />
      </AbsoluteFill>
    );
  }
  // the play: Pebble's own tab (its green group) and Anthropic's video in it (RS9B-02), the echo still up
  const dt = f - seg.play.from;
  const src = Math.round(seg.play.src.at(dt));
  const pr = CROPS.rivalPlay.rect;
  const kp = a === "16x9" ? (W * 0.56) / pr.w : (S.w * (a === "1x1" ? 0.8 : 0.95)) / pr.w;
  const px = a === "16x9" ? W * 0.68 : S.cx;
  const py = a === "16x9" ? H * 0.52 : a === "9x16" ? 1060 : H * 0.62;
  const tr = CROPS.rivalTab.rect;
  const kt = kp * 1.1;
  const arrive = 1 - expoOut((dt + 1) / 7);
  return (
    <AbsoluteFill>
      <Ground tint="deep" focus={{ x: px / W, y: py / H }} energy={1.05} />
      <Card crop="rivalPlay" src={src} pose={{ x: px + arrive * W * 0.25, y: py, k: kp * (1 + 0.02 * (dt / 80)), rotY: -3 * arrive }} blurPx={arrive * 10} glow={0.7} bright={1.04} />
      <Card crop="rivalTab" src={src} pose={{ x: px + arrive * W * 0.25 - (pr.w * kp) / 2 + (tr.w * kt) / 2, y: py - (pr.h * kp) / 2 - (tr.h * kt) / 2 - 16, k: kt }} glow={0.3} radiusPx={10} bright={1.06} />
      <AskEcho text={ASK_TEXT} a={a} W={W} H={H} S={S} sent f={f} />
    </AbsoluteFill>
  );
};

const SilenceScene: React.FC<{ seg: Extract<Segment, { kind: "silence" }>; f: number; W: number; H: number; a: Aspect; S: Safe; lastPlaySrc: number }> = ({ seg, f, W, H, a, S, lastPlaySrc }) => {
  // stillness: a hard punch-in on the title and a 2 % push (still, not frozen); then "Anyway.", dry. ("Anthropic", the
  // channel, is cut in half by the screen's edge in every frame of RS9B-02, so the punch-in holds the title alone.)
  const tr = CROPS.rivalTitle.rect;
  const k = (a === "16x9" ? W * 0.62 : S.w) / tr.w;
  const show = f >= seg.anyway;
  const y = a === "9x16" ? 760 : H * 0.42;
  return (
    <AbsoluteFill>
      <Ground tint="deep" focus={{ x: 0.5, y: 0.45 }} energy={0.55} />
      <Card crop="rivalTitle" src={lastPlaySrc} pose={{ x: a === "16x9" ? W / 2 : S.cx, y, k: k * (1 + 0.02 * c01((f - seg.from) / (seg.to - seg.from))) }} glow={0.2} radiusPx={14} />
      {show && (
        <div style={{ position: "absolute", left: a === "16x9" ? 0 : S.x0, width: a === "16x9" ? W : S.w, top: a === "9x16" ? 980 : H * 0.66, textAlign: "center", fontFamily: FONT.sans, fontWeight: 600, fontSize: Math.round(Math.min(W, H) * 0.06), color: REEL.ink, letterSpacing: "-0.01em" }}>
          Anyway.
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------------------------------ the converge ---- */

// dark real screens only (bright cards at the centre flickered: round 1's scan)
const CONVERGE: readonly CropId[] = ["calculator", "keepAsk", "rivalAsk", "calCard", "stealthPalette", "reply", "calendar", "modelRow", "calculator", "keepAsk", "rivalAsk", "calCard", "reply"];
const CONVERGE_SRC: Partial<Record<CropId, number>> = { calculator: 3420, keepAsk: 5500, rivalAsk: 1700, calCard: 2880, stealthPalette: 420, reply: 1000, calendar: 6250, modelRow: 960 };
const mergeSpot = (a: Aspect, W: number, H: number, S: Safe) => {
  const size = a === "9x16" ? 520 : a === "1x1" ? 460 : 560;
  return { x: a === "16x9" ? W / 2 : S.cx, y: a === "9x16" ? 1000 : a === "1x1" ? H * 0.56 : H * 0.5 + size * 0.3, size };
};

/** The Marvel move (S3): the features fly into the pebble on curved paths, faster and faster, its light swelling. */
const ConvergeScene: React.FC<{ plan: FullPlan; seg: Extract<Segment, { kind: "merge" }>; f: number; W: number; H: number; a: Aspect; S: Safe }> = ({ plan, seg, f, W, H, a, S }) => {
  const ms = mergeSpot(a, W, H, S);
  const cy = ms.y - ms.size * 0.3;
  const prog = c01((f - seg.from) / (seg.to - seg.from));
  const R = a === "16x9" ? W * 0.42 : S.w * 0.62;
  const cards = seg.pulls.map((at, i) => {
    const crop = CONVERGE[i % CONVERGE.length];
    const gap = i === 0 ? plan.B : at - seg.pulls[i - 1];
    const flight = Math.max(20, Math.min(plan.B * 1.6, gap * 2.2));
    const u = (f - (at - flight)) / flight;
    if (u < 0 || u > 1) return null;
    const pos = (q: number) => {
      const qq = c01(q);
      const e = qq * qq * (1.4 - 0.4 * qq); // closes in steadily, faster at the end: seen for most of its flight
      const ang0 = (i * 137.5 * Math.PI) / 180;
      const ang = ang0 + e * 1.9; // a curved path: the angle turns as it falls in
      return { x: ms.x + Math.cos(ang) * R * (1 - e), y: cy + Math.sin(ang) * R * 0.7 * (1 - e), e };
    };
    const p0 = pos(u);
    const p1 = pos(u + 1 / flight);
    const startW = (a === "16x9" ? W * 0.34 : S.w * 0.56) / CROPS[crop].rect.w;
    const k = startW * (1 - 0.92 * p0.e);
    const speed = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    return <Card key={i} crop={crop} src={CONVERGE_SRC[crop] ?? CROPS[crop].allowed[0]} pose={{ x: p0.x, y: p0.y, k, rotZ: (1 - p0.e) * (i % 2 ? 14 : -14), rotY: (1 - p0.e) * 18, opacity: (1 - 0.6 * p0.e) * c01(u * 6) }} blurPx={Math.min(6, speed / 16)} glow={0.3} bright={1.04} />;
  });
  const downs = plan.map.downbeats.filter((d) => d >= seg.from && d < seg.to);
  return (
    <AbsoluteFill>
      <Ground tint="sage" focus={{ x: ms.x / W, y: cy / H }} energy={1.1 + 0.7 * prog} />
      <Hero cues={[{ at: seg.from / 60, pose: "viewing" }]} x={ms.x} y={ms.y} size={ms.size} landAt={seg.from} enter="pop" pulses={downs} pulseGain={0.35} aura={{ level: 0.5 + 0.8 * prog + 0.15 * E(f), rays: 0.3 * prog }} />
      {cards}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------------------------- the logo and the tease ---- */

const EndScene: React.FC<{ plan: FullPlan; f: number; W: number; H: number; a: Aspect; S: Safe }> = ({ plan, f, W, H, a, S }) => {
  const logo = plan.logo;
  const tease = plan.segments.find((s) => s.kind === "tease") as Extract<Segment, { kind: "tease" }>;
  const tall = a !== "16x9";
  const size = a === "9x16" ? 420 : a === "1x1" ? 330 : 470;
  const footX = tall ? S.cx : W * 0.3;
  const footY = a === "9x16" ? 560 : a === "1x1" ? H * 0.32 : H * 0.42;
  const cy = footY - size * 0.3;
  const teaseOn = f >= tease.from;
  const tail = inOut(c01((f - plan.scoreEnd) / 20));
  const lockSize = tall ? fitSize("Pebble 2.0", S.w * 0.9, a === "1x1" ? 140 : 150) : 190;
  const lock = { x: tall ? S.cx : W * 0.4, y: a === "9x16" ? 680 : a === "1x1" ? H * 0.42 : H * 0.27 };
  const lineSize = Math.round(Math.min(W, H) * (tall ? 0.046 : 0.05));
  const tagY = lock.y + lockSize * 0.74;
  // the tagline stays under the lockup through the tease (B5); the tease's lines sit below it
  const teaseY = tagY + lineSize * 1.9;
  const sinceLogo = f - logo;
  const level = teaseOn ? 0.45 + 0.1 * Math.sin((f - tease.from) / 40) : 0.7 + 0.9 * Math.exp(-sinceLogo / 40) + 0.3 * E(f);
  const ms = mergeSpot(a, W, H, S);
  const textX = tall ? S.cx : lock.x;
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
        enter={{ from: ms, frames: 9 }}
        pulses={[logo]}
        aura={{ level, burstAge: sinceLogo, rays: teaseOn ? 0.05 : 0.15 + 0.6 * Math.exp(-sinceLogo / 40), warmth: teaseOn ? 0.2 : 0.55 }}
      />
      <Lockup f={f} w1={logo + 6} w2={logo + 14} x={lock.x} y={lock.y} size={lockSize} align={tall ? "center" : "left"} dim={tail * 0.5} />
      <Word text={END_CARD.tagline} dt={f - logo - 10} size={lineSize * 1.12} x={textX} y={tagY} align={tall ? "center" : "left"} color={REEL.inkSoft} style={{ fontWeight: 600, letterSpacing: "-0.015em", textShadow: "none", opacity: 1 - 0.6 * tail }} />
      {teaseOn &&
        TEASE_LINES.map((t, i) => (
          <Word key={t} text={t} dt={f - tease.lines[i]} size={lineSize} x={textX} y={teaseY + i * lineSize * 1.32} align={tall ? "center" : "left"} color={i === 2 ? REEL.inkSoft : REEL.ink} style={{ fontWeight: i === 0 ? 700 : 600, letterSpacing: "-0.015em", textShadow: "none", opacity: 1 - tail }} />
        ))}
    </AbsoluteFill>
  );
};

/* ----------------------------------------------------------------------------------------- the overlays ---- */

/** Stealth Lockdown's honest line, word for word, from the slam to the score's end, on its band (AA); 9:16: four lines inside the safe width. */
const HonestLine: React.FC<{ plan: FullPlan; f: number; W: number; H: number; a: Aspect; S: Safe }> = ({ plan, f, W, H, a, S }) => {
  if (f < plan.honest.from || f >= plan.honest.to + 14) return null;
  const p = expoOut(c01((f - plan.honest.from + 1) / 8)) * (1 - c01((f - plan.honest.to) / 14));
  const size = Math.round(Math.min(W, H) * (a === "16x9" ? 0.03 : 0.032));
  const y = a === "9x16" ? 1390 : a === "1x1" ? H * 0.88 : H * 0.885;
  return (
    <div style={{ position: "absolute", left: a === "9x16" ? S.x0 : 0, width: a === "9x16" ? S.w : W, top: y, transform: "translateY(-50%)", display: "flex", justifyContent: "center", opacity: p }}>
      <div style={{ maxWidth: a === "16x9" ? W * 0.62 : a === "9x16" ? S.w : W * 0.86, padding: `${size * 0.5}px ${size * 0.8}px`, borderRadius: size * 0.6, background: `rgba(${REEL.shadeRgb}, 0.72)`, fontFamily: FONT.sans, fontWeight: 500, fontSize: size, lineHeight: 1.32, color: REEL.ink, textAlign: "center", textWrap: "balance" as React.CSSProperties["textWrap"] }}>
        {STEALTH_HONEST}
      </div>
    </div>
  );
};

/** The silent tail's billing block (4 s): at the honest line's size, ink on the dark ground (AA), inside each grid. */
const Credits: React.FC<{ plan: FullPlan; f: number; W: number; H: number; a: Aspect; S: Safe }> = ({ plan, f, W, H, a, S }) => {
  if (f < plan.scoreEnd) return null;
  const p = expoOut(c01((f - plan.scoreEnd - 14) / 12));
  const size = Math.round(Math.min(W, H) * (a === "16x9" ? 0.03 : 0.032));
  const top = a === "9x16" ? 860 : a === "1x1" ? H * 0.6 : H * 0.6;
  return (
    <div style={{ position: "absolute", left: a === "9x16" ? S.x0 : W * 0.08, width: a === "9x16" ? S.w : W * 0.84, top, opacity: p, fontFamily: FONT.sans, fontWeight: 500, fontSize: size, lineHeight: 1.42, color: REEL.inkSoft, textAlign: "center", textWrap: "balance" as React.CSSProperties["textWrap"] }}>
      <div style={{ color: REEL.ink, fontWeight: 600, marginBottom: size * 0.4 }}>{END_CARD.honestSmall}</div>
      {END_CARD.credits.map((c) => (
        <div key={c} style={{ marginBottom: size * 0.25 }}>
          {c}
        </div>
      ))}
    </div>
  );
};

/** The companion through the montage: it watches each screen, its glow pulsing on the downbeats (brighter after the step-up), still and dim in the silence, a bounce on the slam. */
const Companion: React.FC<{ plan: FullPlan; f: number; W: number; H: number; a: Aspect }> = ({ plan, f, W, H, a }) => {
  const reveal = plan.segments.find((s) => s.kind === "reveal")!;
  const silence = plan.segments.find((s) => s.kind === "silence")!;
  const from = reveal.to;
  const until = plan.slam + Math.round(plan.B);
  if (f < from || f >= until) return null;
  const home = companionSpot(a, W, H);
  // (tall frames: the honest line's band takes the foot of the frame from the slam, so the companion stands on it)
  const spot = f >= plan.slam && a === "9x16" ? { x: 820, y: 1266, size: 150 } : f >= plan.slam && a === "1x1" ? { x: W * 0.89, y: 852, size: 120 } : home;
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
        { at: from / 60 + 0.1, look: { x: -0.7, y: -0.6 } },
        { at: silence.from / 60, pose: "paused" },
        { at: silence.from / 60 + 0.05, look: { x: -0.5, y: -0.3 } },
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
  const S = safeOf(a, W, H);
  const plan = useMemo(() => buildFullPlan(REEL_MAP), []);
  const seg = segmentAt(plan, f);
  const B = plan.B;
  const rival = plan.segments.find((s) => s.kind === "rival") as Rival;
  const lastPlaySrc = Math.round(rival.play.src.at(rival.play.to - rival.play.from - 1));
  const flashes = plan.segments.filter((x): x is Flash => x.kind === "flash");
  // the montage's segments enter with whips and pushes; Stealth enters on the slam's hard cut
  const montage: Segment[] = plan.segments.filter((x) => x.kind === "flash" || x.kind === "type" || (x.kind === "hero" && x.id !== "stealth"));
  // a slow shake on the drop and the logo; the slam gets a zoom punch (a fast shake flickered in round 1)
  const kick = hitEnv(f - plan.drop, 1, 9) + 0.5 * hitEnv(f - plan.logo, 1, 10);
  const amp = Math.min(W, H) * 0.008 * kick;
  const slamPunch = 0.03 * hitEnv(f - plan.slam, 1, 10);
  const shake = `translate(${amp * Math.sin(f * 0.9)}px, ${amp * Math.cos(f * 1.3 + 1)}px) scale(${1 + 0.015 * kick + slamPunch})`;
  // the logo: a warm swell, not a flash
  const warm = f >= plan.logo && f < plan.logo + 60 ? 0.22 * Math.min(1, (f - plan.logo + 1) / 6) * Math.exp(-Math.max(0, f - plan.logo - 6) / 30) : 0;
  let scene: React.ReactNode = null;
  if (seg) {
    // montage segments enter with a whip or a push out of the pebble, alternating (B1)
    const mi = montage.indexOf(seg);
    // (a bright screen enters on a plain cut: a whip swept its light edge through the frame past the flash limit)
    const brightSeg = seg.kind === "flash" && seg.shots.some((sh) => LIGHT.has(sh.crop));
    const ent = mi >= 0 && !brightSeg ? (["whipL", "push", "whipR", "push"] as const)[mi % 4] : "cut";
    const wrap = (node: React.ReactNode) => (mi >= 0 ? <AbsoluteFill style={entrance(ent, f - seg.from, W, H, a)}>{node}</AbsoluteFill> : node);
    switch (seg.kind) {
      case "hook":
        scene = <HookScene seg={seg} f={f} W={W} H={H} a={a} S={S} />;
        break;
      case "breath":
        scene = <AbsoluteFill style={{ background: "#020805" }} />;
        break;
      case "reveal":
        scene = <RevealScene seg={seg} f={f} W={W} H={H} a={a} S={S} />;
        break;
      case "flash":
        scene = wrap(<FlashScene plan={plan} seg={seg} f={f} W={W} H={H} a={a} S={S} index={flashes.indexOf(seg)} />);
        break;
      case "type":
        scene = wrap(<TypeScene plan={plan} seg={seg} f={f} W={W} H={H} a={a} S={S} B={B} />);
        break;
      case "hero":
        scene = mi >= 0 ? wrap(<HeroScene plan={plan} seg={seg} f={f} W={W} H={H} a={a} S={S} B={B} />) : <HeroScene plan={plan} seg={seg} f={f} W={W} H={H} a={a} S={S} B={B} />;
        break;
      case "rival":
        scene = <RivalScene seg={seg} f={f} W={W} H={H} a={a} S={S} />;
        break;
      case "silence":
        scene = <SilenceScene seg={seg} f={f} W={W} H={H} a={a} S={S} lastPlaySrc={lastPlaySrc} />;
        break;
      case "merge":
        scene = <ConvergeScene plan={plan} seg={seg} f={f} W={W} H={H} a={a} S={S} />;
        break;
      case "rush":
        scene = null;
        break;
      case "logo":
      case "tease":
      case "credits":
        scene = <EndScene plan={plan} f={f} W={W} H={H} a={a} S={S} />;
        break;
    }
  }
  return (
    <AbsoluteFill style={{ background: REEL.base }}>
      <AbsoluteFill style={{ transform: shake }}>
        {scene}
        <Companion plan={plan} f={f} W={W} H={H} a={a} />
      </AbsoluteFill>
      <HonestLine plan={plan} f={f} W={W} H={H} a={a} S={S} />
      <Credits plan={plan} f={f} W={W} H={H} a={a} S={S} />
      {warm > 0.01 && <AbsoluteFill style={{ background: `rgba(255, 232, 205, ${warm})` }} />}
    </AbsoluteFill>
  );
};

export const fullReelLength = (): number => buildFullPlan(REEL_MAP).length;

/**
 * The poster for each aspect (REVIEW S9): its own still, the lockup and the tagline on the pebble's light, with no
 * honest-line band (Stealth isn't shown on it).
 */
export const ReelPoster: React.FC = () => {
  const { width: W, height: H } = useVideoConfig();
  const a = aspectOf(W, H);
  const S = safeOf(a, W, H);
  const tall = a !== "16x9";
  const size = a === "9x16" ? 520 : a === "1x1" ? 380 : 560;
  const footX = tall ? S.cx : W * 0.3;
  const footY = a === "9x16" ? 760 : a === "1x1" ? H * 0.46 : H * 0.6;
  const lockSize = tall ? fitSize("Pebble 2.0", S.w * 0.92, a === "1x1" ? 150 : 160) : 220;
  const lock = { x: tall ? S.cx : W * 0.44, y: a === "9x16" ? 920 : a === "1x1" ? H * 0.62 : H * 0.44 };
  const lineSize = Math.round(Math.min(W, H) * (tall ? 0.05 : 0.052));
  return (
    <AbsoluteFill style={{ background: REEL.base }}>
      <Ground tint="sage" focus={{ x: footX / W, y: (footY - size * 0.3) / H }} energy={1.25} />
      <Hero cues={[{ at: -2, pose: "happy" }]} x={footX} y={footY} size={size} landAt={-60} enter="pop" aura={{ level: 1.0, rays: 0.18, warmth: 0.45 }} />
      <Lockup f={0} w1={-60} w2={-60} x={lock.x} y={lock.y} size={lockSize} align={tall ? "center" : "left"} />
      <Word text={END_CARD.tagline} dt={60} size={lineSize} x={lock.x} y={lock.y + lockSize * 0.78} align={tall ? "center" : "left"} color={REEL.inkSoft} style={{ fontWeight: 600, letterSpacing: "-0.015em", textShadow: "none" }} />
    </AbsoluteFill>
  );
};
