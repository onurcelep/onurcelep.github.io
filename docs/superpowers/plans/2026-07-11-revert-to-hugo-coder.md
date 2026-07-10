# Revert to Pre-Redesign hugo-coder Site — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return onurcelep.github.io to the plain hugo-coder design it had at commit `54cfd73` (pre-Swiss-redesign), keeping the favicon, CLAUDE.md, docs, and .gitignore from the redesign era.

**Architecture:** Pure file-state revert on a branch — restore the two files the redesign modified (`config.toml`, `assets/css/test.css`), delete every file it added, then re-wire the favicon through the theme's own `faviconSVG` param. No `git revert` chains (history has merge commits).

**Tech Stack:** Hugo v0.157.0 extended (`/opt/homebrew/bin/hugo`), hugo-coder theme (vendored at `themes/hugo-coder/`, untouched throughout), GitHub Actions deploy on push to `main`.

## Global Constraints

- Repo: `/Users/onurcelep/code/online-cv/freelance` (all commands run from here)
- Revert target commit: `54cfd73`
- Working branch: `revert/hugo-coder` (created from `main`)
- Never touch: `content/`, `themes/`, `.github/`, `go.mod`, `go.sum`, `static/favicon.svg`, `docs/`, `.gitignore`
- The code-block dark-mode fix (`[markup.highlight] noClasses = false`) is part of `54cfd73`'s config.toml — it must be present after the revert (Task 1 verifies it)
- "Tests" for this static site are build success + grep assertions on generated HTML in `public/`

---

### Task 1: Branch and revert file state to 54cfd73

**Files:**
- Restore (from `54cfd73`): `config.toml`, `assets/css/test.css`
- Delete: `layouts/baseof.html`, `layouts/index.html`, `layouts/list.html`, `layouts/single.html`, `layouts/posts/` (list.html, single.html), `layouts/_partials/swiss/` (frame, head, scripts, xray), `layouts/_markup/` (render-heading.html), `assets/scss/` (all 7 files), `assets/js/` (site.js + vendor/gsap.min.js, vendor/ScrollTrigger.min.js), `data/` (substrate.yaml)
- Keep untouched: `layouts/_partials/footer.html`, `layouts/_partials/head/extensions.html`, `layouts/robots.txt`, `layouts/shortcodes/`, `layouts/sitemap.xml` (these predate the redesign)

**Interfaces:**
- Consumes: nothing (first task)
- Produces: a working tree identical to `54cfd73` except for kept files (`static/favicon.svg`, `CLAUDE.md`, `docs/`, `.gitignore`); site builds with stock hugo-coder templates. Task 2 modifies this `config.toml`.

- [ ] **Step 1: Create the branch**

```bash
cd /Users/onurcelep/code/online-cv/freelance
git checkout main
git checkout -b revert/hugo-coder
```

Expected: `Switched to a new branch 'revert/hugo-coder'`

- [ ] **Step 2: Restore the two modified files and delete the Swiss additions**

```bash
git checkout 54cfd73 -- config.toml assets/css/test.css
git rm -r -q layouts/baseof.html layouts/index.html layouts/list.html layouts/single.html \
  layouts/posts layouts/_partials/swiss layouts/_markup \
  assets/scss assets/js data
```

Expected: no errors; `git status` shows `config.toml` modified, `assets/css/test.css` added, and the Swiss files staged as deleted.

- [ ] **Step 3: Verify the tree matches 54cfd73 except intended keepers**

```bash
git diff --name-status 54cfd73 -- . ':!static/favicon.svg' ':!CLAUDE.md' ':!docs' ':!.gitignore' ':!.superpowers'
grep -n "noClasses" config.toml
```

Expected: first command prints **nothing** (no differences outside kept paths). Second prints `noClasses = false` (the code-block dark-mode fix is back in place).

- [ ] **Step 4: Build and assert the old design is back**

```bash
rm -rf public && hugo --minify
grep -o "css/test.css" public/index.html | head -1
! grep -ri "gsap" public/ --include="*.html" --include="*.js" -l
grep -c "colorscheme" public/index.html
```

Expected: build succeeds (`Pages | …`, no errors). `css/test.css` found (custom diagram CSS loaded). The `! grep … gsap` exits 0 (no GSAP anywhere in output). Last grep ≥ 1 (theme's light/dark colorscheme script present).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "revert: restore pre-redesign hugo-coder site (state of 54cfd73)

Removes Swiss/print layouts, SCSS, GSAP motion, and x-ray landing.
Keeps favicon.svg, CLAUDE.md, docs, .gitignore. Code-block dark-mode
fix (noClasses=false) is part of the restored config."
```

---

### Task 2: Wire the favicon through the theme's faviconSVG param

**Files:**
- Modify: `config.toml` (the `[params]` section, after the `avatarURL` line)

**Interfaces:**
- Consumes: restored `config.toml` from Task 1; existing `static/favicon.svg`; theme partial `themes/hugo-coder/layouts/_partials/head/custom-icons.html`, which emits `<link rel="icon" type="image/svg+xml" href="{{ .Site.Params.faviconSVG | default "/images/favicon.svg" | relURL }}">`
- Produces: final `config.toml`; no later task depends on it

- [ ] **Step 1: Verify the favicon link is currently missing (failing check)**

```bash
rm -rf public && hugo --minify && grep -o 'favicon.svg' public/index.html
```

Expected: grep finds **no match** for the site favicon at the root path — the theme's default points at `/images/favicon.svg`, which does not exist in `static/images/`. (If grep prints `favicon.svg`, check whether it's the `/images/` default path before proceeding.)

- [ ] **Step 2: Add the param**

In `config.toml`, directly below the line `avatarURL = "images/avatar.jpg"`, add:

```toml
faviconSVG = "/favicon.svg"
```

- [ ] **Step 3: Rebuild and verify the link tag**

```bash
rm -rf public && hugo --minify && grep -o 'rel=icon[^>]*href=/favicon.svg' public/index.html
```

Expected: prints a match containing `href=/favicon.svg` (minified HTML drops the quotes; if the grep finds nothing, inspect with `grep -o '<link rel=icon[^>]*>' public/index.html`).

- [ ] **Step 4: Commit**

```bash
git add config.toml && git commit -m "fix: wire OC favicon via theme faviconSVG param"
```

---

### Task 3: Update CLAUDE.md — remove the stale Swiss design-system section

**Files:**
- Modify: `CLAUDE.md` (delete the entire `## Design System (Swiss/print redesign)` section — everything from that heading to end of file — and replace with the short section below)

**Interfaces:**
- Consumes: nothing from other tasks (documentation only)
- Produces: accurate repo docs; nothing depends on it

- [ ] **Step 1: Replace the Design System section**

Delete from the line `## Design System (Swiss/print redesign)` through the end of the file, and append instead:

```markdown
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
```

- [ ] **Step 2: Sanity-check the file**

```bash
grep -c "Swiss" CLAUDE.md
```

Expected: `1` — the only remaining mention is the historical revert note. The Tech Stack / Build & Dev sections above it are unchanged and still accurate.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md && git commit -m "docs: CLAUDE.md reflects reverted stock hugo-coder design"
```

---

### Task 4: Local verification against acceptance criteria

**Files:**
- None created or modified (verification only)

**Interfaces:**
- Consumes: the completed branch from Tasks 1–3
- Produces: evidence for each spec acceptance criterion; gate before merge

- [ ] **Step 1: Serve the site**

```bash
hugo server --port 1717 &
sleep 3
```

Expected: `Web Server is available at http://localhost:1717/`

- [ ] **Step 2: Assert acceptance criteria from the rendered site**

```bash
curl -s http://localhost:1717/ | grep -o 'avatar'            # stock centered landing with avatar
curl -s http://localhost:1717/ | grep -o 'href=[^ ]*about[^ ]*'  # menu links present
curl -s http://localhost:1717/ | grep -io 'darkmode\|colorscheme' | head -2  # toggle machinery present
! curl -s http://localhost:1717/ | grep -i 'gsap\|ScrollTrigger\|xray'       # zero motion code
curl -s http://localhost:1717/ | grep -o 'favicon.svg'
curl -s http://localhost:1717/posts/ssh-certificate-access-to-a-device-lab/ | grep -o 'class=dg' | head -1  # diagram markup renders
```

Expected: every positive grep prints a match; the negated gsap grep exits 0.

- [ ] **Step 3: Human check in browser (light/dark + code blocks + diagrams)**

Open http://localhost:1717/ and verify by eye:
1. Homepage is the centered avatar/name/social landing; no scroll sections, no animation.
2. Toggle dark mode via the moon icon — code blocks in the SSH-certificate post switch palette correctly (the fix that must survive), diagrams follow the theme.
3. About / Services / Blog / Contact pages render in the plain theme.

Then stop the server:

```bash
kill %1
```

- [ ] **Step 4: Report**

No commit. Report verification results; integration (merge to `main`, push, GitHub Actions deploy) is decided with the user via the superpowers:finishing-a-development-branch skill.
