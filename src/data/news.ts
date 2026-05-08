// Weather news feed via Google News RSS (CORS-proxied).


export interface NewsItem {
  title: string;
  link: string;
  pubDate?: string;
  source?: string;
  description?: string;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripHtml(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, "")).trim();
}

function pickCData(xml: string, tag: string): string | undefined {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  if (!m) return undefined;
  const inner = m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  return decodeEntities(inner).trim();
}

export async function fetchWeatherNews(country?: string, lang: string = "en"): Promise<NewsItem[]> {
  const hl = lang === "el" ? "el" : "en-US";
  const gl = (country ?? "US").toUpperCase();
  const ceid = `${gl}:${hl.split("-")[0]}`;
  const query = encodeURIComponent("weather OR storm OR forecast OR hurricane OR flood");
  const feedUrl = `https://news.google.com/rss/search?q=${query}&hl=${hl}&gl=${gl}&ceid=${ceid}`;

  // Try several CORS proxies (Google News blocks direct browser fetches).
  const attempts: Array<() => Promise<string | null>> = [
    async () => {
      const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`);
      if (!r.ok) return null;
      const j = await r.json().catch(() => null);
      return j?.contents ?? null;
    },
    async () => {
      const r = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`);
      if (!r.ok) return null;
      return await r.text();
    },
    async () => {
      const r = await fetch(`https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(feedUrl)}`);
      if (!r.ok) return null;
      const t = await r.text();
      return t && t.length > 0 ? t : null;
    },
    async () => {
      const r = await fetch(`https://r.jina.ai/${feedUrl}`);
      if (!r.ok) return null;
      return await r.text();
    },
  ];

  let text = "";
  for (const attempt of attempts) {
    try {
      const got = await attempt();
      if (got && got.includes("<item")) { text = got; break; }
    } catch {}
  }
  if (!text) return [];

  // r.jina.ai returns markdown sometimes — fallback to detect <item>
  const items: NewsItem[] = [];
  const itemRegex = /<item\b[\s\S]*?<\/item>/g;
  const matches = text.match(itemRegex) ?? [];
  for (const raw of matches.slice(0, 30)) {
    const title = pickCData(raw, "title");
    const link = pickCData(raw, "link");
    const pubDate = pickCData(raw, "pubDate");
    const source = pickCData(raw, "source");
    const descRaw = pickCData(raw, "description");
    const description = descRaw ? stripHtml(descRaw) : undefined;
    if (title && link) items.push({ title, link, pubDate, source, description });
  }
  return items;
}
