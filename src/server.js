import express from "express";
import { extractPreview } from "./extract.js";

const MAX_BYTES = 512 * 1024;
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
    const upstream = await fetch(url, {
      headers: { "user-agent": "link-preview/0.2 (+https://github.com/p2pmerc/link-preview)", accept: "text/html" },
      signal: AbortSignal.timeout(5000),
    });
    const html = (await upstream.text()).slice(0, MAX_BYTES);
    const value = { url: url.href, status: upstream.status, ...extractPreview(html) };
    cache.set(url.href, { at: Date.now(), value });
    res.json(value);
  } catch (err) {
    res.status(502).json({ error: "could not fetch that page" });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(process.env.PORT ?? 3000, () => console.log("link-preview listening"));
}
