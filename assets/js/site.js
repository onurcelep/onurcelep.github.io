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
