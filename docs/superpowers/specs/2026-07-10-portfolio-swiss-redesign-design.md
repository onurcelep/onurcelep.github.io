# Portfolio Redesign — Swiss/Print + Code X-Ray Landing

**Date:** 2026-07-10
**Status:** Approved design, ready for implementation planning
**Repo:** `onurcelep.github.io` (Hugo, hugo-coder theme) — local at `~/code/online-cv/freelance`

## Summary

Redesign the personal portfolio site around a **Swiss/print visual system** (cream
paper, heavy grotesk headlines, a single rust accent, hairline rules, mono labels,
`NN/NN` section numbering) and a **single scrollable landing page** that acts as a
rich front door. On load, a **one-time "x-ray" reveal** — a soft circular aperture —
wanders a top-to-bottom path across the hero, briefly surfacing a hidden layer of
real infrastructure/CI code drawn from Onur's tech stack, then fades away, leaving a
clean, minimal page to explore.

The entire site is restyled to the Swiss system for consistency. Existing pages
(About, Services, Blog, Contact, and individual blog posts) remain **real, crawlable
pages**; the landing's section blocks are **teasers that link out** to them, so
per-page SEO, structured data, and blog-post URLs are preserved. **No Three.js** — the
effect is CSS masking + a little JS + GSAP.

A working, fully-validated prototype exists at
`.superpowers/brainstorm/92407-1783671145/content/xray-reveal.html` (self-contained
HTML). It is the visual source of truth for this spec.

## Goals

- Replace the minimal hugo-coder landing with a memorable, scroll-based front door
  that still reads as calm and minimalist.
- Establish a cohesive Swiss/print design system across the whole site.
- Add a subtle, one-time "engine room" reveal that hints at Onur's technical depth
  without being distracting or permanent.
- Preserve all current SEO wins (real pages, structured data, sitemap, social cards).
- Keep the implementation lightweight and maintainable (Onur's top priority): no
  WebGL, no CDN dependencies, thin theme overrides, centralized tokens and content.

## Non-Goals

- No move to a single-page app or client-side router; Hugo stays the site generator.
- No collapsing of real pages into anchors (teasers link out; content is not
  duplicated inline on the landing).
- No Three.js / WebGL.
- No CMS, comments, or backend changes.

## Design Decisions (locked)

1. **Scope:** whole site restyled to Swiss/print (not landing-only).
2. **Landing sections:** teasers that link out to the existing real pages.
3. **Three.js:** left out entirely.
4. **Dark mode:** default to a **single paper (light) theme**; remove the hugo-coder
   light/dark toggle. A dark Swiss variant is a possible later addition, out of scope
   here. *(Confirm at spec review.)*
5. **Fonts:** system grotesk + system mono stack (zero external font requests). A
   self-hosted grotesk (e.g. a variable display face) is a possible later upgrade.
   *(Confirm at spec review.)*
6. **Accent:** rust `#c0392b`. Paper `#efe9dd`, ink `#1a1a1a`, muted `#6b6459`.

## Visual System (tokens)

Defined once as CSS custom properties / SCSS variables, consumed everywhere:

| Token | Value | Use |
|---|---|---|
| `--paper` | `#efe9dd` | page background |
| `--paper2` | `#e7e0d1` | hover / inset surfaces |
| `--ink` | `#1a1a1a` | text, rules, borders |
| `--muted` | `#6b6459` | secondary text, labels |
| `--accent` | `#c0392b` | rust accent (progress bar, ticks, keywords) |
| `--hair` | `rgba(26,26,26,.18)` | hairline rules, margins |
| grotesk | system: `"Helvetica Neue",Helvetica,Arial,sans-serif` | headings/body |
| mono | system: `"SFMono-Regular",Menlo,Consolas,monospace` | labels, code, numbering |

Signature elements: faint paper-grain dot texture (fixed), thin page-margin rules,
running header, `01/04` section numbering, rules that draw across on scroll, big
grotesk headlines with rust accent words, mono uppercase labels, square photo "plate"
with rust corner ticks and a `Fig. 01` caption.

## Components / Units

Each is independently understandable, testable, and swappable.

### 1. Base stylesheet + tokens (`assets/scss/`)
- `_tokens.scss` — the variables above.
- `_base.scss` — resets, paper grain, typography scale, links, rules, chips, cards,
  post rows, buttons, page frame, progress bar.
- Compiled through Hugo Pipes (`resources.ToCSS` / `resources.Get` → `fingerprint`).
- **Depends on:** nothing. **Consumed by:** every page via the head partial.

### 2. Head/asset wiring (`layouts/_partials/`)
- Override the theme's CSS include to emit the fingerprinted Swiss stylesheet.
- Emit the scroll/reveal JS as a fingerprinted, `defer`-ed local bundle.
- Vendor GSAP + ScrollTrigger locally under `assets/js/vendor/` (no CDN). Include
  only on pages that use scroll animation (landing; optionally inner pages for rule
  draw-ins).
- **Depends on:** 1, 3. **Consumed by:** all templates.

### 3. Scroll + reveal JS module (`assets/js/site.js`)
- **Scroll reveals:** GSAP ScrollTrigger — hero rule draw + headline clip-wipe +
  staggered `.reveal` fade-ups; per-section rule draw + content fade; rust scroll
  progress bar.
- **One-time x-ray intro:** builds a fixed, full-viewport code substrate (`#xray`)
  masked by a soft radial aperture (`--mx/--my`); a `requestAnimationFrame` loop
  walks the aperture through waypoints
  `[[.26,.26],[.48,.46],[.72,.40],[.80,.62],[.56,.80],[.40,.96]]` over ~7s (visiting
  headline → photo → under photo → down to bottom), then fades `#xray` opacity to 0
  and stops. Aperture: `radial-gradient(circle 200px …, #000 0, #000 8%, transparent
  96%)`.
- **Reduced motion:** if `prefers-reduced-motion: reduce`, skip the intro entirely and
  render content in its final state (no reveal, no fade-ups).
- **Depends on:** 2 (GSAP), 4 (substrate content). **Consumed by:** landing (and any
  page opting into scroll reveals).

### 4. Code-substrate data (`data/substrate.yaml` or `assets/js/substrate.js`)
- A single, editable list of realistic code lines spanning Onur's stack (FastAPI,
  Typer, Textual, Go, Groovy/Jenkins, Bash, Terraform/AWS, K8s, Docker, Saltstack,
  Step-CA, Keycloak, GitLab CI, GitHub Actions, Prometheus/Vector/Alloy, Robot
  Framework, Selenium, Labgrid, PostgreSQL, Yocto, Artifactory, Claude CLI).
- The JS wall-builder tiles these into continuous full-width lines that fill the
  viewport (staggered so no vertical banding), at low contrast, larger line spacing.
- Kept **content-agnostic**: the builder reads the list; the list is the only thing
  Onur edits to change what's revealed. `aria-hidden="true"` — decorative, invisible
  to crawlers and screen readers.
- **Depends on:** nothing. **Consumed by:** 3.

### 5. Landing template (`layouts/index.html`)
- Hero: two-column grid — left = label rule + `<h1>` (clip-wipe words, rust accent) +
  sub; right = square portrait plate (`static/images/avatar.jpg`, full color, thin
  border, rust corner ticks, `Onur Celep / Fig. 01` caption), nudged down.
- Sections (About / Services / Blog / Contact): `NN/04` numbering + draw-in rule +
  heading + short teaser + `read more →` linking to the real page. Blog teaser lists
  recent posts from `.Site.RegularPages` (section "posts").
- Fixed running header + margin rules + rust progress bar.
- **Depends on:** 1, 2, 3, 4. **Consumed by:** home page.

### 6. Restyled inner pages (`layouts/`)
- About, Services, single/list templates, Contact re-skinned to the Swiss system
  (page frame, grotesk headings, rules, mono labels). Content unchanged (markdown as
  is). Optional light GSAP rule draw-ins on scroll; content always present without JS.
- The existing `{{< diagram >}}` shortcode and its `assets/css/test.css` styles are
  reconciled with the new tokens (diagrams already theme-aware; retune to paper
  palette; the dark-mode branch can be dropped with the toggle).
- **Depends on:** 1, 2. **Consumed by:** all non-home pages.

## Data Flow

```
content/*.md ──┐
data/substrate ├─> Hugo build ─> fingerprinted CSS/JS ─> static HTML ─> GitHub Pages
.Site.Pages ───┘                       │
                                        └─ landing teasers pull recent posts + link out
```

Runtime (browser): CSS renders the Swiss page immediately → GSAP wires scroll reveals →
one-time x-ray intro plays and fades → static minimal page remains.

## Accessibility, Performance, SEO

- **Progressive enhancement:** full content and navigation work with JS disabled; the
  reveal and animations are purely decorative enhancements.
- **Reduced motion:** intro + scroll animations disabled under `prefers-reduced-motion`.
- **SEO preserved:** real pages, per-page structured data (`extensions.html`), sitemap,
  robots, social cards all unchanged; landing links out rather than duplicating content;
  substrate is `aria-hidden` and non-indexed.
- **Performance:** no WebGL, no CDN; GSAP vendored + fingerprinted; substrate is DOM
  text built once; single paper theme drops the second color scheme's CSS.
- **Umami analytics** include unchanged.

## Testing / Verification

- `hugo --minify` builds clean; `hugo server -D` for local review.
- Drive the real site with the run/verify skills: hero intro plays once and fades;
  scroll reveals fire; teasers link to correct real pages; blog teaser lists live posts.
- `prefers-reduced-motion` path verified (no intro, content present).
- Mobile/responsive: hero grid collapses, photo reorders above text, code wall still
  fills, header/margins hold.
- Lighthouse pass (perf/SEO/a11y) at parity or better than current.
- Cross-check that structured data, sitemap, and social cards are unaffected.

## Maintainability Notes

- Tokens centralized in `_tokens.scss`; substrate content in one data file.
- Theme override stays thin; `themes/hugo-coder/` submodule untouched.
- Update `CLAUDE.md` to document the Swiss override layer, the substrate data file, and
  the reveal module.
- Keep the reveal module generic (no per-page coupling), consistent with the
  maintainability-first / agnostic-artifacts preference.

## Open Questions (confirm at review)

1. Single paper theme + remove the light/dark toggle — OK? (Default: yes.)
2. System font stack for now — OK? (Default: yes; self-hosted grotesk later.)
3. Any inner page that should keep richer motion, or all calm/static?

## Reference

- Prototype: `.superpowers/brainstorm/92407-1783671145/content/xray-reveal.html`
- Current theme: hugo-coder (submodule at `themes/hugo-coder/`)
- Config: `config.toml`; content in `content/`; overrides in `layouts/` + `assets/`
