import { mkdir, writeFile } from "node:fs/promises";
import { entriesFromDatedHtml, renderFeed } from "./worker.mjs";

const urls = {
  claude: "https://support.claude.com/en/articles/12138966-release-notes",
  microsoft: "https://learn.microsoft.com/en-us/microsoft-365/copilot/release-notes",
  openai: "https://openai.com/products/release-notes/rss.xml",
};

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "ReleaseNotesRSS/2.0 (+GitHub Pages feed generator)" },
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.text();
}

function validateXmlFeed(xml, sourceUrl) {
  if (!/<(?:rss|feed)\b/i.test(xml)) {
    throw new Error(`${sourceUrl} did not return an RSS or Atom feed`);
  }
  return xml;
}

const [claudeHtml, microsoftHtml, openaiXml] = await Promise.all([
  fetchText(urls.claude),
  fetchText(urls.microsoft),
  fetchText(urls.openai).then((xml) => validateXmlFeed(xml, urls.openai)),
]);

const claudeEntries = entriesFromDatedHtml(claudeHtml, {
  sourceUrl: urls.claude, headingLevel: 3, titlePrefix: "Claude updates",
});
const microsoftEntries = entriesFromDatedHtml(microsoftHtml, {
  sourceUrl: urls.microsoft, headingLevel: 2, titlePrefix: "Microsoft 365 Copilot updates",
});

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
  ["openai.xml", openaiXml],
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
  openaiBytes: openaiXml.length,
}));
