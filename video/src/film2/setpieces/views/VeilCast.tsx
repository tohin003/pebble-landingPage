// <VeilCast>: the Veil, Stealth Lockdown's look on the pebble, RENDERED with Pebble's own code (TREATMENT S21, VS-2):
// the timings and curves are Pebble 1.1.0's src/stealthVeil.ts (copied unchanged into shared/pebble), the layers are its
// Avatar.vue template's, as the site draws them (src/components/pebble/PebbleVeil.tsx, from Pebble v1.1.0, Apache-2.0,
// Copyright 2026 Tohin Majumder), with every number from shared/pebble/veil.ts veilDraw(). Changes here: React for the
// film (no CSS module: the light theme's colours are explicit), and the frame and the Veil replayed from the piece's
// cues and switches on every frame (films replay, never remember).
//
// It is a render, not a screen recording, and the film says so beside it on every frame it shows ("A render, not a
// screen recording.", L22). The pebble's body and eyes come from the same engine frame the film pebble draws.
import { useId } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { VIEWBOX, VEIL_LIGHT, pebbleAt, veilAt, veilDraw, type PebbleCue, type VeilSwitch } from "../../../../../shared/pebble";
import { PEBBLE_LIGHT } from "../../../pebble/PebbleSvg";
import type { Point } from "../../motion/geometry";

export const VeilCast: React.FC<{ at: Point; size: number; cues: readonly PebbleCue[]; veil: readonly VeilSwitch[]; offsetFrames?: number }> = ({ at, size, cues, veil, offsetFrames = 0 }) => {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame + offsetFrames) / fps;
  const view = pebbleAt(cues, t);
  const vf = veilAt(veil, t);
  const d = veilDraw(vf, size);
  const ids = { body: `vb${id}`, base: `vs${id}`, cloak: `vc${id}`, glass: `vg${id}`, sheen: `vh${id}` };
  const url = (n: string) => `url(#${n})`;
  const fr = view.frame;
  const eyes = (fill: string) => fr.eyes.map((e, i) => <path key={i} d={e.d} transform={e.matrix + d.eyeScale} opacity={e.alpha} fill={fill} />);
  return (
    <svg viewBox={VIEWBOX} width={size} height={size} style={{ position: "absolute", left: at.x - size / 2, top: at.y - size / 2, overflow: "visible", color: PEBBLE_LIGHT.body }} aria-hidden>
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
            <stop offset="0" stopColor={VEIL_LIGHT.hi} />
            <stop offset=".75" stopColor={VEIL_LIGHT.veil} />
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
            {eyes(PEBBLE_LIGHT.eye)}
          </g>
          {d.show && (
            <g clipPath={d.fade ? undefined : url(ids.cloak)} opacity={d.veilOpacity}>
              <path d={fr.bodyPath} opacity={fr.bodyAlpha} fill={d.fine ? url(ids.glass) : VEIL_LIGHT.veil} fillOpacity={d.fillOpacity} />
              {d.fine && (
                <g clipPath={url(ids.body)}>
                  <ellipse cx={-26} cy={-30} rx={20} ry={9} transform="rotate(-35 -26 -30)" fill="#fff" opacity={d.highlightOpacity} />
                  {d.shimmer && <rect x={-20} y={-140} width={40} height={280} fill={url(ids.sheen)} opacity={d.shimmer.opacity} transform={d.shimmer.transform} />}
                </g>
              )}
              {eyes(VEIL_LIGHT.eye)}
            </g>
          )}
          {d.show && (
            <g clipPath={url(ids.body)}>
              <path d={fr.bodyPath} fill="none" stroke={VEIL_LIGHT.rim} strokeWidth={d.rimWidth} opacity={d.rimOpacity} />
              {d.hem && <rect x={-110} y={d.hem.y} width={220} height={1.8} fill={VEIL_LIGHT.rim} opacity={d.hem.opacity} />}
            </g>
          )}
        </g>
        {d.ping && <circle r={66} fill="none" stroke={VEIL_LIGHT.glow} transform={d.ping.transform} strokeWidth={d.ping.strokeWidth} opacity={d.ping.opacity} />}
      </g>
    </svg>
  );
};
