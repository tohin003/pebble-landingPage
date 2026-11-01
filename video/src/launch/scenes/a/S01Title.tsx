// S01 Title, the drop (EDIT_PLAN S01). Night world.
//
// 0.0 the hit: the light jumps (a 0-frame set) and "Pebble 2.0" is already writing itself letter by letter (the "Peb"
// is on the drop frame), while the pebble leaps from the exact spot where S00 left it crouching (stretch on the drop
// frame, landing squash in the lockup at 0.45, growing on the way; flight.tsx: it never slides across the name). One
// diagonal light sweep across the lockup, then the README's line, landed by about 1.2 s and held 3.8 s (REVIEW-1 M5).
// The scene ends with a push onto the pebble (REVIEW-2 S-8, FIXES-2 "S01 → S02"): the type leaves, the night ground
// stays, and the camera settles with the pebble's body centred in the frame at exactly the size of S02's frame-0 take
// pebble (RS11-02's body, 173 take px at 1.2 frame px each: 208 px wide). The master cuts there: the world changes under
// a pebble that doesn't move. No flat sage frames.
import { AbsoluteFill } from "remotion";
import { FontGate } from "../../components/FontGate";
import { Headline } from "../../components/Headline";
import { bodyCentreAbove, cues, look, lookBack, pose } from "../../components/PebbleActor";
import { Stage } from "../../components/Stage";
import { pick, useLayout } from "../../layout";
import { prog, tween } from "../../timing";
import { EASE, TYPE } from "../../tokens";
import { WORLDS } from "../../world";
import type { SceneProps } from "../types";
import { BODY_W, TITLE_TEXT, lockupGeo, onBlink, useClock, type SfxSuggestion } from "./common";
import { FlightPebble, lockupFlight, type Flight } from "./flight";
import { S00_END_DRIFT, S00_NOMINAL, coldOpenGeo, s00ActorCues } from "./S00ColdOpen";

export const S01_NOMINAL = 5.5;

export const TAGLINE = "The desktop companion that does real work,\nand shows its evidence.";

/** Beats, seconds at the nominal length. The push is anchored to the scene's end. */
const B = { hit: 0, land: 0.45, tagline: 0.5, sweep: 0.95 } as const;
/** the name's letters: the first starts this long before the drop, so the drop frame already carries "Peb" */
const LETTERS_AT = -0.15;
/** the push onto the pebble starts this long before the end, and settles SETTLE_S before it (the last frames are still) */
const PUSH_S = 0.6;
const SETTLE_S = 0.05;
/** the pebble's gaze at the cut, matched to the take pebble's eyes on S02's frame 0 */
const END_LOOK = { x: 0.1, y: -0.8 } as const;

/**
 * S02's frame 0 (FIXES-2 "S01 → S02"; measured on stills of Launch-S02-OnYourMac-16x9 / -4x5 frame 0): the take's
 * pebble body centred at (W/2, H/2), 208 × 183 px at 1080p in both aspects (RS11-02's 173 take px at OPEN_MAG 1.2).
 * S01's push ends with ITS body exactly there and that wide.
 */
export const S02_OPEN_PEBBLE = { cx: 0.5, cy: 0.5, bodyW: 173 * 1.2 } as const;

export const S01_MARKS = [
  { name: "hit", s: B.hit },
  { name: "land", s: B.land },
  { name: "tagline", s: B.tagline },
  { name: "sweep", s: B.sweep },
  { name: "push", s: S01_NOMINAL - PUSH_S },
  { name: "match", s: S01_NOMINAL - SETTLE_S },
] as const;

export const S01_SFX: SfxSuggestion[] = [
  { scene: "S01", s: 0, kind: "low impact + short whoosh", note: "the drop; the riser from S00 ends here; the pebble takes off on this frame" },
  { scene: "S01", s: B.land, kind: "pop", note: "the pebble's landing squash in the lockup" },
  { scene: "S01", s: B.sweep + 0.3, kind: "soft shimmer (quiet)", note: "the light sweep crosses \"2.0\"" },
  { scene: "S01", s: S01_NOMINAL - PUSH_S / 2, kind: "whoosh (short, soft), peak at the push's fastest frame", note: "the push onto the pebble; it settles before the cut" },
];

/** The engine runs on from S00 (actor lead 1 there): S01's local 0 is S00's end. */
const LEAD = 1 + S00_NOMINAL;

export const S01Title: React.FC<SceneProps> = ({ durationInFrames }) => {
  const L = useLayout();
  const { t, T, D } = useClock(S01_NOMINAL, durationInFrames);
  // the README's line: 60 px on 16:9 (a little over the 56-px floor, for phones), 44 px on 4:5
  const subSize = L.portrait ? L.type.sub : L.px(60);
  const subH = 2 * subSize * TYPE.support.lineHeight;
  const g = lockupGeo(L, subH);
  const peb = g.pebble;
  const body = peb.size * BODY_W;
  const bodyC = { x: peb.x, y: peb.y - bodyCentreAbove(peb.size) };

  // the leap: from S00's spot (the foot, and the size S00 left it at after its set's drift) into the lockup, growing on the way
  const from = coldOpenGeo(L).peb;
  const to = { x: peb.x, y: peb.y };
  const leap: Flight = { from, to, fromSize: from.size * S00_END_DRIFT, toSize: peb.size, at: 0, dur: T(B.land), ...lockupFlight(L.portrait, L.px, from, to) };
  const actorCues = cues(
    s00ActorCues((x) => x).map((c) => ({ ...c, at: c.at - S00_NOMINAL })),
    pose(T(B.land) + 0.02, "happy"),
    pose(T(1.95), "idle"),
    // it reads its own line, then looks back at us
    look(T(2.25), 0.15, 0.7),
    lookBack(T(3.3)),
    // attentive as the camera pushes in, then S02's take pebble's own face: idle, its gaze a little up and right
    // (RS11-02's frame 0: the eyes sit right of and above the body's middle), so the cut changes nothing but the world
    pose(D - PUSH_S - 0.35, "hover"),
    pose(onBlink(D - PUSH_S + 0.1, LEAD), "idle"),
    look(onBlink(D - PUSH_S + 0.1, LEAD) + 0.05, END_LOOK.x, END_LOOK.y),
  );

  // the push: the camera scales about the body's centre and brings it to S02's spot, on the camera's in-out ease, and
  // settles SETTLE_S before the end (S02's pull-back also starts from rest). Gentle (about 1.4–1.6×), so no motion blur.
  const pushAt = D - PUSH_S;
  const settleAt = D - SETTLE_S;
  const kEnd = L.px(S02_OPEN_PEBBLE.bodyW) / body;
  const goal = { x: S02_OPEN_PEBBLE.cx * L.W, y: S02_OPEN_PEBBLE.cy * L.H };
  const pd = Math.max(0, Math.min(1, (t - pushAt) / (settleAt - pushAt)));
  const m = EASE.camera(pd);
  const cam = { k: Math.exp(Math.log(kEnd) * m), tx: (goal.x - bodyC.x) * m, ty: (goal.y - bodyC.y) * m };
  // the type leaves as the push starts (after the line's 3.8 s hold): an accelerating 0.15 s fade with a little blur
  const typeP = EASE.exit(Math.max(0, Math.min(1, (t - (pushAt + 0.02)) / 0.15)));
  const typeOp = 1 - typeP;

  // the light sweep: a soft diagonal band across the lockup (overlay: it lights the type, barely the ground); wider on
  // the narrow 4:5 lockup, so its glint takes a few frames to cross the pebble
  const sp = prog(t, T(B.sweep), 0.75, EASE.camera);
  const sweepOn = t >= T(B.sweep) && sp < 1;
  const bx = g.bounds.x - L.px(120);
  const bw = g.bounds.w + L.px(240);
  const by = g.bounds.y - L.px(80);
  const bh = g.bounds.h + L.px(160);
  const c = -25 + 150 * sp;
  const band = pick(L, { "16x9": 14, "4x5": 24 });

  const energy = tween(t, [0, 0.12, 1.4], [1.55, 1.5, 1.12], EASE.camera);
  // the pebble's halo dims as it comes close (S02's take pebble has none)
  const glow = 0.6 - 0.45 * m;

  const lockup = (
    <>
      <div style={{ position: "absolute", inset: 0, opacity: typeOp, filter: typeP > 0 ? `blur(${(4 * L.u * typeP).toFixed(2)}px)` : undefined }}>
        <Headline
          text={TITLE_TEXT}
          variant="title"
          size={g.fs}
          accentFace="same"
          entrance="letters"
          at={LETTERS_AT}
          align={g.align}
          valign="top"
          fit={false}
          box={g.titleBox}
        />
      </div>
      {/* in front of the name: it grows toward us as it leaps (16:9: under the type and up on its left; 4:5: up past it in ~3 frames) */}
      <FlightPebble flight={leap} t={t} cues={actorCues} lead={LEAD} glow={glow} />
      <div style={{ position: "absolute", inset: 0, opacity: typeOp, filter: typeP > 0 ? `blur(${(4 * L.u * typeP).toFixed(2)}px)` : undefined }}>
        <Headline
          text={TAGLINE}
          variant="support"
          size={subSize}
          color={WORLDS.night.ink2}
          at={T(B.tagline)}
          dur={0.4}
          stagger={0.025}
          lineStagger={0.06}
          align="center"
          valign="top"
          fit={false}
          box={{ x: L.content.x, y: g.belowTop, w: L.content.w, h: subH + L.px(20) }}
        />
      </div>
      {sweepOn && (
        <div
          style={{
            position: "absolute",
            left: bx,
            top: by,
            width: bw,
            height: bh,
            mixBlendMode: "overlay",
            background: `linear-gradient(112deg, rgba(255,250,236,0) ${(c - band).toFixed(2)}%, rgba(255,250,236,0.55) ${c.toFixed(2)}%, rgba(255,250,236,0) ${(c + band).toFixed(2)}%)`,
            WebkitMaskImage: "radial-gradient(closest-side, #000 70%, rgba(0,0,0,0))",
            maskImage: "radial-gradient(closest-side, #000 70%, rgba(0,0,0,0))",
          }}
        />
      )}
    </>
  );

  return (
    <FontGate>
      <Stage keyLight={{ x: 0.5, y: 0.36, r: 0.8 }} energy={energy}>
        <AbsoluteFill
          style={{
            transform: pd > 0 ? `translate(${cam.tx.toFixed(3)}px, ${cam.ty.toFixed(3)}px) scale(${cam.k.toFixed(6)})` : undefined,
            transformOrigin: `${bodyC.x.toFixed(3)}px ${bodyC.y.toFixed(3)}px`,
          }}
        >
          {lockup}
        </AbsoluteFill>
      </Stage>
    </FontGate>
  );
};
