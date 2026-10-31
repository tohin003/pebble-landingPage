// The 15-second style test for the Pebble 2.0 launch reel (.work/reel/STYLE.md): the hook and the tension, the drop
// and the reveal, the montage cutting on every beat, the merge into the pebble. Every screen is a real 2.0.0 take
// (takes.ts), every cut comes from the beat map (plan.ts). 16:9 and 9:16 read the same plan with their own framing.
import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import "../fonts";
import { buildPlan, typedAt, TYPED, type CardShot, type Dir, type Plan } from "./plan";
import { STYLE_TEST_MAP } from "./maps/current";
import { CROPS, type CropId } from "./takes";
import type { Warp } from "./warp";
import { Card, type CardPose } from "./fx/Card";
import { Ground } from "./fx/Ground";
import { Hero, ShockRing } from "./fx/Hero";
import { Aura, type AuraState } from "./fx/Aura";
import { STYLE_TEST_ENERGY } from "./maps/styleTest.energy";
import { REEL, INTER_HEAVY, c01, expoIn, expoOut, hitEnv, inOut } from "./fx/look";
import { Word, fitSize } from "./fx/Word";
import type { BeatMap } from "./beats";

const CREDIT = "Pebble's character engine: bloub by Jérémy Perret (MIT)";
const HONEST = "Shown with sample data. Edited for time.";

/** The score's smoothed loudness at frame f, 0..1 (energy.py over the style test's mix). */
const E = (f: number): number => STYLE_TEST_ENERGY.level[Math.max(0, Math.min(STYLE_TEST_ENERGY.level.length - 1, Math.round(f)))];

/** The pebble's place on screen in the take RS15-01 (source device px) and its radius. */
const TAKE_PEBBLE = { x: 2750, y: 1625, r: 88 };

/**
 * The aura in the tension: a soft glow breathing with Starfire's pad (its 80 bpm pulse, a breath every 45 frames, the
 * pad's own beats on 0 and 47), then with Vanguard's build on every beat, dimming with the suck-back as the score does,
 * and swelling with rays through the dive before the drop.
 */
function tensionAura(plan: Plan, f: number): AuraState {
  const { hook } = plan;
  const drums = hook.accents[0] ?? hook.send;
  let level: number;
  if (f < drums) level = 0.22 + 0.42 * (0.5 + 0.5 * Math.cos((2 * Math.PI * f) / 45)) + 0.2 * E(f);
  else level = 0.15 + 0.5 * E(f) + hook.pulses.reduce((a, p) => a + 0.28 * hitEnv(f - p, 1, 11), 0);
  let rays = 0;
  if (f >= hook.zoomFrom) {
    const u = c01((f - hook.zoomFrom) / Math.max(1, hook.to - hook.zoomFrom));
    level += 0.9 * u;
    rays = 0.55 * u;
  }
  return { level, rays };
}

/** the first output frame (in [lo, hi]) at which a warp reaches source frame `src` */
function outFrameOf(w: Warp, src: number, lo: number, hi: number): number {
  let a = lo;
  let b = hi;
  if (w.at(b) < src) return Infinity;
  while (b - a > 0.25) {
    const m = (a + b) / 2;
    if (w.at(m) >= src) b = m;
    else a = m;
  }
  return b;
}

const VEC: Record<Dir, { x: number; y: number }> = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } };

/* ------------------------------------------------------------------------------------------------ the hook ---- */

const HookScene: React.FC<{ plan: Plan; f: number; W: number; H: number; vertical: boolean }> = ({ plan, f, W, H, vertical }) => {
  const { hook } = plan;
  const crop = CROPS.askHook.rect;
  const src = Math.round(hook.src.at(f));
  const kCard = vertical ? (W * 0.8) / crop.w : (H * 0.8) / crop.h;
  const home = vertical ? { x: W / 2, y: H * 0.64 } : { x: W * 0.67, y: H * 0.5 };
  const input = { x: 2470, y: 1385 };
  const centre = { x: crop.x + crop.w / 2, y: crop.y + crop.h / 2 };
  const eye = { x: 2731, y: 1618 };

  // the tension: a close-up on the card (the typed line big, the card running off the frame) that pulls back to the
  // whole card by the send; the camera moves the card, never crops inside it
  const pull = inOut(c01(f / Math.max(1, hook.send * 0.92)));
  const Z = (vertical ? 1.35 : 1.75) - (vertical ? 0.35 : 0.75) * pull;
  const kz = kCard * Z;
  const inputHome = { x: home.x + (input.x - centre.x) * kCard, y: home.y + (input.y - centre.y) * kCard };
  // where the input line sits on screen in the close-up: its left part in the frame's right half (16:9), centred (9:16)
  // (9:16: low enough that the card's top stays under the echo)
  const inputClose = vertical ? { x: W * 0.6, y: H * 0.74 } : { x: W * 0.53 + (722 * kz) / 2, y: H * 0.56 };
  const ip = { x: inputClose.x + (inputHome.x - inputClose.x) * pull, y: inputClose.y + (inputHome.y - inputClose.y) * pull };
  let zoom = 1;
  let at = centre;
  let pose: CardPose = { x: ip.x - (input.x - centre.x) * kz, y: ip.y - (input.y - centre.y) * kz, k: kz, rotY: vertical ? 0 : -9 + 4 * pull, rotX: vertical ? 6 - 3 * pull : 3 };
  // the send: a punch; the music's tension hits: smaller ones; every beat of the build: a breath of light
  const punch = hitEnv(f - hook.send, 2, 8) + hook.accents.reduce((a, h) => a + 0.6 * hitEnv(f - h, 2, 9), 0);
  const beatGlow = hook.pulses.reduce((a, p) => a + 0.22 * hitEnv(f - p, 1, 7), 0);
  const lastAccent = Math.max(-999, ...hook.accents.filter((h) => h <= f));
  const sweep = f < 40 ? f / 40 : f - lastAccent < 26 ? (f - lastAccent) / 26 : f >= hook.send && f < hook.send + 24 ? (f - hook.send) / 24 : undefined;
  pose = { ...pose, k: pose.k * (1 + 0.07 * punch) };

  // the riser: the card faces the camera, comes to the centre, and the camera dives into the pebble's eye
  let trail;
  if (f >= hook.zoomFrom) {
    const u = c01((f - hook.zoomFrom) / Math.max(1, hook.to - hook.zoomFrom));
    const e = expoIn(u);
    const m = inOut(c01(u * 1.6));
    pose = { x: home.x + (W / 2 - home.x) * m, y: home.y + (H / 2 - home.y) * m, k: kCard * (1 + 2.2 * e), rotY: (pose.rotY ?? 0) * (1 - m), rotX: (pose.rotX ?? 0) * (1 - m) };
    zoom = 1 + 15 * e;
    at = { x: centre.x + (eye.x - centre.x) * m, y: centre.y + (eye.y - centre.y) * m };
    const e2 = expoIn(c01(u + 1 / Math.max(1, hook.to - hook.zoomFrom)));
    trail = { vx: 0, vy: 0, vlk: Math.log((1 + 15 * e2) / (1 + 15 * e)) * -1, n: u > 0.25 ? 5 : 0, span: 1.2 };
  }

  const aura = tensionAura(plan, f);
  const pebbleAt = { x: pose.x + (TAKE_PEBBLE.x - centre.x) * pose.k, y: pose.y + (TAKE_PEBBLE.y - centre.y) * pose.k };

  // the echo: the question as typed, huge, on the left (16:9) or above (9:16)
  const typed = typedAt(src);
  const lines = typed.length <= 8 ? [typed] : [typed.slice(0, 9).trimEnd(), typed.slice(9)];
  // the first word lands huge and the type settles to its two-line size as the question grows (the hook's first second)
  const settled = vertical ? fitSize("you do now?", W * 0.88, 170) : fitSize("you do now?", W * 0.5, 200);
  const size = settled * (1 + 0.55 * (1 - c01((typed.length - 4) / 4)));
  // each word pops as its first letter lands
  const wordStarts = TYPED.filter(([c], i) => i === 0 || (TYPED[i - 1][0] === " " && c !== " ")).map(([, s]) => outFrameOf(hook.src, s, 0, hook.send + 2));
  const lastStart = Math.max(...wordStarts.filter((w) => w <= f), -99);
  const pop = hitEnv(f - lastStart, 1, 6);
  const leave = f >= hook.zoomFrom ? expoIn(c01((f - hook.zoomFrom) / Math.max(1, (hook.to - hook.zoomFrom) * 0.7))) : 0;
  const sent = f >= hook.send;
  const caretOn = !sent && Math.floor(f / 18) % 2 === 0;
  const echoX = vertical ? W / 2 : W * 0.065;
  const echoY = vertical ? H * 0.2 : H * 0.5;

  return (
    <AbsoluteFill>
      <Ground tint="sage" focus={{ x: c01(pebbleAt.x / W), y: c01(pebbleAt.y / H) }} energy={0.4 + 0.75 * aura.level + 0.4 * punch + 0.6 * leave} />
      <div
        style={{
          position: "absolute",
          left: echoX,
          top: echoY,
          transform: `translate(${vertical ? "-50%" : "0"}, -50%) translate(${-leave * W * 0.4 * (vertical ? 0 : 1)}px, ${-leave * H * 0.2 * (vertical ? 1 : 0)}px) scale(${1 + 0.05 * pop + 0.04 * punch})`,
          transformOrigin: vertical ? "50% 50%" : "0% 50%",
          ...INTER_HEAVY,
          fontSize: size,
          lineHeight: 1.0,
          color: sent ? REEL.accent : REEL.ink,
          textShadow: `0 0 ${size * 0.4}px rgba(${REEL.sage}, ${0.35 + 0.4 * punch})`,
          textAlign: vertical ? "center" : "left",
          whiteSpace: "pre",
          opacity: 1 - leave,
          filter: leave > 0.02 ? `blur(${leave * 24}px)` : undefined,
        }}
      >
        {lines.map((l, i) => (
          <div key={i}>
            {l}
            {i === lines.length - 1 && <span style={{ color: REEL.accent, opacity: caretOn ? 1 : 0, marginLeft: size * 0.04 }}>|</span>}
          </div>
        ))}
      </div>
      {/* the pebble's light spilling from behind the card, breathing (on the dark ground it reads; on the poster it can't) */}
      {f < hook.zoomFrom && <Aura x={pebbleAt.x} y={pebbleAt.y} r={TAKE_PEBBLE.r * pose.k * 2.4} state={{ level: aura.level * 1.15 }} frame={f} motes={0} />}
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
          return <Aura x={p.x} y={p.y} r={TAKE_PEBBLE.r * scale} state={{ level: aura.level * 0.6, rays: aura.rays }} frame={f} motes={0} />;
        }}
      />
      {/* motes drifting around it, in front of the card */}
      {f < hook.zoomFrom && <Aura x={pebbleAt.x} y={pebbleAt.y} r={TAKE_PEBBLE.r * pose.k * 1.6} state={{ level: aura.level }} frame={f} motes={14} glow={false} />}
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------------------------------- the reveal ---- */

/** "Pebble" and "2.0", each slamming on its own beat, as a row; the pebble sits left of the row (16:9) or above it (9:16). */
const Lockup: React.FC<{ f: number; w1: number; w2: number; x: number; y: number; size: number; align: "left" | "center" }> = ({ f, w1, w2, x, y, size, align }) => {
  const piece = (text: string, at: number, color: string) => {
    const dt = f - at;
    if (dt < 0) return <span style={{ opacity: 0 }}>{text}</span>;
    const p = expoOut(dt / 8);
    return (
      <span
        style={{
          display: "inline-block",
          transform: `scale(${1.35 - 0.35 * p}) translateY(${(1 - p) * 20}px)`,
          transformOrigin: "50% 60%",
          filter: dt < 5 ? `blur(${14 * (1 - dt / 5)}px)` : undefined,
          opacity: c01((dt + 1) / 2),
          color,
        }}
      >
        {text}
      </span>
    );
  };
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(${align === "center" ? "-50%" : "0"}, -50%)`,
        ...INTER_HEAVY,
        fontSize: size,
        lineHeight: 1,
        whiteSpace: "pre",
        textShadow: `0 0 ${size * 0.4}px rgba(${REEL.sage}, 0.4)`,
      }}
    >
      {piece("Pebble", w1, REEL.ink)}
      {piece(" 2.0", w2, REEL.accent)}
    </div>
  );
};

// the drop's confident pose: "viewing" (its proud expression, with a spark), then a look at its name as it lands
const revealCues = (D: number, word1: number) => [
  { at: D / 60, pose: "viewing" as const },
  { at: word1 / 60, look: { x: 0.6, y: -0.05 } },
  { at: word1 / 60 + 0.9, look: null },
];

const RevealScene: React.FC<{ plan: Plan; f: number; W: number; H: number; vertical: boolean }> = ({ plan, f, W, H, vertical }) => {
  const { D } = plan;
  const { word1, word2 } = plan.reveal.hits;
  const size = vertical ? 820 : 780;
  // 16:9: lands at the centre, glides left on "Pebble"; 9:16: lands above the centre and stays
  // the pebble makes room before the word lands: the glide ends 2 frames after the beat
  const glide = vertical ? 0 : inOut(c01((f - word1 + 12) / 14));
  const lockSize = vertical ? fitSize("Pebble 2.0", W * 0.88, 190) : 236;
  const footX = vertical ? W / 2 : W / 2 - glide * W * 0.25;
  const footY = vertical ? H * 0.47 : H * 0.5 + size * 0.3;
  const energy = 1 + 0.9 * hitEnv(f - D, 1, 14) + 0.3 * hitEnv(f - word1, 1, 10) + 0.3 * hitEnv(f - word2, 1, 10);
  const pebbleCy = footY - size * 0.3;
  return (
    <AbsoluteFill>
      <Ground tint="sage" focus={{ x: footX / W, y: pebbleCy / H }} energy={energy} />
      {/* the anamorphic streak on the drop */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: pebbleCy - 2,
          width: W,
          height: 4,
          background: `linear-gradient(90deg, transparent, rgba(${REEL.sageCore}, ${0.9 * hitEnv(f - D, 1, 10)}), transparent)`,
          filter: "blur(2px)",
          transform: `scaleX(${0.3 + 0.7 * expoOut((f - D) / 10)})`,
        }}
      />
      <ShockRing x={footX} y={pebbleCy} dt={f - D - 5} r0={size * 0.2} r1={Math.max(W, H) * 0.6} frames={30} />
      <ShockRing x={footX} y={pebbleCy} dt={f - word2} r0={size * 0.25} r1={size * 1.2} frames={20} />
      <Hero
        cues={revealCues(D, word1)}
        x={footX}
        y={footY}
        size={size}
        landAt={D}
        pulses={[word1, word2]}
        aura={{
          // the burst: everything at once on the drop, then a bright, steady glow that answers the two word hits
          level: 0.55 + 0.45 * E(f) + 0.9 * Math.exp(-(f - D) / 18) + 0.3 * hitEnv(f - word1, 1, 10) + 0.3 * hitEnv(f - word2, 1, 10),
          burstAge: f - D,
          rays: 0.12 + 0.88 * Math.exp(-(f - D) / 30),
        }}
      />
      <Lockup f={f} w1={word1} w2={word2} x={vertical ? W / 2 : W * 0.4} y={vertical ? H * 0.68 : pebbleCy} size={lockSize} align={vertical ? "center" : "left"} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------------------------------ the montage ---- */

const cardTarget = (crop: CropId, W: number, H: number, vertical: boolean) => {
  const r = CROPS[crop].rect;
  const wide = crop === "spaces";
  const maxW = vertical ? W * 0.9 : W * (wide ? 0.52 : 0.52);
  // (the companion pebble sits under the cards: they stop above about 0.8 of the height)
  const maxH = vertical ? H * 0.4 : H * 0.66;
  return Math.min(maxW / r.w, maxH / r.h, crop === "calendar" ? 2.4 : 1.9);
};

/** Two far cards behind the shot's own (other screens of the montage), small, out of focus, at half the parallax: depth. */
const DEPTH_ORDER: readonly CropId[] = ["finder", "keepCard", "calculator", "reply", "calendar", "spaces"];
const DepthCards: React.FC<{ shot: CardShot; f: number; W: number; H: number; vertical: boolean; shift: { x: number; y: number } }> = ({ shot, f, W, H, vertical, shift }) => {
  const i0 = DEPTH_ORDER.indexOf(shot.crop);
  const picks = [DEPTH_ORDER[(i0 + 1) % DEPTH_ORDER.length], DEPTH_ORDER[(i0 + 3) % DEPTH_ORDER.length]];
  const sideSign = shot.side === "right" ? 1 : -1;
  const t = (f - shot.from) / 60;
  const spots = vertical
    ? [{ x: W * 0.16, y: H * 0.86 }, { x: W * 0.86, y: H * 0.36 }]
    : [{ x: W * (0.5 + sideSign * 0.42), y: H * 0.14 }, { x: W * (0.5 - sideSign * 0.4), y: H * 0.86 }];
  return (
    <>
      {picks.map((crop, j) => {
        const c = CROPS[crop];
        const k = (Math.min(W, H) * 0.34) / Math.max(c.rect.w, c.rect.h);
        const src = c.allowed[0] + Math.round((c.allowed[1] - c.allowed[0]) * 0.5);
        return (
          <div key={crop} style={{ position: "absolute", inset: 0, opacity: 0.32 }}>
            <Card
              crop={crop}
              src={src}
              pose={{ x: spots[j].x + shift.x * 0.45 + Math.sin(t * 1.3 + j) * 12, y: spots[j].y + shift.y * 0.45 + t * 30 * (j ? -1 : 1), k, rotY: (j ? 18 : -18) * sideSign, rotX: 8 }}
              glow={0}
              shadow={false}
              blurPx={7}
            />
          </div>
        );
      })}
    </>
  );
};

const MontageShot: React.FC<{ shot: CardShot; next?: CardShot; f: number; W: number; H: number; vertical: boolean }> = ({ shot, next, f, W, H, vertical }) => {
  const dt = f - shot.from;
  const len = shot.to - shot.from;
  const left = shot.to - f;
  const src = Math.round(shot.src.at(dt));
  const k0 = cardTarget(shot.crop, W, H, vertical);
  const sideSign = shot.side === "right" ? 1 : -1;
  const home = vertical ? { x: W / 2, y: H * 0.53 } : { x: W / 2 + sideSign * W * 0.16, y: H * 0.45 };

  // arrive: a whip from `enter` (7 frames, expo-out), leave: a whip toward the next shot's arrival side's opposite
  const inV = VEC[shot.enter];
  // the cut lands mid-whip: on the beat's own frame the card is already most of the way in (blurred), settled by 6
  const arrive = 0.45 * (1 - expoOut((dt + 1) / 6));
  const arriveNext = 0.45 * (1 - expoOut((dt + 2) / 6));
  const outV = next ? VEC[next.enter] : { x: 0, y: 0 };
  const go = left <= 5 ? expoIn(1 - left / 5) : 0;
  const goNext = left - 1 <= 5 ? expoIn(1 - (left - 1) / 5) : 0;
  const dist = Math.max(W, H) * 0.75;
  const ox = inV.x * dist * arrive - outV.x * dist * go;
  const oy = inV.y * dist * arrive - outV.y * dist * go;
  const vx = (inV.x * dist * arriveNext - outV.x * dist * goNext) - ox;
  const vy = (inV.y * dist * arriveNext - outV.y * dist * goNext) - oy;
  const speed = Math.hypot(vx, vy);
  const moving = speed > 6;

  let k = k0 * (1 + 0.035 * (dt / Math.max(1, len)));
  for (const p of shot.punches) k *= 1 + 0.12 * hitEnv(dt - p, 2, 8);
  k *= 1 + 0.05 * hitEnv(dt, 1, 6);
  const settle = expoOut(dt / 18);
  const pose: CardPose = {
    x: home.x + ox,
    y: home.y + oy,
    k,
    rotY: vertical ? -6 * sideSign * (1 - settle) : -sideSign * (14 - 7 * settle),
    rotX: 5 - 2 * settle,
    rotZ: vertical ? 0 : sideSign * -1.2 * (1 - settle),
  };
  const wordSize = vertical ? fitSize(shot.word, W * 0.88, 150) : fitSize(shot.word, W * 0.4, 150);
  const wordX = vertical ? W / 2 : shot.side === "right" ? W * 0.055 : W * 0.945;
  const wordY = vertical ? H * 0.2 : H * 0.45;
  // the feature's line lands with its first screen and stays through its others
  const lineDt = f - shot.lineFrom;
  const lineLeft = shot.lineTo - f;
  const energy = 1 + 0.35 * hitEnv(dt, 1, 10) + shot.punches.reduce((a, p) => a + 0.3 * hitEnv(dt - p, 1, 10), 0);
  return (
    <AbsoluteFill>
      <Ground tint={shot.tint} focus={{ x: home.x / W, y: home.y / H }} energy={energy} shift={{ x: ox, y: oy }} />
      <Word
        text={shot.word}
        dt={lineDt}
        left={lineLeft}
        size={wordSize}
        x={wordX}
        y={wordY}
        align={vertical ? "center" : shot.side === "right" ? "left" : "right"}
        sweep={lineDt >= 10 && lineDt <= 34 ? (lineDt - 10) / 24 : undefined}
        exitV={{ x: -outV.x * 9, y: -outV.y * 9 }}
      />
      <DepthCards shot={shot} f={f} W={W} H={H} vertical={vertical} shift={{ x: ox, y: oy }} />
      <Card
        crop={shot.crop}
        src={src}
        pose={pose}
        trail={moving ? { vx, vy, n: 8, span: 1.6 } : undefined}
        blurPx={Math.min(10, speed / 14)}
        sweep={dt >= 3 && dt <= 23 ? (dt - 3) / 20 : undefined}
        fadeRight={shot.crop === "keepCard"}
        glow={0.75}
      />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------------------------ the companion pebble ---- */

/** Where the companion pebble stands through the montage: under the cards, centred. */
const companionSpot = (W: number, H: number, vertical: boolean) => (vertical ? { x: W / 2, y: H * 0.92, size: 250 } : { x: W / 2, y: H * 0.955, size: 190 });

/**
 * The companion through the montage: the real pebble (its own engine and poses), watching each screen as it lands, its
 * aura pulsing on every downbeat and breathing on the beats between, with the score's energy (the lead: "a subtle
 * pulse on the downbeats in the montage").
 */
const Companion: React.FC<{ plan: Plan; f: number; W: number; H: number; vertical: boolean }> = ({ plan, f, W, H, vertical }) => {
  const { montage, map } = plan;
  const from = montage[0].from;
  const to = plan.merge ? plan.merge.from : plan.length;
  const spot = companionSpot(W, H, vertical);
  const downs = map.downbeats.filter((d) => d >= from - 0.5 && d < to - 0.5).map(Math.round);
  const beats = map.beats.filter((b) => b >= from - 0.5 && b < to - 0.5).map(Math.round);
  // it looks up at each screen as it lands (toward the card's side), from Pebble's own gaze
  const cues = [
    { at: from / 60, pose: "viewing" as const },
    ...montage.map((sh) => ({ at: sh.from / 60 + 0.05, look: { x: vertical ? 0 : sh.side === "right" ? 0.75 : -0.75, y: -0.7 } })),
  ];
  const down = downs.reduce((a, d) => a + hitEnv(f - d, 1, 12), 0);
  const beat = beats.reduce((a, b) => a + hitEnv(f - b, 1, 7), 0);
  return (
    <Hero
      cues={cues}
      x={spot.x}
      y={spot.y}
      size={spot.size}
      landAt={from}
      enter="pop"
      pulses={downs}
      pulseGain={0.6}
      aura={{ level: 0.3 + 0.35 * E(f) + 0.55 * down + 0.15 * beat }}
    />
  );
};

/* ---------------------------------------------------------------------------------------------- the merge ---- */

const MERGE_CROPS: readonly CropId[] = ["calculator", "calendar", "finder", "keepCard", "reply", "spaces"];

/**
 * The merge (the person's Marvel idea, OVERRIDES §54): every screen of the montage orbits the pebble as a floating card,
 * and on each eighth note one is pulled in (it accelerates, shrinks and smears into the pebble, which squashes as it
 * takes it); then the lockup lands on the beat.
 */
const MergeScene: React.FC<{ plan: Plan; f: number; W: number; H: number; vertical: boolean }> = ({ plan, f, W, H, vertical }) => {
  const m = plan.merge!;
  const B = plan.B;
  const size = vertical ? 700 : 640;
  const cx = W / 2;
  const footY = vertical ? H * 0.47 : H * 0.5 + size * 0.3;
  const cy = footY - size * 0.3;
  // the lockup: the pebble glides left (16:9) or stays (9:16) for the words on the lockup beat
  const lock = inOut(c01((f - m.lockup + 12) / 14));
  const px = vertical ? cx : cx - lock * W * 0.25;
  const rx = vertical ? W * 0.4 : W * 0.34;
  const ry = vertical ? H * 0.24 : H * 0.36;
  const n = m.arrivals.length;
  const spin = ((f - m.from) / 60) * 0.9; // radians a second
  const pull = B * 1.1;
  const flights = m.arrivals.map((a, i) => {
    const crop = MERGE_CROPS[i % MERGE_CROPS.length];
    const u = (f - (a - pull)) / pull; // < 0: waiting on the orbit; 0..1: pulled in; > 1: gone
    if (u > 1) return null;
    const pos = (q: number) => {
      const e = expoIn(c01(q));
      const ang = (i / n) * Math.PI * 2 + spin + e * 1.4;
      return { x: px + Math.cos(ang) * rx * (1 - e), y: cy + Math.sin(ang) * ry * (1 - e), e };
    };
    const p0 = pos(u);
    const p1 = pos(u + 1 / pull);
    const k0 = Math.min((Math.min(W, H) * 0.42) / Math.max(CROPS[crop].rect.w, CROPS[crop].rect.h), 1.5);
    const k = k0 * (1 - 0.94 * p0.e);
    const appear = c01(0.55 + (f - m.from) / 8 - i * 0.04);
    const src = CROPS[crop].allowed[0] + Math.round((CROPS[crop].allowed[1] - CROPS[crop].allowed[0]) * 0.6);
    const behind = Math.sin((i / n) * Math.PI * 2 + spin) < 0; // the far half of the orbit sits behind the pebble
    return {
      behind: behind && p0.e < 0.5,
      el: (
        <Card
          key={i}
          crop={crop}
          src={src}
          pose={{ x: p0.x, y: p0.y, k: k * (0.4 + 0.6 * appear), rotY: Math.cos((i / n) * Math.PI * 2 + spin) * 22, rotX: 8, rotZ: (1 - p0.e) * (i % 2 ? 6 : -6), opacity: appear }}
          trail={p0.e > 0.05 ? { vx: p1.x - p0.x, vy: p1.y - p0.y, vlk: Math.log((1 - 0.94 * p1.e) / (1 - 0.94 * p0.e)), n: 7, span: 1.6 } : undefined}
          blurPx={behind ? 3 : Math.min(8, Math.hypot(p1.x - p0.x, p1.y - p0.y) / 14)}
          glow={0.35}
        />
      ),
    };
  });
  const absorbed = m.arrivals.filter((a) => a <= f).length;
  const energy = 1.0 + 0.5 * (absorbed / Math.max(1, n)) + m.arrivals.reduce((s, a) => s + 0.25 * hitEnv(f - a, 1, 6), 0) + 0.9 * hitEnv(f - m.lockup, 1, 14);
  return (
    <AbsoluteFill>
      <Ground tint="sage" focus={{ x: px / W, y: cy / H }} energy={energy} />
      {flights.filter((x) => x && x.behind).map((x) => x!.el)}
      {m.arrivals.map((a) => (
        <ShockRing key={a} x={px} y={cy} dt={f - a} r0={size * 0.18} r1={size * 0.55} frames={12} />
      ))}
      <ShockRing x={px} y={cy} dt={f - m.lockup} r0={size * 0.25} r1={Math.max(W, H) * 0.6} frames={28} />
      <Hero
        cues={[
          { at: m.from / 60, pose: "viewing" },
          { at: m.lockup / 60, pose: "happy" },
        ]}
        x={px}
        y={footY}
        size={size}
        landAt={m.from}
        enter={{ from: companionSpot(W, H, vertical), frames: 14 }}
        pulses={[...m.arrivals, m.lockup]}
        aura={{
          // it gathers light as it takes each screen, then bursts on the lockup (the merge's big hit) and warms
          level: 0.45 + 0.6 * (absorbed / Math.max(1, n)) + 0.25 * E(f) + m.arrivals.reduce((s, a) => s + 0.2 * hitEnv(f - a, 1, 6), 0) + 0.8 * hitEnv(f - m.lockup, 1, 20),
          burstAge: f >= m.lockup ? f - m.lockup : undefined,
          rays: f >= m.lockup ? 0.15 + 0.7 * Math.exp(-(f - m.lockup) / 36) : 0.2 * (absorbed / Math.max(1, n)),
          warmth: f >= m.lockup ? 0.3 * c01((f - m.lockup) / 24) : 0,
        }}
      />
      {flights.filter((x) => x && !x.behind).map((x) => x!.el)}
      <Lockup f={f} w1={m.lockup} w2={m.lockup + 4} x={vertical ? W / 2 : W * 0.4} y={vertical ? H * 0.68 : cy} size={vertical ? fitSize("Pebble 2.0", W * 0.88, 190) : 236} align={vertical ? "center" : "left"} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------------------------------------ the whole ---- */

const SmallPrint: React.FC<{ text: string; W: number; H: number; side: "left" | "right"; opacity: number }> = ({ text, W, H, side, opacity }) => {
  const vertical = H > W;
  // 9:16: both lines centred and stacked (side by side they would collide on a phone's width)
  const place: React.CSSProperties = vertical
    ? { left: 0, right: 0, textAlign: "center", bottom: side === "left" ? H * 0.018 : H * 0.034 }
    : { [side]: W * 0.04, bottom: H * 0.035 };
  return (
    <div
      style={{
        position: "absolute",
        ...place,
        fontFamily: "Inter",
        fontWeight: 500,
        fontSize: Math.round(Math.min(W, H) * 0.02),
        color: REEL.inkSoft,
        opacity,
        letterSpacing: "0.005em",
      }}
    >
      {text}
    </div>
  );
};

export const ReelStyleTest: React.FC<{ map?: BeatMap }> = ({ map }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const vertical = H > W;
  const plan = useMemo(() => buildPlan(map ?? STYLE_TEST_MAP), [map]);
  const f = frame;
  const { hook, breath, reveal, montage, merge, D } = plan;
  const shotIdx = montage.findIndex((s) => f >= s.from && f < s.to);
  const flash = f >= D ? 0.85 * Math.exp(-(f - D) / 4.5) : 0; // full on the drop's own frame
  const inMontage = shotIdx >= 0 || (merge && f >= merge.from);
  // the camera shakes on the big hits (the drop, the lockup), a few px, decaying in a sixth of a second
  const kick = hitEnv(f - D, 1, 9) * 1 + (merge ? hitEnv(f - merge.lockup, 1, 8) * 0.7 : 0);
  const amp = Math.min(W, H) * 0.012 * kick;
  const shake = `translate(${amp * Math.sin(f * 2.1)}px, ${amp * Math.cos(f * 2.9 + 1)}px) scale(${1 + 0.02 * kick})`;
  return (
    <AbsoluteFill style={{ background: REEL.base }}>
      <AbsoluteFill style={{ transform: shake }}>
      {f < hook.to && <HookScene plan={plan} f={f} W={W} H={H} vertical={vertical} />}
      {f >= breath.from && f < breath.to && <AbsoluteFill style={{ background: "#020805" }} />}
      {f >= reveal.from && f < reveal.to && <RevealScene plan={plan} f={f} W={W} H={H} vertical={vertical} />}
      {shotIdx >= 0 && <MontageShot shot={montage[shotIdx]} next={montage[shotIdx + 1]} f={f} W={W} H={H} vertical={vertical} />}
      {shotIdx >= 0 && <Companion plan={plan} f={f} W={W} H={H} vertical={vertical} />}
      {merge && f >= merge.from && <MergeScene plan={plan} f={f} W={W} H={H} vertical={vertical} />}
      </AbsoluteFill>
      {flash > 0.01 && <AbsoluteFill style={{ background: `rgba(226, 248, 222, ${flash})` }} />}
      {/* the pebble is on screen from the first frame (the take's own, then the engine's): its credit is too */}
      {!(f >= breath.from && f < breath.to) && <SmallPrint text={CREDIT} W={W} H={H} side="left" opacity={0.7} />}
      {inMontage && <SmallPrint text={HONEST} W={W} H={H} side="right" opacity={0.7} />}
    </AbsoluteFill>
  );
};

export const styleTestLength = (map: BeatMap = STYLE_TEST_MAP): number => buildPlan(map).length;
