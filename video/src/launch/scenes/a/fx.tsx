// Scene group A's type wrappers (owned by the group's worker; not part of the motion system).
import type { ReactNode } from "react";
import { EASE } from "../../tokens";

/**
 * Type leaving (REVIEW-1 M2): an accelerating exit of `dur` s (0.15–0.2) that rises a little and blurs, after which
 * nothing is drawn, so the next line can start 2 frames later on a clean frame. Wrap a Headline that has no exitAt.
 */
export const ExitWrap: React.FC<{ at: number; t: number; dur?: number; rise?: number; children: ReactNode }> = ({ at, t, dur = 0.17, rise = 0, children }) => {
  if (t >= at + dur) return null;
  const p = t <= at ? 0 : EASE.exit(Math.min(1, (t - at) / dur));
  if (p <= 0) return <>{children}</>;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: 1 - p,
        transform: rise ? `translateY(${(-rise * p).toFixed(2)}px)` : undefined,
        filter: `blur(${(5 * p).toFixed(2)}px)`,
      }}
    >
      {children}
    </div>
  );
};

/**
 * A line set ON a hit (a 0-frame set: fully there on the hit's frame), settling from 3 % larger and a 3 px blur in
 * 0.12 s. Wrap a Headline whose `at` is −1 (already landed); this draws it from `at`.
 */
export const HitSet: React.FC<{ at: number; t: number; u: number; origin: string; children: ReactNode }> = ({ at, t, u, origin, children }) => {
  if (t < at) return null;
  const p = EASE.enter(Math.min(1, (t - at) / 0.12));
  if (p >= 1) return <>{children}</>;
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${(1.03 - 0.03 * p).toFixed(5)})`, transformOrigin: origin, filter: `blur(${(3 * u * (1 - p)).toFixed(2)}px)` }}>
      {children}
    </div>
  );
};
