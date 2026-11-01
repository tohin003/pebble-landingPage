// S10's opening: the Veil pebble S09 hands over, shedding the Veil. A scene-local fork of the motion system's
// <VeilPebble> (components/PebbleActor.tsx) with the theme as a prop: on S09's dusk night it is drawn in Pebble's
// dark-theme tokens, and inside the daylight that opens out of it in Pebble's LIGHT-theme tokens (v2.0.1
// src/tokens.css :root: --avatar #536b54, --avatar-eye #fff, --avatar-stealth #44528c …; shared/pebble VEIL_LIGHT),
// so the pebble's colour changes only where the daylight wipe has passed (FIXES-1: a colour changes on a cut or a wipe).
//
// The Veil is Pebble's own code (shared/pebble/veil.ts: Avatar.vue's layers), the release Pebble's own designed one
// (0.65 s: fold, lift, hop). A render, never called a recording. The light variant also draws the contact shadow at rest
// (video/src/pebble/acting.ts), so the hand-over to <PebbleActor> once the release is over is the same picture.
import { useId } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import {
  BODY,
  VEIL_DARK,
  VEIL_LIGHT,
  VIEWBOX,
  VIEWBOX_SIZE,
  pebbleAt,
  veilAt,
  veilDraw,
  type PebbleCue,
  type VeilColors,
  type VeilSwitch,
} from "../../../../../shared/pebble";
import { COLOR } from "../../../motion/spec";
import { contactShadow } from "../../../pebble/acting";
import { PEBBLE_DARK, PEBBLE_LIGHT, type PebbleColors } from "../../../pebble/PebbleSvg";

export type Theme = "dark" | "light";
const THEMES: Record<Theme, { base: PebbleColors; veil: VeilColors }> = {
  dark: { base: PEBBLE_DARK, veil: VEIL_DARK },
  light: { base: PEBBLE_LIGHT, veil: VEIL_LIGHT },
};

export const VeilShed: React.FC<{
  /** the foot (bottom centre of the body), px */
  x: number;
  y: number;
  /** the 220-unit viewBox's size, px */
  size: number;
  theme: Theme;
  cues: readonly PebbleCue[];
  veil: readonly VeilSwitch[];
  initial?: boolean;
  lead?: number;
  /** the contact shadow at rest (daylight) */
  shadow?: boolean;
}> = ({ x, y, size, theme, cues: list, veil, initial = true, lead = 1, shadow = false }) => {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const te = frame / fps + lead;
  const view = pebbleAt(
    list.map((c) => ({ ...c, at: c.at + lead })),
    te,
  );
  const vf = veilAt(
    veil.map((v) => ({ ...v, at: v.at + lead })),
    te,
    { initial },
  );
  const d = veilDraw(vf, size);
  const { base, veil: vc } = THEMES[theme];
  const ids = { body: `dvb${id}`, base: `dvs${id}`, cloak: `dvc${id}`, glass: `dvg${id}`, sheen: `dvh${id}` };
  const url = (n: string) => `url(#${n})`;
  const fr = view.frame;
  const eyes = (fill: string) => fr.eyes.map((e, i) => <path key={i} d={e.d} transform={e.matrix + d.eyeScale} opacity={e.alpha} fill={fill} />);
  const unit = size / VIEWBOX_SIZE;
  const left = x - size / 2;
  const top = y - (VIEWBOX_SIZE / 2 + BODY.bottom) * unit;
  const sh = shadow ? contactShadow(fr, view.motion, { foot: { x, y }, ground: { x, y }, lift: 0, sx: 1, sy: 1 }, unit) : null;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {sh && (
        <div
          style={{
            position: "absolute",
            left: sh.x - sh.width / 2,
            top: sh.y - sh.height / 2,
            width: sh.width,
            height: sh.height,
            borderRadius: "50%",
            background: `rgb(${COLOR.shadowRgb})`,
            opacity: sh.opacity,
            filter: `blur(${sh.blur}px)`,
          }}
        />
      )}
      <svg viewBox={VIEWBOX} width={size} height={size} style={{ position: "absolute", left, top, overflow: "visible", color: base.body }} aria-hidden>
        {d.show && (
          <defs>
            <clipPath id={ids.body}>
              <path d={fr.bodyPath} />
            </clipPath>
            <clipPath id={ids.base}>
              <rect x={-110} y={d.baseClip.y} width={220} height={d.baseClip.height} />
            </clipPath>
            <clipPath id={ids.cloak}>
              <rect x={-110} y={d.cloakClip.y} width={220} height={d.cloakClip.height} />
            </clipPath>
            <linearGradient id={ids.glass} x1=".15" y1="0" x2=".85" y2="1">
              <stop offset="0" stopColor={vc.hi} />
              <stop offset=".75" stopColor={vc.veil} />
            </linearGradient>
            <linearGradient id={ids.sheen} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset=".5" stopColor="#fff" stopOpacity=".55" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
        )}
        <g transform={view.motion.transform}>
          <g transform={d.squash}>
            <g clipPath={d.show && !d.fade ? url(ids.base) : undefined} opacity={d.baseOpacity}>
              <path d={fr.bodyPath} opacity={fr.bodyAlpha} fill="currentColor" />
              {eyes(base.eye)}
            </g>
            {d.show && (
              <g clipPath={d.fade ? undefined : url(ids.cloak)} opacity={d.veilOpacity}>
                <path d={fr.bodyPath} opacity={fr.bodyAlpha} fill={d.fine ? url(ids.glass) : vc.veil} fillOpacity={d.fillOpacity} />
                {d.fine && (
                  <g clipPath={url(ids.body)}>
                    <ellipse cx={-26} cy={-30} rx={20} ry={9} transform="rotate(-35 -26 -30)" fill="#fff" opacity={d.highlightOpacity} />
                    {d.shimmer && <rect x={-20} y={-140} width={40} height={280} fill={url(ids.sheen)} opacity={d.shimmer.opacity} transform={d.shimmer.transform} />}
                  </g>
                )}
                {eyes(vc.eye)}
              </g>
            )}
            {d.show && (
              <g clipPath={url(ids.body)}>
                <path d={fr.bodyPath} fill="none" stroke={vc.rim} strokeWidth={d.rimWidth} opacity={d.rimOpacity} />
                {d.hem && <rect x={-110} y={d.hem.y} width={220} height={1.8} fill={vc.rim} opacity={d.hem.opacity} />}
              </g>
            )}
          </g>
          {d.ping && <circle r={66} fill="none" stroke={vc.glow} transform={d.ping.transform} strokeWidth={d.ping.strokeWidth} opacity={d.ping.opacity} />}
        </g>
      </svg>
    </div>
  );
};
