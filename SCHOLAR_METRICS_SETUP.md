# Automatic Google Scholar metrics

The homepage reads `data/scholar-metrics.json` from the repository and keeps its embedded values as a fallback. Reading the repository copy directly ensures new metrics appear without waiting for another GitHub Pages build. A GitHub Actions workflow checks the Google Scholar profile every Monday and commits the JSON file only when citations, h-index, or i10-index changes.

## One-time setup

1. Create a SerpApi account and copy its private API key.
2. Open this repository on GitHub and go to **Settings → Secrets and variables → Actions**.
3. Create a repository secret named `SERPAPI_KEY` and paste the key as its value.
4. Go to **Actions → Update Google Scholar metrics → Run workflow** to verify the setup immediately.

The private key is used only by GitHub Actions and is never exposed in the website source. The workflow also runs automatically every Monday at 03:17 UTC.

If the API request fails, the workflow does not overwrite the last valid metrics and the live homepage continues showing the stored values.
