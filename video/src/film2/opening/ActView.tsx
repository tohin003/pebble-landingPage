// One act of the film's opening drawn (opening/kit.ts): each take shot a crop of its recording's frame at 1× on the page's
// ground with the film's one shadow, hard cuts between shots; a typographic beat is the page and its lines. The film's
// lines enter and leave with KineticLine, as the set pieces' do. Nothing of Pebble is drawn here: every pixel of a shot
// is the recording's.
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR } from "../tokens";
import { approxLineWidth, safeMarginPx, typeSizePx } from "../type/scale";
import { FontGate } from "../type/FontGate";
import { KineticLine } from "../type/KineticLine";
import { takeFramePath } from "../setpieces/take";
import { LINE_EXIT, PUSH_PER_S, linesOfShot, shotAt, shotLayout, softenAt, type ActPlan } from "./kit";

export const ActView: React.FC<{ act: ActPlan }> = ({ act }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const safe = safeMarginPx(W, H);
  const { shot, index, src, start } = shotAt(act, frame);
  // the film's slow drift (the set pieces' cameras never hold still): a push of PUSH_PER_S a second about the shot's
  // centre, on the recording inside its box and on a typographic beat's lines
  const push = 1 + PUSH_PER_S * ((frame - start) / 60);
  const lay = shotLayout(act, index, W, H, safe, { size: typeSizePx, width: approxLineWidth });
  const lines = linesOfShot(act, index);
  const m = shot.take;
  const c = m ? (shot.crop ?? { x: 0, y: 0, w: m.w, h: m.h }) : null;
  const b = lay.box;
  const u = H / 1080;
  const soft = src !== undefined ? softenAt(shot, src) : { blur: 0, veil: 0 };
  return (
    <AbsoluteFill style={{ background: COLOR.page }}>
      {m && c && b && src !== undefined ? (
        <div style={{ position: "absolute", left: b.left, top: b.top, width: b.w, height: b.h, overflow: "hidden", borderRadius: (shot.crop ? 10 : 6) * u, boxShadow: `0 ${18 * u}px ${48 * u}px rgba(${COLOR.shadeRgb}, 0.22)` }}>
          <Img src={staticFile(takeFramePath(m, src))} style={{ position: "absolute", left: -c.x * b.k, top: -c.y * b.k, width: m.w * b.k, height: m.h * b.k, maxWidth: "none", transform: `scale(${push.toFixed(5)})`, transformOrigin: `${(c.x + c.w / 2) * b.k}px ${(c.y + c.h / 2) * b.k}px`, filter: soft.blur > 0.05 ? `blur(${(soft.blur * u).toFixed(2)}px)` : undefined }} />
          {soft.veil > 0.002 ? <div style={{ position: "absolute", inset: 0, background: COLOR.page, opacity: soft.veil }} /> : null}
        </div>
      ) : null}
      <FontGate>
        <AbsoluteFill style={shot.kind === "type" ? { transform: `scale(${push.toFixed(5)})`, transformOrigin: "50% 50%" } : undefined}>
        {lines.flatMap((l) =>
          lay.rows[l.id]!.map((row, r) => (
          <KineticLine
            key={`${l.id}-${r}`}
            text={row}
            tier={l.tier}
            at={l.at}
            exitAt={l.cutOut ? undefined : l.exitAt}
            exitFrames={LINE_EXIT}
            sizeT={l.sizeT ?? 0.5}
            color={COLOR.ink}
            align="center"
            style={{ left: safe, top: lay.lineTop[l.id]! + r * lay.rowH[l.id]!, width: W - 2 * safe }}
          />
          )),
        )}
        </AbsoluteFill>
      </FontGate>
    </AbsoluteFill>
  );
};
