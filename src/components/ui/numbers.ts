// Numbers are data (PHILOSOPHY "The system in brief"; the lead's decision for the Lexington rebuild): versions, sizes,
// counts, rates and times are set in Geist Mono with tabular figures (globals.css .data). This finds them in a
// sentence, so copy stays plain strings in src/content and still renders its numbers as data (<DataText> in Data.tsx).
//
// What counts as data here (the earliest match wins; on a tie, the longest):
//   versions      v1.0.1, 1.0.4 (not "Apache-2.0" or "Pebble 1.0": names, not measurements)
//   sizes         72 MB, 1.5 GB, 160 KB
//   rates         79.3 %, −3.3 points, +2.5 pts
//   signed        −9.2, +2.5 (an explicit sign makes a number a measurement)
//   money         $0.085
//   counts        8,421 (thousands separators); "107 of 135"; and a bare number before a word the caller lists
//   times         0:28, 1:16 (m:ss)
// Bare small integers ("macOS 12", "three") stay words unless the caller passes the word after them in `counts`.

export type Segment = Readonly<{ text: string; data: boolean }>;

const PATTERNS: readonly RegExp[] = [
  // a version: "v" and two or three parts, or three parts (so "Apache-2.0" and "Pebble 1.0" stay words; a rate or a
  // size that starts the same way is longer, so it wins the tie)
  /\bv\d+\.\d+(?:\.\d+)?\b|\b\d+\.\d+\.\d+\b/,
  /[−+-]?\d+(?:[.,]\d+)?\s?(?:MB|GB|KB)\b/, // a size
  /[−+-]?\d+(?:\.\d+)?\s?(?:%|points?\b|pts\b)/, // a rate or a difference
  /[−+]\d+(?:\.\d+)?/, // a signed measurement
  /\$\d+(?:\.\d+)?/, // money
  /\b\d{1,3}(?:,\d{3})*\s(?:of)\s\d{1,3}(?:,\d{3})*\b/, // a count out of a total: "107 of 135"
  /\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/, // a count with thousands separators
  /\b\d{1,2}:\d{2}\b/, // a time
];

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Splits `text` into plain and data segments. `counts` adds words after which a bare number is a count: with
 * ["validator suites"], "40 validator suites" becomes data "40" + " validator suites".
 */
export function splitData(text: string, counts: readonly string[] = []): Segment[] {
  const patterns = [...PATTERNS];
  if (counts.length) {
    patterns.push(new RegExp(`\\b\\d+(?:,\\d{3})*(?=\\s(?:${counts.map(escapeRegExp).join("|")})\\b)`));
  }
  const out: Segment[] = [];
  let rest = text;
  while (rest) {
    let best: RegExpExecArray | null = null;
    for (const pattern of patterns) {
      const hit = pattern.exec(rest);
      if (hit && (best === null || hit.index < best.index || (hit.index === best.index && hit[0].length > best[0].length))) {
        best = hit;
      }
    }
    if (!best) {
      out.push({ text: rest, data: false });
      break;
    }
    if (best.index > 0) out.push({ text: rest.slice(0, best.index), data: false });
    out.push({ text: best[0], data: true });
    rest = rest.slice(best.index + best[0].length);
  }
  return out;
}
