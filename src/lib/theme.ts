// Light and dark theme (docs/DESIGN.md §6, MASTER_PLAN §2.2). The inline <head> script (bootstrap.ts) sets
// html[data-theme] before first paint: the visitor's stored choice, otherwise the system's. These functions keep it
// in step afterwards. Plain DOM code, no React: hooks.ts wraps it for components.
//
// Storage holds only an explicit choice. Without one, the page follows the system, also while it is open.

export type Theme = "light" | "dark";

export const THEME_KEY = "pebble-theme";
export const DARK_QUERY = "(prefers-color-scheme: dark)";

/** The page background of each theme, which is also the browser's theme colour (MASTER_PLAN §7.8). */
export const THEME_COLOR: Readonly<Record<Theme, string>> = { light: "#F8F9F6", dark: "#191E1B" };

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/** The stored choice, or null (none, or storage is blocked). */
export function storedTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

export function systemTheme(): Theme {
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/** The theme the page shows now (html[data-theme]). */
export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** Show a theme: html[data-theme] plus the browser's theme colour, so its toolbar matches a manual choice. */
export function applyTheme(theme: Theme = storedTheme() ?? systemTheme()): void {
  const root = document.documentElement;
  if (root.dataset.theme !== theme) root.dataset.theme = theme;
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    if (meta.content !== THEME_COLOR[theme]) meta.content = THEME_COLOR[theme];
  }
}

/** Store an explicit choice and show it. */
export function setTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private windows and blocked storage: the choice lasts for this page view only.
  }
  applyTheme(theme);
}

/** Forget the stored choice: the page follows the system again (the footer's "System"). */
export function clearTheme(): void {
  try {
    window.localStorage.removeItem(THEME_KEY);
  } catch {
    // Blocked storage: nothing was stored.
  }
  applyTheme(systemTheme());
}

/** Follow the system theme while no choice is stored. Returns the unsubscribe function. */
export function followSystemTheme(): () => void {
  const query = window.matchMedia(DARK_QUERY);
  const onChange = () => {
    if (!storedTheme()) applyTheme(systemTheme());
  };
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Calls `listener` whenever html[data-theme] changes. */
export function subscribeTheme(listener: () => void): () => void {
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
