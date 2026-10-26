// The film-2.0 compositions, registered under the "Film2" folder with an F2 prefix (src/Root.tsx mounts this). The old
// film's compositions are untouched.
import { Composition, Folder } from "remotion";
import { FOUNDATION_DEMO, FoundationDemo } from "./demo/FoundationDemo";
import { PORTS_LAB, PortsLab } from "./demo/PortsLab";
import { GRADES_SHEET, GradesSheet } from "./demo/GradesSheet";
import { TypeSpecimen } from "./demo/TypeSpecimen";

export const Film2Compositions: React.FC = () => (
  <Folder name="Film2">
    <Composition id="F2-Foundation-Demo" component={FoundationDemo} {...FOUNDATION_DEMO} />
    <Composition id="F2-Foundation-Ports" component={PortsLab} {...PORTS_LAB} />
    <Composition id="F2-Foundation-Grades" component={GradesSheet} {...GRADES_SHEET} />
    <Composition id="F2-Type-16x9" component={TypeSpecimen} durationInFrames={1} fps={60} width={1920} height={1080} />
    <Composition id="F2-Type-1x1" component={TypeSpecimen} durationInFrames={1} fps={60} width={1080} height={1080} />
    <Composition id="F2-Type-9x16" component={TypeSpecimen} durationInFrames={1} fps={60} width={1080} height={1920} />
  </Folder>
);
