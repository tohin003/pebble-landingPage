// Each page's share card carries its own address: og:url is the page's canonical path, with the site's card text, so
// a shared /film link opens /film rather than the home page. Run: bun test ./src/content
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { openGraphFor, seo, twitterCard } from "./seo";

const app = join(import.meta.dir, "..", "app");

describe("openGraphFor", () => {
  test("keeps the site's card and sets the page's own url", () => {
    const card = { url: "/opengraph-image.png", width: 1200, height: 630, type: "image/png", alt: seo.openGraph.imageAlt };
    expect(openGraphFor("/film")).toEqual({
      type: "website",
      siteName: seo.siteName,
      locale: seo.openGraph.locale,
      url: "/film",
      title: seo.openGraph.title,
      description: seo.openGraph.description,
      images: [card],
    });
    expect(twitterCard().images).toEqual([card]);
  });

  test("the card's picture is the file Next.js serves at /opengraph-image.png", () => {
    expect(readFileSync(join(app, "opengraph-image.alt.txt"), "utf8").trim()).toBe(seo.openGraph.imageAlt);
    const png = readFileSync(join(app, "opengraph-image.png"));
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });

  test("every route's og:url equals its canonical path", () => {
    for (const [file, path] of [
      ["layout.tsx", "/"],
      ["film/page.tsx", "/film"],
      ["credits/page.tsx", "/credits"],
      ["privacy/page.tsx", "/privacy"],
    ] as const) {
      const source = readFileSync(join(app, file), "utf8");
      expect(source).toContain(`canonical: "${path}"`);
      expect(source).toContain(`openGraph: openGraphFor("${path}")`);
      expect(source).toContain("twitter: twitterCard()");
    }
  });
});
