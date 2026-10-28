// G1's variants of the demo's Return (MONTAGE_DESIGN §9; OVERRIDES §61: G1 is decided by the lead's rule, by
// measurement and by looking), each the same climax, timeline and cells as the demo's Return (F2-SP-return-<aspect>),
// so they render frame for frame against it; never in a film unless G1 picks it:
//   F2-SP-return-toned-<aspect>    R4's toned matte (§2.7, §9 item 4; lead ruling R4: toning real UI only if the toned
//                                  matte wins G1 on measured contrast)
//   F2-SP-return-curve1-<aspect>   revision 1's travel (§2.3, §9 item 2): orbits of 5, −4 and 3° a second, every swap in
//                                  place, a slow pull-back at 0.33 px a frame at the corners in place of the push
//   F2-SP-return-labels-<aspect>   the three family labels (§2.8, §9 item 3), the camera held at 0.90 or less to R354
//   F2-SP-return-large-<aspect>    the size test (§9 item 7, §10): the rings and their cells ×1.1 about the stone
import { useMemo } from "react";
import type { Aspect } from "../../tokens";
import { PieceView } from "../views/PieceView";
import type { ReturnOptions } from "../returnPlan";
import { demoReturnVariant } from "./plans";

/** The variants G1 renders, by their composition's tag (F2-SP-return-<tag>-<aspect>). */
export const RETURN_G1_VARIANTS: readonly { tag: string; options: Partial<ReturnOptions> }[] = [
  { tag: "toned", options: { merge: "toned" } },
  { tag: "curve1", options: { curve: "r1" } },
  { tag: "labels", options: { labels: true } },
  { tag: "large", options: { fieldScale: 1.1 } },
];

export const ReturnVariantDemo: React.FC<{ aspect: Aspect; variant: string }> = ({ aspect, variant }) => {
  const plan = useMemo(() => demoReturnVariant(aspect, RETURN_G1_VARIANTS.find((v) => v.tag === variant)!.options), [aspect, variant]);
  return <PieceView plan={plan} />;
};
