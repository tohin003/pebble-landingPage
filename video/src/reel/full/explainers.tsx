// The tech features' explainers (the person, 03:15: "highlight … the features which are internal … using additional
// generated animation"). Diagrams in Pebble's style, never product screens: sage strokes on the dark ground, Inter for
// labels, Geist Mono for names, checks and marks that land on the beat. Every label is the release's or the page's own
// words, shortened, never invented (the source is beside each). No numbers anywhere.
//
// Each explainer draws inside a box (x, y, w, h) at the unit u = min(w / 980, h / 560); `dt` is frames since its hero
// beat began, `B` the beat (27 frames). Stages land on beats.
import { FONT } from "../../fonts";
import { Label } from "../fx/WorkshopExplainer";
import { REEL, backOut, c01, expoOut, inOut } from "../fx/look";

const MONO = `"${FONT.mono}", ui-monospace, monospace`;
const SAGE = REEL.accent;
const CLAY = `rgb(${REEL.clay})`;
const unit = (w: number, h: number) => Math.min(w / 980, h / 560);
const pulse = (dt: number, at: number, tau = 7) => (dt >= at ? Math.exp(-(dt - at) / tau) : 0);

const Check: React.FC<{ x: number; y: number; s: number; color?: string }> = ({ x, y, s, color = SAGE }) => (
  <path d={`M ${x - 9 * s} ${y} l ${6 * s} ${7 * s} l ${12 * s} ${-14 * s}`} fill="none" stroke={color} strokeWidth={3.5 * s} strokeLinecap="round" strokeLinejoin="round" />
);

/** A rounded chip with text, drawn in HTML so the type renders crisply. */
const Chip: React.FC<{ x: number; y: number; text: string; u: number; p: number; mono?: boolean; color?: string; fill?: string; size?: number; glow?: number }> = ({ x, y, text, u, p, mono, color = REEL.ink, fill = "#0E1A12", size = 30, glow = 0 }) =>
  p <= 0 ? null : (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${0.7 + 0.3 * backOut(c01(p), 1.8)})`,
        opacity: c01(p * 1.6),
        padding: `${12 * u}px ${24 * u}px`,
        borderRadius: 999,
        background: fill,
        border: `${2.5 * u}px solid ${color === REEL.ink ? SAGE : color}`,
        boxShadow: `0 0 ${(14 + 26 * glow) * u}px rgba(${REEL.sage}, ${0.25 + 0.45 * glow})`,
        fontFamily: mono ? MONO : FONT.sans,
        fontWeight: mono ? 500 : 600,
        fontSize: size * u,
        letterSpacing: mono ? 0 : "-0.01em",
        color,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );

/* -------------------------------------------------------------------------------------------- AgentGuard ---- */

/**
 * AgentGuard (CHANGELOG.md@v2.0.0:183-190; C-200-7, C-200-20; the page's "Evidence before “done”." C-AG-5): Pebble's
 * "done" waits while AgentGuard checks the evidence: the tests, the files, what you asked for. One can't be confirmed,
 * so the word becomes "unverified" (the release's own word); Pebble fixes the cause, the check passes, and it reads
 * "verified" (the work view's Verified row).
 */
export const AgentGuardExplainer: React.FC<{ x: number; y: number; w: number; h: number; dt: number; B: number; energy?: number }> = ({ x, y, w, h, dt, B, energy = 0 }) => {
  const u = unit(w, h);
  const cx = x + w / 2;
  const cy = y + h * 0.48;
  const rows = [
    { label: "the tests", at: 1.45 * B, ok: true },
    { label: "the files", at: 1.75 * B, ok: true },
    { label: "what you asked for", at: 2.1 * B, ok: false, fixed: 4 * B },
  ];
  const state = dt < 3 * B ? "done" : dt < 4 * B ? "unverified" : "verified";
  const stateColor = state === "unverified" ? CLAY : SAGE;
  const word = state === "done" ? "“done”" : state;
  const bubbleIn = expoOut(c01(dt / 10));
  const scan = c01((dt - 1.3 * B) / (1.1 * B)); // the check's beam moving down the evidence
  const rowX = cx + 120 * u;
  const rowY = (i: number) => cy - 120 * u + i * 110 * u;
  const flip = pulse(dt, 3 * B, 8) + pulse(dt, 4 * B, 10);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* Pebble's word, held until the evidence is in */}
      <div
        style={{
          position: "absolute",
          left: cx - 300 * u,
          top: cy,
          transform: `translate(-50%, -50%) scale(${(0.8 + 0.2 * bubbleIn) * (1 + 0.08 * flip)})`,
          opacity: bubbleIn,
          padding: `${22 * u}px ${36 * u}px`,
          borderRadius: 28 * u,
          background: "#0E1A12",
          border: `${3 * u}px solid ${stateColor}`,
          boxShadow: `0 0 ${(20 + 40 * flip + 20 * energy) * u}px ${state === "unverified" ? `rgba(${REEL.clay}, 0.5)` : `rgba(${REEL.sage}, 0.55)`}`,
          fontFamily: FONT.sans,
          fontWeight: 800,
          fontSize: 54 * u,
          letterSpacing: "-0.03em",
          color: state === "done" ? REEL.ink : stateColor,
          whiteSpace: "nowrap",
        }}
      >
        {word}
      </div>
      <Label text="AgentGuard checks" x={rowX - 150 * u} y={cy - 210 * u} size={32 * u} dt={dt - 1.2 * B} align="left" color={SAGE} />
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
        {/* the line from the word to the evidence */}
        <line x1={cx - 180 * u} y1={cy} x2={cx - 180 * u + 120 * u * c01((dt - B) / 10)} y2={cy} stroke={SAGE} strokeWidth={3 * u} strokeOpacity={0.7} />
        {/* the beam */}
        {scan > 0 && scan < 1 && <rect x={rowX - 160 * u} y={rowY(0) - 50 * u + scan * 330 * u} width={460 * u} height={6 * u} rx={3 * u} fill={`rgba(${REEL.sageCore}, 0.8)`} style={{ filter: `drop-shadow(0 0 ${12 * u}px rgba(${REEL.sageCore}, 0.9))` }} />}
        {rows.map((r, i) => {
          if (dt < 1.2 * B + i * 4) return null;
          const p = expoOut(c01((dt - 1.2 * B - i * 4) / 9));
          const ry = rowY(i);
          const marked = dt >= r.at;
          const ok = r.ok || (r.fixed !== undefined && dt >= r.fixed);
          const color = !marked ? `rgba(${REEL.sage}, 0.5)` : ok ? SAGE : CLAY;
          const m = backOut(c01((dt - (ok && r.fixed !== undefined && dt >= r.fixed ? r.fixed : r.at)) / 8), 2.4);
          return (
            <g key={i} opacity={p}>
              <circle cx={rowX - 120 * u} cy={ry} r={26 * u} fill="#0E1A12" stroke={color} strokeWidth={3 * u} />
              {marked && ok && <g transform={`translate(${rowX - 120 * u} ${ry}) scale(${m}) translate(${-(rowX - 120 * u)} ${-ry})`}><Check x={rowX - 120 * u} y={ry} s={u * 1.2} /></g>}
              {marked && !ok && (
                <text x={rowX - 120 * u} y={ry + 13 * u} textAnchor="middle" fontFamily={FONT.sans} fontWeight={800} fontSize={36 * u} fill={CLAY} transform={`translate(${rowX - 120 * u} ${ry}) scale(${m}) translate(${-(rowX - 120 * u)} ${-ry})`}>
                  ?
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {rows.map((r, i) => (
        <Label key={i} text={r.label} x={rowX - 70 * u} y={rowY(i) - 22 * u} size={34 * u} dt={dt - 1.2 * B - i * 4} align="left" color={REEL.ink} />
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------------------------------ Visual answers ---- */

/**
 * Visual answers and the work view (CHANGELOG.md@v2.0.0:225-233, :313; C-200-12, C-200-14): a reply's table sorts by
 * any column and becomes a chart; a flowchart draws itself; the work view draws each run's steps as cards. Data shown as
 * bars, never figures.
 */
export const VisualExplainer: React.FC<{ x: number; y: number; w: number; h: number; dt: number; B: number; energy?: number }> = ({ x, y, w, h, dt, B }) => {
  const u = unit(w, h);
  const left = x + w * 0.04;
  const top = y + h * 0.1;
  const values = [0.55, 0.9, 0.35, 0.72];
  const order = [1, 3, 0, 2]; // sorted, largest first
  const sortP = inOut(c01((dt - 0.6 * B) / 14));
  const chartP = inOut(c01((dt - 1.6 * B) / 16));
  const tw = 420 * u;
  const rowH = 62 * u;
  // the table, then the chart (the value bars rotate up into columns)
  const table = values.map((v, i) => {
    const rank = order.indexOf(i);
    const yRow = top + 70 * u + (i + (rank - i) * sortP) * rowH;
    const barW = v * 190 * u;
    // chart pose: a column at x by rank, growing up from the base line
    const colX = left + 40 * u + rank * 95 * u;
    const base = top + 70 * u + 4 * rowH;
    const colH = v * 230 * u;
    const bx = (left + 200 * u) * (1 - chartP) + colX * chartP;
    const by = (yRow + 18 * u) * (1 - chartP) + (base - colH) * chartP;
    const bw = barW * (1 - chartP) + 60 * u * chartP;
    const bh = 22 * u * (1 - chartP) + colH * chartP;
    return (
      <g key={i}>
        <rect x={left} y={yRow} width={tw} height={rowH - 6 * u} rx={10 * u} fill={`rgba(${REEL.sage}, ${0.08 * (1 - chartP)})`} />
        <rect x={left + 24 * u} y={yRow + 21 * u} width={120 * u} height={14 * u} rx={7 * u} fill={`rgba(232, 238, 230, ${0.35 * (1 - chartP)})`} />
        <rect x={bx} y={by} width={bw} height={bh} rx={8 * u} fill={i === 1 ? SAGE : `rgba(${REEL.sage}, 0.75)`} />
      </g>
    );
  });
  const tableIn = expoOut(c01(dt / 10));
  // the flowchart: three nodes and their arrows drawing themselves
  const fx = x + w * 0.62;
  const fy = y + h * 0.12;
  const nodes = [
    { x: fx, y: fy, at: 2.6 * B },
    { x: fx + 240 * u, y: fy, at: 2.9 * B },
    { x: fx + 120 * u, y: fy + 140 * u, at: 3.2 * B },
  ];
  // the work view: each run's steps as cards
  const steps = ["files read", "commands", "tests", "your review"];
  const sx = x + w * 0.55;
  const sy = y + h * 0.58;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
        <g opacity={tableIn}>
          <rect x={left} y={top} width={tw} height={56 * u} rx={12 * u} fill={`rgba(${REEL.sage}, ${0.22 * (1 - chartP)})`} stroke={SAGE} strokeOpacity={0.6 * (1 - chartP)} strokeWidth={2 * u} />
          {/* the column being sorted: its header lights */}
          <rect x={left + 190 * u} y={top + 10 * u} width={150 * u} height={36 * u} rx={10 * u} fill={`rgba(${REEL.sageCore}, ${(0.5 * pulse(dt, 0.6 * B, 12) + 0.15) * (1 - chartP)})`} />
          {table}
          <line x1={left + 20 * u} y1={top + 70 * u + 4 * rowH + 2 * u} x2={left + 430 * u} y2={top + 70 * u + 4 * rowH + 2 * u} stroke={SAGE} strokeWidth={2.5 * u} strokeOpacity={chartP} />
        </g>
        {nodes.slice(1).map((n, i) => {
          const a = nodes[i];
          const p = c01((dt - n.at + 4) / 8);
          return <line key={i} x1={a.x} y1={a.y} x2={a.x + (n.x - a.x) * p} y2={a.y + (n.y - a.y) * p} stroke={SAGE} strokeWidth={3 * u} strokeLinecap="round" />;
        })}
        {nodes.map((n, i) => {
          const p = backOut(c01((dt - n.at) / 9), 2);
          return p > 0 ? <rect key={i} x={n.x - 70 * u * p} y={n.y - 30 * u * p} width={140 * u * p} height={60 * u * p} rx={16 * u} fill="#0E1A12" stroke={SAGE} strokeWidth={3 * u} style={{ filter: `drop-shadow(0 0 ${10 * u}px rgba(${REEL.sage}, 0.5))` }} /> : null;
        })}
      </svg>
      {steps.map((t, i) => {
        const at = 4 * B + i * 5;
        const p = expoOut(c01((dt - at) / 9));
        return p > 0 ? (
          <div
            key={i}
            style={{
              position: "absolute",
              left: sx + i * 26 * u,
              top: sy + i * 58 * u + (1 - p) * 30 * u,
              opacity: p,
              width: 330 * u,
              padding: `${12 * u}px ${20 * u}px`,
              borderRadius: 14 * u,
              background: "#101C14",
              border: `${2 * u}px solid rgba(${REEL.sage}, 0.7)`,
              boxShadow: `0 ${10 * u}px ${24 * u}px rgba(${REEL.shadeRgb}, 0.7)`,
              display: "flex",
              alignItems: "center",
              gap: 14 * u,
              fontFamily: FONT.sans,
              fontWeight: 600,
              fontSize: 28 * u,
              color: REEL.ink,
            }}
          >
            <span style={{ width: 14 * u, height: 14 * u, borderRadius: 7 * u, background: SAGE, display: "inline-block" }} />
            {t}
          </div>
        ) : null;
      })}
      <Label text="sorts by any column" x={left} y={top - 48 * u} size={32 * u} dt={dt - 0.6 * B} align="left" color={SAGE} />
      <Label text="becomes a chart" x={left + tw} y={top + 70 * u + 4 * rowH + 18 * u} size={32 * u} dt={dt - 1.6 * B} align="right" />
      <Label text="flowcharts, drawn natively" x={fx + 120 * u} y={fy + 190 * u} size={32 * u} dt={dt - 3.2 * B} />
      <Label text="the work view" x={sx} y={sy - 50 * u} size={32 * u} dt={dt - 4 * B} align="left" color={SAGE} />
    </div>
  );
};

/* ------------------------------------------------------------------------------------- Long tasks stay light ---- */

/**
 * Long tasks (README.md@v2.0.0:445: "a long task's older tool results are sealed in large chunks"): a context tape fed
 * by tool results; the older ones fold into sealed blocks, and the tape never grows. No name, no figures.
 */
export const LongTasksExplainer: React.FC<{ x: number; y: number; w: number; h: number; dt: number; B: number; energy?: number }> = ({ x, y, w, h, dt, B }) => {
  const u = unit(w, h);
  const tapeX = x + w * 0.04;
  const tapeY = y + h * 0.42;
  const tapeW = w * 0.92;
  const tile = 44 * u;
  const gap = 10 * u;
  const step = tile + gap;
  const blockW = 92 * u;
  const rate = B / 4; // a tool result every sixteenth
  const SEALS = [2 * B, 4 * B]; // on beats: the eight oldest open results fold into one sealed block
  const arrived = dt < 0 ? 0 : Math.min(30, Math.floor(dt / rate) + 1);
  const started = SEALS.filter((s) => dt >= s);
  const fold = started.length ? inOut(c01((dt - started[started.length - 1]) / 10)) : 1;
  const tapeIn = expoOut(c01(dt / 12));
  const els: React.ReactNode[] = [];
  let cur = tapeX + 20 * u;
  started.forEach((s, k) => {
    const p = k === started.length - 1 ? fold : 1; // the newest fold animates from eight tiles' width to one block
    const bw = blockW * p + (8 * step - gap) * (1 - p);
    const flash = pulse(dt, s, 9);
    els.push(
      <div
        key={`s${k}`}
        style={{
          position: "absolute",
          left: cur,
          top: tapeY - tile * 0.6,
          width: bw,
          height: tile * 1.2,
          borderRadius: 12 * u,
          background: "linear-gradient(180deg, #24402C, #14261A)",
          border: `${2.5 * u}px solid ${SAGE}`,
          boxShadow: `0 0 ${(10 + 30 * flash) * u}px rgba(${REEL.sage}, ${0.4 + 0.5 * flash})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ width: 20 * u, height: 20 * u, borderRadius: "50%", border: `${3 * u}px solid ${SAGE}`, opacity: p }} />
      </div>,
    );
    cur += bw + gap;
  });
  const openFrom = started.length * 8;
  for (let idx = openFrom; idx < arrived; idx++) {
    const p = expoOut(c01((dt - idx * rate) / 6));
    els.push(
      <div
        key={`t${idx}`}
        style={{
          position: "absolute",
          left: cur + (1 - p) * 120 * u,
          top: tapeY - tile / 2,
          width: tile,
          height: tile,
          borderRadius: 9 * u,
          background: `rgba(${REEL.sage}, ${0.18 + 0.12 * ((idx * 7) % 3)})`,
          border: `${2 * u}px solid rgba(${REEL.sage}, 0.8)`,
          opacity: p,
        }}
      />,
    );
    cur += step;
  }
  return (
    <div style={{ position: "absolute", inset: 0, opacity: tapeIn }}>
      {/* the tape: its length never changes */}
      <div style={{ position: "absolute", left: tapeX, top: tapeY - tile, width: tapeW, height: tile * 2, borderRadius: tile, border: `${2 * u}px solid rgba(${REEL.sage}, 0.45)`, background: `rgba(${REEL.sage}, 0.05)` }} />
      {els}
      <Label text="a long task" x={tapeX} y={tapeY - tile - 64 * u} size={34 * u} dt={dt - 4} align="left" color={REEL.ink} />
      <Label text="older tool results" x={tapeX + 20 * u} y={tapeY + tile + 26 * u} size={34 * u} dt={dt - 1.2 * B} align="left" />
      <Label text="sealed in large chunks" x={tapeX + 20 * u} y={tapeY + tile + 80 * u} size={34 * u} dt={dt - 2 * B - 4} align="left" color={SAGE} />
    </div>
  );
};

/* ------------------------------------------------------------------------------------------- Pebble Remote ---- */

/**
 * Pebble Remote (CHANGELOG.md@v2.0.0:213-221): the iPhone and the Mac linked over Tailscale or your Wi-Fi; from the
 * phone you read conversations, send messages, see what Pebble is doing and approve with Face ID. Outlines only: no
 * drawn app screen.
 */
export const RemoteExplainer: React.FC<{ x: number; y: number; w: number; h: number; dt: number; B: number; energy?: number }> = ({ x, y, w, h, dt, B, energy = 0 }) => {
  const u = unit(w, h);
  const phone = { x: x + w * 0.1, y: y + h * 0.5, w: 170 * u, h: 340 * u };
  const mac = { x: x + w * 0.86, y: y + h * 0.5, w: 330 * u, h: 210 * u };
  const inP = expoOut(c01(dt / 12));
  const link = c01((dt - 0.6 * B) / 12);
  const x1 = phone.x + phone.w / 2 + 16 * u;
  const x2 = mac.x - mac.w / 2 - 16 * u;
  const dots = Array.from({ length: 6 }, (_, i) => {
    const p = ((dt / 30 + i / 6) % 1 + 1) % 1;
    return { x: x1 + (x2 - x1) * p, a: link * Math.sin(p * Math.PI) };
  });
  const chips = ["read conversations", "send messages", "see what Pebble is doing", "approve with Face ID"];
  const glow = 0.35 + 0.3 * energy + 0.5 * pulse(dt, 0.6 * B + 12, 10);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: inP }}>
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
        {/* the phone */}
        <rect x={phone.x - phone.w / 2} y={phone.y - phone.h / 2} width={phone.w} height={phone.h} rx={34 * u} fill="#0B140E" stroke={SAGE} strokeWidth={3.5 * u} style={{ filter: `drop-shadow(0 0 ${14 * u}px rgba(${REEL.sage}, ${glow}))` }} />
        <rect x={phone.x - 30 * u} y={phone.y - phone.h / 2 + 14 * u} width={60 * u} height={14 * u} rx={7 * u} fill={`rgba(${REEL.sage}, 0.6)`} />
        {/* the Mac */}
        <rect x={mac.x - mac.w / 2} y={mac.y - mac.h / 2} width={mac.w} height={mac.h} rx={16 * u} fill="#0B140E" stroke={SAGE} strokeWidth={3.5 * u} style={{ filter: `drop-shadow(0 0 ${14 * u}px rgba(${REEL.sage}, ${glow}))` }} />
        <path d={`M ${mac.x - mac.w * 0.62} ${mac.y + mac.h / 2 + 12 * u} L ${mac.x + mac.w * 0.62} ${mac.y + mac.h / 2 + 12 * u}`} stroke={SAGE} strokeWidth={6 * u} strokeLinecap="round" />
        {/* the link */}
        <line x1={x1} y1={phone.y} x2={x1 + (x2 - x1) * link} y2={phone.y} stroke={SAGE} strokeWidth={3 * u} strokeDasharray={`${10 * u} ${10 * u}`} />
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={phone.y} r={6 * u} fill={`rgba(${REEL.sageCore}, ${d.a})`} style={{ filter: `drop-shadow(0 0 ${6 * u}px rgba(${REEL.sageCore}, 0.9))` }} />
        ))}
      </svg>
      <Label text="iPhone" x={phone.x} y={phone.y + phone.h / 2 + 18 * u} size={30 * u} dt={dt - 2} />
      <Label text="Mac" x={mac.x} y={mac.y + mac.h / 2 + 30 * u} size={30 * u} dt={dt - 2} />
      <Label text="over Tailscale or your Wi-Fi" x={(x1 + x2) / 2} y={phone.y - 70 * u} size={32 * u} dt={dt - 0.6 * B - 6} color={SAGE} />
      {chips.map((c, i) => (
        <Chip key={c} x={(x1 + x2) / 2} y={phone.y + 64 * u + i * 62 * u} text={c} u={u} p={(dt - (1.6 + i * 0.75) * B) / 9} size={25} glow={pulse(dt, (1.6 + i * 0.75) * B, 9)} />
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------------------------------ Stealth's split ---- */

/**
 * Stealth Lockdown as a diagram (the lead, 03:15): your screen and your screen share side by side; Pebble on yours,
 * not in the share. Outlines only (no screenshot), and only what the honest line says.
 */
export const StealthSplit: React.FC<{ x: number; y: number; w: number; h: number; dt: number; B: number; vertical?: boolean }> = ({ x, y, w, h, dt, vertical }) => {
  const u = unit(w, h);
  const inP = expoOut(c01(dt / 10));
  const sw = vertical ? w * 0.8 : w * 0.44;
  const sh = sw * 0.62;
  const a = vertical ? { x: x + w / 2, y: y + h * 0.27 } : { x: x + w * 0.25, y: y + h * 0.5 };
  const b = vertical ? { x: x + w / 2, y: y + h * 0.75 } : { x: x + w * 0.75, y: y + h * 0.5 };
  const screen = (c: { x: number; y: number }, label: string, withPebble: boolean, delay: number) => {
    const p = expoOut(c01((dt - delay) / 10));
    return (
      <div style={{ position: "absolute", left: c.x - sw / 2, top: c.y - sh / 2, width: sw, height: sh, opacity: p, transform: `translateY(${(1 - p) * 20 * u}px)` }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 18 * u, border: `${3 * u}px solid ${SAGE}`, background: "#0B140E", boxShadow: `0 0 ${16 * u}px rgba(${REEL.sage}, 0.35)` }} />
        {/* a window */}
        <div style={{ position: "absolute", left: sw * 0.08, top: sh * 0.14, width: sw * 0.56, height: sh * 0.62, borderRadius: 10 * u, border: `${2 * u}px solid rgba(${REEL.sage}, 0.55)`, background: `rgba(${REEL.sage}, 0.06)` }} />
        {/* where the companion sits */}
        {withPebble ? (
          <div style={{ position: "absolute", left: sw * 0.74, top: sh * 0.56, width: sw * 0.13, height: sw * 0.11, borderRadius: "50% 50% 46% 46%", background: "#B4CDA6", boxShadow: `0 0 ${18 * u}px rgba(${REEL.sageCore}, 0.7)` }}>
            <div style={{ position: "absolute", left: "34%", top: "34%", width: "9%", height: "26%", borderRadius: 4, background: "#23351f" }} />
            <div style={{ position: "absolute", left: "57%", top: "34%", width: "9%", height: "26%", borderRadius: 4, background: "#23351f" }} />
          </div>
        ) : (
          <div style={{ position: "absolute", left: sw * 0.74, top: sh * 0.56, width: sw * 0.13, height: sw * 0.11, borderRadius: "50% 50% 46% 46%", border: `${2 * u}px dashed rgba(${REEL.sage}, 0.45)` }} />
        )}
        <div style={{ position: "absolute", left: 0, right: 0, top: sh + 18 * u, textAlign: "center", fontFamily: FONT.sans, fontWeight: 600, fontSize: 34 * u, color: withPebble ? REEL.ink : REEL.inkSoft }}>{label}</div>
      </div>
    );
  };
  return (
    <div style={{ position: "absolute", inset: 0, opacity: inP }}>
      {screen(a, "Your screen", true, 0)}
      {screen(b, "Your screen share", false, 6)}
    </div>
  );
};

/* ------------------------------------------------------------------------------------------- type beats' motifs ---- */

/** The permission dial (the modes' own names, C-200-8): a pill that moves between them on the beats. */
export const PaceDial: React.FC<{ x: number; y: number; w: number; dt: number; B: number }> = ({ x, y, w, dt, B }) => {
  const modes = ["Ask for approval", "Auto in project", "Full access"];
  const u = w / 980;
  const pos = dt < 1.5 * B ? 0 : dt < 3 * B ? 1 : 2;
  const prev = dt < 1.5 * B ? 0 : dt < 3 * B ? 0 : 1;
  const moveAt = pos === 0 ? 0 : pos === 1 ? 1.5 * B : 3 * B;
  const m = inOut(c01((dt - moveAt) / 10));
  const slot = (i: number) => x + w * (i + 0.5) / 3;
  const px = slot(prev) + (slot(pos) - slot(prev)) * m;
  const inP = expoOut(c01(dt / 10));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: inP }}>
      <div style={{ position: "absolute", left: x, top: y - 44 * u, width: w, height: 88 * u, borderRadius: 44 * u, border: `${2.5 * u}px solid rgba(${REEL.sage}, 0.6)`, background: "#0B140E" }} />
      <div style={{ position: "absolute", left: px - w / 6 + 8 * u, top: y - 36 * u, width: w / 3 - 16 * u, height: 72 * u, borderRadius: 36 * u, background: `rgba(${REEL.sage}, 0.35)`, border: `${2.5 * u}px solid ${SAGE}`, boxShadow: `0 0 ${24 * u}px rgba(${REEL.sage}, 0.6)` }} />
      {modes.map((t, i) => (
        <div key={t} style={{ position: "absolute", left: slot(i), top: y, transform: "translate(-50%, -50%)", fontFamily: FONT.sans, fontWeight: 600, fontSize: 30 * u, color: i === pos ? REEL.ink : REEL.inkSoft, whiteSpace: "nowrap" }}>
          {t}
        </div>
      ))}
    </div>
  );
};

/** Chips that land one per beat (the model's three ways in, after C-200-30). */
export const ChipRow: React.FC<{ x: number; y: number; w: number; dt: number; B: number; items: readonly string[]; vertical?: boolean }> = ({ x, y, w, dt, B, items, vertical }) => {
  const u = w / 980;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {items.map((t, i) => (
        <Chip key={t} x={vertical ? x + w / 2 : x + (w * (i + 0.5)) / items.length} y={vertical ? y + i * 110 * u : y} text={t} u={u * 1.3} p={(dt - (0.5 + i * 0.5) * B) / 8} glow={pulse(dt, (0.5 + i * 0.5) * B, 9)} />
      ))}
    </div>
  );
};

/** Memory you control: memory chips, and the one you choose to forget leaves (C-200-11: "Forget"). */
export const MemoryChips: React.FC<{ x: number; y: number; w: number; dt: number; B: number }> = ({ x, y, w, dt, B }) => {
  const u = w / 980;
  const forgetAt = 1.6 * B;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {[0, 1, 2].map((i) => {
        const p = expoOut(c01((dt - i * 4) / 9));
        const gone = i === 1 ? inOut(c01((dt - forgetAt - 6) / 10)) : 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + w * 0.1 + i * w * 0.28,
              top: y - 40 * u + (1 - p) * 20 * u - gone * 40 * u,
              width: w * 0.24,
              height: 80 * u,
              borderRadius: 18 * u,
              background: "#0E1A12",
              border: `${2.5 * u}px solid ${i === 1 && dt >= forgetAt ? CLAY : SAGE}`,
              opacity: p * (1 - gone),
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 10 * u,
              padding: `0 ${20 * u}px`,
            }}
          >
            <div style={{ height: 10 * u, width: "80%", borderRadius: 5 * u, background: "rgba(232,238,230,0.4)" }} />
            <div style={{ height: 10 * u, width: "55%", borderRadius: 5 * u, background: "rgba(232,238,230,0.25)" }} />
          </div>
        );
      })}
      <Chip x={x + w * 0.1 + w * 0.28 + w * 0.12} y={y + 90 * u} text="Forget" u={u * 1.2} p={(dt - forgetAt) / 7} color={CLAY} />
    </div>
  );
};
