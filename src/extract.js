const pick = (html, regex) => {
  const m = regex.exec(html);
  return m ? m[1].replace(/\s+/g, " ").trim() : undefined;
};

const meta = (html, name) =>
  pick(html, new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)["']`, "i")) ??
  pick(html, new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${name}["']`, "i"));

/** Pulls the fields a link card needs out of an HTML document. */
export function extractPreview(html) {
  return {
    title: meta(html, "og:title") ?? pick(html, /<title[^>]*>([^<]*)<\/title>/i),
    description: meta(html, "og:description") ?? meta(html, "description"),
    image: meta(html, "og:image"),
  };
}
