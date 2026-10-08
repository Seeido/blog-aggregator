import { XMLParser } from "fast-xml-parser";

type RSSFeed = {
  channel: {
    title: string;
    link: string;
    description: string;
    item: RSSItem[];
  };
};
type RSSItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

export async function fetchFeed(feedURL: string) {
  const res = await fetch(feedURL, {
    method: "GET",
    headers: {
      "User-Agent": "gator",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  const xml = await res.text();
  const parser = new XMLParser({
    processEntities: false,
  });
  const parsed = parser.parse(xml);

  const channel = parsed.rss?.channel;
  if (!channel) {
    throw new Error("feed has no channel element");
  }

  const { title, link, description } = channel;
  if (
    typeof title !== "string" ||
    typeof link !== "string" ||
    typeof description !== "string"
  ) {
    throw new Error("feed channel is missing title, link, or description");
  }

  let items = [];
  if (Array.isArray(channel.item)) {
    items = channel.item;
  } else if (channel.item && typeof channel.item === "object") {
    items = [channel.item];
  }

  const validItems: RSSItem[] = [];

  for (const item of items) {
    const { title, link, description, pubDate } = item;
    if (
      typeof title !== "string" ||
      typeof link !== "string" ||
      typeof description !== "string" ||
      typeof pubDate !== "string"
    ) {
      continue;
    }
    validItems.push({ title, link, description, pubDate });
  }

  const feed: RSSFeed = {
    channel: { title, link, description, item: validItems },
  };

  return feed;
}
