// Numbers as data in the benchmark's sentences. <DataText> (src/components/ui/Data.tsx) finds versions, sizes, rates,
// signed values, money, "107 of 135", thousands and times; the benchmark also prints interval bounds ("68.1 to 88.9"),
// a subtraction ("79.3 minus 82.2") and seconds ("10.9 s"). This sets those in Geist Mono too, so every measured
// number in the section reads alike. "Claude Opus 5.5" stays a name.
import { splitData, type Segment } from "@/components/ui/numbers";

/** a bare decimal (not the model's name) or seconds */
const MORE = /(?<!Opus )\b\d+\.\d+(?:\s?s\b)?/;

/** splitData, then the bare decimals and seconds left in its plain segments */
export function benchSegments(text: string, counts: readonly string[] = []): Segment[] {
  const out: Segment[] = [];
  for (const segment of splitData(text, counts)) {
    if (segment.data) {
      out.push(segment);
      continue;
    }
    let rest = segment.text;
    while (rest) {
      const hit = MORE.exec(rest);
      if (!hit) {
        out.push({ text: rest, data: false });
        break;
      }
      if (hit.index > 0) out.push({ text: rest.slice(0, hit.index), data: false });
      out.push({ text: hit[0], data: true });
      rest = rest.slice(hit.index + hit[0].length);
    }
  }
  return out;
}

/** One <span> around the segments (so spaces survive in a flex container), the numbers in .data. */
export function Figures({ text, counts, className }: { text: string; counts?: readonly string[]; className?: string }) {
  const segments = benchSegments(text, counts);
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
