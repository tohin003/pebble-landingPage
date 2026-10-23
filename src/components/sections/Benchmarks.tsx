// Section 10b, Benchmarks: "Measured, not claimed" (the lead's decision for the Lexington rebuild), right after Built
// like infrastructure. STUB by the system lane; the sections lane (B) builds it.
//
// It renders only while src/content/release.ts says the benchmark is public (`benchmark.public`), and never with a
// number that isn't published (OVERRIDES §11; PHILOSOPHY "Evidence, presented"). What it shows, in this order: the
// method (the same model, the tasks, repetitions, the grader), the overall result with its interval ("Pebble matches
// Claude Code on the same model, within the margin." as the only headline), where Pebble led and where it trailed at
// equal weight, the cost, what this does not prove, then the raw data and how to rerun it. Numbers are data:
// <DataText> / .data (Geist Mono, tabular figures), each rate with its count ("79.3 % (107 of 135)").
//
// Anatomy: <section id={SECTIONS.benchmarks} className="sec" aria-labelledby="benchmarks-title"> with a SectionHead
// (src/components/ui/SectionHead.tsx), then the exhibit in .sec-body.
import { benchmark } from "@/content/release";

export function Benchmarks() {
  if (!benchmark.public) return null;
  return null; // TODO(sections lane B): the section.
}
