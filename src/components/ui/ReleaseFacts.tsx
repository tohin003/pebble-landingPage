// The release facts under a Download, as a list with hairline separators (globals.css .facts), never a middle-dot
// string: "v1.0.1 | 72 MB | Apple silicon | macOS 12 or later". The version and the size are data (Geist Mono,
// tabular figures); the requirements stay words. From the release the page offers (src/lib/release.ts), so they
// follow the latest release by themselves.
import type { CSSProperties } from "react";
import { releaseFacts, type ReleaseInfo } from "@/lib/release";
import { DataText } from "./Data";

export function ReleaseFacts({
  release,
  count,
  className,
  style,
}: {
  release: Pick<ReleaseInfo, "version" | "sizeLabel">;
  /** only the first `count` facts (the sticky call to action shows version and size) */
  count?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const facts = releaseFacts(release).slice(0, count);
  return (
    <ul className={`facts ${className ?? ""}`} style={style}>
      {facts.map((fact) => (
        <li key={fact}>
          <DataText text={fact} />
        </li>
      ))}
    </ul>
  );
}
