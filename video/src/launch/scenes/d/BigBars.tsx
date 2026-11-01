// S10's chart: a scene-local fork of the motion system's <BarCompare> (components/BarCompare.tsx), sized for the
// director's review r2: Pebble's value bigger than the rival's (≥ 96 px against ≥ 72 px in 16:9), a ≥ 36 px header
// naming the comparison, thicker bars. Everything else as BarCompare: a row per product, its name and count, its value
// counting up in Geist Mono tabular figures, a bar on a full-length track from zero (never a cut axis), Pebble's bar in
// the world's accent and the rival's in mute grey, no logos, rows counting one after the other. The count-up timing is
// BarCompare's own (rows start `at + 0.1 + i × rowStagger`, EASE.count over `dur`), so common.countTicks() matches it.
// Every number must be the published one, exactly.
import { useLayout, type Rect } from "../../layout";
import { DUR, EASE, TYPE } from "../../tokens";
import { useWorld } from "../../world";
import type { BarRow } from "../../components/BarCompare";
import { clamp01, useT } from "./common";

export interface BigBarSizes {
  header: number;
  oursName: number;
  rivalName: number;
  oursValue: number;
  rivalValue: number;
  detail: number;
  oursBar: number;
  rivalBar: number;
  /** between the header and the first row, and between the rows */
  headGap: number;
  rowGap: number;
}

/** A number in Geist Mono with its decimal point drawn narrow (a monospace "." is a full cell wide). */
const Num: React.FC<{ value: number; decimals: number }> = ({ value, decimals }) => {
  const [int, frac] = value.toFixed(decimals).split(".");
  return (
    <>
      {int}
      {frac !== undefined && (
        <>
          <span style={{ margin: "0 -0.2em" }}>.</span>
          {frac}
        </>
      )}
    </>
  );
};

export const BigBars: React.FC<{
  rows: readonly BarRow[];
  unit?: string;
  prefix?: string;
  decimals: number;
  max: number;
  header: string;
  at: number;
  dur: number;
  exitAt?: number;
  box: Rect;
  sizes: BigBarSizes;
  /** arrive on the frame (a hit with a small punch) instead of rising in */
  slam?: boolean;
  rowStagger?: number;
}> = ({ rows, unit, prefix, decimals, max, header, at, dur, exitAt, box: b, sizes: z, slam = false, rowStagger = 0.22 }) => {
  const t = useT();
  const L = useLayout();
  const W = useWorld();
  const u = L.u;
  const pin = slam ? (t >= at ? 1 : 0) : EASE.enter(clamp01((t - at) / 0.35));
  const punch = slam ? 1 + 0.05 * (1 - EASE.enter(clamp01((t - at) / 0.28))) : 1;
  const pex = exitAt === undefined ? 0 : EASE.exit(clamp01((t - exitAt) / DUR.exit));
  if (pin <= 0 || pex >= 1) return null;
  const countAt = (i: number) => at + 0.1 + i * rowStagger;
  const headH = z.header * 1.25;
  const highlight = "rgba(255,255,255,0.18)";
  let y = headH + z.headGap;
  const tops = rows.map((r) => {
    const top = y;
    y += (r.ours ? z.oursValue + z.oursBar : z.rivalValue + z.rivalBar) + 16 * u + z.rowGap;
    return top;
  });

  return (
    <div
      style={{
        position: "absolute",
        left: b.x,
        top: b.y,
        width: b.w,
        height: b.h,
        opacity: pin * (1 - pex),
        transform: `translateY(${((1 - pin) * 24 * u - pex * 18 * u).toFixed(2)}px) scale(${punch.toFixed(4)})`,
        transformOrigin: "50% 40%",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: b.w,
          fontFamily: TYPE.support.fontFamily,
          fontVariationSettings: TYPE.support.fontVariationSettings,
          fontWeight: 520,
          fontSize: z.header,
          lineHeight: 1.25,
          letterSpacing: "-0.01em",
          color: W.ink2,
          whiteSpace: "nowrap",
        }}
      >
        {header}
      </div>
      {rows.map((row, i) => {
        const ours = !!row.ours;
        const valueSize = ours ? z.oursValue : z.rivalValue;
        const barH = ours ? z.oursBar : z.rivalBar;
        const pc = EASE.count(clamp01((t - countAt(i)) / dur));
        const sw = clamp01((t - (countAt(i) + dur * 0.8)) / 0.5);
        const frac = clamp01((row.value / max) * pc);
        return (
          <div key={row.name} style={{ position: "absolute", left: 0, top: tops[i], width: b.w, height: valueSize + 16 * u + barH }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: b.w, height: valueSize, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 20 * u, minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: TYPE.headline.fontFamily,
                    fontVariationSettings: TYPE.headline.fontVariationSettings,
                    fontWeight: 650,
                    fontSize: ours ? z.oursName : z.rivalName,
                    letterSpacing: "-0.025em",
                    color: ours ? W.ink : W.rivalInk,
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.name}
                </span>
                {row.detail && (
                  <span style={{ fontFamily: TYPE.mono.fontFamily, fontWeight: 500, fontVariantNumeric: "tabular-nums", fontSize: z.detail, color: W.small, whiteSpace: "nowrap" }}>
                    {row.detail}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontFamily: TYPE.mono.fontFamily,
                  fontWeight: ours ? 560 : 500,
                  fontVariantNumeric: "tabular-nums",
                  fontSize: valueSize,
                  lineHeight: 1,
                  letterSpacing: "-0.045em",
                  color: ours ? W.accent : W.rivalInk,
                  whiteSpace: "nowrap",
                }}
              >
                {prefix ? <span style={{ fontSize: "0.68em", marginRight: "0.04em" }}>{prefix}</span> : null}
                <Num value={row.value * pc} decimals={decimals} />
                {unit ? <span style={{ fontSize: "0.52em", marginLeft: "0.14em", color: ours ? W.accent : W.small }}>{unit}</span> : null}
              </span>
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: valueSize + 16 * u,
                width: b.w,
                height: barH,
                borderRadius: barH * 0.3,
                background: W.track,
                boxShadow: `inset 0 0 0 ${Math.max(1, u)}px ${W.line}`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: barH,
                  width: b.w * frac,
                  borderRadius: barH * 0.3,
                  background: ours ? `linear-gradient(180deg, ${highlight}, rgba(255,255,255,0) 55%), ${W.accent}` : W.rival,
                  opacity: ours ? 1 : 0.9,
                }}
              >
                {ours && sw > 0 && sw < 1 && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: barH * 0.3,
                      background: `linear-gradient(100deg, rgba(255,255,255,0) ${(sw * 130 - 30).toFixed(1)}%, rgba(255,255,255,0.4) ${(sw * 130 - 15).toFixed(1)}%, rgba(255,255,255,0) ${(sw * 130).toFixed(1)}%)`,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
