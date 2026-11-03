import test from "node:test";
import assert from "node:assert";
import { extractPreview } from "../src/extract.js";

test("prefers Open Graph tags", () => {
  const html = `<head><title>Plain</title><meta property="og:title" content="Card title"><meta name="description" content="Short text"></head>`;
  assert.deepEqual(extractPreview(html), { title: "Card title", description: "Short text", image: undefined });
});

test("falls back to the title element", () => {
  assert.equal(extractPreview("<title> Hello   world </title>").title, "Hello world");
});

test("reads content-first meta tags", () => {
  assert.equal(extractPreview(`<meta content="img.png" property="og:image">`).image, "img.png");
});
