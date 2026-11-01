// S01 Title, the drop (EDIT_PLAN S01). Night world.
//
// 0.0 the hit: the light jumps (a 0-frame set) and "Pebble 2.0" arrives letter by letter while the pebble hops in big
// from below (anticipation, stretch, landing squash). One diagonal light sweep across the lockup, then the README's
// line. The scene ends with a scale-through into the pebble's body: its last ~0.3 s is a flat fill of the body's own
// colour, so the director can match-cut into S02.
import { AbsoluteFill, Easing } from "remotion";
import { FontGate } from "../../components/FontGate";
import { Headline } from "../../components/Headline";
import { PebbleActor, bodyCentreAbove, cues, pose } from "../../components/PebbleActor";
import { Stage } from "../../components/Stage";
import { pick, useLayout } from "../../layout";
import { prog, tween } from "../../timing";
import { EASE, TYPE } from "../../tokens";
import { WORLDS } from "../../world";
import type { SceneProps } from "../types";
import { BODY_W, TITLE_TEXT, lockupGeo, useClock, type SfxSuggestion } from "./common";

export const S01_NOMINAL = 4;

export const TAGLINE = "The desktop companion that does real work,\nand shows its evidence.";

/** Beats, seconds at the nominal length. The dive is anchored to the scene's end. */
const B = { hit: 0, land: 0.45, sweep: 0.85, tagline: 0.95 } as const;
/** the dive starts this long before the end; the flat fill holds for the last FILL_S */
const DIVE_S = 0.85;
const FILL_S = 0.3;

export const S01_MARKS = [
  { name: "hit", s: B.hit },
  { name: "land", s: B.land },
  { name: "sweep", s: B.sweep },
  { name: "tagline", s: B.tagline },
  { name: "dive", s: S01_NOMINAL - DIVE_S },
  { name: "sage-fill", s: S01_NOMINAL - FILL_S },
] as const;

export const S01_SFX: SfxSuggestion[] = [
  { scene: "S01", s: 0, kind: "low impact + short whoosh", note: "the drop; the riser from S00 ends here" },
  { scene: "S01", s: B.land, kind: "pop", note: "the pebble's landing squash" },
  { scene: "S01", s: B.sweep + 0.3, kind: "soft shimmer (quiet)", note: "the light sweep crosses \"2.0\"" },
  { scene: "S01", s: S01_NOMINAL - FILL_S, kind: "whoosh (medium), peak on the fill", note: "the dive into the body; swell starts ~0.4 s early" },
];

/** A mild ease-in (in log space): the dive gathers speed into the body. */
const DIVE_EASE = Easing.bezier(0.45, 0, 0.8, 0.55);

export const S01Title: React.FC<SceneProps> = ({ durationInFrames }) => {
  const L = useLayout();
  const { t, T, D } = useClock(S01_NOMINAL, durationInFrames);
  const subSize = L.type.sub;
  const subH = 2 * subSize * TYPE.support.lineHeight;
  const g = lockupGeo(L, subH);
  const peb = g.pebble;
  const body = peb.size * BODY_W;
  const bodyC = { x: peb.x, y: peb.y - bodyCentreAbove(peb.size) };

  // the hop: from below the frame, to the lockup
  const from = pick(L, { "16x9": { x: peb.x - L.px(320), y: L.H + peb.size * 0.6 }, "4x5": { x: peb.x - L.px(200), y: L.H + peb.size * 0.6 } });
  const flight = 0.42;
  const hops = [{ at: T(B.land) - flight, to: { x: peb.x, y: peb.y }, duration: flight, height: L.px(pick(L, { "16x9": 240, "4x5": 300 })) }];

  // the dive: scale about a point a little below-left of the body's centre and bring it to the frame's centre, so the
  // eyes leave through the top right while the body grows to cover the whole frame (the nearest edge from that point
  // is ~0.3 × the body's width away) before the flat fill takes over. Log-space scale on a mild ease-in: the zoom's
  // perceived speed rises steadily instead of jumping in the last frames.
  const diveAt = D - DIVE_S;
  const fillAt = D - FILL_S;
  const aim = { x: bodyC.x - 0.1 * body, y: bodyC.y + 0.07 * body };
  const far = Math.hypot(L.W / 2, L.H / 2);
  // overshoot ×3: the body covers the frame about 80 % of the way in, so the last frames before the fill are all body
  const kEnd = (far / (0.3 * body)) * 1.1 * 3;
  const pd = Math.max(0, Math.min(1, (t - diveAt) / (fillAt - diveAt)));
  const e = DIVE_EASE(pd);
  const k = Math.exp(Math.log(kEnd) * e);
  const m = EASE.camera(pd);
  const tx = (L.centre.x - aim.x) * m;
  const ty = (L.centre.y - aim.y) * m;
  const blur = 6 * L.u * Math.sin(Math.PI * Math.min(1, pd * 1.25)) * Math.min(1, pd * 2.5);

  // the light sweep: a soft diagonal band across the lockup (overlay: it lights the type, barely the ground)
  const sp = prog(t, T(B.sweep), 0.75, EASE.camera);
  const sweepOn = t >= T(B.sweep) && sp < 1;
  const bx = g.bounds.x - L.px(120);
  const bw = g.bounds.w + L.px(240);
  const by = g.bounds.y - L.px(80);
  const bh = g.bounds.h + L.px(160);
  const c = -25 + 150 * sp;

  const energy = tween(t, [0, 0.12, 1.4], [1.55, 1.5, 1.12], EASE.camera);
  const vignette = tween(t, [diveAt, fillAt], [0.6, 0], EASE.camera);
  const fill = WORLDS.night.pebble.body;

  return (
    <FontGate>
      <AbsoluteFill>
        <Stage keyLight={{ x: 0.5, y: 0.36, r: 0.8 }} energy={energy} vignette={vignette}>
          <AbsoluteFill
            style={{
              transform: pd > 0 ? `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${k.toFixed(5)})` : undefined,
              transformOrigin: `${aim.x.toFixed(2)}px ${aim.y.toFixed(2)}px`,
              filter: blur > 0.1 ? `blur(${blur.toFixed(2)}px)` : undefined,
            }}
          >
            <PebbleActor
              x={from.x}
              y={from.y}
              size={peb.size}
              hops={hops}
              cues={cues(pose(0, "idle"), pose(T(B.land) + 0.05, "happy"), pose(T(B.land) + 1.3, "idle"))}
              glow={0.6}
            />
            <Headline text={TITLE_TEXT} variant="title" size={g.fs} accentFace="same" entrance="letters" at={0.02} align={g.align} valign="top" fit={false} box={g.titleBox} />
            <Headline
              text={TAGLINE}
              variant="support"
              size={subSize}
              color={WORLDS.night.ink2}
              at={T(B.tagline)}
              stagger={0.025}
              lineStagger={0.06}
              align="center"
              valign="top"
              fit={false}
              box={{ x: L.content.x, y: g.belowTop, w: L.content.w, h: subH + L.px(20) }}
            />
            {sweepOn && (
              <div
                style={{
                  position: "absolute",
                  left: bx,
                  top: by,
                  width: bw,
                  height: bh,
                  mixBlendMode: "overlay",
                  background: `linear-gradient(112deg, rgba(255,250,236,0) ${(c - 14).toFixed(2)}%, rgba(255,250,236,0.55) ${c.toFixed(2)}%, rgba(255,250,236,0) ${(c + 14).toFixed(2)}%)`,
                  WebkitMaskImage: "radial-gradient(closest-side, #000 70%, rgba(0,0,0,0))",
                  maskImage: "radial-gradient(closest-side, #000 70%, rgba(0,0,0,0))",
                }}
              />
            )}
          </AbsoluteFill>
          {t >= fillAt && <AbsoluteFill style={{ backgroundColor: fill }} />}
        </Stage>
      </AbsoluteFill>
    </FontGate>
  );
};
