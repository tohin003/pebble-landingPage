import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const PAGES = ["/", "/film", "/credits", "/privacy"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((path) => ({
    url: siteUrl(path).toString(),
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.5,
  }));
}
