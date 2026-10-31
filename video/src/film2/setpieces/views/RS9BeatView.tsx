// A beat of real takes drawn (RS-9's, setpieces/rs9Beat.ts; Act I's and S11's, setpieces/takeBeats.ts): each shot a crop of its clip's frame at 1×, on the page's ground with the
// film's one shadow; hard cuts between shots; "Anyway." in the functional tier, ink, in the lower safe area. Nothing of
// Pebble is drawn here: every pixel of a shot is the recording's.
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR } from "../../tokens";
import { safeMarginPx, typeStyle } from "../../type/scale";
import { FontGate } from "../../type/FontGate";
import { takeFramePath } from "../take";
import { beatAt } from "../rs9Beat";
import { BEATS, type BeatName } from "../takeBeats";

export const RS9BeatView: React.FC<{ beat?: BeatName }> = ({ beat = "rs9" }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const { shot, src } = beatAt(frame, BEATS[beat]);
  const m = shot.take;
  const c = shot.crop ?? { x: 0, y: 0, w: m.w, h: m.h };
  const safe = safeMarginPx(W, H);
  // the whole screen fills the frame's width; a crop sits inside the safe area, above the line's band
  const boxW = shot.crop ? W - 2 * safe : W;
  const boxH = shot.crop ? H * (shot.id === "ask" || shot.id === "keys" ? 0.78 : 0.7) : H;
  const k = Math.min(boxW / c.w, boxH / c.h);
  const w = c.w * k;
  const h = c.h * k;
  const left = (W - w) / 2;
  const top = shot.crop ? Math.max(safe, (H - h) / 2 - (shot.line ? H * 0.06 : 0)) : (H - h) / 2;
  return (
    <AbsoluteFill style={{ background: COLOR.page }}>
      <div style={{ position: "absolute", left, top, width: w, height: h, overflow: "hidden", borderRadius: shot.crop ? 10 * (W / 1920) : 0, boxShadow: shot.crop ? `0 ${18 * (H / 1080)}px ${48 * (H / 1080)}px rgba(${COLOR.shadeRgb}, 0.22)` : undefined }}>
        <Img src={staticFile(takeFramePath(m, src))} style={{ position: "absolute", left: -c.x * k, top: -c.y * k, width: m.w * k, height: m.h * k, maxWidth: "none" }} />
      </div>
      {shot.line ? (
        <FontGate>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: safe * 2, textAlign: "center", color: COLOR.ink }}>
            <p style={typeStyle("functional", W, H, 0.6)}>{shot.line}</p>
          </div>
        </FontGate>
      ) : null}
    </AbsoluteFill>
  );
};
