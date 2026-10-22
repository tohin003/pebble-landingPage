// /llms.txt (llmstxt.org): the factual summary in src/content/seo.ts, served as a static file at build time. A route
// rather than a copy in public/, so it can never drift from seo.ts.
import { llmsTxt } from "@/content/seo";

export const dynamic = "force-static";

export function GET(): Response {
  return new Response(llmsTxt, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
