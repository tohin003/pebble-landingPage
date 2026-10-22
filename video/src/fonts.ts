import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// The same woff2 files as the site's src/fonts (see public/fonts/README.md). Never @remotion/google-fonts: it needs the
// network during renders. loadFont() holds the render (delayRender) until each face is ready.
export const FONT = {
  display: "Fraunces",
  sans: "Inter",
  mono: "Geist Mono",
} as const;

loadFont({ family: FONT.display, url: staticFile("fonts/Fraunces-Variable-latin.woff2"), weight: "100 900" });
loadFont({ family: FONT.sans, url: staticFile("fonts/Inter-Variable-opsz-latin.woff2"), weight: "100 900" });
loadFont({ family: FONT.mono, url: staticFile("fonts/GeistMono-Regular-latin.woff2"), weight: "400" });
loadFont({ family: FONT.mono, url: staticFile("fonts/GeistMono-Medium-latin.woff2"), weight: "500" });

// Fraunces' default instance is WONK 1; D14 asks for SOFT 100 and WONK 0.
export const FRAUNCES_AXES = '"SOFT" 100, "WONK" 0';
