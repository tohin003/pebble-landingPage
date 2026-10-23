// The Veil on the site's pebble: Stealth Lockdown's look, drawn layer for layer as Pebble's Avatar.vue template draws
// it. Modified for the Pebble site from Pebble v1.1.0, src/components/Avatar.vue (Apache-2.0, Copyright 2026 Tohin
// Majumder): the clip paths and the two gradients; the plain pebble below the wipe edge; the dusk glass above it, with
// its highlight, the shimmer band and its own eyes; the light rim and the hem, clipped to the body; the squash about the
// pebble's bottom; and the cast's ring. Changes: React instead of Vue; ids from useId (one set per pebble) instead of
// nextVeilId(); every number from veilDraw (shared/pebble/veil.ts, Avatar.vue's formulas); the body and eyes keep the
// site's --pebble and --pebble-eye; Reduce Motion's cross-fade is drawn frame by frame (veilFrame) instead of by a CSS
// transition, so it fades both ways.
//
// Colours: --pebble-veil (the dusk blue), --pebble-veil-hi (its highlight), --pebble-veil-eye, --pebble-veil-rim and
// --pebble-veil-glow. Set them on any ancestor to scope them; without them the pebble uses Pebble 1.1.0's tokens for the
// page's theme (PebbleVeil.module.css), and the light values where no stylesheet loads. A pure component (one useId),
// so server and client components render it alike. PebbleSvg uses it only while the Veil differs from the plain pebble.
// The clip and gradient ids are unique within one React tree (a page); pebbles rendered by separate React roots or
// separate renderToStaticMarkup calls into one document would repeat them, and url(#…) takes the first in the document.
import { useId } from "react";
import type { BotFrame, PebbleMotion } from "@pebble/index";
import { VEIL_LIGHT, veilDraw, type VeilFrame } from "@pebble/veil";
import styles from "./PebbleVeil.module.css";

const token = (name: string, light: string) => `var(--pebble-${name}, var(--_pebble-${name}, ${light}))`;

/** The Veil's paints: the page's tokens first, then the theme's defaults, then the light value. */
export const VEIL_PAINT = {
  veil: token("veil", VEIL_LIGHT.veil),
  hi: token("veil-hi", VEIL_LIGHT.hi),
  eye: token("veil-eye", VEIL_LIGHT.eye),
  rim: token("veil-rim", VEIL_LIGHT.rim),
  glow: token("veil-glow", VEIL_LIGHT.glow),
} as const;

export interface PebbleVeilProps {
  frame: BotFrame;
  motion: PebbleMotion;
  veil: VeilFrame;
  /** rendered width in px (under 64 px: no glass, highlight, shimmer or ring, and a thicker rim); undefined: CSS-sized */
  size?: number;
}

/** The pebble's body group with the Veil: what PebbleSvg draws in place of its plain body while the Veil shows. */
export function PebbleVeil({ frame, motion, veil, size }: PebbleVeilProps) {
  const id = useId();
  const d = veilDraw(veil, size);
  const ids = {
    body: `veil-body${id}`,
    base: `veil-base${id}`,
    cloak: `veil-cloak${id}`,
    glass: `veil-glass${id}`,
    sheen: `veil-sheen${id}`,
  };
  const url = (name: string) => `url(#${name})`;
  const eyes = (fill: string) =>
    frame.eyes.map((e, i) => <path key={i} d={e.d} transform={e.matrix + d.eyeScale} opacity={e.alpha} fill={fill} />);
  return (
    <g className={styles.veil}>
      {d.show && (
        <defs>
          <clipPath id={ids.body}>
            <path d={frame.bodyPath} />
          </clipPath>
          <clipPath id={ids.base}>
            <rect x={-110} y={d.baseClip.y} width={220} height={d.baseClip.height} />
          </clipPath>
          <clipPath id={ids.cloak}>
            <rect x={-110} y={d.cloakClip.y} width={220} height={d.cloakClip.height} />
          </clipPath>
          <linearGradient id={ids.glass} x1=".15" y1="0" x2=".85" y2="1">
            <stop offset="0" stopColor={VEIL_PAINT.hi} />
            <stop offset=".75" stopColor={VEIL_PAINT.veil} />
          </linearGradient>
          <linearGradient id={ids.sheen} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff" stopOpacity=".55" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      <g transform={motion.transform}>
        <g transform={d.squash}>
          <g clipPath={d.show && !d.fade ? url(ids.base) : undefined} opacity={d.baseOpacity} data-veil="base">
            <path d={frame.bodyPath} opacity={frame.bodyAlpha} fill="currentColor" />
            {eyes("var(--pebble-eye, #ffffff)")}
          </g>
          {d.show && (
            <g clipPath={d.fade ? undefined : url(ids.cloak)} opacity={d.veilOpacity} data-veil="glass">
              <path
                d={frame.bodyPath}
                opacity={frame.bodyAlpha}
                fill={d.fine ? url(ids.glass) : VEIL_PAINT.veil}
                fillOpacity={d.fillOpacity}
              />
              {d.fine && (
                <g clipPath={url(ids.body)}>
                  <ellipse cx={-26} cy={-30} rx={20} ry={9} transform="rotate(-35 -26 -30)" fill="#fff" opacity={d.highlightOpacity} />
                  {d.shimmer && (
                    <rect
                      x={-20}
                      y={-140}
                      width={40}
                      height={280}
                      fill={url(ids.sheen)}
                      opacity={d.shimmer.opacity}
                      transform={d.shimmer.transform}
                    />
                  )}
                </g>
              )}
              {eyes(VEIL_PAINT.eye)}
            </g>
          )}
          {d.show && (
            <g clipPath={url(ids.body)} data-veil="rim">
              <path d={frame.bodyPath} fill="none" stroke={VEIL_PAINT.rim} strokeWidth={d.rimWidth} opacity={d.rimOpacity} />
              {d.hem && <rect x={-110} y={d.hem.y} width={220} height={1.8} fill={VEIL_PAINT.rim} opacity={d.hem.opacity} />}
            </g>
          )}
        </g>
        {d.ping && (
          <circle
            r={66}
            fill="none"
            stroke={VEIL_PAINT.glow}
            transform={d.ping.transform}
            strokeWidth={d.ping.strokeWidth}
            opacity={d.ping.opacity}
          />
        )}
      </g>
    </g>
  );
}
