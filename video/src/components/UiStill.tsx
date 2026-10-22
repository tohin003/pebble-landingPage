// A captured still of the real Pebble UI (lane D, video/public/ui/<name>@2x.png | @3x.png) placed in world units: one
// world unit is one CSS px of the capture, so the camera's zoom IS the magnification m of R5 §5.1. The @3x file is
// the default because it stays crisp up to m ≈ 3 (punch-ins); pass dpr={2} for shots that never pass m ≈ 2.
//
// Element-level layering without extra captures (critic C8): `focus` keeps one region sharp while the rest of the
// same still recedes under a paper veil and a little blur (R5 §5.3). A "card" focus is cut out of the still and rises
// with a shadow, so a real control can lift off its own screen; a "soft" focus is a feathered ellipse, for regions
// that bleed off the frame. The pixels stay the capture's own: nothing is redrawn (D4).
import type { CSSProperties } from "react";
import { Img, staticFile } from "remotion";
import type { Rect } from "../motion/camera";
import { COLOR } from "../motion/spec";
import { useCamera } from "./Camera";
import { UI_STILLS, type UiStillName } from "./uiStills";

export interface UiFocus {
  /** the region that stays sharp, in the still's CSS px */
  rect: Rect;
  /** "card" (default): a clean cut-out that can rise; "soft": a feathered ellipse */
  mode?: "card" | "soft";
  /** 0..1: how far everything else recedes (at 1: a 50 % paper veil and 6 px of on-screen blur) */
  amount: number;
  /** 0..1: how far a card rises (+2.5 % scale and a card shadow at 1) */
  lift?: number;
  /** corner radius of the card, CSS px */
  radius?: number;
  /** extra feather of a soft focus, CSS px */
  feather?: number;
  /** opacity of the paper veil over the rest at amount 1 (default 0.5, R5 §5.3's 45–55 %) */
  veil?: number;
  /** blur of the rest ON SCREEN at amount 1, px (default 6; keep it under 20) */
  blur?: number;
}

export interface UiPress {
  /** the pressed control, in the still's CSS px */
  rect: Rect;
  /** 0..1: how pressed it looks (R5 §5.4: about 4 % darker while held) */
  amount: number;
  radius?: number;
}

export interface UiStillProps {
  name: UiStillName;
  dpr?: 2 | 3;
  /** placement in the parent's units (default: at 0, 0, the capture's own CSS size) */
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  focus?: UiFocus;
  press?: UiPress;
  /** the paper colour the veil fades to (default Pebble's window background) */
  veil?: string;
  style?: CSSProperties;
}

export const uiStillSrc = (name: UiStillName, dpr: 2 | 3 = 3) => staticFile(`ui/${name}@${dpr}x.png`);
export const uiStillSize = (name: UiStillName) => ({ w: UI_STILLS[name].w, h: UI_STILLS[name].h });

export const UiStill: React.FC<UiStillProps> = ({ name, dpr = 3, x = 0, y = 0, w, h, focus, press, veil = "#F7F8F5", style }) => {
  const cam = useCamera();
  const meta = UI_STILLS[name];
  const W = w ?? meta.w;
  const H = h ?? meta.h;
  const k = W / meta.w; // parent units per CSS px of the capture
  const src = uiStillSrc(name, dpr);
  const img = (extra?: CSSProperties) => (
    <Img src={src} style={{ position: "absolute", left: 0, top: 0, width: W, height: H, display: "block", ...extra }} />
  );
  const amount = Math.max(0, Math.min(1, focus?.amount ?? 0));
  // the blur is given ON SCREEN: the element is drawn at cam.zoom (and k) times its local size
  const blurLocal = ((focus?.blur ?? 6) * amount) / Math.max(0.01, cam.pose.zoom * k);
  const veilOpacity = (focus?.veil ?? 0.5) * amount;
  const r = focus ? { x: focus.rect.x * k, y: focus.rect.y * k, w: focus.rect.w * k, h: focus.rect.h * k } : null;

  return (
    <div style={{ position: "absolute", left: x, top: y, width: W, height: H, ...style }}>
      {img(amount > 0.001 ? { filter: `blur(${blurLocal.toFixed(3)}px)` } : undefined)}
      {press && press.amount > 0 ? (
        <div
          style={{
            position: "absolute",
            left: press.rect.x * k,
            top: press.rect.y * k,
            width: press.rect.w * k,
            height: press.rect.h * k,
            borderRadius: (press.radius ?? 8) * k,
            background: `rgba(${COLOR.shadowRgb}, ${(0.06 * Math.min(1, press.amount)).toFixed(3)})`,
          }}
        />
      ) : null}
      {focus && r && amount > 0.001 ? (
        focus.mode === "soft" ? (
          <SoftFocus r={r} veilOpacity={veilOpacity} feather={(focus.feather ?? 60) * k} veil={veil} img={img} />
        ) : (
          <CardFocus r={r} veilOpacity={veilOpacity} lift={focus.lift ?? 0} radius={(focus.radius ?? 10) * k} veil={veil} img={img} />
        )
      ) : null}
    </div>
  );
};

const CardFocus: React.FC<{
  r: Rect;
  veilOpacity: number;
  lift: number;
  radius: number;
  veil: string;
  img: (extra?: CSSProperties) => React.ReactNode;
}> = ({ r, veilOpacity, lift, radius, veil, img }) => {
  const s = 1 + 0.025 * lift;
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const rgb = COLOR.shadowRgb;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: veil, opacity: veilOpacity }} />
      <div style={{ position: "absolute", inset: 0, transformOrigin: `${cx}px ${cy}px`, transform: lift > 0 ? `scale(${s.toFixed(5)})` : undefined }}>
        {lift > 0 ? (
          <div
            style={{
              position: "absolute",
              left: r.x,
              top: r.y,
              width: r.w,
              height: r.h,
              borderRadius: radius,
              boxShadow: `0 1px 2px rgba(${rgb}, ${(0.08 * lift).toFixed(3)}), 0 10px 28px rgba(${rgb}, ${(0.14 * lift).toFixed(3)}), 0 30px 70px rgba(${rgb}, ${(0.12 * lift).toFixed(3)})`,
            }}
          />
        ) : null}
        <div style={{ position: "absolute", inset: 0, clipPath: `inset(${r.y}px calc(100% - ${r.x + r.w}px) calc(100% - ${r.y + r.h}px) ${r.x}px round ${radius}px)` }}>
          {img()}
        </div>
      </div>
    </>
  );
};

const SoftFocus: React.FC<{
  r: Rect;
  veilOpacity: number;
  feather: number;
  veil: string;
  img: (extra?: CSSProperties) => React.ReactNode;
}> = ({ r, veilOpacity, feather, veil, img }) => {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  // an ellipse that just contains the rect, then `feather` of falloff
  const rx = (r.w / 2) * Math.SQRT2;
  const ry = (r.h / 2) * Math.SQRT2;
  const mask = `radial-gradient(${(rx + feather).toFixed(1)}px ${(ry + feather).toFixed(1)}px at ${cx}px ${cy}px, #000 ${((rx / (rx + feather)) * 100).toFixed(1)}%, transparent 100%)`;
  const inverse = `radial-gradient(${(rx + feather).toFixed(1)}px ${(ry + feather).toFixed(1)}px at ${cx}px ${cy}px, transparent ${((rx / (rx + feather)) * 100).toFixed(1)}%, #000 100%)`;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: veil, opacity: veilOpacity, WebkitMaskImage: inverse, maskImage: inverse }} />
      <div style={{ position: "absolute", inset: 0, WebkitMaskImage: mask, maskImage: mask }}>{img()}</div>
    </>
  );
};
