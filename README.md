# PokeChu (PWA Pokédex Game)

Single-page (no router) PWA game: discover random Gen 1 encounters, catch Pokémon (rule of 6), and browse your Pokédex view (with a Gen 1-era TCG card preview via the TCGdex API).

## Live
- GitHub Pages: `https://mourad9101.github.io/PwaPokedex/`

## Features
- One page, zero router (game view ↔ pokédex view)
- Data from PokéAPI (one Pokémon at a time, no “load all 151”)
- LocalStorage persistence (team, stats, settings)
- Offline-first Service Worker caching (app shell + sprites + PokéAPI)
- Native notifications (optional)
- Sound effects (optional)
- Pokédex view with a single “Gen 1-era” TCG card preview (TCGdex API)

## Tech
- Vite + React + TypeScript
- Custom UI (CSS / glassmorphism)

## Run locally
```bash
npm install
npm run dev
```

Build / preview:
```bash
npm run build
npm run preview
```

## Install on iPhone (PWA)
1. Open the live URL in **Safari**.
2. Tap **Share** → **Add to Home Screen**.
3. Launch from the icon for a standalone app experience.

## Deploy (GitHub Pages)
This repo deploys automatically on pushes to `main` using GitHub Actions.
- GitHub → **Settings → Pages** → **Source: GitHub Actions**
