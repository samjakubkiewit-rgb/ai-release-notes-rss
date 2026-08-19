import { mkdir, writeFile } from "node:fs/promises";
import { entriesFromDatedHtml, renderFeed } from "./worker.mjs";

const urls = {
  claude: "https://support.claude.com/en/articles/12138966-release-notes",
  microsoft: "https://learn.microsoft.com/en-us/microsoft-365/copilot/release-notes",
  openai: "https://openai.com/products/release-notes/",
  openaiReader: "https://r.jina.ai/http://openai.com/products/release-notes/",
};

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "ReleaseNotesRSS/2.0 (+GitHub Pages feed generator)" },
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.text();
}

const OPENAI_DATE = /^(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},\s+\d{4}$/i;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function plainMarkdown(value) {
  return value.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "").replace(/^[-*]\s+/gm, "")
    .replace(/\*\*|__|`/g, "").replace(/\s+/g, " ").trim();
}

function entriesFromOpenAiMarkdown(markdown, sourceUrl) {
  const lines = markdown.split(/\r?\n/);
  const markers = lines.flatMap((line, index) => OPENAI_DATE.test(line.trim()) ? [{ index, label: line.trim() }] : []);
  const entries = [];

  for (let markerIndex = 0; markerIndex < markers.length; markerIndex += 1) {
    const marker = markers[markerIndex];
    const nextMarker = markers[markerIndex + 1]?.index ?? lines.length;
    const headingIndex = lines.findIndex((line, index) =>
      index > marker.index && index < nextMarker && /^##\s+/.test(line.trim()));
    if (headingIndex < 0) continue;

    const date = new Date(`${marker.label} 12:00:00 UTC`);
    if (!Number.isFinite(date.getTime())) continue;
    const title = plainMarkdown(lines[headingIndex].trim().replace(/^##\s+/, ""));
    if (!title) continue;

    const sectionLines = lines.slice(headingIndex + 1, Math.max(headingIndex + 1, nextMarker - 1));
    const sourceLink = sectionLines.join("\n").match(/\[View source[^\]]*\]\((https?:\/\/[^)]+)\)/i)?.[1];
    const bodyEnd = sectionLines.findIndex((line) => /^\[View source/i.test(line.trim()));
    const body = plainMarkdown(sectionLines.slice(0, bodyEnd < 0 ? sectionLines.length : bodyEnd).join("\n"));
    const day = date.toISOString().slice(0, 10);
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    entries.push({
      date,
      title: `OpenAI — ${title}`,
      link: sourceLink ?? sourceUrl,
      guid: `${sourceUrl}#rss-${day}-${slug}`,
      content: `<p>${escapeHtml(body || title)}</p>`,
    });
  }

  if (!entries.length) {
    throw new Error(`${sourceUrl} did not contain any dated release-note entries`);
  }
  return entries;
}

const [claudeHtml, microsoftHtml, openaiMarkdown] = await Promise.all([
  fetchText(urls.claude),
  fetchText(urls.microsoft),
  fetchText(urls.openaiReader),
]);

const claudeEntries = entriesFromDatedHtml(claudeHtml, {
  sourceUrl: urls.claude, headingLevel: 3, titlePrefix: "Claude updates",
});
const microsoftEntries = entriesFromDatedHtml(microsoftHtml, {
  sourceUrl: urls.microsoft, headingLevel: 2, titlePrefix: "Microsoft 365 Copilot updates",
});
const openaiEntries = entriesFromOpenAiMarkdown(openaiMarkdown, urls.openai);

const baseUrl = process.env.PAGES_BASE_URL ?? "";
const feeds = [
  ["feed.xml", renderFeed({
    title: "Claude release notes", description: "Claude features and improvements.",
    siteUrl: urls.claude, selfUrl: baseUrl && `${baseUrl}/feed.xml`, entries: claudeEntries,
  })],
  ["microsoft-365-copilot.xml", renderFeed({
    title: "Microsoft 365 Copilot release notes", description: "Microsoft 365 Copilot features and improvements.",
    siteUrl: urls.microsoft, selfUrl: baseUrl && `${baseUrl}/microsoft-365-copilot.xml`, entries: microsoftEntries,
  })],
  ["openai.xml", renderFeed({
    title: "OpenAI product release notes", description: "OpenAI product updates and release notes.",
    siteUrl: urls.openai, selfUrl: baseUrl && `${baseUrl}/openai.xml`, entries: openaiEntries,
  })],
];

await mkdir("public", { recursive: true });
for (const [filename, xml] of feeds) await writeFile(`public/${filename}`, xml, "utf8");
await writeFile("public/index.html", `<!doctype html><meta charset="utf-8"><title>AI release-note feeds</title>
<h1>AI release-note feeds</h1><ul>
<li><a href="feed.xml">Claude release notes</a></li>
<li><a href="microsoft-365-copilot.xml">Microsoft 365 Copilot release notes</a></li>
<li><a href="openai.xml">OpenAI product release notes</a></li>
</ul>`, "utf8");

console.log(JSON.stringify({
  claude: claudeEntries.length,
  microsoft: microsoftEntries.length,
  openai: openaiEntries.length,
}));
