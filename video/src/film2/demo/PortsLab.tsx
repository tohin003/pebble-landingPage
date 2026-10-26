// F2-Foundation-Ports: a lab reel of the HyperFrames registry moves ported to GSAP (transitions/ports.tsx,
// type/TextMatchCut.tsx, light/LightLeak.tsx) and the reserved zoom-through, on PLACEHOLDER UI. 10 s at 60 fps. It is a
// test bench for the lead's ear and eye, not a film: whips and zoom-throughs are reserved in the treatment, and leaks
// appear at most once or twice in a film.
//
//   0.0–2.2 s  cut-the-curve: the ask card leaves left on power4.in; at peak speed the receipt continues the move
//   2.2–4.2 s  whip-pan-cut (reserved): one strip, matched by construction; σ = peak travel ÷ 7
//   4.2–7.0 s  text-match-cut: one line becomes another at the speed peak of one curve
//   7.0–8.6 s  zoom-through (reserved): the companion's stone dives into the main window
//   8.6–10 s   a code light leak (port of the light-leak block) over the main window
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { AbsoluteFill, Img, Sequence, staticFile, useVideoConfig } from "remotion";
import { COLOR, SHADOW_WINDOW } from "../tokens";
import { CutTheCurve, WhipPanCut } from "../transitions/ports";
import { zoomThrough } from "../transitions/presentations";
import { TextMatchCut } from "../type/TextMatchCut";
import { FontGate } from "../type/FontGate";
import { LightLeak } from "../light/LightLeak";
import { PlaceholderSlate, RIVERBED_SRC, UiImage } from "./parts";
import { PLACEHOLDER, type Placeholder } from "./placeholders";

export const PORTS_LAB = { durationInFrames: 600, fps: 60, width: 1920, height: 1080 } as const;

const Ground: React.FC = () => (
  <AbsoluteFill>
    <Img src={staticFile(RIVERBED_SRC)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  </AbsoluteFill>
);

/** A placeholder capture as a floating Pebble window, centred, `scale` × its CSS size. */
const Card: React.FC<{ ph: Placeholder; scale: number }> = ({ ph, scale }) => {
  const { width, height } = useVideoConfig();
  const c = ph.crop ?? { x: 0, y: 0, w: ph.w, h: ph.h };
  const w = c.w * scale;
  const h = c.h * scale;
  return (
    <div style={{ position: "absolute", left: (width - w) / 2, top: (height - h) / 2, width: w, height: h, borderRadius: 10 * scale, overflow: "hidden", boxShadow: SHADOW_WINDOW }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: c.w, height: c.h, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
        <UiImage ph={ph} />
      </div>
    </div>
  );
};

const Scene: React.FC<{ ph: Placeholder; scale: number }> = ({ ph, scale }) => (
  <AbsoluteFill>
    <Ground />
    <Card ph={ph} scale={scale} />
  </AbsoluteFill>
);

export const PortsLab: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLOR.riverbedMid }}>
    <Sequence from={0} durationInFrames={132}>
      <AbsoluteFill>
        <Ground />
        <CutTheCurve at={24} frames={72} direction="left" outgoing={<Card ph={PLACEHOLDER.ask} scale={1.6} />} incoming={<Card ph={PLACEHOLDER.receipt} scale={1.5} />} />
      </AbsoluteFill>
    </Sequence>
    <Sequence from={132} durationInFrames={120}>
      <WhipPanCut at={30} direction="left" before={<Scene ph={PLACEHOLDER.main} scale={1.15} />} after={<Scene ph={PLACEHOLDER.memoryKinds} scale={1.9} />} />
    </Sequence>
    <Sequence from={252} durationInFrames={168}>
      <AbsoluteFill style={{ backgroundColor: COLOR.page }}>
        <FontGate>
          <TextMatchCut a="Memory you control" b="Forget this memory" at={40} mode="scale-down" style={{ left: 0, top: 0, width: 1920, height: 1080 }} />
        </FontGate>
      </AbsoluteFill>
    </Sequence>
    <Sequence from={420} durationInFrames={180}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={64}>
          <Scene ph={PLACEHOLDER.memoryRecords} scale={1.8} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={linearTiming({ durationInFrames: 30 })} presentation={zoomThrough({ exitScale: 3.2, origin: [0.5, 0.5] })} />
        <TransitionSeries.Sequence durationInFrames={146}>
          <AbsoluteFill>
            <Scene ph={PLACEHOLDER.main} scale={1.15} />
            <LightLeak at={60} frames={54} tone="warm" />
          </AbsoluteFill>
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </Sequence>
    <PlaceholderSlate />
  </AbsoluteFill>
);
