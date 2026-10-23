"use client";
// The honesty stamp (MASTER_PLAN §7.2 row 12, R4 §6.5 signature 9): "This page: 0 cookies, 0 trackers, 0 third-party
// requests", counted live in the visitor's own browser, never written into the HTML. Nothing shows until it has been
// counted (no JavaScript, no stamp: never a static claim).
//
// - Files: every resource the page loaded (Resource Timing, kept up to date by a PerformanceObserver, so lazy images
//   and videos that load later are counted too), plus the page itself.
// - Third-party requests: files from any origin other than this site's.
// - Trackers: requests to known analytics or advertising services, Vercel's own analytics endpoints (same origin, so
//   they would not show as third-party), and beacons (navigator.sendBeacon).
// - Cookies: the cookies this page can see (document.cookie).
// A disclosure lists the files, so the count can be checked.
import { useEffect, useState } from "react";
import { DataText } from "@/components/ui/Data";
import { footer } from "@/content/copy";
import { inline } from "@/lib/inline";
import styles from "./Footer.module.css";

/** the counted nouns: their numbers are data (Geist Mono, tabular figures) */
const COUNTED = ["cookie", "cookies", "tracker", "trackers", "third-party"] as const;

const TRACKER_HOSTS = [
  "google-analytics.com",
  "googletagmanager.com",
  "doubleclick.net",
  "googlesyndication.com",
  "facebook.net",
  "facebook.com",
  "hotjar.com",
  "segment.io",
  "segment.com",
  "mixpanel.com",
  "amplitude.com",
  "plausible.io",
  "posthog.com",
  "clarity.ms",
  "bat.bing.com",
  "ads.linkedin.com",
  "analytics.twitter.com",
  "ads-twitter.com",
  "fullstory.com",
  "heapanalytics.com",
  "sentry.io",
  "nr-data.net",
  "vercel-insights.com",
  "vercel-analytics.com",
];
const TRACKER_PATHS = ["/_vercel/insights", "/_vercel/speed-insights"];

type Tally = Readonly<{ cookies: number; trackers: number; thirdParty: number; files: readonly string[]; others: readonly string[] }>;

function isTracker(url: URL, initiator: string): boolean {
  if (initiator === "beacon" || initiator === "ping") return true;
  const host = url.hostname.toLowerCase();
  if (TRACKER_HOSTS.some((t) => host === t || host.endsWith(`.${t}`))) return true;
  return url.origin === window.location.origin && TRACKER_PATHS.some((p) => url.pathname.startsWith(p));
}

function tally(entries: ReadonlyMap<string, string>): Tally {
  const own = window.location.origin;
  const files = [window.location.pathname];
  const others: string[] = [];
  let trackers = 0;
  for (const [name, initiator] of entries) {
    let url: URL;
    try {
      url = new URL(name, own);
    } catch {
      continue;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") continue; // data: and blob: never leave the browser
    if (isTracker(url, initiator)) trackers++;
    if (url.origin === own) files.push(`${url.pathname}${url.search}`);
    else others.push(url.href);
  }
  const cookies = document.cookie
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean).length;
  return { cookies, trackers, thirdParty: others.length, files: [...new Set(files)], others: [...new Set(others)] };
}

export function HonestyStamp() {
  const [counted, setCounted] = useState<Tally | null>(null);

  useEffect(() => {
    if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") return;
    const seen = new Map<string, string>(); // url → initiator type
    let frame = 0;
    const add = (list: readonly PerformanceEntry[]) => {
      for (const entry of list) {
        const timing = entry as PerformanceResourceTiming;
        if (!seen.has(timing.name)) seen.set(timing.name, timing.initiatorType ?? "");
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setCounted(tally(seen)));
    };
    add(performance.getEntriesByType("resource"));
    let observer: PerformanceObserver | null = null;
    try {
      observer = new PerformanceObserver((list) => add(list.getEntries()));
      observer.observe({ type: "resource", buffered: true });
    } catch {
      observer = null; // older engines: the first count stands
    }
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, []);

  if (!counted) return null;
  const stamp = footer.honestyStamp;
  const details = footer.honestyDetails;
  return (
    <div className={styles.stamp}>
      <div className={styles.stampLine}>
        <span>{stamp.lead}</span>
        <ul className={`facts ${styles.stampFacts}`}>
          <li>
            <DataText text={stamp.cookies(counted.cookies)} counts={COUNTED} />
          </li>
          <li>
            <DataText text={stamp.trackers(counted.trackers)} counts={COUNTED} />
          </li>
          <li>
            <DataText text={stamp.thirdParty(counted.thirdParty)} counts={COUNTED} />
          </li>
        </ul>
      </div>
      <details className={styles.stampDetails}>
        <summary>{details.summary}</summary>
        <div className={styles.stampBody}>
          <p>{inline(details.body)}</p>
          <p>{details.trackers}</p>
          {counted.others.length === 0 ? <p>{details.allSameOrigin}</p> : null}
          <p className={styles.fileHeading}>{details.listHeading}</p>
          {/* scrollable, so it takes keyboard focus */}
          <ul className={styles.files} tabIndex={0} aria-label={details.listHeading}>
            {counted.files.map((file) => (
              <li key={file} translate="no">
                {file}
              </li>
            ))}
          </ul>
          {counted.others.length > 0 ? (
            <>
              <p className={styles.fileHeading}>{details.otherSites}</p>
              <ul className={styles.files} tabIndex={0} aria-label={details.otherSites}>
                {counted.others.map((file) => (
                  <li key={file} translate="no">
                    {file}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </details>
    </div>
  );
}
