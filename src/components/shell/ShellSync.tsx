"use client";
// Keeps html[data-theme], html[data-motion] and html[data-platform] right after first paint. The inline <head> script
// (src/lib/bootstrap.ts) sets them before first paint; this component, mounted once in the root layout:
// - sets them again on mount. That is a no-op in production; in development, React's Strict Mode remount resets the
//   <html> attributes it doesn't own (Next.js guide "Preventing flash before hydration");
// - follows the system theme while the visitor has made no choice, and the system's reduced-motion setting.
import { useLayoutEffect } from "react";
import { applyMotion, REDUCED_QUERY } from "@/lib/motion";
import { detectPlatform } from "@/lib/platform";
import { applyTheme, followSystemTheme } from "@/lib/theme";

export function ShellSync() {
  useLayoutEffect(() => {
    applyTheme();
    applyMotion();
    const root = document.documentElement;
    const platform = detectPlatform(navigator as Navigator & { userAgentData?: { platform?: string; mobile?: boolean } });
    if (root.dataset.platform !== platform) root.dataset.platform = platform;

    const stopTheme = followSystemTheme();
    const reduced = window.matchMedia(REDUCED_QUERY);
    reduced.addEventListener("change", applyMotion);
    return () => {
      stopTheme();
      reduced.removeEventListener("change", applyMotion);
    };
  }, []);
  return null;
}
