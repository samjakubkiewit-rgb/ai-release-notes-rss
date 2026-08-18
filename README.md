# Hosted AI release-note RSS feeds

This repository publishes four free RSS 2.0 feeds on GitHub Pages:

- `feed.xml` — combined Claude Platform and Claude Apps release notes
- `microsoft-365-copilot.xml` — Microsoft 365 Copilot release notes
- `chatgpt.xml` — combined ChatGPT consumer and Enterprise & Edu release notes
- `cursor.xml` — Cursor changelog

The GitHub Action rebuilds the feeds daily at 11:17 UTC and whenever `main` changes. Generated files are committed back to the repository so scheduled workflows remain active on GitHub and there is a visible update history.

ChatGPT's Help Center uses Cloudflare protection for automated clients, so both ChatGPT sources are read through Jina Reader; every item still links to its canonical OpenAI Help Center article.
