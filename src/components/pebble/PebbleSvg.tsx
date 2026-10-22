// The pebble's SVG: a pure renderer of one engine frame, ported from Pebble's Avatar.vue template (Pebble v1.0.1,
// Apache-2.0). No hooks and no state, so server components (PebbleStatic) and client components (PebbleLive) render
// the same markup. The film has its own copy (video/src/pebble/PebbleSvg.tsx); keep the two in step.
//
// Colours come from the page theme: the body is `--pebble` (light #536B54, dark #B4CDA6) and the eyes `--pebble-eye`
// (light #FFFFFF, dark #23351F), one flat colour each. The fallbacks are the light values. It is always aria-hidden:
// anything a person can do with the pebble is mirrored by a real button elsewhere.
import type { CSSProperties } from "react";
import type { BotFrame, PebbleMotion } from "@pebble/index";

const VIEWBOX = "-110 -110 220 220"; // shared/pebble VIEWBOX (kept literal so this file pulls in no engine code)
const SPARKS: readonly [number, number][] = [
  [-58, -46],
  [57, -48],
  [0, -77],
];

export interface PebbleSvgProps {
  frame: BotFrame;
  motion: PebbleMotion;
  /** a settled still frame (pins the orbit cue at −30°, as Avatar.vue does) */
  still?: boolean;
  /** width and height in px; without it the SVG fills its box (size it with CSS) */
  size?: number;
  /** written to data-pose, for tests and debugging */
  pose?: string;
  className?: string;
  style?: CSSProperties;
}

export function PebbleSvg({ frame, motion, still = false, size, pose, className, style }: PebbleSvgProps) {
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
      width={size ?? "100%"}
      height={size ?? "100%"}
      aria-hidden="true"
      focusable="false"
      className={className}
      data-pose={pose}
      data-animated={still ? "false" : "true"}
      style={{ display: "block", overflow: "visible", color: "var(--pebble, #536b54)", ...style }}
    >
      {frame.dotsBehind && dots}
      <g transform={motion.transform}>
        <path d={frame.bodyPath} opacity={frame.bodyAlpha} fill="currentColor" />
        {frame.eyes.map((e, i) => (
          <path key={i} d={e.d} transform={e.matrix} opacity={e.alpha} fill="var(--pebble-eye, #ffffff)" />
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
      {frame.notif && <circle cx={frame.notif.x} cy={frame.notif.y} r={frame.notif.r} fill="var(--accent, #506e54)" />}
    </svg>
  );
}
