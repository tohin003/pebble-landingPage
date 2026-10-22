// Which call to action a visitor sees: by platform, not by width (docs/DESIGN.md §7, MASTER_PLAN §7.4).
//
// Pebble runs on Macs with Apple silicon. A Mac sees "Download for Mac"; everyone else sees "Pebble is for Macs with
// Apple silicon." and "Send yourself the link". iPads report a Mac user agent ("Macintosh", platform "MacIntel") since
// iPadOS 13, so a touch screen (navigator.maxTouchPoints > 1) means "not a Mac". Browsers can't tell Intel Macs from
// Apple-silicon ones reliably, so every Mac gets the download and the facts list says "Apple silicon".
//
// The inline <head> script (bootstrap.ts) runs the same test before first paint and sets html[data-platform], so both
// variants are in the server HTML and CSS shows one: no hydration mismatch and no flash. Without JavaScript, the Mac
// variant shows.

export type Platform = "mac" | "other";

export type NavigatorLike = Readonly<{
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
  userAgentData?: Readonly<{ platform?: string; mobile?: boolean }> | null;
}>;

export function detectPlatform(nav: NavigatorLike): Platform {
  const ua = nav.userAgent ?? "";
  const hinted = nav.userAgentData?.platform ?? "";
  const legacy = nav.platform ?? "";
  if (/iPhone|iPad|iPod|Android/i.test(ua) || nav.userAgentData?.mobile) return "other";
  if ((nav.maxTouchPoints ?? 0) > 1) return "other"; // iPadOS asking for the desktop site
  const mac = /^macOS$/i.test(hinted) || /^Mac/i.test(legacy) || /Macintosh|Mac OS X/.test(ua);
  return mac ? "mac" : "other";
}

/** The platform the page settled on before first paint (html[data-platform]); "mac" when it is not set. */
export function currentPlatform(): Platform {
  return document.documentElement.dataset.platform === "other" ? "other" : "mac";
}
