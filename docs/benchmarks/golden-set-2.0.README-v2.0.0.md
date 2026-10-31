<!-- README.md@v2.0.0:390-424 of github.com/tohin003/Pebble (tag v2.0.0, commit 673f8f23a325), copied byte for byte on 2026-10-31 at 15:05 IST by the page lane. The source of every golden set 2.0 figure on the site: src/content/benchmarks.test.ts checks each against these lines. Never edit by hand; re-copy from the tag. -->
## Benchmarks: measured, not claimed

**Pebble 2.0 against Claude Code and Codex: more tasks done correctly, fewer false completions, lower cost per task.**
Golden set 2.0's held-out split has 85 tasks in 17 families, each asked in three phrasings, so 255 runs per product.
The tasks were written before the runs and kept sealed from development, and the plan (its gates, graders, prices and
budgets) was registered before the first run. Each comparison used one model for both products. Pebble ran as 1.9.29,
the build whose source 2.0.0 is, apart from its version number and notes.

| Against Claude Code (`claude-opus-5-5`) | Pebble | Claude Code |
|---|---|---|
| Tasks done correctly | 235 of 255 (92.2 %) | 213 of 255 (83.5 %) |
| Said done when it was not | 6.3 % | 13.7 % |
| Cost per task | $0.091 | $0.117 |
| Time per task: median, 95th percentile | 12.1 s, 46.5 s | 12.9 s, 40.2 s |

| Against Codex (`gpt-6.1-sol`) | Pebble | Codex |
|---|---|---|
| Tasks done correctly | 243 of 255 (95.3 %) | 231 of 255 (90.6 %) |
| Said done when it was not | 3.9 % | 7.1 % |
| Cost per task | $0.042 | $0.050 |
| Time per task: median, 95th percentile | 20.0 s, 62.9 s | 21.1 s, 54.6 s |

- **The paired difference** in tasks done correctly:
  - +8.6 points (95 % interval +3.1 to +14.9) against Claude Code;
  - +4.7 points (+0.4 to +9.4) against Codex.

  The plan's five measured gates were met against both.
- **"Beats", by the plan's rule,** applies family by family, only where the 95 % lower bound is above zero.
  - Against Claude Code: answers from saved web pages and repeated computations.
  - Against Codex: no single family.
- **Where Pebble trails**, by one task each: remembering across sessions against Claude Code, and long tasks against
  Codex.
- **Not run before 2.0.0:** the plan's sixth gate (no regression on the older corpus 24a) and the 32 held-out probes.

The setup, the gates and what was not run are in the [2.0.0 release notes](CHANGELOG.md#200).
