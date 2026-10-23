"use client";
// "Before you open Pebble" (MASTER_PLAN §7.4): after a click on a Download inside `children`, a short panel under them
// explains the one-time first-run step and links to "Why isn't it notarized?". The download is never held up: the
// link keeps its default action. Close (or Esc) returns focus to the Download. A polite live region announces it.
// Used by GetPebbleCluster, so the hero and the final call to action behave the same.
import { useId, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { Icon } from "@/components/shell/icons";
import { cta, downloadNotice } from "@/content/copy";
import { inline } from "@/lib/inline";
import { sectionHref } from "@/lib/sections";
import styles from "./DownloadNotice.module.css";

export function DownloadNotice({
  children,
  className,
  style,
  headingLevel = 2,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** 2 under the hero's H1, 3 inside a section with its own H2 */
  headingLevel?: 2 | 3;
}) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const Heading = headingLevel === 3 ? "h3" : "h2";

  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    const link = (event.target as Element | null)?.closest?.<HTMLElement>('[data-cta="download"]');
    if (!link) return;
    opener.current = link;
    setOpen(true); // the link's own action (the download) goes ahead
  };

  const close = () => {
    setOpen(false);
    opener.current?.focus({ preventScroll: true });
  };

  return (
    <>
      <div className={className} style={style} onClickCapture={onClickCapture}>
        {children}
      </div>
      <div className={styles.slot} aria-live="polite">
        {open ? (
          <section
            className={styles.notice}
            aria-labelledby={titleId}
            onKeyDown={(event) => {
              if (event.key === "Escape") close();
            }}
          >
            <Heading id={titleId} className={styles.title}>
              {downloadNotice.title}
            </Heading>
            <button type="button" className={styles.close} onClick={close}>
              <Icon name="X" className={styles.closeIcon} />
              <span className="sr-only">{downloadNotice.close}</span>
            </button>
            {downloadNotice.body.map((paragraph) => (
              <p key={paragraph}>{inline(paragraph)}</p>
            ))}
            <p>
              <a href="#faq-notarized">{downloadNotice.whyLink}</a>
            </p>
            <p className={styles.tip}>
              {downloadNotice.installerTip} <a href={sectionHref("install")}>{cta.installLink}</a>
            </p>
          </section>
        ) : null}
      </div>
    </>
  );
}
