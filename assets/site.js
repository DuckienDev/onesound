/* OneSound site: language switching and the turntable of phones.
   No dependencies. Without JS the page is static and still complete. */
(function () {
  var LANGS = ['en', 'vi', 'ko'];
  var reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ?lang= (the app passes its language) > saved choice > browser > en.
  function initialLang() {
    var param = new URLSearchParams(location.search).get('lang');
    if (LANGS.indexOf(param) >= 0) return param;
    try {
      var saved = localStorage.getItem('onesound.lang');
      if (LANGS.indexOf(saved) >= 0) return saved;
    } catch (e) {}
    var nav = (navigator.language || 'en').slice(0, 2);
    return LANGS.indexOf(nav) >= 0 ? nav : 'en';
  }

  function remember(lang) {
    try { localStorage.setItem('onesound.lang', lang); } catch (e) {}
    var url = new URL(location.href);
    url.searchParams.set('lang', lang);
    history.replaceState(null, '', url);
  }

  function wireButtons(onPick) {
    document.querySelectorAll('.lang button').forEach(function (b) {
      b.addEventListener('click', function () { onPick(b.dataset.lang); });
    });
  }

  function markButtons(lang) {
    document.querySelectorAll('.lang button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
    });
    document.documentElement.lang = lang;
    // Links to the other pages keep the language.
    document.querySelectorAll('[data-langlink]').forEach(function (a) {
      var base = a.getAttribute('href').split('?')[0];
      a.setAttribute('href', base + '?lang=' + lang);
    });
  }

  // The top bar turns solid once the page scrolls.
  function topbar() {
    var bar = document.getElementById('topbar');
    if (!bar) return;
    function update() { bar.classList.toggle('scrolled', scrollY > 10); }
    addEventListener('scroll', update, { passive: true });
    update();
  }

  // The ring of posters turns slowly like a record, can be dragged or turned
  // with the arrow keys, and drifts to rest after a flick. On load it swings
  // in once; with reduced motion it only moves when asked to.
  function turntable() {
    var deck = document.getElementById('deck');
    var ring = document.getElementById('ring');
    if (!deck || !ring) return;

    var STEP = 45;            // degrees between posters
    var CRUISE = -6;          // degrees per second while idle
    var angle = reduced ? 0 : 150;
    var velocity = 0;         // degrees per second, from drags
    var target = reduced ? 0 : null;   // swing-in, then keyboard snaps
    var dragging = false, lastX = 0, lastT = 0, idleAt = 0;
    var visible = true, last = performance.now();

    function draw() { ring.style.setProperty('--a', angle.toFixed(2) + 'deg'); }

    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!dragging) {
        if (target !== null) {
          // Ease toward a resting angle (the swing-in, or an arrow key).
          angle += (target - angle) * Math.min(1, dt * 4);
          if (Math.abs(target - angle) < 0.05) {
            angle = target;
            target = null;
            idleAt = now;
          }
        } else if (Math.abs(velocity) > 1) {
          angle += velocity * dt;
          velocity *= Math.pow(0.12, dt);   // a flick dies out in ~1.5 s
          idleAt = now;
        } else if (!reduced && now - idleAt > 1500) {
          angle += CRUISE * dt;
        }
      }
      draw();
      if (visible) requestAnimationFrame(frame);
    }

    function start() { last = performance.now(); requestAnimationFrame(frame); }

    deck.addEventListener('pointerdown', function (e) {
      dragging = true; target = null; velocity = 0;
      lastX = e.clientX; lastT = performance.now();
      deck.classList.add('dragging');
      deck.setPointerCapture(e.pointerId);
    });
    deck.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var now = performance.now();
      var delta = (e.clientX - lastX) * 0.35;
      angle += delta;
      velocity = delta / Math.max(0.016, (now - lastT) / 1000);
      lastX = e.clientX; lastT = now;
    });
    function release() {
      if (!dragging) return;
      dragging = false;
      deck.classList.remove('dragging');
      if (performance.now() - lastT > 80) velocity = 0;
      idleAt = performance.now();
    }
    deck.addEventListener('pointerup', release);
    deck.addEventListener('pointercancel', release);

    deck.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      var base = Math.round(angle / STEP) * STEP;
      target = base + (e.key === 'ArrowLeft' ? STEP : -STEP);
      velocity = 0;
    });

    // Only spin while on screen.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        var now = entries[0].isIntersecting;
        if (now && !visible) { visible = true; start(); }
        visible = now;
      }).observe(deck);
    }

    if (!reduced) target = 0;
    draw();
    start();
  }

  // Music notes drifting down behind the page, swaying as they fall. Each
  // glyph is drawn once to a sprite so a frame is only a few drawImage calls.
  function notes() {
    if (reduced) return;
    var c = document.createElement('canvas');
    c.className = 'notes';
    c.setAttribute('aria-hidden', 'true');
    document.body.prepend(c);
    var ctx = c.getContext('2d');
    var GLYPHS = ['\u266A', '\u266B', '\u2669', '\u266C'];
    var COLORS = ['#3ea6ff', '#7fd4ff', '#8b5cf6', '#ffc940'];
    var SPRITE = 64;
    var sprites = [];
    GLYPHS.forEach(function (g) {
      COLORS.forEach(function (col) {
        var s = document.createElement('canvas');
        s.width = s.height = SPRITE * 2;
        var x = s.getContext('2d');
        x.font = SPRITE + 'px "Apple Symbols", "Segoe UI Symbol", "Noto Sans Symbols 2", sans-serif';
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.shadowColor = col;
        x.shadowBlur = 18;
        x.fillStyle = col;
        x.fillText(g, SPRITE, SPRITE);
        sprites.push(s);
      });
    });

    var W, H, list = [];
    function make(anywhere) {
      return {
        img: sprites[(Math.random() * sprites.length) | 0],
        x: Math.random() * W,
        y: anywhere ? Math.random() * H : -40,
        size: 16 + Math.random() * 22,
        fall: 16 + Math.random() * 26,           // px per second
        sway: 12 + Math.random() * 28,
        phase: Math.random() * Math.PI * 2,
        spin: 0.6 + Math.random() * 0.8,
        alpha: 0.18 + Math.random() * 0.32
      };
    }
    function size() {
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      W = innerWidth; H = innerHeight;
      c.width = W * dpr; c.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var want = W < 700 ? 12 : 24;
      while (list.length < want) list.push(make(true));
      list.length = want;
    }
    size();
    addEventListener('resize', size);

    var last = performance.now();
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < list.length; i++) {
        var n = list[i];
        n.y += n.fall * dt;
        n.phase += dt * n.spin;
        if (n.y > H + 40) { list[i] = n = make(false); }
        var x = n.x + Math.sin(n.phase) * n.sway;
        // Fade in at the top and out near the bottom.
        var edge = Math.min(1, (n.y + 40) / 120, (H + 40 - n.y) / 160);
        ctx.globalAlpha = n.alpha * Math.max(0, edge);
        ctx.save();
        ctx.translate(x, n.y);
        ctx.rotate(Math.sin(n.phase * 0.8) * 0.4);
        var d = n.size * 2;
        ctx.drawImage(n.img, -d / 2, -d / 2, d, d);
        ctx.restore();
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // Wrap each word of [data-split] so the headline can arrive word by word.
  function splitWords() {
    document.querySelectorAll('[data-split]').forEach(function (el) {
      var words = el.textContent.trim().split(/\s+/);
      el.textContent = '';
      words.forEach(function (w, i) {
        if (i) el.appendChild(document.createTextNode(' '));
        var s = document.createElement('span');
        s.className = 'w';
        s.textContent = w;
        el.appendChild(s);
      });
    });
    // Delays run across the whole headline, not per span.
    document.querySelectorAll('.hero h1 .w').forEach(function (w, i) {
      w.style.setProperty('--d', i);
    });
  }

  // Sections rise in once they scroll into view.
  function reveal() {
    var els = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  // The room code shuffles, then locks in letter by letter.
  function roomCode() {
    var el = document.querySelector('.code');
    if (!el || reduced || !('IntersectionObserver' in window)) return;
    var final = el.textContent.trim();
    var POOL = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    el.textContent = '';
    var chars = final.split('').map(function () {
      var s = document.createElement('span');
      s.className = 'ch';
      s.textContent = POOL[(Math.random() * POOL.length) | 0];
      el.appendChild(s);
      return s;
    });
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      var t0 = performance.now();
      (function tick(now) {
        var locked = 0;
        chars.forEach(function (s, i) {
          if (now - t0 > 500 + i * 160) {
            if (!s.classList.contains('lock')) {
              s.textContent = final[i];
              s.classList.add('lock');
            }
            locked++;
          } else {
            s.textContent = POOL[(Math.random() * POOL.length) | 0];
          }
        });
        if (locked < chars.length) setTimeout(function () { requestAnimationFrame(tick); }, 55);
      })(t0);
    }, { rootMargin: '0px 0px -15% 0px' });
    io.observe(el);
  }

  window.OneSound = {
    // The landing page: text comes from [dict][lang][key].
    page: function (dict) {
      function apply(lang) {
        var t = dict[lang];
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
          var v = t[el.dataset.i18n];
          if (typeof v === 'string') el.textContent = v;
        });
        splitWords();
        document.querySelectorAll('[data-i18n-label]').forEach(function (el) {
          var v = t[el.dataset.i18nLabel];
          if (typeof v === 'string') el.setAttribute('aria-label', v);
        });
        markButtons(lang);
      }
      wireButtons(function (lang) { apply(lang); remember(lang); });
      apply(initialLang());
      topbar();
      turntable();
      notes();
      reveal();
      roomCode();
    },

    // The legal pages: one <article data-lang> per language.
    legal: function () {
      function apply(lang) {
        document.querySelectorAll('article[data-lang]').forEach(function (a) {
          a.hidden = a.dataset.lang !== lang;
        });
        markButtons(lang);
      }
      wireButtons(function (lang) { apply(lang); remember(lang); });
      apply(initialLang());
      topbar();
      notes();
    }
  };
})();
