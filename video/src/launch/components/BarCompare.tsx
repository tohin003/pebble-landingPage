// <BarCompare>: the benchmark's bars (TREATMENT §3 "The numbers", §5): a row per product, each with its name, its
// count ("235 of 255"), its value counting up in Geist Mono tabular figures (the number is the biggest thing in the
// chart), and a bar on a full-length track that starts at zero (never a cut axis). Pebble's bar is the world's accent
// (sage at night, deep sage in daylight), the rival's mute grey; no rival logos. Rows count up one after the other
// (never every number at once), each over the same time. `lowerIsBetter` prints "Lower is better." above the rows.
// Every number must be the published one, exactly.
//
//   <BarCompare at={0.4} unit="%" decimals={1} max={100} note="Both on claude-opus-5-5"
//     rows={[{ name: "Pebble", value: 92.2, detail: "235 of 255", ours: true },
//            { name: "Claude Code", value: 83.5, detail: "213 of 255" }]} />
import { useCurrentFrame, useVideoConfig } from "remotion";
import { useLayout, type Rect } from "../layout";
import { DUR, EASE, RGB, TYPE } from "../tokens";
import { useWorld } from "../world";

export interface BarRow {
  name: string;
  value: number;
  /** the count behind a rate, e.g. "235 of 255" */
  detail?: string;
  /** Pebble's row: the accent */
  ours?: boolean;
}

export interface BarCompareProps {
  rows: readonly BarRow[];
  /** a unit after the number ("%") */
  unit?: string;
  /** a unit before it ("$") */
  prefix?: string;
  decimals?: number;
  /** the value of a full track (default 100 with "%", else 1.25 × the largest value) */
  max?: number;
  lowerIsBetter?: boolean;
  /** a mono line above the rows ("Both on claude-opus-5-5") */
  note?: string;
  /** count-up start and length, seconds */
  at?: number;
  dur?: number;
  exitAt?: number;
  /** the chart's box (default: the layout's chart box) */
  box?: Rect;
  /** a light passing along Pebble's bar once it lands */
  sweep?: boolean;
  /** each row starts this long after the one above */
  rowStagger?: number;
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

export const BarCompare: React.FC<BarCompareProps> = ({
  rows,
  unit,
  prefix,
  decimals = 1,
  max,
  lowerIsBetter = false,
  note,
  at = 0,
  dur = DUR.count,
  exitAt,
  box,
  sweep = true,
  rowStagger = 0.22,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const W = useWorld();
  const t = frame / fps;
  const b = box ?? L.chart;
  const u = L.u;
  const full = max ?? (unit === "%" ? 100 : 1.25 * Math.max(...rows.map((r) => r.value)));

  const portrait = L.portrait;
  // the number is the biggest thing in the chart; names stay phone-legible (56 px on 16:9, 42 on 4:5)
  const nameSize = (portrait ? 44 : 56) * u;
  const valueSize = (portrait ? 100 : 124) * u;
  const detailSize = (portrait ? 26 : 30) * u;
  const barH = (portrait ? 30 : 34) * u;
  const gapHead = (portrait ? 14 : 16) * u; // between a row's line and its bar
  const noteSize = (portrait ? 26 : 32) * u;
  const headTop = note || lowerIsBetter ? noteSize * 2.4 : 0;
  const rowH = valueSize + gapHead + barH;
  // rows stay together (a chart, not a list spread over the box)
  const rowGap = Math.min((portrait ? 104 : 64) * u, Math.max(28 * u, (b.h - headTop - rows.length * rowH) / Math.max(1, rows.length - 1)));

  const pin = Math.max(0, Math.min(1, (t - at) / 0.35));
  const countAt = (i: number) => at + 0.1 + i * rowStagger;
  const pcOf = (i: number) => EASE.count(Math.max(0, Math.min(1, (t - countAt(i)) / dur)));
  const pex = exitAt === undefined ? 0 : EASE.exit(Math.max(0, Math.min(1, (t - exitAt) / DUR.exit)));
  if (pin <= 0 || pex >= 1) return null;
  const highlight = W.dark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.16)";

  return (
    <div
      style={{
        position: "absolute",
        left: b.x,
        top: b.y,
        width: b.w,
        height: b.h,
        opacity: EASE.enter(pin) * (1 - pex),
        transform: `translateY(${((1 - EASE.enter(pin)) * 24 * u - pex * 18 * u).toFixed(2)}px)`,
      }}
    >
      {(note || lowerIsBetter) && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: b.w,
            display: "flex",
            justifyContent: "space-between",
            fontFamily: TYPE.mono.fontFamily,
            fontWeight: 500,
            fontSize: noteSize,
            color: W.small,
          }}
        >
          <span>{note ?? ""}</span>
          <span>{lowerIsBetter ? "Lower is better." : ""}</span>
        </div>
      )}
      {rows.map((row, i) => {
        const top = headTop + i * (rowH + rowGap);
        const pc = pcOf(i);
        // the light passes once, 0.5 s, as the bar settles
        const sw = sweep ? Math.max(0, Math.min(1, (t - (countAt(i) + dur * 0.8)) / 0.5)) : 0;
        const shown = row.value * pc;
        const frac = Math.max(0, Math.min(1, (row.value / full) * pc));
        const ours = !!row.ours;
        const fill = ours ? W.accent : W.rival;
        const valueInk = ours ? W.accent : W.rivalInk;
        return (
          <div key={row.name} style={{ position: "absolute", left: 0, top, width: b.w, height: rowH }}>
            {/* the row's line: name and count on the left, the value on the right */}
            <div style={{ position: "absolute", left: 0, top: 0, width: b.w, height: valueSize, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 24 * u, minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: TYPE.headline.fontFamily,
                    fontVariationSettings: TYPE.headline.fontVariationSettings,
                    fontWeight: 650,
                    fontSize: nameSize,
                    letterSpacing: "-0.025em",
                    color: ours ? W.ink : W.rivalInk,
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.name}
                </span>
                {row.detail && (
                  <span style={{ fontFamily: TYPE.mono.fontFamily, fontWeight: 500, fontVariantNumeric: "tabular-nums", fontSize: detailSize, color: W.small, whiteSpace: "nowrap" }}>
                    {row.detail}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontFamily: TYPE.mono.fontFamily,
                  fontWeight: 500,
                  fontVariantNumeric: "tabular-nums",
                  fontSize: valueSize,
                  lineHeight: 1,
                  letterSpacing: "-0.04em",
                  color: valueInk,
                  whiteSpace: "nowrap",
                }}
              >
                {prefix ? <span style={{ fontSize: "0.7em", marginRight: "0.04em" }}>{prefix}</span> : null}
                <Num value={shown} decimals={decimals} />
                {unit ? <span style={{ fontSize: "0.56em", marginLeft: "0.16em", color: ours ? W.accent : W.small }}>{unit}</span> : null}
              </span>
            </div>
            {/* the track (the full scale) and the bar, from zero */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: valueSize + gapHead,
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
                  background: ours ? `linear-gradient(180deg, ${highlight}, rgba(255,255,255,0) 55%), ${fill}` : fill,
                  opacity: ours ? 1 : W.dark ? 0.8 : 0.9,
                  boxShadow: ours && W.dark ? `0 0 ${18 * u}px rgba(${RGB.sage}, 0.25)` : undefined,
                }}
              >
                {ours && sw > 0 && sw < 1 && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: barH * 0.3,
                      background: `linear-gradient(100deg, rgba(255,255,255,0) ${(sw * 130 - 30).toFixed(1)}%, rgba(255,255,255,${W.dark ? 0.32 : 0.4}) ${(sw * 130 - 15).toFixed(1)}%, rgba(255,255,255,0) ${(sw * 130).toFixed(1)}%)`,
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
