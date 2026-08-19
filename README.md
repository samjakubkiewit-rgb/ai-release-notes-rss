# Hosted AI release-note RSS feeds

This repository publishes two free RSS 2.0 feeds on GitHub Pages:

- `feed.xml` — Claude release notes
- `microsoft-365-copilot.xml` — Microsoft 365 Copilot release notes

The GitHub Action rebuilds the feeds every three hours and whenever `main` changes. Generated files are committed back to the repository so scheduled workflows remain active on GitHub and there is a visible update history.
