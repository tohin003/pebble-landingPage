// A review sheet for the component paths the style frames do not use (Tools folder, not part of any film): the
// "rise" and "ink" entrances, a callout ring, a soft focus, a quiet-lit window and a pressing pointer. Render frame 12
// (mid-entrance) and frame 40 (landed): `npx remotion still src/index.ts ComponentCheck out/check-f40.png --frame=40`.
import { AbsoluteFill } from "remotion";
import { Camera, Cursor, KineticText, MacWindow, Ring, SageField, UiStill, World } from "../components";
import { COLOR, LOOK } from "../motion/spec";

export const COMPONENT_CHECK_FRAMES = 60;

export const ComponentCheck: React.FC = () => (
  <AbsoluteFill style={{ background: LOOK.room }}>
    {/* top left: "rise" on paper (two lines) */}
    <KineticText lines={["Two lines rise", "from their masks"]} role="headline" enter="rise" at={0} box={{ x: 64, y: 48, w: 860, h: 300 }} size={84} />
    {/* bottom left: "ink" on the sage field */}
    <div style={{ position: "absolute", left: 32, top: 560, width: 900, height: 480, overflow: "hidden", borderRadius: 24 }}>
      <SageField>
        <KineticText lines={["Words ink in, one by one"]} role="headline" enter="ink" at={4} color={LOOK.onSage} size={72} align="center" valign="center" box={{ x: 40, y: 40, w: 820, h: 400 }} />
      </SageField>
    </div>
    {/* right: a quiet-lit window, a soft focus, a ring and a pressing pointer */}
    <div style={{ position: "absolute", left: 980, top: 48, width: 900, height: 990, overflow: "hidden", borderRadius: 24 }}>
      <Camera pose={{ x: 520, y: 390, zoom: 0.95 }} viewport={{ width: 900, height: 990 }}>
        <World>
          <div style={{ position: "absolute", left: -2000, top: -2000, width: 5000, height: 5000, background: COLOR.side }} />
          <MacWindow x={60} y={60} width={1160 * 0.8} height={800 * 0.8} lights="quiet">
            <UiStill name="main-approval" dpr={2} w={1160 * 0.8} h={800 * 0.8} focus={{ rect: { x: 760, y: 200, w: 400, h: 560 }, mode: "soft", amount: 1 }} />
          </MacWindow>
        </World>
        {/* the Apply edit button: CSS (1025, 656, 103 × 31) in main-approval, drawn at 0.8 from (60, 60) */}
        <Ring rect={{ x: 60 + 1025 * 0.8, y: 60 + 656 * 0.8, w: 103 * 0.8, h: 31 * 0.8 }} radius={8 * 0.8} drawAt={6} />
        <Cursor space="world" keys={[{ at: 0, x: 700, y: 700 }, { at: 24, x: 60 + 1076 * 0.8, y: 60 + 672 * 0.8 }]} clicks={[30]} />
      </Camera>
    </div>
  </AbsoluteFill>
);
