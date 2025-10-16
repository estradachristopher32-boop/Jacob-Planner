```markdown
# tg_bridge — Overview

This repository contains local agent runners and tools for working with a small file-queue message bridge. It also includes a small static site (Jacob Planner) in the `docs/` folder which is published via GitHub Pages.

## How to view the Jacob Planner site

The site is published on GitHub Pages at:

https://estradachristopher32-boop.github.io/tg_bridge/

You can verify the site from the command line (any system with curl):

```bash
curl -I https://estradachristopher32-boop.github.io/tg_bridge/
curl -s https://estradachristopher32-boop.github.io/tg_bridge/jacob_plan.json | jq .
```

If you want to open it in your browser, visit the URL above.

## Quick verification from this repo

- The site source files live in `docs/`:
  - `index.html`, `jacob_plan.json`, `manifest.json`, `sw.js`, `icon-192.svg`, `icon-512.svg`
  - `market-navigator/` — a small static demo of the Market Navigator UI (see `docs/market-navigator/index.html`).
- The site is already committed on `main` and Pages was enabled to serve from `/docs`.

## Want automatic publishing?

I can add a small GitHub Actions workflow that will auto-deploy `docs/` on pushes to `main`. Tell me and I'll add it.

## Notes

- Repo visibility was changed to public so Pages can serve the site.
- If you want the site published on a custom domain, tell me and I'll add guidance for DNS and `CNAME`.
```
