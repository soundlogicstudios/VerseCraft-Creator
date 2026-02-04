# VerseCraft Creator — Phase 1 Web Viewer

This is a **no-build**, GitHub-Pages-friendly web viewer for VerseCraft story JSON.

## What it does
- Drag/drop or pick a story JSON file
- Normalizes the story into the runtime-friendly shape `{ start, scenes: {id:{text, options}} }`
- Audits for common issues:
  - missing `start`
  - dangling `to` targets
  - unreachable scenes
  - dead ends
  - >4 choices (runtime only renders 4 pills)

## Run locally
Just open `index.html` in a local server (recommended).

Example with Node:
```bash
npx serve .
```

## Deploy on GitHub Pages
- Put these files in your repo root
- GitHub → Settings → Pages
- Source: Deploy from branch
- Branch: main, Folder: /(root)
