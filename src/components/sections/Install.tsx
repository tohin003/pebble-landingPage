// Section 12, Install (DESIGN §5 row 12; design comp 2's split install; OVERRIDES §1, §2, §8 H14).
//
// In comp 2's order, and no longer than it:
// - the head as a split (the H2 left, the lead right), then the four requirement cells (macOS always with "Built and
//   tested on macOS 27");
// - the one-line command, exactly as published, in a pill with Copy; a small live pebble sits on the pill and taps when
//   the command is copied (Install.pill.tsx). Under it, one line: read the installer first, and two of its options;
// - two columns: what the installer does, and "Or download it and check it": the zip and SHA256SUMS, the short honest
//   line next to those downloads (OVERRIDES §2), the checksum's own limit under the shasum step (DESIGN §9), and the
//   honest first-run steps;
// - first run and updates. Uninstalling in full is in the FAQ, right after the limits.
// The release facts (version, size, links) come from src/lib/release.ts. With PEBBLE_RELEASE_STATE=soon (a manual
// override only) there is no command and no download: the section keeps the requirements and the GitHub link.
// The line passes beside the section (a "margin" anchor).
import { cta, hero, install, links } from "@/content/copy";
import { ChapterChip } from "@/components/media/ChapterChip";
import { Pebble } from "@/components/pebble/Pebble";
import { Icon } from "@/components/shell/icons";
import { inline } from "@/lib/inline";
import { getRelease } from "@/lib/release";
import { SECTIONS } from "@/lib/sections";
import { InstallPill } from "./Install.pill";
import styles from "./Install.module.css";

const PEBBLE_NAME = "install";

/** Phosphor's ArrowUpRight (regular), MIT; Phosphor is credited on /credits. */
const ARROW = "M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16H192A8,8,0,0,1,200,64Z";

export async function Install() {
  const release = await getRelease();
  const live = release.state === "live";
  const req = install.requirements;
  const cells = [
    req.mac,
    req.system,
    { label: req.download.label, value: release.sizeLabel, note: req.download.note(release.version) },
    req.price,
  ];
  const [checkStep, ...otherSteps] = install.byHand.steps;
  return (
    <section id={SECTIONS.install} className={`section ${styles.section}`} aria-labelledby="install-title" data-path-anchor="margin">
      <div className={styles.inner}>
        <header className={styles.head}>
          <h2 id="install-title">{install.h2}</h2>
          <div className={styles.headAside}>
            <p className="lead">{install.lead}</p>
            <div className={styles.chip}>
              <ChapterChip chapterId="get" />
            </div>
          </div>
        </header>

        <dl className={styles.requirements} aria-label={req.title}>
          {cells.map((cell) => (
            <div key={cell.label} className={styles.cell}>
              <dt>{cell.label}</dt>
              <dd>
                <span className={styles.value}>{cell.value}</span>
                <span className={styles.note}>{cell.note}</span>
              </dd>
            </div>
          ))}
        </dl>

        {live ? (
          <>
            <div className={styles.oneLine}>
              <h3 className="sr-only">{install.oneLine.title}</h3>
              <p className={styles.label}>{install.oneLine.lead}</p>
              <div className={styles.pillWrap}>
                {/* decorative: the box lets the pointer through to the pill; the Copy button makes it tap */}
                <div className={styles.perch} aria-hidden="true">
                  <Pebble name={PEBBLE_NAME} className={styles.pebble} />
                </div>
                <InstallPill
                  command={release.installCommand}
                  pebble={PEBBLE_NAME}
                  labels={{
                    copy: install.oneLine.copy,
                    copyAria: install.oneLine.copyAria,
                    copied: install.oneLine.copied,
                    copyFailed: install.oneLine.copyFailed,
                  }}
                />
              </div>
              <ul className={styles.cmdMore}>
                <li>
                  <a href={install.oneLine.readFirst.href} className={styles.readFirst}>
                    {install.oneLine.readFirst.label}
                    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false" className={styles.arrow}>
                      <path d={ARROW} />
                    </svg>
                  </a>
                </li>
                <li>{inline(install.oneLine.preview)}</li>
                <li>{inline(install.oneLine.uninstall)}</li>
              </ul>
            </div>

            <div className={styles.ways}>
              <div className={styles.way}>
                <h3>{install.oneLine.whatItDoesTitle}</h3>
                <ul className={styles.ticks}>
                  {install.oneLine.whatItDoes.map((item) => (
                    <li key={item}>
                      <Icon name="Check" className={styles.tick} />
                      <span>{inline(item)}</span>
                    </li>
                  ))}
                </ul>
                <p className={styles.small}>{install.oneLine.quarantineNote}</p>
              </div>

              <div className={styles.way}>
                <h3>{install.byHand.title}</h3>
                <div className={styles.downloads}>
                  <a className={styles.download} href={release.downloadUrl}>
                    <Icon name="DownloadSimple" className={styles.downloadIcon} />
                    <span>{install.byHand.downloadZip}</span>
                  </a>
                  <a className={styles.sums} href={release.checksumsUrl} translate="no">
                    {install.byHand.downloadChecksums}
                  </a>
                </div>
                <p className={styles.honest}>
                  {hero.honestLine} <a href={`#${SECTIONS.limits}`}>{install.limitsLink}</a>
                </p>
                <ol className={styles.steps}>
                  {checkStep ? (
                    <li>
                      {inline(checkStep)}
                      <span className={styles.stepNote}>{install.byHand.checksumNote}</span>
                    </li>
                  ) : null}
                  {otherSteps.map((step) => (
                    <li key={step}>{inline(step)}</li>
                  ))}
                </ol>
                <p className={styles.gatekeeper}>{install.byHand.gatekeeper}</p>
              </div>
            </div>
          </>
        ) : (
          <p className={styles.soon}>
            <a href={links.repo}>{cta.github}</a>
          </p>
        )}

        <div className={styles.after}>
          <div>
            <h3>{install.firstRun.title}</h3>
            <p>{install.firstRun.body}</p>
          </div>
          <div>
            <h3>{install.update.title}</h3>
            <p>
              {inline(install.update.body)} <a href={install.update.link.href}>{install.update.link.label}</a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
