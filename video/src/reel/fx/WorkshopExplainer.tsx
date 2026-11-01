// Pebble's Workshop, the explainer (the person, 03:15: "highlight features like … pebble's workshop using additional
// generated animation"). A diagram, never a product screen: Pebble makes a small tool, validates it in a fresh sandbox
// against its own tests and inputs it generates, then a blind check (tests written from its description alone). In the
// real take (RSW-01) the blind check disagreed, so Pebble ASKED: the diagram shows exactly that (some marks pass, some
// don't), and the real card "Keep this tool in Pebble's Toolbox?" lands next, on the beat.
//
// Words (every label is the release's or the page's own, shortened, never invented; CLAIMS C-WS-1, C-WS-2):
//   "a small tool" ("Pebble can make a small tool"), "a fresh sandbox" ("validate it in a fresh sandbox"), "its own
//   tests", "inputs it generates" ("against its own tests and inputs it generates"), "a blind check" ("passed a blind
//   check, with tests written from its description alone"). What follows is the real card, which says why it asks.
//   The tool's name, kiln_ramp_time, is the real one in RSW-01.
import { FONT } from "../../fonts";
import { REEL, backOut, c01, expoOut, inOut } from "./look";

/** Local frames (at 60 fps) of the explainer's stages, as multiples of the beat B. */
export const workshopStages = (B: number) => ({
  chip: 0,
  sandbox: B,
  tests: B * 1.15,
  inputs: B * 2,
  blind: B * 2.45,
  ask: B * 3,
});

const MONO = `"${FONT.mono}", ui-monospace, monospace`;

/** One label: Inter 600, sentence case, fading up over 6 frames. */
export const Label: React.FC<{ text: string; x: number; y: number; size: number; dt: number; align?: "left" | "center" | "right"; color?: string }> = ({ text, x, y, size, dt, align = "center", color = REEL.inkSoft }) => {
  if (dt < 0) return null;
  const p = expoOut(dt / 8);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(${align === "center" ? "-50%" : align === "right" ? "-100%" : "0"}, ${(1 - p) * 10}px)`,
        fontFamily: FONT.sans,
        fontWeight: 600,
        fontSize: size,
        letterSpacing: "-0.01em",
        color,
        opacity: c01((dt + 1) / 5),
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
};

/**
 * The diagram, drawn in a box of `w` × `h` px whose top-left is (`x`, `y`). `dt` is frames since the hero beat began;
 * `B` the beat. It ends compact (scaled to `settle`) when the real card arrives at stages.ask.
 */
export const WorkshopExplainer: React.FC<{ x: number; y: number; w: number; h: number; dt: number; B: number; energy?: number }> = ({ x, y, w, h, dt, B, energy = 0 }) => {
  const st = workshopStages(B);
  const u = Math.min(w / 980, h / 560); // the design is drawn about 980 × 560 px
  const cx = x + w / 2;
  const cy = y + h * 0.44;
  const sage = REEL.accent;
  const clay = `rgb(${REEL.clay})`;

  // the chip: the tool itself, drawn on, with its real name
  const chipIn = expoOut(c01((dt - st.chip) / 10));
  const chipW = 330 * u;
  const chipH = 74 * u;
  const pulse = (at: number) => (dt >= at ? Math.exp(-(dt - at) / 7) : 0);

  // the sandbox: a dashed box drawing itself around the chip
  const boxP = inOut(c01((dt - st.sandbox) / 14));
  const boxW = 780 * u;
  const boxH = 330 * u;
  const perim = 2 * (boxW + boxH);

  // its own tests: three pills fly into the chip from the left, each lands as a check
  const tests = [0, 1, 2].map((i) => {
    const t0 = st.tests + i * 4;
    const p = inOut(c01((dt - t0) / 9));
    const sx = cx - boxW * 0.6;
    const sy = cy - 64 * u + i * 64 * u;
    const ex = cx - chipW * 0.5 - 18 * u;
    const ey = cy - 18 * u + i * 18 * u;
    return { x: sx + (ex - sx) * p, y: sy + (ey - sy) * p, landed: dt >= t0 + 9, show: dt >= t0, fade: dt >= t0 + 9 ? c01(1 - (dt - t0 - 9) / 8) : 1, t0 };
  });

  // inputs it generates: a stream of small particles from the right
  const inputs = Array.from({ length: 12 }, (_, i) => {
    const t0 = st.inputs + i * 1.2;
    const p = c01((dt - t0) / 8);
    const lane = ((i * 37) % 5) - 2;
    const sx = cx + boxW * 0.6;
    const sy = cy + lane * 22 * u;
    const ex = cx + chipW * 0.5;
    return { x: sx + (ex - sx) * expoOut(p), y: sy + (cy - sy) * p * 0.8, a: dt >= t0 && p < 1 ? 0.9 : 0 };
  });

  // a blind check: five marks under the chip; the take's check disagreed, so not all pass
  const blind = [true, false, true, false, false].map((ok, i) => ({ ok, at: st.blind + i * 2.5 }));

  // when the real card arrives, the diagram steps back (up and smaller) to make room
  const settle = 1 - 0.18 * inOut(c01((dt - st.ask + 4) / 12));
  const lift = -h * 0.12 * inOut(c01((dt - st.ask + 4) / 12));
  const glow = 0.35 + 0.25 * energy + 0.6 * pulse(st.sandbox) + 0.4 * pulse(st.inputs) + 0.4 * pulse(st.blind);
  const lbl = 40 * u;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", transform: `translate(0px, ${lift}px) scale(${settle})`, transformOrigin: `${cx}px ${y}px` }}>
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
        {/* the sandbox */}
        <rect
          x={cx - boxW / 2}
          y={cy - boxH / 2}
          width={boxW}
          height={boxH}
          rx={34 * u}
          fill={`rgba(${REEL.sage}, ${0.1 * boxP})`}
          stroke={sage}
          strokeOpacity={0.85}
          strokeWidth={3 * u}
          strokeDasharray={`${perim * boxP} ${perim}`}
          style={{ filter: `drop-shadow(0 0 ${10 * u}px rgba(${REEL.sage}, ${0.6 * glow}))` }}
        />
        {/* the blind check's marks */}
        {blind.map((b, i) => {
          if (dt < b.at) return null;
          const p = backOut(c01((dt - b.at) / 8), 2.4);
          const mx = cx + (i - 2) * 64 * u;
          const my = cy + boxH * 0.5 + 62 * u;
          const r = 22 * u * p;
          return (
            <g key={i}>
              <circle cx={mx} cy={my} r={r} fill={b.ok ? `rgba(${REEL.sage}, 0.35)` : `rgba(${REEL.clay}, 0.3)`} stroke={b.ok ? sage : clay} strokeWidth={2.5 * u} />
              {p > 0.6 &&
                (b.ok ? (
                  <path d={`M ${mx - 9 * u} ${my} l ${6 * u} ${7 * u} l ${12 * u} ${-14 * u}`} fill="none" stroke={sage} strokeWidth={3.5 * u} strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d={`M ${mx - 8 * u} ${my - 8 * u} l ${16 * u} ${16 * u} M ${mx + 8 * u} ${my - 8 * u} l ${-16 * u} ${16 * u}`} fill="none" stroke={clay} strokeWidth={3.5 * u} strokeLinecap="round" />
                ))}
            </g>
          );
        })}
        {/* the tests flying in */}
        {tests.map((t, i) =>
          t.show && t.fade > 0 ? (
            <g key={i} opacity={t.fade}>
              <rect x={t.x - 44 * u} y={t.y - 15 * u} width={88 * u} height={30 * u} rx={15 * u} fill={`rgba(${REEL.sage}, 0.22)`} stroke={sage} strokeWidth={2 * u} />
              <path d={`M ${t.x - 9 * u} ${t.y} l ${6 * u} ${6 * u} l ${12 * u} ${-12 * u}`} fill="none" stroke={sage} strokeWidth={3 * u} strokeLinecap="round" strokeLinejoin="round" opacity={t.landed ? 1 : 0.35} />
            </g>
          ) : null,
        )}
        {/* the generated inputs */}
        {inputs.map((p, i) => (p.a > 0 ? <circle key={i} cx={p.x} cy={p.y} r={5 * u} fill={`rgba(${REEL.sageCore}, ${p.a})`} style={{ filter: `drop-shadow(0 0 ${6 * u}px rgba(${REEL.sageCore}, 0.8))` }} /> : null))}
      </svg>
      {/* the tool: a chip with its real name, in the mono face */}
      <div
        style={{
          position: "absolute",
          left: cx - chipW / 2,
          top: cy - chipH / 2,
          width: chipW,
          height: chipH,
          borderRadius: chipH / 2,
          background: "#0E1A12",
          border: `${2.5 * u}px solid ${sage}`,
          boxShadow: `0 0 ${(18 + 30 * glow) * u}px rgba(${REEL.sage}, ${0.35 + 0.4 * glow}), inset 0 1px 0 rgba(255,255,255,0.12)`,
          transform: `scale(${(0.6 + 0.4 * chipIn) * (1 + 0.06 * (pulse(st.tests + 9) + pulse(st.tests + 13) + pulse(st.tests + 17) + pulse(st.inputs + 10)))})`,
          opacity: chipIn,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14 * u,
          fontFamily: MONO,
          fontSize: 30 * u,
          color: REEL.ink,
        }}
      >
        <span style={{ color: sage, fontWeight: 500 }}>ƒ</span>
        <span>{"kiln_ramp_time".slice(0, Math.max(0, Math.round(c01((dt - st.chip) / 14) * 14)))}</span>
      </div>
      {/* labels: the tool's above it; the sandbox's above the box, left; tests and inputs inside the box's lower corners
          (each on its own side, so they never meet); the blind check's under its marks */}
      <Label text="a small tool" x={cx} y={cy - chipH / 2 - 56 * u} size={lbl} dt={dt - st.chip - 4} color={REEL.ink} />
      <Label text="a fresh sandbox" x={cx - boxW / 2} y={cy - boxH / 2 - 52 * u} size={lbl} dt={dt - st.sandbox} align="left" color={REEL.accent} />
      <Label text="its own tests" x={cx - boxW / 2 + 26 * u} y={cy + boxH / 2 - 58 * u} size={lbl} dt={dt - st.tests} align="left" />
      <Label text="inputs it generates" x={cx + boxW / 2 - 26 * u} y={cy + boxH / 2 - 58 * u} size={lbl} dt={dt - st.inputs} align="right" />
      <Label text="a blind check" x={cx} y={cy + boxH / 2 + 100 * u} size={lbl} dt={dt - st.blind} />
    </div>
  );
};
