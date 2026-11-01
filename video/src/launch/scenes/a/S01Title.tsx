// S01 Title, the drop (EDIT_PLAN S01). Night world.
//
// 0.0 the hit: the light jumps (a 0-frame set) and "Pebble 2.0" is already writing itself letter by letter (the "Peb"
// is on the drop frame), while the pebble leaps from the exact spot where S00 left it crouching (stretch on the drop
// frame, landing squash in the lockup at 0.45, growing on the way; flight.tsx: it never slides across the name). One
// diagonal light sweep across the lockup, then the README's line, landed by about 1.2 s and held 3.8 s (REVIEW-1 M5).
// The scene ends with a dive into the pebble's body, drawn sharp (the vector is re-rasterised at every scale; only the
// camera's motion blurs, across a 180° shutter):
// the body covers the frame only for the last 0.1 s (3 frames at 30 fps, REVIEW-1 S4), a flat field of the body's own
// colour; S02 opens on the real companion pebble, centred and sharp (1.8× take px), and pulls back to the whole Mac.
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
import { BODY_W, TITLE_TEXT, lockupGeo, useClock, type SfxSuggestion } from "./common";
import { FlightPebble, lockupFlight, type Flight } from "./flight";
import { S00_NOMINAL, coldOpenGeo, s00ActorCues } from "./S00ColdOpen";

export const S01_NOMINAL = 5.5;

export const TAGLINE = "The desktop companion that does real work,\nand shows its evidence.";

/** Beats, seconds at the nominal length. The dive is anchored to the scene's end. */
const B = { hit: 0, land: 0.45, tagline: 0.5, sweep: 0.95 } as const;
/** the name's letters: the first starts this long before the drop, so the drop frame already carries "Peb" */
const LETTERS_AT = -0.15;
/** the dive starts this long before the end; the body covers the whole frame for the last COVER_S */
const DIVE_S = 0.55;
const COVER_S = 0.1;

export const S01_MARKS = [
  { name: "hit", s: B.hit },
  { name: "land", s: B.land },
  { name: "tagline", s: B.tagline },
  { name: "sweep", s: B.sweep },
  { name: "dive", s: S01_NOMINAL - DIVE_S },
  { name: "sage-cover", s: S01_NOMINAL - COVER_S },
] as const;

export const S01_SFX: SfxSuggestion[] = [
  { scene: "S01", s: 0, kind: "low impact + short whoosh", note: "the drop; the riser from S00 ends here; the pebble takes off on this frame" },
  { scene: "S01", s: B.land, kind: "pop", note: "the pebble's landing squash in the lockup" },
  { scene: "S01", s: B.sweep + 0.3, kind: "soft shimmer (quiet)", note: "the light sweep crosses \"2.0\"" },
  { scene: "S01", s: S01_NOMINAL - COVER_S, kind: "whoosh (medium), peak where the body covers the frame", note: "the dive; swell starts ~0.4 s early" },
];

/** An ease-in in log space (p²): the dive gathers speed into the body, and its last frame before the cover is ~1.5× from it. */
const DIVE_EASE = (p: number) => p * p;

/** The engine runs on from S00 (actor lead 1 there): S01's local 0 is S00's end. */
const LEAD = 1 + S00_NOMINAL;

export const S01Title: React.FC<SceneProps> = ({ durationInFrames }) => {
  const L = useLayout();
  const { t, T, D, fps } = useClock(S01_NOMINAL, durationInFrames);
  // the README's line: 60 px on 16:9 (a little over the 56-px floor, for phones), 44 px on 4:5
  const subSize = L.portrait ? L.type.sub : L.px(60);
  const subH = 2 * subSize * TYPE.support.lineHeight;
  const g = lockupGeo(L, subH);
  const peb = g.pebble;
  const body = peb.size * BODY_W;
  const bodyC = { x: peb.x, y: peb.y - bodyCentreAbove(peb.size) };

  // the leap: from S00's spot (the foot and the size S00 left it at) into the lockup, growing on the way
  const from = coldOpenGeo(L).peb;
  const to = { x: peb.x, y: peb.y };
  const leap: Flight = { from, to, fromSize: from.size, toSize: peb.size, at: 0, dur: T(B.land), ...lockupFlight(L.portrait, L.px, from, to) };
  const actorCues = cues(
    s00ActorCues((x) => x).map((c) => ({ ...c, at: c.at - S00_NOMINAL })),
    pose(T(B.land) + 0.02, "happy"),
    pose(T(1.95), "idle"),
    // it reads its own line, then looks back at us; attentive as the camera dives into it
    look(T(2.25), 0.15, 0.7),
    lookBack(T(3.3)),
    pose(D - DIVE_S - 0.35, "hover"),
  );

  // the dive: scale about a point below-right of the body's centre and bring it to the frame's centre, so the eyes leave
  // through the top left while the name leaves to the right (never through the same part of the frame: the flash
  // scan's windows count every light-dark change in one place), and the body grows to cover the frame (the nearest edge
  // from that point is ~0.28 × the body's width away) exactly at the cover. Log-space scale on an ease-in: the zoom's perceived speed rises
  // steadily. The pebble stays a sharp vector at every scale (REVIEW-1 S4); only the camera's own motion blurs.
  const diveAt = D - DIVE_S;
  const coverAt = D - COVER_S;
  const aim = { x: bodyC.x + 0.15 * body, y: bodyC.y + 0.12 * body };
  const far = Math.hypot(L.W / 2, L.H / 2);
  const kCover = (far / (0.28 * body)) * 1.04;
  const camAt = (ts: number) => {
    const pd = Math.max(0, Math.min(1, (ts - diveAt) / (coverAt - diveAt)));
    const m = EASE.camera(pd);
    return { pd, k: Math.exp(Math.log(kCover) * DIVE_EASE(pd)), tx: (L.centre.x - aim.x) * m, ty: (L.centre.y - aim.y) * m };
  };
  // Motion blur on the dive's fast frames: the same frame drawn at the camera's poses across a 180° shutter and
  // averaged (opaque layers at 1/(i + 1), as ScreenZoom does), a sample every 2.5 px of travel at the frame's corners
  // (up to 24), so no copy of a stroke shows (REVIEW-1 S8). At 30 fps the sharp zoom otherwise strobes.
  const open = 0.5 / fps;
  const now = camAt(t);
  const before = camAt(t - open);
  const shift = Math.abs(Math.log(now.k / before.k)) * far + Math.hypot(now.tx - before.tx, now.ty - before.ty);
  const n = now.pd > 0 && t < coverAt ? Math.max(1, Math.min(24, Math.ceil(shift / 2.5))) : 1;
  // the type leaves as the zoom turns extreme (after the line's 3.8 s hold), so the fastest frames hold only the
  // pebble: white letters crossing the frame in one step read as flashes (and as pops to the neighbour scan)
  const typeOp = 1 - EASE.exit(Math.max(0, Math.min(1, (t - (diveAt + 0.08)) / 0.12)));
  const shutter = n === 1 ? [t] : Array.from({ length: n }, (_, i) => t - open * (1 - i / (n - 1)));

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
  const vignette = tween(t, [diveAt, coverAt], [0.6, 0], EASE.camera);
  const fill = WORLDS.night.pebble.body;

  const lockup = (
    <>
      <div style={{ position: "absolute", inset: 0, opacity: typeOp }}>
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
      <FlightPebble flight={leap} t={t} cues={actorCues} lead={LEAD} glow={0.6} />
      <div style={{ position: "absolute", inset: 0, opacity: typeOp }}>
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
      {shutter.map((ts, i) => {
        const cam = camAt(ts);
        return (
          <AbsoluteFill key={i} style={i === 0 ? undefined : { opacity: 1 / (i + 1) }}>
            <Stage keyLight={{ x: 0.5, y: 0.36, r: 0.8 }} energy={energy} vignette={vignette}>
              <AbsoluteFill
                style={{
                  transform: cam.pd > 0 ? `translate(${cam.tx.toFixed(2)}px, ${cam.ty.toFixed(2)}px) scale(${cam.k.toFixed(5)})` : undefined,
                  transformOrigin: `${aim.x.toFixed(2)}px ${aim.y.toFixed(2)}px`,
                }}
              >
                {lockup}
              </AbsoluteFill>
              {t >= coverAt && <AbsoluteFill style={{ backgroundColor: fill }} />}
            </Stage>
          </AbsoluteFill>
        );
      })}
    </FontGate>
  );
};
