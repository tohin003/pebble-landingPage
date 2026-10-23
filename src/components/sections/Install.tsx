// Section 12, Install (DESIGN-LEXINGTON §6 row 12; comp A; OVERRIDES §1, §2, §8 H14, §16).
//
// The head through SectionHead: "Install / Version 1.0.4" in the rail (the version the page offers, as data), the H2
// "Install Pebble." with the lead's first sentence as its muted second line, the rest of the lead, the film chip.
// The exhibit, from column 4:
// - the requirements strip: four cells between hairlines (macOS always with "Built and tested on macOS 27"), the size
//   and the version as data;
// - the one-line command on a flat --fill block with Copy (Install.pill.tsx); the small live pebble perches on its top
//   edge and taps when the command is copied. Under it, "Read the installer first ›" and two of its options;
// - two ways side by side (a 4 | 5 split): what the installer does, with the installer's ticks (a state mark, one of the
//   accent's three jobs), and "Or download it and check it": the zip and SHA256SUMS, the short honest line next to
//   those downloads (OVERRIDES §2), the steps as plain numerals, the checksum's own limit under its step (DESIGN §9)
//   and, while the release offered is the one src/content/releaseFacts.ts describes, the zip's line in SHA256SUMS;
// - first run and updates (4 | 5). Uninstalling in full is in the FAQ.
// The release facts come from src/lib/release.ts (the GitHub API, with releaseFacts.ts as the known-good values). With
// PEBBLE_RELEASE_STATE=soon (a manual override only) there is no command and no download.
import { cta, hero, install, links } from "@/content/copy";
import { labels } from "@/content/labels";
import { releaseFacts, sha256Line } from "@/content/releaseFacts";
import { Pebble } from "@/components/pebble/Pebble";
import { Icon } from "@/components/shell/icons";
import { DataText } from "@/components/ui/Data";
import { SectionHead } from "@/components/ui/SectionHead";
import { TextLink } from "@/components/ui/TextLink";
import { firstSentence } from "@/components/ui/twoTone";
import { inline } from "@/lib/inline";
import { getRelease } from "@/lib/release";
import { SECTIONS, sectionHref } from "@/lib/sections";
import { InstallPill } from "./Install.pill";
import styles from "./Install.module.css";

const PEBBLE_NAME = "install";
/** "One line in Terminal, or the zip by hand." under the H2, then "Both install the same app …" as the lead */
const [THEN, LEAD] = firstSentence(install.lead);

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
  // the hash belongs to one release: never print it beside a download of another
  const showHash = release.version === releaseFacts.version;
  return (
    <section id={SECTIONS.install} className="sec" aria-labelledby="install-title">
      <SectionHead
        id="install-title"
        label={labels.install(release.version)}
        title={install.h2}
        then={THEN}
        lead={LEAD}
        chip="get"
      />

      <div className="wrap grid-12 sec-body">
        <div className={`main ${styles.body}`}>
          <dl className={styles.requirements} aria-label={req.title}>
            {cells.map((cell) => (
              <div key={cell.label} className={styles.cell}>
                <dt>{cell.label}</dt>
                <dd>
                  <DataText text={cell.value} className={styles.value} />
                  <DataText text={cell.note} className={styles.note} />
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
                  {/* decorative: the box lets the pointer through to the block; the Copy button makes it tap */}
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
                    <TextLink href={install.oneLine.readFirst.href}>{install.oneLine.readFirst.label}</TextLink>
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
                    <a className="chev" href={release.checksumsUrl} translate="no">
                      {install.byHand.downloadChecksums}
                    </a>
                  </div>
                  <p className={styles.honest}>
                    {hero.honestLine} <TextLink href={sectionHref("limits")}>{install.limitsLink}</TextLink>
                  </p>
                  <ol className={styles.steps}>
                    {checkStep ? (
                      <li>
                        {inline(checkStep)}
                        <span className={styles.stepNote}>{install.byHand.checksumNote}</span>
                        {showHash ? (
                          <span className={styles.hash}>
                            {inline(install.byHand.sha256Intro(release.version))}
                            <code className={styles.hashLine} translate="no">
                              {sha256Line()}
                            </code>
                          </span>
                        ) : null}
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
              <TextLink href={links.repo}>{cta.github}</TextLink>
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
                {inline(install.update.body)} <TextLink href={install.update.link.href}>{install.update.link.label}</TextLink>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
