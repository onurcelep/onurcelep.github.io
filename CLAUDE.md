# Onur Celep - Portfolio / CV Site

Hugo-based personal portfolio and CV site using the hugo-coder theme, deployed to GitHub Pages.

## Tech Stack

- **Hugo** (Extended edition required) with the [hugo-coder](https://github.com/luizdepra/hugo-coder) theme
- Theme is a git submodule at `themes/hugo-coder/`
- SVG icon module: `github.com/UtkarshVerma/hugo-modules/svg-icon-system`
- Configuration: `config.toml` (not `hugo.toml`)

## Build & Dev

- **Build:** `hugo --minify`
- **Dev server:** `hugo server -D`
- **Deploy:** Push to `main` branch — GitHub Actions (`.github/workflows/gh-pages.yml`) handles deployment to GitHub Pages

## Design System (Swiss/print redesign)

- Single **paper (light)** theme; the hugo-coder light/dark toggle is removed
  (`colorScheme="light"`, `hideColorSchemeToggle=true`, `disableDefaultJsScripts=true`).
- Style entry: `assets/scss/swiss.scss` → imports `_tokens` (palette + fonts),
  `_base`, `_landing`, `_pages`, `_diagram`. Compiled via Hugo Pipes.
- Template overrides in `layouts/` (theme submodule untouched):
  `baseof.html`, `index.html` (landing), `single.html`, `list.html`,
  `posts/single.html`, `posts/list.html`, and `_partials/swiss/*`
  (`head`, `frame`, `scripts`, `xray`).
- Motion: `assets/js/site.js` — shared scroll reveals on every page (elements
  marked `.reveal` inside `[data-animate]` sections, with `.rule` draw-ins and
  `#prog` progress bar). GSAP is vendored at `assets/js/vendor/`.
- Landing-only **x-ray reveal**: a one-time CSS-mask scan surfaces a hidden code
  layer. Edit the revealed code in `data/substrate.yaml` (only place it's defined);
  it is `aria-hidden` and non-indexed.
- All motion is gated by `prefers-reduced-motion`; content works without JS.
