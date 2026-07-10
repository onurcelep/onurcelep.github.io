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

## Design

Stock hugo-coder theme, no template overrides beyond what predates the 2026-07
Swiss redesign (reverted 2026-07-11, see
`docs/superpowers/specs/2026-07-11-revert-to-hugo-coder-design.md`):

- Light/dark toggle: theme default (`colorScheme = "auto"`).
- Code blocks: CSS-class syntax highlighting (`[markup.highlight] noClasses = false`)
  so the theme's light/dark chroma stylesheets apply.
- Blog diagrams: `{{< diagram >}}` shortcode (`layouts/shortcodes/diagram.html`)
  styled by `assets/css/test.css` (theme-aware via the theme's `colorscheme`
  mechanism), loaded through `customCSS` in config.toml.
- Favicon: `static/favicon.svg`, wired via the theme's `faviconSVG` param.
