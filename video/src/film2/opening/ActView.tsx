// One act of the film's opening drawn (opening/kit.ts): each take shot a crop of its recording's frame at 1× on the page's
// ground with the film's one shadow, hard cuts between shots; a typographic beat is the page and its lines. The film's
// lines enter and leave with KineticLine, as the set pieces' do. Nothing of Pebble is drawn here: every pixel of a shot
// is the recording's.
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR } from "../tokens";
import { safeMarginPx, typeSizePx } from "../type/scale";
import { FontGate } from "../type/FontGate";
import { KineticLine } from "../type/KineticLine";
import { takeFramePath } from "../setpieces/take";
import { LINE_EXIT, linesOfShot, shotAt, shotLayout, type ActPlan } from "./kit";

export const ActView: React.FC<{ act: ActPlan }> = ({ act }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const safe = safeMarginPx(W, H);
  const { shot, index, src } = shotAt(act, frame);
  const lay = shotLayout(act, index, W, H, safe, typeSizePx);
  const lines = linesOfShot(act, index);
  const m = shot.take;
  const c = m ? (shot.crop ?? { x: 0, y: 0, w: m.w, h: m.h }) : null;
  const b = lay.box;
  const u = H / 1080;
  return (
    <AbsoluteFill style={{ background: COLOR.page }}>
      {m && c && b && src !== undefined ? (
        <div style={{ position: "absolute", left: b.left, top: b.top, width: b.w, height: b.h, overflow: "hidden", borderRadius: (shot.crop ? 10 : 6) * u, boxShadow: `0 ${18 * u}px ${48 * u}px rgba(${COLOR.shadeRgb}, 0.22)` }}>
          <Img src={staticFile(takeFramePath(m, src))} style={{ position: "absolute", left: -c.x * b.k, top: -c.y * b.k, width: m.w * b.k, height: m.h * b.k, maxWidth: "none" }} />
        </div>
      ) : null}
      <FontGate>
        {lines.map((l) => (
          <KineticLine
            key={l.id}
            text={l.text}
            tier={l.tier}
            at={l.at}
            exitAt={l.cutOut ? undefined : l.exitAt}
            exitFrames={LINE_EXIT}
            sizeT={l.sizeT ?? 0.5}
            color={COLOR.ink}
            align="center"
            style={{ left: safe, top: lay.lineTop[l.id], width: W - 2 * safe }}
          />
        ))}
      </FontGate>
    </AbsoluteFill>
  );
};
