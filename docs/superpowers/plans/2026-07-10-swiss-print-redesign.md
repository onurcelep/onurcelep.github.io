# Swiss/Print Redesign + Code X-Ray Landing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the portfolio around a Swiss/print visual system with a single scrollable front-door landing and a one-time CSS-mask "x-ray" reveal of a stack-derived code layer, keeping every existing page real and crawlable.

**Architecture:** Override hugo-coder templates and styles in the project's own `layouts/` and `assets/` (theme submodule untouched). A single paper theme, system fonts, GSAP vendored locally, no Three.js. Shared scroll motion site-wide; the x-ray reveal is landing-only. The hidden code content lives in one editable data file.

**Tech Stack:** Hugo v0.157 extended, hugo-coder theme (submodule), SCSS via Hugo Pipes (`resources.ToCSS`), GSAP 3.12 + ScrollTrigger (vendored), vanilla JS + CSS `mask-image`.

## Global Constraints

- Hugo **extended** edition required (SCSS compilation). Config file is `config.toml` (TOML, not `hugo.toml`).
- Theme submodule `themes/hugo-coder/` is **never edited**; all changes go in project `layouts/`, `assets/`, `data/`, `config.toml`.
- No CDN / no remote assets at runtime; GSAP is vendored under `assets/js/vendor/`.
- No Three.js / WebGL.
- Single **paper (light)** theme; the light/dark toggle is removed.
- System font stacks only: grotesk `"Helvetica Neue",Helvetica,Arial,sans-serif`; mono `"SFMono-Regular",Menlo,Consolas,"Liberation Mono",monospace`.
- Palette tokens (exact): `--paper:#efe9dd`, `--paper2:#e7e0d1`, `--ink:#1a1a1a`, `--muted:#6b6459`, `--accent:#c0392b`, `--hair:rgba(26,26,26,.18)`.
- All motion gated by `prefers-reduced-motion: reduce`; content is fully present and navigable without JS. The x-ray substrate is `aria-hidden="true"` and must not affect SEO.
- Preserve existing SEO: real pages, `layouts/_partials/head/extensions.html` structured data, sitemap, robots, social cards, and the umami analytics include.
- Work happens on branch `feature/swiss-print-redesign` (already created). Commit after every task.
- **Visual source of truth:** the committed prototype at `docs/superpowers/prototype-xray-reveal.html` (created in Task 1). When a task says "port from the prototype," copy the exact CSS/markup from that file and apply the listed adaptations.

**Verification model (this is a static site, not a unit-tested app):** each task's "test" is (a) `hugo --minify` builds with no errors/warnings, (b) a `grep`/`test -f` assertion against the generated `public/` HTML or built assets proving the change is present, and (c) where noted, a visual check in `hugo server`. Treat a failing build or a missing-string grep as a red test.

---

### Task 1: Scaffolding — prototype reference, vendored GSAP, config, stylesheet entry

**Files:**
- Create: `docs/superpowers/prototype-xray-reveal.html` (copy of the working prototype)
- Create: `assets/js/vendor/gsap.min.js`, `assets/js/vendor/ScrollTrigger.min.js`
- Create: `assets/scss/swiss.scss`, `assets/scss/_tokens.scss`
- Modify: `config.toml`
- Reference: `themes/hugo-coder/layouts/baseof.html` (JS-disable guard behavior)

**Interfaces:**
- Produces: `assets/scss/swiss.scss` (stylesheet entry, imported partials added in later tasks); `assets/js/vendor/*.js` (GSAP globals `gsap`, `ScrollTrigger`); config flags `colorScheme="light"`, `hideColorSchemeToggle=true`, `disableDefaultJsScripts=true`.

- [ ] **Step 1: Copy the prototype into the repo as the porting reference**

```bash
cp .superpowers/brainstorm/92407-1783671145/content/xray-reveal.html \
   docs/superpowers/prototype-xray-reveal.html
```

(The `.superpowers/` dir is gitignored; this committed copy is the durable source of truth for porting CSS/markup.)

- [ ] **Step 2: Vendor GSAP + ScrollTrigger locally**

```bash
mkdir -p assets/js/vendor
curl -fsSL https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js -o assets/js/vendor/gsap.min.js
curl -fsSL https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js -o assets/js/vendor/ScrollTrigger.min.js
test -s assets/js/vendor/gsap.min.js && test -s assets/js/vendor/ScrollTrigger.min.js && echo OK
```

Expected: `OK` (both files non-empty).

- [ ] **Step 3: Create the token partial** — `assets/scss/_tokens.scss`

```scss
// Swiss/print design tokens — single source of truth for palette + fonts.
:root {
  --paper:   #efe9dd;
  --paper2:  #e7e0d1;
  --ink:     #1a1a1a;
  --muted:   #6b6459;
  --accent:  #c0392b;
  --line:    #1a1a1a;
  --hair:    rgba(26,26,26,.18);
  --grotesk: "Helvetica Neue", Helvetica, Arial, sans-serif;
  --mono:    "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace;
}
```

- [ ] **Step 4: Create the stylesheet entry** — `assets/scss/swiss.scss`

```scss
// Compiled via Hugo Pipes into the single site stylesheet.
@import "tokens";
@import "base";     // Task 2
@import "landing";  // Task 3
@import "pages";    // Task 4
@import "diagram";  // Task 5
```

(Imports for not-yet-created partials are added as those tasks land; create empty placeholders now so the build succeeds.)

```bash
: > assets/scss/_base.scss
: > assets/scss/_landing.scss
: > assets/scss/_pages.scss
: > assets/scss/_diagram.scss
```

- [ ] **Step 5: Update `config.toml`** — single theme, drop toggle + default JS, drop old customCSS/JS wiring

In `[params]` set / change these keys (leave everything else — `umami`, `module`, `avatarURL`, menus, taxonomies — untouched):

```toml
colorScheme = "light"
hideColorSchemeToggle = true
disableDefaultJsScripts = true   # removes hugo-coder's coder.js (toggle logic)
customCSS = []                    # diagram CSS moves into swiss.scss (Task 5)
customJS = []
```

Note: `disableDefaultJsScripts=true` requires `hideColorSchemeToggle=true` (theme `baseof.html` errors otherwise); both are set above.

- [ ] **Step 6: Smoke-build**

Run: `hugo --minify`
Expected: builds with no errors. (The site still renders with theme CSS at this point; our SCSS isn't wired in until Task 2.)

- [ ] **Step 7: Commit**

```bash
git add assets/js/vendor assets/scss config.toml docs/superpowers/prototype-xray-reveal.html
git commit -m "chore: scaffold Swiss redesign — vendor gsap, tokens, single-theme config"
```

---

### Task 2: Base Swiss shell — baseof override, head, frame, scripts, base styles, motion JS

**Files:**
- Create: `layouts/baseof.html` (overrides theme)
- Create: `layouts/_partials/swiss/head.html`
- Create: `layouts/_partials/swiss/frame.html`
- Create: `layouts/_partials/swiss/scripts.html`
- Create: `assets/js/site.js`
- Modify: `assets/scss/_base.scss` (fill the placeholder)
- Reference: `docs/superpowers/prototype-xray-reveal.html`, `themes/hugo-coder/layouts/baseof.html`

**Interfaces:**
- Consumes: `assets/scss/swiss.scss` (Task 1); GSAP globals (Task 1).
- Produces: body markup contract used by all page templates — a fixed frame with `#prog` (progress bar); page templates render into the `content` block; sections that should animate carry `data-animate`, with a `.rule` (draws across) and `.reveal` children (fade up). `site.js` drives `.reveal`, `.rule`, `#hero .clip`, `#prog`, and the landing `#xray`.

- [ ] **Step 1: Create the base shell** — `layouts/baseof.html`

```html
<!DOCTYPE html>
<html lang="{{ .Site.Language.Lang }}">
<head>
  <title>{{ block "title" . }}{{ .Site.Params.HeadTitle | default .Site.Title }}{{ end }}</title>
  {{ partial "swiss/head.html" . }}
</head>
<body class="{{ if .IsHome }}is-home{{ end }}">
  {{ partial "swiss/frame.html" . }}

  <main class="wrap">
    {{ block "content" . }}{{ end }}
  </main>

  {{ if .IsHome }}{{ partial "swiss/xray.html" . }}{{ end }}  {{/* xray partial: Task 3 */}}

  {{ partial "swiss/scripts.html" . }}

  {{ template "_internal/google_analytics.html" . }}
  {{ if and .Site.Params.umami .Site.Params.umami.siteID }}{{ partial "analytics/umami" . }}{{ end }}
  {{ partial "body/extensions" . }}
</body>
</html>
```

Note: `swiss/xray.html` does not exist until Task 3. Hugo's `partial` fails hard on a missing partial, so create a temporary stub now and flesh it out in Task 3:

```bash
mkdir -p layouts/_partials/swiss
printf '%s\n' '{{/* stub — replaced in Task 3 */}}' > layouts/_partials/swiss/xray.html
```

- [ ] **Step 2: Create the head partial** — `layouts/_partials/swiss/head.html`

```html
{{ partial "head/meta-tags.html" . }}
{{ partial "head/extensions.html" . }}

{{ $css := resources.Get "scss/swiss.scss" | toCSS (dict "targetPath" "css/swiss.css") }}
{{ if hugo.IsServer }}
  <link rel="stylesheet" href="{{ $css.RelPermalink }}">
{{ else }}
  {{ $css = $css | minify | fingerprint }}
  <link rel="stylesheet" href="{{ $css.RelPermalink }}" integrity="{{ $css.Data.Integrity }}">
{{ end }}
```

(`head/meta-tags.html` is the theme's SEO/OpenGraph partial; `head/extensions.html` is our existing structured-data override. Both are reused as-is.)

- [ ] **Step 3: Create the frame partial** — `layouts/_partials/swiss/frame.html`

```html
<div id="prog"></div>
<header class="frame" role="banner">
  <div class="frame-top">
    <a class="brand" href="{{ "/" | relURL }}">{{ .Site.Params.author | default .Site.Title }}</a>
    <nav class="frame-nav" aria-label="Main">
      {{ range .Site.Menus.main }}<a href="{{ .URL | relURL }}">{{ .Name }}</a>{{ end }}
    </nav>
  </div>
  <span class="frame-edge l" aria-hidden="true"></span>
  <span class="frame-edge r" aria-hidden="true"></span>
</header>
```

- [ ] **Step 4: Create the scripts partial** — `layouts/_partials/swiss/scripts.html`

```html
{{ $gsap := resources.Get "js/vendor/gsap.min.js" }}
{{ $st   := resources.Get "js/vendor/ScrollTrigger.min.js" }}
{{ $site := resources.Get "js/site.js" }}
{{ $bundle := slice $gsap $st $site | resources.Concat "js/site.bundle.js" }}
{{ if not hugo.IsServer }}{{ $bundle = $bundle | minify | fingerprint }}{{ end }}
<script src="{{ $bundle.RelPermalink }}" defer></script>
```

- [ ] **Step 5: Create the motion module** — `assets/js/site.js`

```javascript
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- shared scroll motion (all pages) ----
  if (window.gsap && window.ScrollTrigger && !reduce) {
    gsap.registerPlugin(ScrollTrigger);

    // hero (landing only; selectors simply match nothing elsewhere)
    gsap.to('#hero .rule', { scaleX: 1, duration: 1, ease: 'power3.inOut' });
    gsap.to('#hero .clip', { clipPath: 'inset(0 0% 0 0)', duration: .9, stagger: .12, delay: .25, ease: 'power3.out' });
    gsap.to('#hero .reveal', { opacity: 1, y: 0, duration: .8, stagger: .12, delay: .9, ease: 'power2.out' });

    // any section opting in with data-animate
    gsap.utils.toArray('[data-animate]').forEach(function (sec) {
      var tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top 72%' } });
      var rule = sec.querySelector('.rule');
      if (rule) tl.to(rule, { scaleX: 1, duration: .8, ease: 'power3.inOut' });
      tl.to(sec.querySelectorAll('.reveal'), { opacity: 1, y: 0, duration: .6, stagger: .07, ease: 'power2.out' }, rule ? '-=.5' : 0);
    });

    gsap.to('#prog', { width: '100%', ease: 'none', scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: .3 } });
  } else {
    // no-JS-motion fallback: show everything in final state
    document.querySelectorAll('.reveal').forEach(function (el) { el.style.opacity = 1; el.style.transform = 'none'; });
    document.querySelectorAll('.rule').forEach(function (el) { el.style.transform = 'scaleX(1)'; });
    document.querySelectorAll('#hero .clip').forEach(function (el) { el.style.clipPath = 'inset(0 0% 0 0)'; });
  }

  // ---- one-time x-ray reveal (landing only) ----
  var xray = document.getElementById('xray');
  if (xray && !reduce) {
    var lines = [];
    var data = document.getElementById('substrate-data');
    try { lines = JSON.parse(data.textContent); } catch (e) {}
    var wall = document.createElement('pre');
    wall.className = 'codewall';
    xray.appendChild(wall);

    function buildWall() {
      if (!lines.length) return;
      var lineH = 26, rows = Math.ceil(innerHeight / lineH) + 4;
      var targetChars = Math.ceil(innerWidth / 6.5) + 40;
      var html = '', k = 0;
      for (var r = 0; r < rows; r++) {
        var line = '';
        while (line.length < targetChars) { line += lines[k++ % lines.length] + '    '; }
        html += line.replace(/(name:|jobs:|resource |\$ |pipeline |FROM |on:|deploy:|build:)/g, '<span class="k">$1</span>') + '\n';
        k += 1;
      }
      wall.innerHTML = html;
    }
    buildWall();
    addEventListener('resize', buildWall);

    var WP = [[0.26,0.26],[0.48,0.46],[0.72,0.40],[0.80,0.62],[0.56,0.80],[0.40,0.96]];
    var DUR = 7000, start = null;
    function smooth(t) { return t * t * (3 - 2 * t); }
    function frame(ts) {
      if (start === null) start = ts;
      var p = (ts - start) / DUR;
      if (p >= 1) { xray.style.transition = 'opacity 1s ease'; xray.style.opacity = '0'; return; }
      var segs = WP.length - 1, f = p * segs, i = Math.min(Math.floor(f), segs - 1), e = smooth(f - i);
      var x = (WP[i][0] + (WP[i + 1][0] - WP[i][0]) * e) * innerWidth;
      var y = (WP[i][1] + (WP[i + 1][1] - WP[i][1]) * e) * innerHeight;
      xray.style.setProperty('--mx', x + 'px');
      xray.style.setProperty('--my', y + 'px');
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
})();
```

- [ ] **Step 6: Fill `assets/scss/_base.scss`** — port base styles from the prototype

Open `docs/superpowers/prototype-xray-reveal.html`. From its `<style>` block, copy these rule groups into `_base.scss` and apply the adaptations below:

- Copy: `body` + `body::before` (paper grain); `.frame`, `.frame .top`→`.frame-top`, `.frame .top a`→`.frame-nav a`, `.frame .links`→`.frame-nav`, `.frame .edge`→`.frame-edge`; `.rulewrap`, `.num`, `.rule`, `.label`; `h2`, `.lead`; `.chips`, `.chip`; `.cards`, `.card` …; `.posts`, `.post` …; `.morelink`; `.social`, `.social a`; `#prog`; `.reveal`; `.clip`; `section` base.
- Adaptations:
  - Replace every literal color (`#efe9dd`, `#1a1a1a`, `#6b6459`, `#c0392b`, `rgba(26,26,26,.18)`, `#e7e0d1`) with the matching `var(--…)` token.
  - Rename selectors `.frame .top`→`.frame-top`, `.frame .top a`→`.frame .frame-nav a`, `.frame .links`→`.frame-nav`, `.frame .edge`→`.frame-edge` (matching the frame partial markup from Step 3).
  - Change `.wrap` (prototype's content wrapper) to `main.wrap`.
  - Do **not** copy `#xray`, `#lens`, `#node`, `#graph`, `.codewall`, `.hint`, `.sub`, or `#hero`/`.portrait`/`.herogrid` rules here — those belong to Task 3 (`_landing.scss`).
  - Keep `#prog` here (shared, all pages).

- [ ] **Step 7: Build and assert the Swiss shell is live**

Run: `hugo --minify`
Then:

```bash
grep -rq 'id="prog"' public/index.html && echo "frame OK"
grep -rq 'css/swiss' public/index.html && echo "css OK"
grep -rq 'site.bundle' public/index.html && echo "js OK"
```

Expected: `frame OK`, `css OK`, `js OK`. Build has no errors.

- [ ] **Step 8: Visual check**

Run: `hugo server -D`, open `http://localhost:1313/about/`. Expected: paper background, running header with brand + menu, margin rules, grotesk type. (Landing still looks unstyled/placeholder until Task 3.)

- [ ] **Step 9: Commit**

```bash
git add layouts/baseof.html layouts/_partials/swiss assets/js/site.js assets/scss/_base.scss
git commit -m "feat: Swiss base shell — override baseof, frame, head, scripts, motion JS"
```

---

### Task 3: Landing page — hero, teasers, x-ray substrate + data

**Files:**
- Create: `layouts/index.html` (overrides theme home)
- Create: `layouts/_partials/swiss/xray.html` (replaces the Task 2 stub)
- Create: `data/substrate.yaml`
- Modify: `assets/scss/_landing.scss` (fill the placeholder)
- Reference: `docs/superpowers/prototype-xray-reveal.html`

**Interfaces:**
- Consumes: frame + `#prog` + motion contract (Task 2); `site.js` reads `#xray` and `#substrate-data` (Task 2).
- Produces: `#hero` with `.rule`/`.clip`/`.reveal`; `section[data-animate]` teasers; `#xray` container + `<script id="substrate-data" type="application/json">`.

- [ ] **Step 1: Create the substrate data** — `data/substrate.yaml`

```yaml
# Hidden "engine room" code revealed once by the landing x-ray scan.
# Edit this list to change what surfaces — nothing else references these strings.
lines:
  - 'from fastapi import FastAPI, Depends'
  - 'app = FastAPI(title="delivery-api")'
  - '@app.get("/healthz")'
  - 'async def health(): return {"status": "ok"}'
  - 'import typer; cli = typer.Typer(no_args_is_help=True)'
  - 'def deploy(env: str = "prod", wait: bool = True): ...'
  - 'from textual.app import App, ComposeResult'
  - 'package main'
  - 'func main() { log.Fatal(srv.ListenAndServe()) }'
  - 'pipeline { agent { label "linux" }'
  - 'stages { stage("Build") { steps { sh "make" } } }'
  - 'stage("Test") { steps { sh "robot -d out tests/" } }'
  - '#!/usr/bin/env bash'
  - 'set -euo pipefail'
  - 'kubectl apply -f k8s/ && kubectl rollout status deploy/api'
  - 'docker build -t registry/app:$(git rev-parse --short HEAD) .'
  - 'resource "aws_eks_cluster" "ci" { name = "ci-runners" version = "1.29" }'
  - 'provider "aws" { region = "eu-central-1" }'
  - 'apiVersion: apps/v1'
  - 'kind: Deployment'
  - 'FROM golang:1.22 AS build'
  - 'RUN CGO_ENABLED=0 go build -o /bin/app ./...'
  - 'salt "*" state.apply pipeline.runners'
  - 'step ca certificate lab.internal lab.crt lab.key'
  - 'kcadm.sh create clients -r ci -s clientId=runner'
  - 'stages: [test, build, deploy]'
  - 'on: { push: { branches: [main] } }'
  - 'uses: actions/checkout@v4'
  - 'run: hugo --minify --gc'
  - 'scrape_configs: - job_name: "ci-runners"'
  - 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))'
  - '[sinks.loki] type = "loki" endpoint = "http://loki:3100"'
  - '*** Test Cases ***'
  - 'Login Works    Open Browser    https://app    chrome'
  - 'from selenium import webdriver'
  - 'labgrid-client -p board01 console'
  - 'SELECT count(*) FROM reservations WHERE host_id = 42;'
  - 'bitbake core-image-minimal'
  - 'claude -p "summarize CI failures" < build.log'
  - 'artifactory upload ./dist repo-local/'
  - 'git log --oneline -1'
```

- [ ] **Step 2: Create the x-ray partial** — `layouts/_partials/swiss/xray.html` (overwrite the stub)

```html
<div id="xray" aria-hidden="true"></div>
<script id="substrate-data" type="application/json">{{ .Site.Data.substrate.lines | jsonify }}</script>
```

- [ ] **Step 3: Create the landing template** — `layouts/index.html`

```html
{{ define "content" }}
<section id="hero">
  <div class="herogrid">
    <div>
      <div class="rulewrap"><span class="label">Est. 2013</span><span class="rule"></span><span class="num">Germany / Remote</span></div>
      <h1>
        {{ range $i, $l := .Site.Params.info }}<span class="clip">{{ $l }}</span><br>{{ end }}
      </h1>
      <p class="sub reveal">{{ .Site.Params.description }}</p>
    </div>
    <figure class="portrait reveal">
      <span class="tick tl"></span><span class="tick br"></span>
      {{ with .Site.Params.avatarURL }}<img src="{{ . | relURL }}" alt="{{ $.Site.Params.author }}">{{ end }}
      <figcaption><span>{{ .Site.Params.author }}</span><span>Fig. 01</span></figcaption>
    </figure>
  </div>
  <div class="scrollcue reveal">Scroll</div>
</section>

{{ $sections := slice
  (dict "num" "01" "label" "About"    "url" "/about/"    "h" "Turning messy delivery into calm, automated flow." "lead" "A detail-oriented engineer specializing in CI/CD and test automation systems — across automotive, travel, and telecom." "more" "Read the full story")
  (dict "num" "02" "label" "Services" "url" "/services/" "h" "What I help teams do." "lead" "CI/CD design, test automation, infrastructure as code, and technical leadership." "more" "See all services")
}}
{{ range $sections }}
<section data-animate>
  <div class="rulewrap"><span class="num">{{ .num }} / 04</span><span class="rule"></span><span class="label">{{ .label }}</span></div>
  <h2 class="reveal">{{ .h }}</h2>
  <p class="lead reveal">{{ .lead }}</p>
  <a class="morelink reveal" href="{{ .url | relURL }}">{{ .more }} →</a>
</section>
{{ end }}

<section id="blog" data-animate>
  <div class="rulewrap"><span class="num">03 / 04</span><span class="rule"></span><span class="label">Writing</span></div>
  <h2 class="reveal">Notes from the field.</h2>
  <div class="posts">
    {{ range first 3 (where .Site.RegularPages "Section" "posts") }}
    <a class="post reveal" href="{{ .RelPermalink }}">
      <h4>{{ .Title }}</h4><span class="date">{{ .Date.Format "2006" }}</span>
    </a>
    {{ end }}
  </div>
  <a class="morelink reveal" href="{{ "/posts/" | relURL }}">Read the blog →</a>
</section>

<section id="contact" data-animate>
  <div class="rulewrap"><span class="num">04 / 04</span><span class="rule"></span><span class="label">Contact</span></div>
  <h2 class="reveal">Let's build something <span class="accent">dependable</span>.</h2>
  <p class="lead reveal">Available for freelance consulting in Germany and remote.</p>
  <div class="social">
    {{ range .Site.Params.social }}<a class="reveal" href="{{ .url }}">{{ .name }}</a>{{ end }}
  </div>
</section>
{{ end }}
```

Note: `.Site.Params.info` is a list (currently `["Platform & CI/CD Engineering", "Consultant"]`); each entry becomes a wipe-in headline line. If a richer headline is wanted, edit `info` in `config.toml` — no template change needed.

- [ ] **Step 4: Fill `assets/scss/_landing.scss`** — port hero + x-ray styles from the prototype

From `docs/superpowers/prototype-xray-reveal.html` `<style>`, copy into `_landing.scss` and adapt:

- Copy: `#hero`, `.herogrid`, `#hero h1`, `#hero h1 .accent`, `#hero .sub2`→`#hero .sub`, `.portrait` + `.portrait img` + `.portrait figcaption` + `.portrait .tick*`, `.scrollcue`, the `@media(max-width:820px)` hero rules; and the x-ray rules `#xray` (with the `mask-image` radial-gradient, both `-webkit-` and standard), `.codewall`, `.codewall .k`.
- Adaptations:
  - Tokenize all literal colors to `var(--…)`.
  - Rename `#hero .sub2` → `#hero .sub` (matches the template's `<p class="sub …">`).
  - Keep the `#xray` mask exactly: `radial-gradient(circle 200px at var(--mx,-999px) var(--my,-999px), #000 0%, #000 8%, transparent 96%)` and `#xray{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}` — the JS drives `--mx/--my` and fades opacity.
  - `.portrait img` must stay full color (no grayscale filter).

- [ ] **Step 5: Build and assert the landing**

Run: `hugo --minify`
Then:

```bash
grep -q 'id="hero"' public/index.html && echo "hero OK"
grep -q 'id="xray"' public/index.html && echo "xray OK"
grep -q 'substrate-data' public/index.html && echo "data OK"
grep -q 'href="/about/"' public/index.html && echo "teaser-link OK"
grep -q 'class="post' public/index.html && echo "blog-teaser OK"
```

Expected: all five `OK` lines. Build clean.

- [ ] **Step 6: Visual check (the payoff)**

Run: `hugo server -D`, open `http://localhost:1313/`. Expected: on load the soft circle scans headline → photo → down to bottom over ~7s revealing code, then fades; hero headline wipes in; teasers fade up on scroll; progress bar fills; "Read the full story/blog" links go to the real pages. Reload replays the scan. Test `prefers-reduced-motion` (macOS: System Settings → Accessibility → Display → Reduce motion) and confirm the scan is skipped and all content is visible.

- [ ] **Step 7: Commit**

```bash
git add layouts/index.html layouts/_partials/swiss/xray.html data/substrate.yaml assets/scss/_landing.scss
git commit -m "feat: Swiss landing — hero, teasers, one-time code x-ray reveal"
```

---

### Task 4: Inner pages — single, list, blog list/post in the Swiss system

**Files:**
- Create: `layouts/single.html` (About / Services / Contact)
- Create: `layouts/list.html` (generic sections/taxonomies)
- Create: `layouts/posts/single.html` (blog post)
- Create: `layouts/posts/list.html` (blog index)
- Modify: `assets/scss/_pages.scss` (fill the placeholder)
- Reference: `themes/hugo-coder/layouts/_partials/page.html`, `posts/single.html`, `posts/list.html`

**Interfaces:**
- Consumes: base shell + motion contract (Task 2). Each page wraps content in a `section[data-animate]` with a `.rulewrap`/`.rule` header and `.reveal` content so it inherits shared scroll motion; no `#xray`.
- Produces: `.prose` article styling used by all long-form content.

- [ ] **Step 1: Create `layouts/single.html`** (top-level pages: about, services, contact)

```html
{{ define "content" }}
<article class="page" data-animate>
  <div class="rulewrap"><span class="num">§</span><span class="rule"></span><span class="label">{{ .Title }}</span></div>
  <h1 class="reveal">{{ .Title }}</h1>
  <div class="prose reveal">
    {{ .Content }}
  </div>
</article>
{{ end }}
```

- [ ] **Step 2: Create `layouts/posts/single.html`** (blog post)

```html
{{ define "content" }}
<article class="page post-single" data-animate>
  <div class="rulewrap"><span class="num">{{ .Date.Format "2006" }}</span><span class="rule"></span><span class="label">Writing</span></div>
  <h1 class="reveal">{{ .Title }}</h1>
  {{ with .Params.description }}<p class="lead reveal">{{ . }}</p>{{ end }}
  <div class="prose reveal">
    {{ .Content }}
  </div>
  <a class="morelink" href="{{ "/posts/" | relURL }}">← All writing</a>
</article>
{{ end }}
```

- [ ] **Step 3: Create `layouts/posts/list.html`** (blog index)

```html
{{ define "content" }}
<section class="page" data-animate>
  <div class="rulewrap"><span class="num">Index</span><span class="rule"></span><span class="label">Writing</span></div>
  <h1 class="reveal">Notes from the field.</h1>
  <div class="posts">
    {{ range .Pages }}
    <a class="post reveal" href="{{ .RelPermalink }}">
      <span class="pn">{{ .Date.Format "2006" }}</span>
      <h4>{{ .Title }}</h4>
      <span class="date">{{ .Date.Format "Jan 2" }}</span>
    </a>
    {{ end }}
  </div>
</section>
{{ end }}
```

- [ ] **Step 4: Create `layouts/list.html`** (generic fallback for other sections/taxonomies)

```html
{{ define "content" }}
<section class="page" data-animate>
  <div class="rulewrap"><span class="num">List</span><span class="rule"></span><span class="label">{{ .Title }}</span></div>
  <h1 class="reveal">{{ .Title }}</h1>
  {{ with .Content }}<div class="prose reveal">{{ . }}</div>{{ end }}
  <div class="posts">
    {{ range .Pages }}
    <a class="post reveal" href="{{ .RelPermalink }}"><h4>{{ .Title }}</h4></a>
    {{ end }}
  </div>
</section>
{{ end }}
```

- [ ] **Step 5: Fill `assets/scss/_pages.scss`** — article/prose + page wrapper styles

Provide these (self-contained; tokens already defined):

```scss
.page { max-width: 74rem; margin: 0 auto; padding: 18vh 6rem 12vh; min-height: 60vh; }
.page h1 { font-size: clamp(2.2rem, 5vw, 3.4rem); font-weight: 800; letter-spacing: -.02em; line-height: 1.02; }
.prose { margin-top: 2rem; max-width: 60rem; font-size: 1.06rem; line-height: 1.7; color: var(--ink); }
.prose h2 { font-size: clamp(1.5rem, 3vw, 2.1rem); font-weight: 800; margin: 2.4rem 0 .8rem; letter-spacing: -.01em; }
.prose h3, .prose h4 { font-weight: 800; margin: 1.6rem 0 .5rem; }
.prose p { margin: 0 0 1.1rem; }
.prose a { color: var(--accent); text-decoration: none; border-bottom: 1px solid var(--hair); }
.prose a:hover { border-color: var(--accent); }
.prose ul, .prose ol { margin: 0 0 1.1rem 1.3rem; }
.prose li { margin: .3rem 0; }
.prose code { font-family: var(--mono); font-size: .88em; background: var(--paper2); padding: .1em .4em; border-radius: .35rem; }
.prose pre { background: var(--paper2); border: 1px solid var(--hair); border-radius: .6rem; padding: 1.1rem 1.3rem; overflow-x: auto; margin: 0 0 1.3rem; }
.prose pre code { background: none; padding: 0; }
.prose blockquote { border-left: 3px solid var(--accent); margin: 0 0 1.1rem; padding-left: 1.1rem; color: var(--muted); }
.prose img { max-width: 100%; height: auto; }
.prose table { border-collapse: collapse; margin: 0 0 1.3rem; }
.prose th, .prose td { border: 1px solid var(--hair); padding: .5rem .8rem; text-align: left; }
.post-single .pn { display: none; }
@media (max-width: 720px) { .page { padding: 14vh 1.4rem 10vh; } }
```

- [ ] **Step 6: Build and assert inner pages**

Run: `hugo --minify`
Then:

```bash
grep -q 'class="prose' public/about/index.html && echo "about OK"
grep -q 'class="prose' public/services/index.html && echo "services OK"
grep -q 'data-animate' public/posts/index.html && echo "bloglist OK"
POST=$(ls -d public/posts/*/ | grep -v -E 'page|index' | head -1); grep -q 'class="prose' "${POST}index.html" && echo "post OK"
```

Expected: `about OK`, `services OK`, `bloglist OK`, `post OK`. Build clean.

- [ ] **Step 7: Visual check**

Run: `hugo server -D`; visit `/about/`, `/services/`, `/posts/`, and one post, and `/contact/`. Expected: Swiss styling, readable prose, section rule draws in + content fades up on scroll; no x-ray scan on any of these.

- [ ] **Step 8: Commit**

```bash
git add layouts/single.html layouts/list.html layouts/posts assets/scss/_pages.scss
git commit -m "feat: Swiss inner pages — single, list, blog list/post with shared motion"
```

---

### Task 5: Diagram shortcode reconciliation + docs

**Files:**
- Modify: `assets/scss/_diagram.scss` (fill the placeholder from the old `assets/css/test.css`)
- Delete: `assets/css/test.css`
- Modify: `CLAUDE.md`
- Reference: `assets/css/test.css` (current diagram styles), `layouts/shortcodes/diagram.html`

**Interfaces:**
- Consumes: tokens (Task 1). Produces: `.dg*` diagram styles in the paper palette, loaded via `swiss.scss` on every page (so posts with `{{< diagram >}}` render correctly).

- [ ] **Step 1: Port diagram styles into `_diagram.scss`**

Copy the `.dg …` rules from `assets/css/test.css` into `assets/scss/_diagram.scss`, with these adaptations:
- Drop the `.icon` rule (belonged to the old theme's SVG sizing) unless a built page needs it — verify with a build after; re-add if an icon breaks.
- Replace the diagram's own light-palette literals with the shared tokens where they match (`--dg-surface` stays diagram-local, but set `--dg-ink:var(--ink)`, `--dg-accent:var(--accent)`, `--dg-line:var(--hair)`, `--dg-muted:var(--muted)` so diagrams track the Swiss palette).
- **Delete the entire dark-mode block** (`body.colorscheme-dark .dg{…}` and the `@media (prefers-color-scheme: dark)` `.dg` override) — there is no dark theme now.

- [ ] **Step 2: Remove the obsolete stylesheet**

```bash
git rm assets/css/test.css
```

(Already dereferenced: `customCSS=[]` was set in Task 1.)

- [ ] **Step 3: Update `CLAUDE.md`** — document the new architecture

Replace the "Project Structure", "Services Page Pattern", and add a "Design System" section. Concretely, set the Project Structure section to:

```markdown
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
```

- [ ] **Step 4: Build and assert diagrams + no stale refs**

Run: `hugo --minify`
Then:

```bash
grep -rq 'colorscheme-dark' public/ && echo "STALE DARK REF — investigate" || echo "no dark refs OK"
grep -rq 'test.css' public/ && echo "STALE test.css REF — investigate" || echo "no test.css OK"
# a post containing a diagram still renders its nodes:
grep -rlq 'class="dg' public/posts/ && echo "diagram OK" || echo "no diagram found (ok if none use it)"
```

Expected: `no dark refs OK`, `no test.css OK`, and `diagram OK` if any post uses `{{< diagram >}}`. Build clean.

- [ ] **Step 5: Commit**

```bash
git add assets/scss/_diagram.scss CLAUDE.md
git rm --cached assets/css/test.css 2>/dev/null; true
git commit -m "refactor: fold diagrams into Swiss palette; drop test.css; update docs"
```

---

### Task 6: Full verification pass

**Files:** none (verification only). Fix-forward into the relevant task's files if something fails.

- [ ] **Step 1: Clean production build**

Run: `rm -rf public && hugo --minify`
Expected: no errors, no warnings.

- [ ] **Step 2: SEO/structured-data intact**

```bash
grep -q 'application/ld+json' public/index.html && echo "home schema OK"
POST=$(ls -d public/posts/*/ | grep -v -E 'page/|index' | head -1); grep -q 'BlogPosting' "${POST}index.html" && echo "post schema OK"
test -f public/sitemap.xml && echo "sitemap OK"
grep -q 'umami' public/index.html && echo "analytics OK"
grep -q 'og:image' public/index.html && echo "social card OK"
```

Expected: all `OK`.

- [ ] **Step 3: Drive the real site (verify skill)**

Use the `verify` (or `run`) skill to launch `hugo server` and confirm end-to-end: landing scan plays once and fades; scroll reveals fire on landing and inner pages; every teaser/menu link resolves to a real page; blog list and a post render; the reduced-motion path shows all content with no scan.

- [ ] **Step 4: Responsive check**

In the browser at ~375px width: hero grid collapses to one column with the photo above the text; frame header/menu usable; prose padding comfortable; code wall still fills during the scan; no horizontal scroll.

- [ ] **Step 5: Lighthouse**

Run a Lighthouse pass (Chrome DevTools) on `/` and one post. Expected: Performance, SEO, Accessibility at parity with or better than the pre-redesign site; no contrast failures on the paper palette; reduced-motion respected.

- [ ] **Step 6: Finalize**

If all green, the branch `feature/swiss-print-redesign` is ready for review/merge. Use `superpowers:finishing-a-development-branch` to decide merge vs PR. Do **not** merge to `main` without explicit approval (main auto-deploys to GitHub Pages).

---

## Self-Review

**Spec coverage:**
- Swiss visual system + tokens → Task 1 (`_tokens`), Task 2 (`_base`). ✓
- Single scrollable landing / front door with teasers linking out → Task 3. ✓
- One-time x-ray reveal, landing-only, reduced-motion gated → Task 2 (JS) + Task 3 (markup/data/CSS). ✓
- Whole-site restyle → Tasks 2 (shell) + 4 (inner pages) + 5 (diagrams). ✓
- Shared scroll motion on every page → Task 2 (`[data-animate]`/`.reveal` contract, `site.js`), applied in Tasks 3–4. ✓
- Code substrate from stack, editable in one data file, `aria-hidden` → Task 3 (`data/substrate.yaml`, `xray.html`). ✓
- No Three.js, no CDN, GSAP vendored → Task 1. ✓
- Single paper theme, toggle removed → Task 1 (config) + Task 5 (drop dark diagram block). ✓
- System fonts → Task 1 (`_tokens`). ✓
- SEO preserved (real pages, structured data, sitemap, social, umami) → reused partials in Task 2 head; verified in Task 6. ✓
- Accessibility / no-JS / reduced-motion → Task 2 (`site.js` fallback + guard), verified Task 6. ✓
- Maintainability (thin overrides, centralized tokens/content, docs) → Tasks 1–5, `CLAUDE.md` in Task 5. ✓

**Placeholder scan:** Empty `_base/_landing/_pages/_diagram.scss` files are created in Task 1 but each is filled in its owning task (2/3/4/5) with concrete content or explicit port-from-prototype instructions naming exact selectors and adaptations — not "TBD". No unresolved placeholders.

**Type/name consistency:** `.reveal`, `.rule`, `.clip`, `[data-animate]`, `#prog`, `#hero`, `#xray`, `#substrate-data`, `.codewall`, `.frame-top`/`.frame-nav`/`.frame-edge`, `.portrait`, `.herogrid`, `.prose`, `.page` are used consistently across `site.js`, the templates, and the SCSS instructions. `data/substrate.yaml` key `lines` matches `.Site.Data.substrate.lines` and the `#substrate-data` JSON consumed by `site.js`. The `swiss/xray.html` partial is stubbed in Task 2 (so `baseof.html` builds) and completed in Task 3.
