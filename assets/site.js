/* OneSound site: language switching, scroll reveals and the live round demo.
   No dependencies. Everything degrades to static content without JS. */
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

  function reveal() {
    var items = document.querySelectorAll('.reveal');
    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    items.forEach(function (el) { io.observe(el); });
  }

  function countUp() {
    document.querySelectorAll('[data-count]').forEach(function (el) {
      var target = +el.dataset.count;
      var suffix = target >= 1000 ? '+' : '';
      if (reduced) { el.textContent = target.toLocaleString() + suffix; return; }
      var start = null;
      function step(t) {
        if (!start) start = t;
        var p = Math.min(1, (t - start) / 1600);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString() +
          (p === 1 ? suffix : '');
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  // Cards light up where the pointer is.
  function spotlight() {
    document.querySelectorAll('.card').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--x', (e.clientX - r.left) + 'px');
        card.style.setProperty('--y', (e.clientY - r.top) + 'px');
      });
    });
  }

  // A round on loop: countdown, a hand goes up, the title is typed, "Correct!"
  function demo(getGuess) {
    var bar = document.getElementById('timerBar');
    var typed = document.getElementById('typed');
    var me = document.getElementById('me');
    var result = document.getElementById('result');
    var steps = document.querySelectorAll('.steps li');
    if (!bar) return;

    function mark(i) {
      steps.forEach(function (s) { s.classList.toggle('on', +s.dataset.step === i); });
    }
    if (reduced) {
      bar.style.transform = 'scaleX(.6)';
      me.classList.add('hand');
      typed.textContent = getGuess();
      return;
    }

    var timers = [];
    function later(ms, fn) { timers.push(setTimeout(fn, ms)); }

    function run() {
      timers.forEach(clearTimeout); timers = [];
      result.classList.remove('show');
      me.classList.remove('hand');
      typed.textContent = '';
      bar.style.transition = 'none';
      bar.style.transform = 'scaleX(1)';
      mark(0);
      // The clip plays: the timer runs down.
      later(60, function () {
        bar.style.transition = 'transform 7s linear';
        bar.style.transform = 'scaleX(0)';
      });
      later(1800, function () { mark(1); me.classList.add('hand'); });
      later(2600, function () {
        mark(2);
        var text = getGuess(), i = 0;
        (function type() {
          typed.textContent = text.slice(0, ++i);
          if (i < text.length) later(70 + Math.random() * 70, type);
        })();
      });
      later(4600, function () {
        mark(3);
        bar.style.transition = 'transform .3s';
        result.classList.add('show');
      });
      later(7400, run);
    }

    // Only animate while visible.
    if ('IntersectionObserver' in window) {
      var running = false;
      new IntersectionObserver(function (entries) {
        var visible = entries[0].isIntersecting;
        if (visible && !running) { running = true; run(); }
        if (!visible && running) {
          running = false; timers.forEach(clearTimeout); timers = [];
        }
      }, { threshold: 0.3 }).observe(document.querySelector('.demo'));
    } else {
      run();
    }
  }

  // Repeats children so a CSS loop (translateX -50%) has no gap.
  function loop(el, nodes) {
    el.innerHTML = '';
    for (var n = 0; n < 2; n++) {
      nodes.forEach(function (make) { el.appendChild(make()); });
    }
  }

  function fillTicker(words) {
    var el = document.getElementById('ticker');
    if (!el) return;
    var all = words.concat(words);
    loop(el, all.map(function (w) {
      return function () {
        var s = document.createElement('span'); s.textContent = w; return s;
      };
    }));
  }

  function fillGallery(names) {
    var el = document.getElementById('gallery-track');
    if (!el || el.childElementCount) return;
    loop(el, names.map(function (n) {
      return function () {
        var d = document.createElement('div');
        d.className = 'poster';
        var img = document.createElement('img');
        img.src = 'assets/promo/' + n + '.webp';
        img.alt = ''; img.loading = 'lazy';
        d.appendChild(img);
        return d;
      };
    }));
  }

  function fillWave() {
    var w = document.getElementById('wave');
    if (!w) return;
    for (var i = 0; i < 28; i++) w.appendChild(document.createElement('i'));
  }

  // The top bar turns to glass once the page scrolls.
  function topbar() {
    var bar = document.getElementById('topbar');
    if (!bar) return;
    function update() { bar.classList.toggle('scrolled', scrollY > 10); }
    addEventListener('scroll', update, { passive: true });
    update();
  }

  // The hero poster stack leans toward the pointer.
  function tilt() {
    var stack = document.getElementById('stack');
    if (!stack || reduced || !matchMedia('(pointer: fine)').matches) return;
    var box = stack.parentElement;
    box.addEventListener('pointermove', function (e) {
      var r = box.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - .5;
      var y = (e.clientY - r.top) / r.height - .5;
      stack.style.transform = 'rotateY(' + (x * 14) + 'deg) rotateX(' +
        (-y * 10) + 'deg)';
    });
    box.addEventListener('pointerleave', function () {
      stack.style.transform = '';
    });
  }

  function fillPacks(list) {
    var a = document.getElementById('packsA');
    var b = document.getElementById('packsB');
    if (!a) return;
    var half = Math.ceil(list.length / 2);
    function fill(el, items) {
      // Twice over, so the strip loops without a gap.
      el.innerHTML = '';
      items.concat(items, items).forEach(function (name) {
        var s = document.createElement('span');
        s.className = 'chip';
        s.textContent = name;
        el.appendChild(s);
      });
    }
    fill(a, list.slice(0, half));
    fill(b, list.slice(half));
  }

  window.OneSound = {
    // The landing page: text comes from [dict][lang][key].
    page: function (dict, opts) {
      opts = opts || {};
      var current;
      function apply(lang) {
        current = lang;
        var t = dict[lang];
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
          var v = t[el.dataset.i18n];
          if (typeof v === 'string') el.textContent = v;
        });
        fillPacks(t.packs);
        if (t.ticker) fillTicker(t.ticker);
        markButtons(lang);
      }
      wireButtons(function (lang) { apply(lang); remember(lang); });
      apply(initialLang());
      if (opts.gallery) fillGallery(opts.gallery);
      fillWave(); topbar(); tilt();
      reveal(); countUp(); spotlight();
      demo(function () { return dict[current].guess; });
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
      topbar(); reveal();
    }
  };
})();
