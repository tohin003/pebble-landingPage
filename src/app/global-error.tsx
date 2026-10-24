"use client";
// The last-resort page Next shows when a page fails on the server and the root layout itself can't render (a 500).
// Next's own has no lang attribute (QA F-500-1); this one is the site's, kept plain on purpose:
// - <html lang="en-GB">, as the root layout's;
// - the six roles' values in both themes (light-dark(), with color-scheme), the system's sans: the web fonts, the
//   stylesheet and the theme switch all belong to the root layout, which is what failed;
// - its words from copy.ts (`globalError`), one button that reloads the page and one link home. No other imports, so
//   nothing here can fail in turn.
import { globalError } from "@/content/copy";

const page = {
  margin: 0,
  minHeight: "100dvh",
  display: "grid",
  placeItems: "center",
  padding: "32px 16px",
  background: "light-dark(#f8f9f6, #191e1b)",
  color: "light-dark(#1d2520, #e8eee6)",
  font: '16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
} as const;

const muted = { color: "light-dark(#5d665e, #adb9ab)" } as const;

export default function GlobalError() {
  return (
    <html lang="en-GB" style={{ colorScheme: "light dark" }}>
      <head>
        <title>{`${globalError.title} – Pebble`}</title>
      </head>
      <body style={page}>
        <main style={{ maxWidth: "32em" }}>
          <h1 style={{ margin: 0, fontSize: "28px", lineHeight: 1.2, fontWeight: 500 }}>{globalError.title}</h1>
          <p style={{ ...muted, margin: "12px 0 0" }}>{globalError.body}</p>
          <p style={{ margin: "20px 0 0", display: "flex", flexWrap: "wrap", gap: "12px 24px", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                font: "inherit",
                fontWeight: 500,
                minHeight: "44px",
                padding: "0 16px",
                borderRadius: "8px",
                border: "1px solid light-dark(#1d252047, #e8eee647)",
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              {globalError.retry}
            </button>
            <a href="/" style={{ color: "inherit", fontWeight: 500 }}>
              {globalError.home}
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
