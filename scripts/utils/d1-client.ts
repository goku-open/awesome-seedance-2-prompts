import fetch from "node-fetch";

const API_HOST = process.env.API_HOST || "https://api-ph.gokuscraper.com";

export interface D1PromptItem {
  id: string;
  version: string | null;
  category: string | null;
  is_featured: number | null;
  date: string | null;
  slug: string | null;
  raw_p: string | null;
  model_info: Record<string, any> | string | null;
  media: Record<string, any> | string | null;
  spec: Record<string, any> | string | null;
  i18n: Record<string, any> | string | null;
  platform: string | null;
  sourceLink: string | null;
  file_name: string | null;
}

export interface Prompt {
  id: string;
  title: string;
  description: string;
  content: string;
  translatedContent?: string;
  sourceLink?: string;
  sourcePublishedAt: string;
  video?: string;
  poster?: string;
  author: { name: string; link?: string };
  language: string;
  featured: boolean;
  needReferenceImages?: boolean;
}

interface ListResponse {
  items: D1PromptItem[];
  total: number;
}

export function mapPromptForLocale(item: D1PromptItem, locale: string): Prompt {
  return mapPrompt(item, locale);
}

function getLocalizedField(
  i18n: Record<string, any> | string | null,
  locale: string,
  field: "t" | "p"
): string | null {
  if (!i18n) return null;
  const parsed = typeof i18n === "string" ? tryParseJson(i18n) : i18n;
  if (!parsed || typeof parsed !== "object") return null;

  const langBranch = parsed[locale];
  if (langBranch && typeof langBranch[field] === "string") {
    return langBranch[field];
  }

  if (locale === "zh" && parsed["zh-CN"]?.p) {
    return parsed["zh-CN"].p;
  }

  return null;
}

function tryParseJson(value: string): Record<string, any> | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getMediaVideo(media: Record<string, any> | string | null): { video?: string; poster?: string } {
  if (!media) return {};
  const parsed = typeof media === "string" ? tryParseJson(media) : media;
  if (!parsed || typeof parsed !== "object") return {};
  return {
    video: typeof parsed.v === "string" ? parsed.v : undefined,
    poster: typeof parsed.c === "string" ? parsed.c : undefined,
  };
}

function getAuthorName(sourceLink: string | null, platform: string | null): string {
  if (sourceLink) {
    try {
      const url = new URL(sourceLink);
      const segments = url.pathname.split("/").filter(Boolean);
      if (url.hostname.includes("x.com") || url.hostname.includes("twitter.com")) {
        return segments.length > 0 ? `@${segments[0]}` : "Unknown";
      }
    } catch {
    }
  }
  return platform || "Unknown";
}

function getAuthorLink(sourceLink: string | null): string | undefined {
  if (!sourceLink) return undefined;
  try {
    const url = new URL(sourceLink);
    const segments = url.pathname.split("/").filter(Boolean);
    if (url.hostname.includes("x.com") || url.hostname.includes("twitter.com")) {
      return `https://x.com/${segments[0]}`;
    }
    return sourceLink;
  } catch {
    return undefined;
  }
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength - 1).trim() + "…";
}

function mapPrompt(item: D1PromptItem, locale: string): Prompt {
  const i18nBranch = item.i18n;

  const localizedTitle =
    getLocalizedField(i18nBranch, locale, "t") ||
    getLocalizedField(i18nBranch, "en", "t") ||
    item.slug ||
    item.id;

  const rawContent = item.raw_p || "";
  const localizedContent =
    getLocalizedField(i18nBranch, locale, "p") || rawContent;

  const description = truncate(
    (localizedContent || rawContent || "").replace(/\s+/g, " ").trim(),
    160
  );

  const { video, poster } = getMediaVideo(item.media);

  return {
    id: item.id,
    title: localizedTitle,
    description,
    content: localizedContent,
    translatedContent: localizedContent !== rawContent ? rawContent : undefined,
    sourceLink: item.sourceLink || undefined,
    sourcePublishedAt: item.date || "",
    video,
    poster,
    author: {
      name: getAuthorName(item.sourceLink, item.platform),
      link: getAuthorLink(item.sourceLink),
    },
    language: locale,
    featured: item.is_featured === 1,
    needReferenceImages: false,
  };
}

export async function fetchAllPrompts(
  locale: string = "en",
  pageSize: number = 100
): Promise<{ docs: Prompt[]; total: number }> {
  const { items, total } = await fetchItems(pageSize);
  return { docs: items.map((item) => mapPrompt(item, locale)), total };
}

export async function fetchItems(
  pageSize: number = 100
): Promise<{ items: D1PromptItem[]; total: number }> {
  const url = `${API_HOST}/api/list?pageSize=${Math.min(pageSize, 200)}&random=1&model=SeedDance+2`;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`D1 API error: ${response.statusText}`);
  }

  const data = (await response.json()) as ListResponse;
  return { items: data.items, total: data.total };
}
