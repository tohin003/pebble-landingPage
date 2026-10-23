// Numbers as data (globals.css .data): Geist Mono with tabular figures.
//
//   <Data>8,421</Data>                                   one value
//   <DataText text={infrastructure.facts[0].text} />     a sentence whose versions, sizes, counts, rates and times
//                                                        render as data (numbers.ts says which)
//   <DataText text={…} counts={["validator suites"]} />  also the bare number before these words
import type { ReactNode } from "react";
import { splitData } from "./numbers";

export function Data({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={`data ${className ?? ""}`}>{children}</span>;
}

/**
 * One <span> around the segments, so the spaces between a number and its words survive inside a flex container
 * (a .facts item is one: there, bare text beside a span would become its own flex item and lose its leading space).
 */
export function DataText({ text, counts, className }: { text: string; counts?: readonly string[]; className?: string }) {
  const segments = splitData(text, counts);
  if (segments.length === 1 && segments[0]!.data) return <span className={`data ${className ?? ""}`}>{text}</span>;
  return (
    <span className={className}>
      {segments.map((segment, i) =>
        segment.data ? (
          <span key={i} className="data">
            {segment.text}
          </span>
        ) : (
          segment.text
        ),
      )}
    </span>
  );
}
