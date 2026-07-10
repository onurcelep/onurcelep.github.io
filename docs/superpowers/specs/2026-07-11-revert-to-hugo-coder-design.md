# Revert to pre-redesign hugo-coder site

**Date:** 2026-07-11
**Status:** Approved direction — pure revert, no new features

## Goal

Return onurcelep.github.io to the plain hugo-coder design it had before the
Swiss/print redesign (merge `942b513` and its polish follow-ups). The Swiss
design has too much on-screen motion; the site should be the simple theme
default again, with the top menu linking to the actual pages. No custom
homepage, no scroll sections, no animation.

## Revert target

Commit `54cfd73` ("ci: bump deploy actions off deprecated Node 20") — the last
commit before the redesign work began. This state already contains:

- the theme-aware diagram shortcode and its styles (`assets/css/test.css`)
- the code-block dark-mode fix (`[markup.highlight] noClasses = false`,
  commit `2a11492`) — explicitly required to survive the revert
- SEO work (social cards, structured data, Search Console tag)
- the CI deploy-action bump

## Method

Restore files from `54cfd73` on a new branch (`revert/hugo-coder`); do **not**
chain `git revert` through the redesign's merge commits. Concretely:

1. Restore modified files: `config.toml`, `assets/css/test.css`.
2. Delete redesign additions:
   - `layouts/baseof.html`, `layouts/index.html`, `layouts/list.html`,
     `layouts/single.html`, `layouts/posts/`, `layouts/_partials/swiss/`,
     `layouts/_markup/render-heading.html`
   - `assets/scss/` (all Swiss SCSS)
   - `assets/js/site.js`, `assets/js/vendor/` (gsap, ScrollTrigger)
   - `data/substrate.yaml`
3. Keep (post-redesign additions that are design-independent):
   - `static/favicon.svg` (red OC monogram). Note: its `<link>` tag lived in
     the deleted Swiss head partial, so re-wire it through hugo-coder's own
     mechanism (`faviconSVG`/`favicon_*` params or a minimal head override —
     whichever the vendored theme version supports).
   - `CLAUDE.md`, `docs/` (specs/plans history)
   - current `.gitignore` (has `.superpowers/` entry)
4. Content (`content/`), theme (`themes/hugo-coder/`), CI workflow, and go.mod
   module setup are untouched by the redesign — no action.

## Acceptance criteria

- `hugo server`: homepage is the stock hugo-coder centered landing (avatar,
  name, tagline, social icons); menu About / Services / Blog / Contact works.
- Light/dark toggle works; code blocks in blog posts render correctly in both
  modes.
- Blog post diagrams ({{< diagram >}}) render theme-aware in both modes.
- No GSAP/ScrollTrigger loaded; no scroll-driven motion anywhere.
- Favicon still the red OC monogram.
- Merged to `main`; existing GitHub Actions deploy publishes it.

## Out of scope

Any homepage customization (scrollable sections, jump links) — considered and
dropped. Content edits. Theme upgrades.
