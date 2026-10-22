// The inline <head> script must agree with theme.ts, motion.ts and platform.ts. Run: bun test ./src/lib
import { describe, expect, test } from "bun:test";
import { BOOTSTRAP_SCRIPT } from "./bootstrap";
import { detectPlatform, type NavigatorLike } from "./platform";

type Env = Readonly<{
  stored?: Record<string, string>;
  storageThrows?: boolean;
  dark?: boolean;
  reduce?: boolean;
  nav: NavigatorLike;
}>;

function runBootstrap(env: Env): Record<string, string> {
  const attrs: Record<string, string> = {};
  const document = { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) } };
  const localStorage = {
    getItem: (key: string) => {
      if (env.storageThrows) throw new Error("SecurityError");
      return env.stored?.[key] ?? null;
    },
  };
  const window = {
    matchMedia: (q: string) => ({
      matches: q.includes("prefers-color-scheme: dark") ? !!env.dark : q.includes("prefers-reduced-motion: reduce") ? !!env.reduce : false,
    }),
  };
  new Function("document", "localStorage", "window", "navigator", BOOTSTRAP_SCRIPT)(document, localStorage, window, env.nav);
  return attrs;
}

const MAC_SAFARI: NavigatorLike = {
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15",
  platform: "MacIntel",
  maxTouchPoints: 0,
};
const MAC_CHROME: NavigatorLike = {
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36",
  platform: "MacIntel",
  maxTouchPoints: 0,
  userAgentData: { platform: "macOS", mobile: false },
};
const IPAD_DESKTOP: NavigatorLike = { ...MAC_SAFARI, maxTouchPoints: 5 };
const IPHONE: NavigatorLike = {
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
  platform: "iPhone",
  maxTouchPoints: 5,
};
const WINDOWS: NavigatorLike = {
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36",
  platform: "Win32",
  maxTouchPoints: 0,
  userAgentData: { platform: "Windows", mobile: false },
};
const ANDROID: NavigatorLike = {
  userAgent: "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36",
  platform: "Linux armv8l",
  maxTouchPoints: 5,
  userAgentData: { platform: "Android", mobile: true },
};

describe("platform", () => {
  const cases: [string, NavigatorLike, "mac" | "other"][] = [
    ["Mac Safari", MAC_SAFARI, "mac"],
    ["Mac Chrome", MAC_CHROME, "mac"],
    ["iPad asking for the desktop site", IPAD_DESKTOP, "other"],
    ["iPhone", IPHONE, "other"],
    ["Windows", WINDOWS, "other"],
    ["Android", ANDROID, "other"],
  ];
  for (const [name, nav, expected] of cases) {
    test(name, () => {
      expect(detectPlatform(nav)).toBe(expected);
      expect(runBootstrap({ nav })["data-platform"]).toBe(expected);
    });
  }
});

describe("theme", () => {
  test("a stored choice wins over the system", () => {
    expect(runBootstrap({ nav: MAC_SAFARI, stored: { "pebble-theme": "dark" } })["data-theme"]).toBe("dark");
    expect(runBootstrap({ nav: MAC_SAFARI, stored: { "pebble-theme": "light" }, dark: true })["data-theme"]).toBe("light");
  });
  test("no choice: the system", () => {
    expect(runBootstrap({ nav: MAC_SAFARI, dark: true })["data-theme"]).toBe("dark");
    expect(runBootstrap({ nav: MAC_SAFARI })["data-theme"]).toBe("light");
  });
  test("junk in storage is ignored", () => {
    expect(runBootstrap({ nav: MAC_SAFARI, stored: { "pebble-theme": "purple" }, dark: true })["data-theme"]).toBe("dark");
  });
  test("blocked storage still sets every attribute", () => {
    const attrs = runBootstrap({ nav: MAC_SAFARI, storageThrows: true, dark: true, reduce: true });
    expect(attrs).toEqual({ "data-theme": "dark", "data-motion": "paused", "data-platform": "mac" });
  });
});

describe("motion", () => {
  test("on by default", () => expect(runBootstrap({ nav: MAC_SAFARI })["data-motion"]).toBe("on"));
  test("Pause motion stored", () => expect(runBootstrap({ nav: MAC_SAFARI, stored: { "pebble-motion": "paused" } })["data-motion"]).toBe("paused"));
  test("the system's reduced motion always wins", () => {
    expect(runBootstrap({ nav: MAC_SAFARI, reduce: true, stored: { "pebble-motion": "on" } })["data-motion"]).toBe("paused");
  });
});

test("the script stays small", () => {
  expect(BOOTSTRAP_SCRIPT.length).toBeLessThan(1024);
});
