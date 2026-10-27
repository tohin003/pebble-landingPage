// The film-2.0 compositions, registered under the "Film2" folder with an F2 prefix (src/Root.tsx mounts this). The old
// film's compositions are untouched.
import { Composition, Folder } from "remotion";
import { FOUNDATION_DEMO, FoundationDemo } from "./demo/FoundationDemo";
import { PORTS_LAB, PortsLab } from "./demo/PortsLab";
import { GRADES_SHEET, GradesSheet } from "./demo/GradesSheet";
import { TypeSpecimen } from "./demo/TypeSpecimen";
import { SetPiecesDemo, DEMO_SIZE, demoLength } from "./setpieces/demo/SetPiecesDemo";
import { demoPlans } from "./setpieces/demo/plans";
import { ReturnTonedDemo } from "./setpieces/demo/ReturnVariantDemo";
import type { Aspect } from "./tokens";

const ASPECTS: readonly [Aspect, string][] = [
  ["16:9", "16x9"],
  ["1:1", "1x1"],
  ["9:16", "9x16"],
];

export const Film2Compositions: React.FC = () => (
  <Folder name="Film2">
    <Composition id="F2-Foundation-Demo" component={FoundationDemo} {...FOUNDATION_DEMO} />
    <Composition id="F2-Foundation-Ports" component={PortsLab} {...PORTS_LAB} />
    <Composition id="F2-Foundation-Grades" component={GradesSheet} {...GRADES_SHEET} />
    <Composition id="F2-Type-16x9" component={TypeSpecimen} durationInFrames={1} fps={60} width={1920} height={1080} />
    <Composition id="F2-Type-1x1" component={TypeSpecimen} durationInFrames={1} fps={60} width={1080} height={1080} />
    <Composition id="F2-Type-9x16" component={TypeSpecimen} durationInFrames={1} fps={60} width={1080} height={1920} />
    <Folder name="SetPieces">
      {ASPECTS.map(([a, tag]) => (
        <Composition
          key={`demo-${tag}`}
          id={a === "16:9" ? "F2-SetPieces-Demo" : `F2-SetPieces-Demo-${tag}`}
          component={SetPiecesDemo}
          defaultProps={{ aspect: a }}
          durationInFrames={demoLength(demoPlans(a))}
          fps={60}
          width={DEMO_SIZE[a].w}
          height={DEMO_SIZE[a].h}
        />
      ))}
      {ASPECTS.flatMap(([a, tag]) =>
        demoPlans(a).map((e) => (
          <Composition
            key={`${e.plan.id}-${tag}`}
            id={`F2-SP-${e.plan.id}-${tag}`}
            component={SetPiecesDemo}
            defaultProps={{ aspect: a, only: e.plan.id }}
            durationInFrames={e.plan.duration}
            fps={60}
            width={DEMO_SIZE[a].w}
            height={DEMO_SIZE[a].h}
          />
        )),
      )}
      {/* the Return with R4's toned matte, for G1's A/B against F2-SP-return-<aspect> (MONTAGE_DESIGN §9) */}
      {ASPECTS.map(([a, tag]) => (
        <Composition
          key={`return-toned-${tag}`}
          id={`F2-SP-return-toned-${tag}`}
          component={ReturnTonedDemo}
          defaultProps={{ aspect: a }}
          durationInFrames={demoPlans(a).find((e) => e.plan.id === "return")!.plan.duration}
          fps={60}
          width={DEMO_SIZE[a].w}
          height={DEMO_SIZE[a].h}
        />
      ))}
    </Folder>
  </Folder>
);
