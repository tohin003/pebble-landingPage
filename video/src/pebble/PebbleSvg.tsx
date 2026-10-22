// The pebble's SVG for the films: a port of Pebble's Avatar.vue template (Pebble v1.0.1, Apache-2.0), drawing one
// engine frame. The site has its own copy (src/components/pebble/PebbleSvg.tsx) so the two projects never share a
// React; keep the two in step. Colours are explicit here (the film has no CSS theme): the light palette by default.
import type { CSSProperties } from "react";
import type { BotFrame, PebbleMotion } from "../../../shared/pebble";
import { VIEWBOX } from "../../../shared/pebble";
import { COLOR } from "../motion/spec";

export const PEBBLE_LIGHT = { body: COLOR.pebble, eye: COLOR.eye, accent: COLOR.accent } as const;
export const PEBBLE_DARK = { body: COLOR.darkPebble, eye: "#23351f", accent: COLOR.darkAccent } as const;
export type PebbleColors = { body: string; eye: string; accent: string };

const SPARKS: readonly [number, number][] = [
  [-58, -46],
  [57, -48],
  [0, -77],
];

export const PebbleSvg: React.FC<{
  frame: BotFrame;
  motion: PebbleMotion;
  /** a settled still frame (pins the orbit cue at −30°, as Avatar.vue does) */
  still?: boolean;
  /** rendered width and height of the 220-unit viewBox, in px */
  size: number;
  colors?: PebbleColors;
  style?: CSSProperties;
}> = ({ frame, motion, still = false, size, colors = PEBBLE_LIGHT, style }) => {
  const p = motion.pulse;
  const dots =
    frame.dots.length > 0 ? (
      <g>
        {frame.dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} opacity={d.opacity} fill="currentColor" />
        ))}
      </g>
    ) : null;
  return (
    <svg
      viewBox={VIEWBOX}
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", overflow: "visible", color: colors.body, ...style }}
    >
      {frame.dotsBehind && dots}
      <g transform={motion.transform}>
        <path d={frame.bodyPath} opacity={frame.bodyAlpha} fill="currentColor" />
        {frame.eyes.map((e, i) => (
          <path key={i} d={e.d} transform={e.matrix} opacity={e.alpha} fill={colors.eye} />
        ))}
      </g>
      {motion.cue ? (
        <g fill="currentColor" stroke="currentColor" strokeLinecap="round">
          {motion.cue === "thought" &&
            [1, 2, 3].map((i) => (
              <circle key={i} cx={-18 + i * 10} cy={-76} r={2.5 + p[i - 1]!} opacity={0.35 + 0.65 * p[i - 1]!} stroke="none" />
            ))}
          {motion.cue === "orbit" && (
            <g transform={`rotate(${still ? -30 : motion.t * 85})`}>
              {[1, 2, 3].map((i) => (
                <circle
                  key={i}
                  cx={76 * Math.cos(i * 2.094)}
                  cy={76 * Math.sin(i * 2.094)}
                  r={4 - i * 0.6}
                  opacity={1 - i * 0.2}
                  stroke="none"
                />
              ))}
            </g>
          )}
          {motion.cue === "scan" && (
            <path d={`M -28 ${-76 + (p[0]! - 0.5) * 6} h 56`} fill="none" strokeWidth={3} strokeDasharray="18 6 6 6" opacity={0.65} />
          )}
          {(motion.cue === "spark" || motion.cue === "celebrate") && (
            <g fill="none" strokeWidth={2.8}>
              {SPARKS.map(([x, y], i) => (
                <path
                  key={i}
                  transform={`translate(${x} ${y}) rotate(${(p[i]! - 0.5) * 40}) scale(${0.75 + 0.25 * p[i]!})`}
                  d="M -5 0 H 5 M 0 -5 V 5"
                />
              ))}
            </g>
          )}
          {motion.cue === "attention" && <path d="M 0 -81 V -73 M 0 -67 V -66" fill="none" strokeWidth={3.5} />}
          {motion.cue === "sleep" && (
            <path d="M 39 -65 h 9 l -9 9 h 9 M 52 -77 h 7 l -7 7 h 7" fill="none" strokeWidth={2.5} opacity={0.4 + 0.4 * p[0]!} />
          )}
          {motion.cue === "sigh" && <path d="M -54 -43 q -5 8 0 12 q 5 -4 0 -12" stroke="none" opacity={0.6} />}
        </g>
      ) : null}
      {!frame.dotsBehind && dots}
      {frame.notif && <circle cx={frame.notif.x} cy={frame.notif.y} r={frame.notif.r} fill={colors.accent} />}
    </svg>
  );
};
