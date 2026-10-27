// F2-SP-return-toned-<aspect>: the demo's Return with R4's toned matte (MONTAGE_DESIGN §2.7 and §9 item 4; lead ruling
// R4: toning real UI only if the toned matte wins G1 on measured contrast). The same climax, timeline and cells as the
// demo's Return (F2-SP-return-<aspect>), so the two render frame for frame for G1's A/B; never in a film unless G1 picks it.
import { useMemo } from "react";
import type { Aspect } from "../../tokens";
import { PieceView } from "../views/PieceView";
import { demoReturnVariant } from "./plans";

export const ReturnTonedDemo: React.FC<{ aspect: Aspect }> = ({ aspect }) => {
  const plan = useMemo(() => demoReturnVariant(aspect, { merge: "toned" }), [aspect]);
  return <PieceView plan={plan} />;
};
