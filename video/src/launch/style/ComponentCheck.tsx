// LaunchComponents-16x9 / -4x5: a check sheet for the parts the style frames don't show, 1.5 s each, so a still at
// 1.0 s of each segment shows the component mid-move: (1) the Device with a stand-in screen, (2) a whip, (3) a
// scale-through, (4) the pebble wipe, (5) the soft wipe from night into daylight, (6) a lower-is-better chart.
// The stand-in screen is labelled as one; Pebble's UI is never drawn.
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { BarCompare } from "../components/BarCompare";
import { Device } from "../components/Device";
import { FontGate } from "../components/FontGate";
import { Headline } from "../components/Headline";
import { PebbleActor, bodyCentreAbove, cues, look, pose } from "../components/PebbleActor";
import { Stage } from "../components/Stage";
import { PebbleWipeLayer, ScaleThroughLayer, SoftWipeLayer, WhipLayer } from "../components/transitions";
import { useLayout } from "../layout";
import { useS } from "../timing";
import { C, TYPE } from "../tokens";

export const CHECK_SEG_S = 1.5;
export const CHECK_SCENES = 6;

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

/** Progress of a transition running from 0.4 s to 1.6 s of the segment (0.5 at 1.0 s). */
const useP = () => Math.max(0, Math.min(1, (useT() - 0.4) / 1.2));

const NightCard: React.FC<{ text: string }> = ({ text }) => {
  const L = useLayout();
  return (
    <Stage>
      <Headline text={text} at={-1} align="center" size={L.type.headline} />
    </Stage>
  );
};

const DayCard: React.FC<{ text: string }> = ({ text }) => {
  const L = useLayout();
  return (
    <Stage world="daylight">
      <Headline text={text} at={-1} align="center" size={L.type.headline} />
    </Stage>
  );
};

const DeviceCheck: React.FC = () => {
  const L = useLayout();
  return (
    <Stage keyLight={{ x: 0.6, y: 0.3, r: 0.8 }}>
      <Device at={0} flattenAt={0.3}>
        <AbsoluteFill style={{ background: "linear-gradient(160deg, #2B312D, #141816)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontFamily: TYPE.mono.fontFamily, fontSize: L.px(26), color: C.mute, textAlign: "center", lineHeight: 1.4 }}>
            Stand-in screen
            <br />
            (the Simulator recording goes here)
          </div>
        </AbsoluteFill>
      </Device>
      {!L.portrait && <Headline text={"Your Mac,\nin your pocket."} at={-1} align="left" box={{ x: L.content.x, y: L.px(300), w: L.px(720), h: L.px(480) }} />}
    </Stage>
  );
};

const WhipCheck: React.FC = () => {
  const p = useP();
  return (
    <AbsoluteFill>
      <WhipLayer progress={p} role="out" direction="left">
        <NightCard text="Your apps." />
      </WhipLayer>
      <WhipLayer progress={p} role="in" direction="left">
        <NightCard text="Your calendar." />
      </WhipLayer>
    </AbsoluteFill>
  );
};

const ScaleThroughCheck: React.FC = () => {
  const L = useLayout();
  const p = useP();
  const rect = L.portrait ? { x: L.px(140), y: L.px(560), w: L.px(800), h: L.px(500) } : { x: L.px(1060), y: L.px(300), w: L.px(640), h: L.px(400) };
  return (
    <AbsoluteFill>
      <ScaleThroughLayer progress={p} role="out" rect={rect} radius={L.px(22)}>
        <Stage>
          <Headline text="AgentGuard." at={-1} align="left" size={L.type.headline} box={L.portrait ? { x: L.content.x, y: L.px(200), w: L.content.w, h: L.px(260) } : { x: L.content.x, y: L.px(380), w: L.px(860), h: L.px(320) }} />
          <div style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderRadius: L.px(22), background: "#ECE8DF", boxShadow: "0 30px 80px rgba(3,6,4,0.6)" }} />
        </Stage>
      </ScaleThroughLayer>
      <ScaleThroughLayer progress={p} role="in" rect={rect} radius={L.px(22)}>
        <DayCard text="Evidence before “done”." />
      </ScaleThroughLayer>
    </AbsoluteFill>
  );
};

const PebbleWipeCheck: React.FC = () => {
  const L = useLayout();
  const p = useP();
  const foot = { x: L.centre.x, y: L.floorY };
  const size = L.px(200);
  return (
    <AbsoluteFill>
      <PebbleWipeLayer progress={p} role="out" x={foot.x} y={foot.y - bodyCentreAbove(size)} body={size * 0.59}>
        <Stage>
          <PebbleActor x={foot.x} y={foot.y} size={size} cues={cues(pose(0, "idle"), look(0.2, 0, -0.5))} pool />
          <Headline text="It remembers what matters." at={-1} align="center" size={L.type.title} box={{ x: L.content.x, y: L.px(L.portrait ? 300 : 220), w: L.content.w, h: L.px(260) }} />
        </Stage>
      </PebbleWipeLayer>
      <PebbleWipeLayer progress={p} role="in" x={foot.x} y={foot.y - bodyCentreAbove(size)} body={size * 0.59}>
        <DayCard text="Six layers. All visible." />
      </PebbleWipeLayer>
    </AbsoluteFill>
  );
};

const SoftWipeCheck: React.FC = () => {
  const p = useP();
  return (
    <AbsoluteFill>
      <SoftWipeLayer progress={p} role="out" direction="left">
        <NightCard text="So. How did it do?" />
      </SoftWipeLayer>
      <SoftWipeLayer progress={p} role="in" direction="left">
        <DayCard text="Cost per task." />
      </SoftWipeLayer>
    </AbsoluteFill>
  );
};

const LowerCheck: React.FC = () => {
  const L = useLayout();
  return (
    <Stage world="daylight">
      <Headline text="Cost per task." at={-1} size={L.portrait ? L.type.title : L.px(104)} align="left" valign="middle" box={{ x: L.content.x, y: L.px(110), w: L.content.w, h: L.px(170) }} />
      <BarCompare
        at={-2}
        prefix="$"
        decimals={3}
        max={0.15}
        lowerIsBetter
        note="Both on claude-opus-5-5"
        rows={[
          { name: "Pebble", value: 0.091, ours: true },
          { name: "Claude Code", value: 0.117 },
        ]}
      />
    </Stage>
  );
};

const PARTS = [DeviceCheck, WhipCheck, ScaleThroughCheck, PebbleWipeCheck, SoftWipeCheck, LowerCheck];

export const ComponentCheck: React.FC = () => {
  const S = useS();
  return (
    <AbsoluteFill style={{ backgroundColor: "#070B09" }}>
      <FontGate>
        {PARTS.map((Part, i) => (
          <Sequence key={i} from={S(i * CHECK_SEG_S)} durationInFrames={S(CHECK_SEG_S)}>
            <Part />
          </Sequence>
        ))}
      </FontGate>
    </AbsoluteFill>
  );
};
