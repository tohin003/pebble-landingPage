// The tech features' explainers, round 2 (REVIEW.md B2, S1, S4, S5, S6, S7; the lead's 10:15 rulings): ONE idea each,
// at most three labels (about six label words), every label landing on a beat (or an eighth after the step-up) and held
// at least 0.4 s a word. Diagrams in Pebble's style, never product screens and never look-alike controls. Every label is
// the release's own words, shortened (CLAIMS C-REEL-6, -7, -9, -11, -14, -21). No numbers.
//
// Each draws inside a box (x, y, w, h). `vertical` stacks the idea top to bottom for 9:16 (its own grid, B3). `dt` is
// frames since the hero began, `B` the beat. `pace` < 1 builds faster (the step-up's eighths).
import { FONT } from "../../fonts";
import { REEL, backOut, c01, expoOut, inOut } from "../fx/look";

const MONO = `"${FONT.mono}", ui-monospace, monospace`;
const SAGE = REEL.accent;
const CLAY = `rgb(${REEL.clay})`;
const pulse = (dt: number, at: number, tau = 7) => (dt >= at ? Math.exp(-(dt - at) / tau) : 0);

export interface ExplainerProps {
  x: number;
  y: number;
  w: number;
  h: number;
  dt: number;
  B: number;
  vertical?: boolean;
  energy?: number;
}

/** A label: Inter 700, sentence case, landing with a short rise (no long blur: the review's "dim and blur-in"). */
export const Tag: React.FC<{ text: string; x: number; y: number; size: number; dt: number; align?: "left" | "center" | "right"; color?: string }> = ({ text, x, y, size, dt, align = "center", color = REEL.ink }) => {
  if (dt < 0) return null;
  const p = expoOut(dt / 6);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(${align === "center" ? "-50%" : align === "right" ? "-100%" : "0"}, -50%) translateY(${(1 - p) * 12}px) scale(${1.12 - 0.12 * p})`,
        fontFamily: FONT.sans,
        fontWeight: 700,
        fontSize: size,
        letterSpacing: "-0.015em",
        color,
        opacity: c01((dt + 1) / 3),
        whiteSpace: "nowrap",
        textShadow: `0 0 ${size * 0.4}px rgba(${REEL.sage}, 0.35)`,
      }}
    >
      {text}
    </div>
  );
};

const Mark: React.FC<{ cx: number; cy: number; r: number; state: "empty" | "ok" | "fail" | "fixing"; p: number }> = ({ cx, cy, r, state, p }) => {
  const color = state === "fail" ? CLAY : state === "empty" ? `rgba(${REEL.sage}, 0.5)` : SAGE;
  const s = r / 26;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#0E1A12" stroke={color} strokeWidth={3.5 * s} />
      {state === "fixing" && <circle cx={cx} cy={cy} r={r * (1.2 + 0.5 * p)} fill="none" stroke={SAGE} strokeWidth={3 * s} opacity={1 - p} />}
      {state === "ok" && (
        <path d={`M ${cx - 11 * s} ${cy} l ${7 * s} ${8 * s} l ${15 * s} ${-17 * s}`} fill="none" stroke={SAGE} strokeWidth={5 * s} strokeLinecap="round" strokeLinejoin="round" transform={`translate(${cx} ${cy}) scale(${backOut(p, 2.4)}) translate(${-cx} ${-cy})`} />
      )}
      {state === "fail" && (
        <path d={`M ${cx - 10 * s} ${cy - 10 * s} l ${20 * s} ${20 * s} M ${cx + 10 * s} ${cy - 10 * s} l ${-20 * s} ${20 * s}`} fill="none" stroke={CLAY} strokeWidth={5 * s} strokeLinecap="round" transform={`translate(${cx} ${cy}) scale(${backOut(p, 2.4)}) translate(${-cx} ${-cy})`} />
      )}
    </g>
  );
};

/** A word in a rounded chip (the "done" bubble, the tool), drawn in HTML so the type is crisp. */
const Pill: React.FC<{ x: number; y: number; size: number; text: string; color?: string; glow?: number; mono?: boolean; scale?: number; opacity?: number; onRef?: never }> = ({ x, y, size, text, color = SAGE, glow = 0, mono, scale = 1, opacity = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: `translate(-50%, -50%) scale(${scale})`,
      opacity,
      padding: `${size * 0.32}px ${size * 0.62}px`,
      borderRadius: size * 0.55,
      background: "#0E1A12",
      border: `${Math.max(2, size * 0.055)}px solid ${color}`,
      boxShadow: `0 0 ${size * (0.5 + 1.1 * glow)}px ${color === CLAY ? `rgba(${REEL.clay}, ${0.35 + 0.4 * glow})` : `rgba(${REEL.sage}, ${0.35 + 0.45 * glow})`}`,
      fontFamily: mono ? MONO : FONT.sans,
      fontWeight: mono ? 500 : 800,
      fontSize: size,
      letterSpacing: mono ? 0 : "-0.03em",
      color: color === SAGE && !mono ? REEL.ink : color === CLAY ? CLAY : REEL.ink,
      whiteSpace: "nowrap",
    }}
  >
    {text}
  </div>
);

/* -------------------------------------------------------------------------------------------- AgentGuard ---- */

/**
 * AgentGuard (CHANGELOG.md@v2.0.0:183-188; C-REEL-6): Pebble's "done" waits on the evidence. The tests pass; a check of
 * the files fails (a cross); Pebble fixes the cause and the check passes; then, and only then, "verified". Never
 * "unverified" turning into "verified" (S5). The connector starts at the chip's edge (S4).
 */
export const AgentGuardExplainer: React.FC<ExplainerProps> = ({ x, y, w, h, dt, B, vertical, energy = 0 }) => {
  const u = vertical ? Math.min(w / 600, h / 760) : Math.min(w / 860, h / 470);
  const verified = dt >= 4 * B;
  const word = verified ? "verified" : "“done”";
  const chipSize = 78 * u;
  const chip = vertical ? { x: x + w / 2, y: y + 120 * u } : { x: x + 220 * u, y: y + h / 2 };
  // the chip's half width, about: the word's em width plus its padding (the connector starts at its edge)
  const half = (word.length * 0.55 + 1.24) * chipSize * 0.5;
  const rows = [
    { label: "the tests", at: 1.5 * B, fail: false },
    { label: "the files", at: 2.5 * B, fail: true, fixed: 4 * B },
  ];
  const rowAt = (i: number) => (vertical ? { x: x + w / 2 - 150 * u, y: y + 330 * u + i * 150 * u } : { x: x + 540 * u, y: y + h / 2 - 85 * u + i * 170 * u });
  const flip = pulse(dt, 4 * B, 10);
  const lineP = c01((dt - B) / 8);
  const r = 34 * u;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
        {vertical ? (
          <line x1={chip.x} y1={chip.y + chipSize * 0.75} x2={chip.x} y2={chip.y + chipSize * 0.75 + (rowAt(0).y - r - chip.y - chipSize * 0.75 - 14 * u) * lineP} stroke={SAGE} strokeWidth={3.5 * u} strokeOpacity={0.75} />
        ) : (
          <line x1={chip.x + half + 10 * u} y1={chip.y} x2={chip.x + half + 10 * u + (rowAt(0).x - r - chip.x - half - 34 * u) * lineP} y2={chip.y} stroke={SAGE} strokeWidth={3.5 * u} strokeOpacity={0.75} />
        )}
        {rows.map((row, i) => {
          if (dt < B + i * 6) return null;
          const p = rowAt(i);
          const state = dt < row.at ? "empty" : row.fail && dt < (row.fixed ?? 0) ? (dt >= (row.fixed ?? 0) - 0.5 * B ? "fixing" : "fail") : "ok";
          const since = row.fail && row.fixed !== undefined && dt >= row.fixed ? dt - row.fixed : state === "fixing" ? (dt - ((row.fixed ?? 0) - 0.5 * B)) / (0.5 * B) : dt - row.at;
          return <Mark key={i} cx={p.x} cy={p.y} r={r} state={state} p={state === "fixing" ? c01(since) : c01(since / 8)} />;
        })}
      </svg>
      {rows.map((row, i) => (
        <Tag key={i} text={row.label} x={rowAt(i).x + r + 22 * u} y={rowAt(i).y} size={56 * u} dt={dt - B - i * 6} align="left" />
      ))}
      <Pill x={chip.x} y={chip.y} size={chipSize} text={word} glow={0.4 * flip + 0.2 * energy} scale={(0.85 + 0.15 * expoOut(dt / 8)) * (1 + 0.1 * flip)} opacity={c01((dt + 1) / 4)} />
    </div>
  );
};

/* ------------------------------------------------------------------------------------------ Pebble's Workshop ---- */

/**
 * The Workshop (CHANGELOG.md@v2.0.0:141-148; C-REEL-7): the tool Pebble made, then the blind check (tests written from
 * its description alone) disagreeing, as it did in RSW-01; the real card follows (FullReel draws it on beat 3).
 */
export const WorkshopExplainer2: React.FC<ExplainerProps & { stepBack?: number }> = ({ x, y, w, h, dt, B, vertical, energy = 0, stepBack = 0 }) => {
  const u = vertical ? Math.min(w / 600, h / 620) : Math.min(w / 700, h / 470);
  const cx = x + w / 2;
  const toolY = vertical ? y + 110 * u : y + h * 0.3;
  const marksY = vertical ? y + 380 * u : y + h * 0.66;
  const ok = [true, false, true, false, false];
  const toolIn = expoOut(c01(dt / 8));
  const typed = "kiln_ramp_time".slice(0, Math.round(c01(dt / 12) * 14));
  const glow = 0.3 + 0.3 * energy + 0.5 * pulse(dt, B);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - 0.65 * stepBack, transform: `translateY(${-stepBack * 40 * u}px) scale(${1 - 0.12 * stepBack})`, transformOrigin: `${cx}px ${y}px` }}>
      <Pill x={cx} y={toolY} size={52 * u} text={`ƒ ${typed}`} mono glow={glow} scale={0.8 + 0.2 * toolIn} opacity={toolIn} />
      <Tag text="a small tool" x={cx} y={toolY - 92 * u} size={46 * u} dt={dt - 2} />
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
        {ok.map((good, i) => {
          const at = B + i * (B / 4); // the marks land on sixteenths from beat 1
          if (dt < at) return null;
          return <Mark key={i} cx={cx + (i - 2) * 92 * u} cy={marksY} r={30 * u} state={good ? "ok" : "fail"} p={c01((dt - at) / 8)} />;
        })}
      </svg>
      <Tag text="a blind check" x={cx} y={marksY + 92 * u} size={46 * u} dt={dt - B} />
    </div>
  );
};

/* ------------------------------------------------------------------------------------------ Visual answers ---- */

/**
 * Visual answers (CHANGELOG.md@v2.0.0:230-234; C-REEL-9): one idea, a reply's table becoming a chart. Bars, never figures.
 */
export const VisualExplainer: React.FC<ExplainerProps> = ({ x, y, w, h, dt, B, vertical }) => {
  const u = vertical ? Math.min(w / 600, h / 700) : Math.min(w / 680, h / 520);
  const values = [0.55, 0.92, 0.36, 0.74];
  const order = [1, 3, 0, 2];
  const sortP = inOut(c01((dt - 0.5 * B) / 10)); // sorted on the first eighth after the downbeat
  const chartP = inOut(c01((dt - 2 * B) / 12)); // a chart on beat 2
  const tw = (vertical ? 520 : 600) * u;
  const left = x + (w - tw) / 2;
  const top = y + (vertical ? 120 : 70) * u;
  const rowH = 78 * u;
  const base = top + 70 * u + 4 * rowH + 10 * u;
  const tableIn = expoOut(c01(dt / 8));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: tableIn }}>
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
        <rect x={left} y={top} width={tw} height={58 * u} rx={14 * u} fill={`rgba(${REEL.sage}, ${0.22 * (1 - chartP)})`} stroke={SAGE} strokeOpacity={0.6 * (1 - chartP)} strokeWidth={2.5 * u} />
        <rect x={left + tw * 0.45} y={top + 10 * u} width={tw * 0.4} height={38 * u} rx={10 * u} fill={`rgba(${REEL.sageCore}, ${(0.45 * pulse(dt, 0.5 * B, 12) + 0.12) * (1 - chartP)})`} />
        {values.map((v, i) => {
          const rank = order.indexOf(i);
          const yRow = top + 70 * u + (i + (rank - i) * sortP) * rowH;
          const colW = (tw - 80 * u) / 4;
          const colX = left + 40 * u + rank * colW + colW * 0.18;
          const colH = v * (vertical ? 330 : 300) * u;
          const bx = (left + tw * 0.45) * (1 - chartP) + colX * chartP;
          const by = (yRow + 24 * u) * (1 - chartP) + (base - colH) * chartP;
          const bw = v * tw * 0.42 * (1 - chartP) + colW * 0.64 * chartP;
          const bh = 26 * u * (1 - chartP) + colH * chartP;
          return (
            <g key={i}>
              <rect x={left} y={yRow} width={tw} height={rowH - 8 * u} rx={12 * u} fill={`rgba(${REEL.sage}, ${0.08 * (1 - chartP)})`} />
              <rect x={left + 26 * u} y={yRow + 28 * u} width={tw * 0.26} height={16 * u} rx={8 * u} fill={`rgba(232, 238, 230, ${0.4 * (1 - chartP)})`} />
              <rect x={bx} y={by} width={bw} height={bh} rx={10 * u} fill={i === 1 ? SAGE : `rgba(${REEL.sage}, 0.78)`} />
            </g>
          );
        })}
        <line x1={left + 20 * u} y1={base + 4 * u} x2={left + tw - 20 * u} y2={base + 4 * u} stroke={SAGE} strokeWidth={3 * u} strokeOpacity={chartP} />
      </svg>
      <Tag text="a table" x={left} y={top - 50 * u} size={46 * u} dt={dt - 3} align="left" color={REEL.inkSoft} />
      <Tag text="becomes a chart" x={left + tw / 2} y={base + 70 * u} size={52 * u} dt={dt - 2 * B} />
    </div>
  );
};

/* ------------------------------------------------------------------------------------------------ Long tasks ---- */

/**
 * Long tasks (README.md@v2.0.0:445; CHANGELOG.md@v1.4.0:16-17; C-REEL-14, C-REEL-21): older tool results fold into a
 * sealed block, and one sealed block reopens to its full result: returned exactly. Never the name D55 keeps unnamed,
 * and no saving, cost or speed claim.
 */
export const LongTasksExplainer: React.FC<ExplainerProps> = ({ x, y, w, h, dt, B, vertical }) => {
  const u = vertical ? Math.min(w / 600, h / 700) : Math.min(w / 760, h / 520);
  const tile = 60 * u;
  const gap = 12 * u;
  const step = tile + gap;
  const count = vertical ? 7 : 9;
  const rowW = count * step;
  // (landscape: the row starts at the returned card's left edge, so what stays after the seal sits centred over it)
  const left = vertical ? x + (w - rowW) / 2 : x + (w - 600 * u) / 2;
  const tapeY = y + (vertical ? 220 : h * 0.36);
  const rate = B / 4;
  const sealAt = 1.5 * B;
  const openAt = 3 * B;
  const arrived = dt < 0 ? 0 : Math.min(count, Math.floor(dt / rate) + 1);
  const fold = inOut(c01((dt - sealAt) / 10));
  const open = inOut(c01((dt - openAt) / 12));
  const blockW = 190 * u;
  const n0 = vertical ? 4 : 5; // the older results that seal
  const els: React.ReactNode[] = [];
  let cur = left;
  if (dt >= sealAt) {
    const bw = blockW * fold + (n0 * step - gap) * (1 - fold);
    els.push(
      <div
        key="seal"
        style={{
          position: "absolute",
          left: cur,
          top: tapeY - tile * 0.6,
          width: bw,
          height: tile * 1.2,
          borderRadius: 14 * u,
          background: "linear-gradient(180deg, #2A4A32, #16281B)",
          border: `${3 * u}px solid ${SAGE}`,
          boxShadow: `0 0 ${(12 + 36 * pulse(dt, sealAt, 9) + 36 * pulse(dt, openAt, 9)) * u}px rgba(${REEL.sage}, 0.6)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontFamily: FONT.sans, fontWeight: 700, fontSize: 40 * u, color: REEL.ink, opacity: c01((dt - sealAt - 6) / 4), letterSpacing: "-0.01em" }}>sealed</div>
      </div>,
    );
    cur += bw + gap;
  }
  const from = dt >= sealAt ? n0 : 0;
  for (let i = from; i < arrived; i++) {
    const p = expoOut(c01((dt - i * rate) / 6));
    els.push(<div key={i} style={{ position: "absolute", left: cur + (1 - p) * 100 * u, top: tapeY - tile / 2, width: tile, height: tile, borderRadius: 10 * u, background: `rgba(${REEL.sage}, ${0.42 + 0.14 * ((i * 7) % 3)})`, border: `${2.5 * u}px solid ${SAGE}`, opacity: p }} />);
    cur += step;
  }
  // the sealed block reopens to its full result, below the tape
  const card = { w: (vertical ? 520 : 600) * u, h: 190 * u };
  const cardX = left + (vertical ? (rowW - card.w) / 2 : 0);
  const cardY = tapeY + tile + 50 * u;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: expoOut(c01(dt / 8)) }}>
      {els}
      {dt >= openAt && (
        <div
          style={{
            position: "absolute",
            left: cardX,
            top: cardY,
            width: card.w,
            height: card.h * open,
            overflow: "hidden",
            borderRadius: 16 * u,
            background: "#101C14",
            border: `${3 * u}px solid ${SAGE}`,
            boxShadow: `0 ${12 * u}px ${30 * u}px rgba(${REEL.shadeRgb}, 0.7)`,
            padding: `${22 * u}px ${26 * u}px`,
            boxSizing: "border-box",
          }}
        >
          {[0.86, 0.72, 0.9, 0.6].map((wf, i) => (
            <div key={i} style={{ height: 16 * u, width: `${wf * 100}%`, borderRadius: 8 * u, background: `rgba(232, 238, 230, ${0.5 - i * 0.07})`, marginBottom: 20 * u }} />
          ))}
        </div>
      )}
      {/* the link from the block to what it returned */}
      {dt >= openAt && <div style={{ position: "absolute", left: left + blockW / 2 - 2 * u, top: tapeY + tile * 0.6, width: 4 * u, height: (cardY - tapeY - tile * 0.6) * open, background: SAGE, opacity: 0.8 }} />}
      <Tag text="older tool results" x={left} y={tapeY - tile - 40 * u} size={46 * u} dt={dt - 0.5 * B} align="left" color={REEL.inkSoft} />
      <Tag text="returned exactly" x={cardX + card.w / 2} y={cardY + card.h + 56 * u} size={52 * u} dt={dt - openAt - 4} />
    </div>
  );
};

/* ------------------------------------------------------------------------------------------- Pebble Remote ---- */

/**
 * Pebble Remote (CHANGELOG.md@v2.0.0:213-218; pebble-remote README.md:3-4; C-REEL-11): the iPhone and the Mac linked
 * over Tailscale or your Wi-Fi, and an approval with Face ID. Outlines only: no drawn app screen. Inside title-safe (S6).
 */
export const RemoteExplainer: React.FC<ExplainerProps> = ({ x, y, w, h, dt, B, vertical, energy = 0 }) => {
  const u = vertical ? Math.min(w / 600, h / 690) : Math.min(w / 760, h / 520);
  // 9:16: phone, its Face ID line, the link, the Mac, the link's line; 16:9: phone left, Mac right, the link between
  const phone = vertical ? { x: x + w / 2, y: y + 125 * u, w: 125 * u, h: 240 * u } : { x: x + 140 * u, y: y + h * 0.44, w: 160 * u, h: 300 * u };
  const mac = vertical ? { x: x + w / 2, y: y + 510 * u, w: 260 * u, h: 150 * u } : { x: x + w - 190 * u, y: y + h * 0.44, w: 280 * u, h: 170 * u };
  const faceLabel = vertical ? { x: phone.x + 32 * u, y: phone.y + phone.h / 2 + 56 * u, align: "center" as const } : { x: phone.x - phone.w / 2 + 70 * u, y: phone.y + phone.h / 2 + 64 * u, align: "left" as const };
  // (16:9: above the Mac: between the devices it overlapped their outlines)
  const linkLabel = vertical ? { x: mac.x, y: mac.y + mac.h / 2 + 64 * u } : { x: mac.x, y: mac.y - mac.h / 2 - 54 * u };
  const link = c01((dt - 0.5 * B) / 10);
  const a = vertical ? { x: phone.x, y: faceLabel.y + 46 * u } : { x: phone.x + phone.w / 2 + 16 * u, y: phone.y };
  const b = vertical ? { x: mac.x, y: mac.y - mac.h / 2 - 16 * u } : { x: mac.x - mac.w / 2 - 16 * u, y: mac.y };
  const dots = Array.from({ length: 5 }, (_, i) => {
    const p = ((dt / 28 + i / 5) % 1 + 1) % 1;
    return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, o: link * Math.sin(p * Math.PI) };
  });
  const faceAt = 1.5 * B;
  const fp = backOut(c01((dt - faceAt) / 9), 2);
  const glow = 0.35 + 0.3 * energy + 0.6 * pulse(dt, faceAt, 10);
  // the Face ID glyph sits beside its line, outside the phone (never a drawn screen)
  const textW = 20 * 0.56 * 46 * u;
  const fid = vertical ? { x: faceLabel.x - textW / 2 - 40 * u, y: faceLabel.y } : { x: faceLabel.x - 40 * u, y: faceLabel.y };
  return (
    <div style={{ position: "absolute", inset: 0, opacity: expoOut(c01(dt / 8)) }}>
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
        <rect x={phone.x - phone.w / 2} y={phone.y - phone.h / 2} width={phone.w} height={phone.h} rx={30 * u} fill="#0B140E" stroke={SAGE} strokeWidth={4 * u} style={{ filter: `drop-shadow(0 0 ${14 * u}px rgba(${REEL.sage}, ${glow}))` }} />
        <rect x={phone.x - 26 * u} y={phone.y - phone.h / 2 + 14 * u} width={52 * u} height={12 * u} rx={6 * u} fill={`rgba(${REEL.sage}, 0.6)`} />
        <rect x={mac.x - mac.w / 2} y={mac.y - mac.h / 2} width={mac.w} height={mac.h} rx={16 * u} fill="#0B140E" stroke={SAGE} strokeWidth={4 * u} style={{ filter: `drop-shadow(0 0 ${14 * u}px rgba(${REEL.sage}, ${glow}))` }} />
        <path d={`M ${mac.x - mac.w * 0.6} ${mac.y + mac.h / 2 + 12 * u} L ${mac.x + mac.w * 0.6} ${mac.y + mac.h / 2 + 12 * u}`} stroke={SAGE} strokeWidth={6 * u} strokeLinecap="round" />
        <line x1={a.x} y1={a.y} x2={a.x + (b.x - a.x) * link} y2={a.y + (b.y - a.y) * link} stroke={SAGE} strokeWidth={3.5 * u} strokeDasharray={`${12 * u} ${10 * u}`} />
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={7 * u} fill={`rgba(${REEL.sageCore}, ${d.o})`} />
        ))}
        {fp > 0 && (
          <g transform={`translate(${fid.x} ${fid.y}) scale(${fp * 0.8})`} stroke={SAGE} strokeWidth={4 * u} fill="none" strokeLinecap="round">
            <path d={`M ${-30 * u} ${-12 * u} v ${-18 * u} h ${18 * u} M ${12 * u} ${-30 * u} h ${18 * u} v ${18 * u} M ${30 * u} ${12 * u} v ${18 * u} h ${-18 * u} M ${-12 * u} ${30 * u} h ${-18 * u} v ${-18 * u}`} />
            <path d={`M ${-9 * u} ${-6 * u} v ${7 * u} M ${9 * u} ${-6 * u} v ${7 * u} M ${-9 * u} ${12 * u} q ${9 * u} ${7 * u} ${18 * u} 0`} />
          </g>
        )}
      </svg>
      <Tag text="Wi-Fi or Tailscale" x={linkLabel.x} y={linkLabel.y} size={42 * u} dt={dt - 0.5 * B - 4} color={REEL.inkSoft} />
      <Tag text="approve with Face ID" x={faceLabel.x} y={faceLabel.y} size={46 * u} dt={dt - faceAt} align={faceLabel.align} />
    </div>
  );
};
