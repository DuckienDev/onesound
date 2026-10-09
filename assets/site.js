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

  // The ring of phones turns slowly like a record, can be dragged or turned
  // with the arrow keys, and drifts to rest after a flick. On load it swings
  // in once; with reduced motion it only moves when asked to.
  function turntable() {
    var deck = document.getElementById('deck');
    var ring = document.getElementById('ring');
    if (!deck || !ring) return;

    var STEP = 72;            // degrees between phones
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

  window.OneSound = {
    // The landing page: text comes from [dict][lang][key].
    page: function (dict) {
      function apply(lang) {
        var t = dict[lang];
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
          var v = t[el.dataset.i18n];
          if (typeof v === 'string') el.textContent = v;
        });
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
    }
  };
})();
