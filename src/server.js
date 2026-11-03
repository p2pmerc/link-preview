import express from "express";
import { extractPreview } from "./extract.js";
import { assertPublicUrl } from "./guard.js";

const MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;
const cache = new Map();

export const app = express();

app.get("/preview", async (req, res) => {
  const target = String(req.query.url ?? "");
  let url;
  try {
    url = new URL(target);
  } catch {
    return res.status(400).json({ error: "url must be a valid absolute URL" });
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return res.status(400).json({ error: "only http and https links are supported" });
  }

  const cached = cache.get(url.href);
  if (cached && Date.now() - cached.at < 5 * 60_000) return res.json(cached.value);

  try {
    // Follow redirects by hand so every hop is checked, not just the first URL.
    let current = url;
    let upstream;
    for (let hops = 0; ; hops++) {
      await assertPublicUrl(current);
      upstream = await fetch(current, {
        headers: { "user-agent": "link-preview/0.2 (+https://github.com/p2pmerc/link-preview)", accept: "text/html" },
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      });
      const location = upstream.headers.get("location");
      if (upstream.status < 300 || upstream.status >= 400 || !location) break;
      if (hops >= MAX_REDIRECTS) throw new Error("too many redirects");
      current = new URL(location, current);
      if (current.protocol !== "http:" && current.protocol !== "https:") throw new Error("bad redirect");
    }
    const html = (await upstream.text()).slice(0, MAX_BYTES);
    const value = { url: url.href, status: upstream.status, ...extractPreview(html) };
    cache.set(url.href, { at: Date.now(), value });
    res.json(value);
  } catch (err) {
    if (err?.code === "BLOCKED_TARGET") return res.status(400).json({ error: "that address is not allowed" });
    res.status(502).json({ error: "could not fetch that page" });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(process.env.PORT ?? 3000, () => console.log("link-preview listening"));
}
