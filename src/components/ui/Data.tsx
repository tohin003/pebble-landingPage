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

export function DataText({ text, counts }: { text: string; counts?: readonly string[] }) {
  return (
    <>
      {splitData(text, counts).map((segment, i) =>
        segment.data ? (
          <span key={i} className="data">
            {segment.text}
          </span>
        ) : (
          segment.text
        ),
      )}
    </>
  );
}
