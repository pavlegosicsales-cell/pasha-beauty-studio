/* Pasha Beauty Studio: interactions (behaviour mirrors the Salonix Framer template) */

// Paste the Apps Script URL here after running Skill 03 (form backend setup).
const ENDPOINT = 'https://script.google.com/macros/s/AKfycbzSJtjpjOP6vn8foVFXsQBbdBkJKD4DWFu3cekQdH-gJLxG9bB5dV0RQsiFX2Ht4qWqxQ/exec';
// Studio WhatsApp number, international format without + or spaces (e.g. '381641234567').
// When set: "Pošalji poruku" buttons open WhatsApp and the booking form hands the request to WhatsApp.
const WA_NUMBER = '381629780605';

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isPhone = () => innerWidth < 810;

  /* ---------- hero entrance: split title letters, start after fonts load ---------- */
  const letters = $('[data-letters]');
  if (letters) {
    const txt = letters.textContent;
    letters.textContent = '';
    [...txt].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'hero__letter'; s.textContent = ch;
      s.style.setProperty('--d', (0.32 + i * 0.06).toFixed(2) + 's');
      letters.appendChild(s);
    });
  }
  const start = () => requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('is-ready')));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const fontsReady = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), wait(1200)]);
  const loaderEl = $('#loader');
  const loaderOn = loaderEl && !document.documentElement.classList.contains('no-loader');
  if (reduced) document.documentElement.classList.add('is-ready');
  else if (!loaderOn) fontsReady.then(start);
  else {
    // keep the loader up until fonts + first hero photo are in (min 1.1s, max 3.5s)
    const heroImg = $('.hero__slide');
    const imgReady = heroImg && !heroImg.complete ? new Promise((r) => { heroImg.addEventListener('load', r, { once: true }); heroImg.addEventListener('error', r, { once: true }); }) : Promise.resolve();
    Promise.race([Promise.all([fontsReady, imgReady, wait(1100)]), wait(3500)]).then(() => {
      loaderEl.classList.add('is-done');
      try { sessionStorage.setItem('pasha-loaded', '1'); } catch (e) {}
      setTimeout(start, 250);
      setTimeout(() => loaderEl.remove(), 900);
    });
  }

  /* ---------- smooth scroll (Framer Smooth Scroll = Lenis, intensity 8 -> duration 0.8) ---------- */
  let lenis = null;
  if (window.Lenis && !reduced) {
    lenis = new Lenis({ duration: 0.8 });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  const navH = () => (isPhone() ? 70 : 90);
  const scrollToEl = (el) => {
    const y = el.getBoundingClientRect().top + scrollY - (el.id === 'pocetna' ? 0 : 0);
    if (lenis) lenis.scrollTo(y, { duration: 1.2 });
    else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"], a[href^="./#"]');
    if (!a) return;
    const id = a.getAttribute('href').split('#')[1];
    const el = id && document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    closeMenu();
    scrollToEl(el);
    history.replaceState(null, '', '#' + id);
  });
  if (location.hash) {
    const el = document.getElementById(location.hash.slice(1));
    if (el) setTimeout(() => scrollToEl(el), 60);
  }

  /* ---------- nav: hide on scroll down, show on scroll up, solid after hero ---------- */
  const nav = $('#nav');
  const hero = $('.hero');
  const menuBtn = $('#menuBtn');
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY;
    if (!nav.classList.contains('is-open')) {
      const solidAt = hero ? hero.offsetHeight - navH() : 10;
      nav.classList.toggle('is-solid', y > solidAt || !hero);
      if (y > lastY + 2 && y > navH()) nav.classList.add('is-hidden');
      else if (y < lastY - 2 || y <= navH()) nav.classList.remove('is-hidden');
    }
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function closeMenu() {
    if (!nav.classList.contains('is-open')) return;
    nav.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Otvori meni');
    if (lenis) lenis.start();
  }
  menuBtn.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    if (!open) return closeMenu();
    nav.classList.add('is-open');
    nav.classList.remove('is-hidden');
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.setAttribute('aria-label', 'Zatvori meni');
    if (lenis) lenis.stop();
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  /* ---------- hero slideshow: 3 slides, switch every 2.85s, each zooms 1.15 -> 1 over 3s ---------- */
  const slides = $$('.hero__slide');
  const dots = $$('.hero__dot');
  if (slides.length) {
    const m = slides[0].dataset.mobile;
    if (m && isPhone()) slides[0].src = m;
    let cur = 0, timer;
    const fluidHost = $('[data-fluid]');
    const toFluid = (s) => {
      if (!window.PashaFluid || !fluidHost) return;
      fluidHost.style.filter = getComputedStyle(s).filter;
      window.PashaFluid.show(s.currentSrc || s.src, parseFloat(s.dataset.focus)).then(() => {
        fluidHost.classList.remove('is-zoom'); void fluidHost.offsetWidth; fluidHost.classList.add('is-zoom');
      });
    };
    const show = (i) => {
      slides[cur].classList.remove('is-on'); dots[cur] && dots[cur].classList.remove('is-on');
      cur = (i + slides.length) % slides.length;
      const s = slides[cur];
      s.classList.remove('is-on'); void s.offsetWidth; s.classList.add('is-on');
      dots[cur] && dots[cur].classList.add('is-on');
      toFluid(s);
    };
    if (window.PashaFluid) { window.PashaFluid.preload(slides.map((s) => s.src)); toFluid(slides[0]); }
    const loop = () => { clearTimeout(timer); timer = setTimeout(() => { show(cur + 1); loop(); }, 2850); };
    dots.forEach((d, i) => d.addEventListener('click', () => { show(i); loop(); }));
    if (!reduced) {
      // preload the other slides after first paint so the swap never flashes
      addEventListener('load', () => slides.forEach((s) => s.loading = 'eager'));
      loop();
    }
  }

  /* ---------- concept: title scales in, image columns tilt 12deg -> 0 while scrolling ---------- */
  const concept = $('.concept');
  if (concept && !reduced) {
    const content = $('[data-concept-content]', concept);
    const visual = $('[data-concept-visual]', concept);
    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    let ticking = false;
    const update = () => {
      ticking = false;
      const H = innerHeight, top = concept.getBoundingClientRect().top;
      const p = clamp01((0.667 * H - top) / (0.645 * H));
      const s = p * p * (3 - 2 * p);
      content.style.opacity = s;
      content.style.transform = `scale(${s})`;
      const r = clamp01((-top - 0.138 * H) / (1.433 * H));
      visual.style.transform = `perspective(1200px) rotateX(${(12 * (1 - r)).toFixed(3)}deg)`;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    update();
  }

  /* ---------- scroll fill (ported 1:1 from B-Steel / Konstra): the text splits into letters and each
     letter lights up over its own slice of the scroll range. Range: from the moment the top of the
     block reaches 70% of the viewport until it reaches 30%. Letter i owns [i/n, (i+1)/n] of that range.
     JS only writes --t per letter; CSS turns it into opacity .2 -> 1 and colour off -> on. ---------- */
  const fillBlocks = $$('[data-scroll-fill]');
  if (fillBlocks.length && !reduced) {
    const items = fillBlocks.map((block) => {
      const text = block.textContent.trim();
      const frag = document.createDocumentFragment();
      const chars = [];
      text.split(/\s+/).forEach((word, wi, all) => {
        const w = document.createElement('span');
        w.className = 'fill-word';
        [...word].forEach((ch) => {
          const c = document.createElement('span');
          c.className = 'fill-char'; c.textContent = ch;
          w.appendChild(c); chars.push(c);
        });
        frag.appendChild(w);
        // the space stays between words so line breaks behave normally
        if (wi < all.length - 1) frag.appendChild(document.createTextNode(' '));
      });
      block.setAttribute('aria-label', text);
      block.textContent = '';
      block.appendChild(frag);
      return { el: block, chars, last: [] };
    });
    document.documentElement.classList.add('js-scroll-fill');
    let fillTick = false;
    const paintFill = () => {
      fillTick = false;
      const vh = innerHeight;
      items.forEach((item) => {
        const top = item.el.getBoundingClientRect().top;
        const p = Math.max(0, Math.min(1, (0.7 * vh - top) / (0.4 * vh)));
        const n = item.chars.length;
        for (let i = 0; i < n; i++) {
          const t = Math.round(Math.max(0, Math.min(1, (p - i / n) * n)) * 100) / 100;
          if (item.last[i] === t) continue; // only touch the DOM when the value changes
          item.last[i] = t;
          item.chars[i].style.setProperty('--t', t);
        }
      });
    };
    addEventListener('scroll', () => { if (!fillTick) { fillTick = true; requestAnimationFrame(paintFill); } }, { passive: true });
    addEventListener('resize', paintFill);
    paintFill();
  }

  /* ---------- 4-panel strip: click expands one panel, click again restores ---------- */
  const strip = $('#strip');
  if (strip) {
    $$('.strip__item', strip).forEach((it) => it.addEventListener('click', () => {
      const was = it.classList.contains('is-open');
      $$('.strip__item', strip).forEach((x) => x.classList.remove('is-open'));
      strip.classList.toggle('has-open', !was);
      if (!was) it.classList.add('is-open');
    }));
  }

  /* ---------- custom cursor (Salonix "01"): 10px square, centred horizontally on the pointer with its
     top edge on it. Over a problem card it becomes the "Pogledaj rešenje" button (same anchor). ---------- */
  const cursorBtn = $('#cursorBtn');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  let dot = null;
  if (finePointer && !reduced) {
    dot = document.createElement('div');
    dot.className = 'cursor-dot'; dot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dot);
  }
  let mx = -100, my = -100, cx = -100, cy = -100, curRaf = 0, seen = false, lastT = 0;
  // Measured on salonix.framer.website: the square halves its remaining distance every ~108 ms with no
  // overshoot, i.e. exponential follow with a time constant of ~156 ms. Time based, so the lag is the
  // same on 60 Hz and 144 Hz screens.
  const CURSOR_TAU = 156;
  const placeCursor = (t) => {
    const dt = lastT ? Math.min(250, t - lastT) : 16.7;
    lastT = t;
    const k = 1 - Math.exp(-dt / CURSOR_TAU);
    cx += (mx - cx) * k; cy += (my - cy) * k;
    if (Math.abs(mx - cx) < 0.1 && Math.abs(my - cy) < 0.1) { cx = mx; cy = my; }
    if (cx === mx && cy === my) lastT = 0;
    if (dot) dot.style.transform = `translate3d(${cx - 5}px, ${cy}px, 0)`;
    if (cursorBtn) cursorBtn.style.transform = `translate3d(${cx - cursorBtn.offsetWidth / 2}px, ${cy}px, 0)`;
    curRaf = cx !== mx || cy !== my ? requestAnimationFrame(placeCursor) : 0;
  };
  if (dot) {
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      if (!seen) { cx = mx; cy = my; seen = true; dot.classList.add('is-on'); }
      if (!curRaf) curRaf = requestAnimationFrame(placeCursor);
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => { dot.classList.remove('is-on'); seen = false; });
  }
  $$('.sol').forEach((card) => {
    const label = () => { if (cursorBtn) cursorBtn.firstChild.textContent = card.classList.contains('is-open') ? 'Zatvori ' : 'Pogledaj rešenje '; };
    const toggle = () => { const open = card.classList.toggle('is-open'); card.setAttribute('aria-pressed', open); label(); };
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    if (!cursorBtn || !dot) return;
    card.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      label(); cursorBtn.classList.add('is-on'); dot.classList.add('is-off');
      if (!curRaf) curRaf = requestAnimationFrame(placeCursor);
    });
    card.addEventListener('pointerleave', () => { cursorBtn.classList.remove('is-on'); dot.classList.remove('is-off'); });
  });

  /* ---------- accordions (services, FAQ): one open at a time ---------- */
  const accordion = (items, headSel) => {
    items.forEach((item) => {
      const head = $(headSel, item);
      head.addEventListener('click', () => {
        const open = !item.classList.contains('is-open');
        if (!open && isPhone() && item.classList.contains('svc')) { item.classList.remove('is-open'); head.setAttribute('aria-expanded', 'false'); return; }
        items.forEach((o) => { o.classList.remove('is-open'); $(headSel, o).setAttribute('aria-expanded', 'false'); });
        if (open) { item.classList.add('is-open'); head.setAttribute('aria-expanded', 'true'); }
      });
    });
  };
  const svcs = $$('.svc');
  accordion(svcs, '.svc__head');
  // on phones the template shows every service open
  if (isPhone()) svcs.forEach((s) => { s.classList.add('is-open'); $('.svc__head', s).setAttribute('aria-expanded', 'true'); });
  accordion($$('.qa'), '.qa__q');

  /* ---------- orbit cards: bottom blur = blurred copy of the photo, masked (see .wcard__blur) ---------- */
  $$('.wcard__img').forEach((w) => {
    const img = $('img', w);
    if (!img) return;
    const b = document.createElement('span');
    b.className = 'wcard__blur'; b.setAttribute('aria-hidden', 'true');
    const i = document.createElement('i');
    i.style.backgroundImage = `url("${img.getAttribute('src')}")`;
    b.appendChild(i);
    img.after(b);
  });

  /* ---------- entrance (Framer appear: threshold .5, once) ---------- */
  const rise = $$('.rise');
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { threshold: 0.2 });
    rise.forEach((el) => io.observe(el));
  } else rise.forEach((el) => el.classList.add('is-in'));

  /* ---------- counters ---------- */
  const counters = $$('[data-count]');
  const runCount = (el) => {
    const end = +el.dataset.count, dur = 1600, t0 = performance.now();
    const fmt = (n) => n.toLocaleString('sr-Latn-RS');
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(end * e));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window && !reduced) {
    const co = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { runCount(e.target); co.unobserve(e.target); }
    }), { threshold: 0.6 });
    counters.forEach((c) => co.observe(c));
  } else counters.forEach((c) => (c.textContent = (+c.dataset.count).toLocaleString('sr-Latn-RS')));

  /* ---------- process tabs: hover / tap activates ---------- */
  const tabs = $$('.ptab');
  const procImgs = $$('.proc__img');
  tabs.forEach((t, i) => {
    const on = () => {
      tabs.forEach((x) => x.classList.remove('is-on')); t.classList.add('is-on');
      // each tab has its own photo (Salonix), cross-faded
      procImgs.forEach((im, j) => { if (j === i) im.loading = 'eager'; im.classList.toggle('is-on', j === i); });
    };
    t.addEventListener('pointerenter', on);
    t.addEventListener('click', on);
  });

  /* ---------- gallery ticker: 50px/s, gap 16, endless ---------- */
  const ticker = $('#ticker');
  if (ticker) {
    const track = $('.ticker__track', ticker);
    const originals = [...track.children];
    originals.forEach((n) => { const c = n.cloneNode(true); c.classList.add('is-clone'); c.setAttribute('aria-hidden', 'true'); c.tabIndex = -1; track.appendChild(c); });
    let x = 0, last = performance.now(), width = 0, visible = true;
    const measure = () => { width = originals.reduce((w, n) => w + n.offsetWidth + 16, 0); };
    addEventListener('resize', measure); addEventListener('load', measure); measure();
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(ticker);
    const tick = (t) => {
      const dt = Math.min(64, t - last); last = t;
      if (visible && !isPhone() && !reduced && width) {
        x -= 50 * dt / 1000;
        if (-x >= width) x += width;
        track.style.transform = `translate3d(${x}px,0,0)`;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- message buttons: WhatsApp once the number is known, Instagram DM until then ---------- */
  if (WA_NUMBER) {
    $$('[data-contact]').forEach((a) => { a.href = `https://wa.me/${WA_NUMBER}`; });
    $$('[data-wa-only]').forEach((el) => { el.hidden = false; });
    $$('[data-wa-label]').forEach((el) => { el.textContent = 'Pošalji poruku'; });
  }

  /* ---------- gallery: filters + lightbox ---------- */
  const gal = $('[data-gallery]');
  if (gal) {
    const items = $$('.gal__item', gal);
    const filters = $$('[data-filter]');
    filters.forEach((f) => f.addEventListener('click', () => {
      if (f.classList.contains('is-on')) return;
      filters.forEach((x) => { x.classList.toggle('is-on', x === f); x.setAttribute('aria-pressed', x === f); });
      const k = f.dataset.filter;
      const apply = () => items.forEach((it) => { it.hidden = k !== 'sve' && it.dataset.cat !== k; });
      if (reduced) return apply();
      gal.classList.add('is-switching');
      setTimeout(() => { apply(); requestAnimationFrame(() => gal.classList.remove('is-switching')); }, 250);
    }));

    const lb = $('#lightbox');
    const lbImg = $('[data-lb-img]', lb), lbCap = $('[data-lb-cap]', lb), lbCount = $('[data-lb-count]', lb), fig = $('.lb__fig', lb);
    let list = [], at = 0, opener = null;
    const paint = () => {
      const img = $('img', list[at]);
      lbImg.src = img.currentSrc || img.src; lbImg.alt = img.alt;
      lbCap.textContent = '';
      const t = list[at].dataset.title;
      if (t) { const b = document.createElement('b'); b.textContent = t; lbCap.append(b, document.createElement('br')); }
      lbCap.append(img.alt);
      lbCount.textContent = `${at + 1} / ${list.length}`;
    };
    const go = (d) => {
      at = (at + d + list.length) % list.length;
      if (reduced) return paint();
      fig.classList.add('is-swap');
      setTimeout(() => { paint(); fig.classList.remove('is-swap'); }, 200);
    };
    const open = (it) => {
      opener = it; list = items.filter((x) => !x.hidden); at = list.indexOf(it);
      paint(); lb.hidden = false;
      requestAnimationFrame(() => lb.classList.add('is-on'));
      if (lenis) lenis.stop();
      document.documentElement.style.overflow = 'hidden';
      $('[data-lb-close]', lb).focus({ preventScroll: true });
    };
    const close = () => {
      lb.classList.remove('is-on');
      setTimeout(() => { lb.hidden = true; }, 350);
      if (lenis) lenis.start();
      document.documentElement.style.overflow = '';
      if (opener) opener.focus({ preventScroll: true });
    };
    items.forEach((it) => it.addEventListener('click', () => open(it)));
    $('[data-lb-close]', lb).addEventListener('click', close);
    $('[data-lb-prev]', lb).addEventListener('click', () => go(-1));
    $('[data-lb-next]', lb).addEventListener('click', () => go(1));
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    addEventListener('keydown', (e) => {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    });
    let sx = 0;
    lb.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); });
  }

  /* ---------- booking wizard: every item of the price list can be booked ----------
     Steps adapt to the choice: Kategorija -> Usluga -> (Dužina / Tehnika if the service has
     variants) -> (Dodaci if the category has extras) -> Termin -> Vaši podaci.
     A summary bar above the question shows every answer so far (click = go back to that step)
     plus an estimated price and duration. Data comes from the price list JSON inside the form. */
  const UNSURE = 'Nisam sigurna, posavetujte me';
  const toNum = (p) => +String(p || '').replace(/[^\d]/g, '') || 0;
  const fmt = (n) => n.toLocaleString('sr-Latn-RS');
  const mins = (t) => { const m = /^(\d+)\s*min$/.exec(t || ''); return m ? +m[1] : 0; };
  $$('[data-wizard]').forEach((form) => {
    let cats;
    try { cats = JSON.parse($('[data-cenovnik]', form).textContent).cats; } catch (e) { return; }
    const step = (k) => $(`[data-step="${k}"]`, form);
    const steps = $$('[data-step]', form);
    const vp = $('[data-viewport]', form);
    const next = $('[data-next]', form);
    const back = $('[data-back]', form);
    const bar = $('[data-bar]', form);
    const label = $('[data-step-label]', form);
    const name = $('[data-step-name]', form);
    const err = $('[data-error]', form);
    const navRow = $('[data-nav]', form);
    const sum = $('[data-summary]', form);
    const chipsEl = $('[data-chips]', form);
    const totalEl = $('[data-total]', form);
    const st = { cat: null, svc: null, variant: null, addons: [], addonsSeen: false, termin: null };
    let cur = 'kategorija', busy = false;

    const catObj = () => cats.find((c) => c.slug === st.cat) || null;
    const svcObj = () => { const c = catObj(); return c && st.svc ? c.services.find((s) => s.n === st.svc) || null : null; };
    const variantObj = () => { const s = svcObj(); return s && s.v ? s.v.find((v) => v.n === st.variant) || null : null; };
    const addonList = () => {
      const c = catObj(), s = svcObj();
      if (!c || !c.addons || !s) return [];
      return c.addons.filter((a) => (!a.for || a.for.includes(s.n)) && !(a.skip && a.skip.some((w) => s.n.toLowerCase().includes(w))));
    };
    const flow = () => {
      const f = ['kategorija', 'usluga'];
      const s = svcObj();
      if (s && s.v) f.push('varijanta');
      if (addonList().length) f.push('dodaci');
      f.push('termin', 'podaci');
      return f;
    };
    const stepName = (k) => ({
      kategorija: 'Kategorija', usluga: 'Usluga', termin: 'Termin', podaci: 'Vaši podaci',
      varijanta: (svcObj() && svcObj().vt) || 'Izbor', dodaci: (catObj() && catObj().at) || 'Dodaci'
    })[k];
    const meta = (o, plus) => [o.p ? `${plus ? '+' : ''}${o.p} din${o.per ? ' po noktu' : ''}` : '', o.t].filter(Boolean).join(' · ');
    const choiceBtn = (title, sub, on, check) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'choice' + (check ? ' choice--check' : '') + (on ? ' is-on' : '');
      const s = document.createElement('span'); s.textContent = title; b.appendChild(s);
      if (sub) { const m = document.createElement('small'); m.textContent = sub; b.appendChild(m); }
      if (check) { const i = document.createElement('i'); i.setAttribute('aria-hidden', 'true'); b.appendChild(i); }
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      return b;
    };
    const markOn = (list, btn) => $$('.choice', list).forEach((b) => { const on = b === btn; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
    const goNextSoon = (from) => setTimeout(() => { if (cur === from) { const f = flow(); render(f[f.indexOf(from) + 1]); } }, 260);

    /* step contents that depend on earlier answers */
    const buildServices = () => {
      const list = $('[data-list]', step('usluga'));
      list.textContent = '';
      const c = catObj();
      $('[data-q]', step('usluga')).textContent = c.q || 'Koja usluga?';
      [...c.services, { n: UNSURE }].forEach((s) => {
        const sub = s.v ? `od ${fmt(Math.min(...s.v.map((v) => toNum(v.p))))} din` : meta(s, c.plus);
        const b = choiceBtn(s.n, sub, st.svc === s.n);
        b.addEventListener('click', () => {
          if (st.svc !== s.n) { st.variant = null; st.addons = []; st.addonsSeen = false; }
          st.svc = s.n; markOn(list, b); paintSummary(); goNextSoon('usluga');
        });
        list.appendChild(b);
      });
    };
    const buildVariants = () => {
      const s = svcObj(), list = $('[data-list]', step('varijanta'));
      list.textContent = '';
      $('[data-q]', step('varijanta')).textContent = s.vq || 'Izaberite';
      const hint = $('[data-hint]', step('varijanta'));
      hint.textContent = s.vh || ''; hint.hidden = !s.vh;
      s.v.forEach((v) => {
        const b = choiceBtn(v.n, meta(v), st.variant === v.n);
        b.addEventListener('click', () => { st.variant = v.n; markOn(list, b); paintSummary(); goNextSoon('varijanta'); });
        list.appendChild(b);
      });
    };
    const buildAddons = () => {
      const c = catObj(), list = $('[data-list]', step('dodaci'));
      list.textContent = '';
      $('[data-q]', step('dodaci')).textContent = c.aq || 'Želite li nešto uz to?';
      $('[data-hint]', step('dodaci')).textContent = c.ah || 'Nije obavezno. Možete izabrati više stavki ili preskočiti.';
      addonList().forEach((a) => {
        const b = choiceBtn(a.n, meta(a, c.aplus !== false), st.addons.includes(a.n), true);
        b.addEventListener('click', () => {
          const on = !st.addons.includes(a.n);
          // extras in the same group exclude each other (e.g. one nail art level)
          if (a.g) st.addons = st.addons.filter((n) => { const o = c.addons.find((x) => x.n === n); return !o || o.g !== a.g; });
          st.addons = st.addons.filter((n) => n !== a.n);
          if (on) st.addons.push(a.n);
          $$('.choice', list).forEach((x) => { const v = st.addons.includes($('span', x).textContent); x.classList.toggle('is-on', v); x.setAttribute('aria-pressed', v); });
          next.firstChild.textContent = st.addons.length ? 'Dalje' : 'Preskoči';
          paintSummary();
        });
        list.appendChild(b);
      });
    };

    /* summary bar: answers so far + estimated price/time */
    const answers = () => {
      const out = [];
      const c = catObj(), s = svcObj(), v = variantObj();
      if (c) out.push(['kategorija', 'Kategorija', c.name]);
      if (st.svc) out.push(['usluga', 'Usluga', st.svc]);
      if (v) out.push(['varijanta', stepName('varijanta'), v.n]);
      if (st.addonsSeen && flow().includes('dodaci')) out.push(['dodaci', stepName('dodaci'), st.addons.length ? st.addons.join(', ') : 'Bez dodataka']);
      if (st.termin) out.push(['termin', 'Termin', st.termin]);
      return out;
    };
    const estimate = () => {
      const c = catObj(), s = svcObj();
      if (!s) return '';
      const base = variantObj() || (s.v ? null : s);
      if (!base) return '';
      let price = toNum(base.p), time = mins(base.t), perNail = base.per ? toNum(base.p) : 0;
      if (base.per) price = 0;
      st.addons.forEach((n) => {
        const a = c.addons.find((x) => x.n === n); if (!a) return;
        if (a.per) perNail += toNum(a.p); else { price += toNum(a.p); time += mins(a.t); }
      });
      const parts = [];
      if (price) parts.push(`<b>${fmt(price)} din</b>`);
      if (perNail) parts.push(`${price ? '+ ' : ''}<b>${fmt(perNail)} din</b> po noktu`);
      if (c.plus) parts.push('doplata na osnovnu uslugu');
      if (time) parts.push(`oko ${time} min`);
      return parts.length ? 'Okvirno: ' + parts.join(' · ') : '';
    };
    const paintSummary = () => {
      const list = answers().filter(([k]) => flow().indexOf(k) < flow().indexOf(cur) || cur === 'podaci');
      chipsEl.textContent = '';
      list.forEach(([k, lab, val]) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'wiz__chip'; b.title = 'Izmeni';
        const sm = document.createElement('small'); sm.textContent = lab;
        const sp = document.createElement('span'); sp.textContent = val;
        b.append(sm, sp);
        b.addEventListener('click', () => render(k));
        chipsEl.appendChild(b);
      });
      totalEl.innerHTML = estimate();
      sum.hidden = !list.length && !totalEl.innerHTML;
    };

    const lockHeight = (fn) => {
      const from = vp.offsetHeight;
      vp.style.height = from + 'px';
      fn();
      const to = (() => { vp.style.height = 'auto'; const h = vp.offsetHeight; vp.style.height = from + 'px'; return h; })();
      requestAnimationFrame(() => { vp.style.height = to + 'px'; });
      const done = () => { vp.style.height = ''; vp.removeEventListener('transitionend', done); };
      vp.addEventListener('transitionend', done);
      setTimeout(done, 1000);
    };
    const render = (k) => {
      if (k === 'usluga') buildServices();
      if (k === 'varijanta') buildVariants();
      if (k === 'dodaci') { buildAddons(); st.addonsSeen = true; }
      lockHeight(() => {
        steps.forEach((s) => { s.hidden = true; s.classList.remove('is-enter'); });
        const el = step(k); el.hidden = false; el.classList.add('is-enter');
      });
      if (k === 'done') {
        navRow.hidden = true; sum.hidden = true; bar.style.width = '100%';
        label.textContent = 'Poslato'; name.textContent = '';
        return;
      }
      cur = k;
      const f = flow(), i = f.indexOf(k);
      bar.style.width = ((i + 1) / f.length) * 100 + '%';
      label.textContent = `Korak ${i + 1} od ${f.length}`;
      name.textContent = stepName(k);
      back.hidden = i === 0;
      next.hidden = !(k === 'dodaci' || k === 'podaci');
      next.disabled = false;
      next.firstChild.textContent = k === 'podaci' ? 'Pošalji zahtev' : (st.addons.length ? 'Dalje' : 'Preskoči');
      err.hidden = true;
      paintSummary();
    };

    /* fixed steps: category and time */
    $$('.choice', step('kategorija')).forEach((b) => b.addEventListener('click', () => pickCat(b.dataset.slug, true)));
    const pickCat = (slug, auto) => {
      const b = $$('.choice', step('kategorija')).find((x) => x.dataset.slug === slug);
      if (!b) return false;
      if (st.cat !== slug) { st.svc = null; st.variant = null; st.addons = []; st.addonsSeen = false; }
      st.cat = slug; markOn(step('kategorija'), b);
      if (auto) goNextSoon('kategorija'); else render('usluga');
      return true;
    };
    $$('.choice', step('termin')).forEach((b) => b.addEventListener('click', () => {
      st.termin = b.dataset.value; markOn(step('termin'), b); paintSummary(); goNextSoon('termin');
    }));

    back.addEventListener('click', () => { const f = flow(), i = f.indexOf(cur); if (i > 0) render(f[i - 1]); });

    const validate = () => {
      let ok = true;
      ['ime', 'telefon'].forEach((n) => {
        const input = form.elements[n];
        const bad = !input.value.trim() || (n === 'telefon' && input.value.replace(/\D/g, '').length < 6);
        input.closest('.field').classList.toggle('is-bad', bad);
        if (bad) ok = false;
      });
      const mail = form.elements.email;
      if (mail.value && !/^\S+@\S+\.\S+$/.test(mail.value)) { mail.closest('.field').classList.add('is-bad'); ok = false; }
      else mail.closest('.field').classList.remove('is-bad');
      return ok;
    };
    $$('input, textarea', form).forEach((i) => i.addEventListener('input', () => i.closest('.field').classList.remove('is-bad')));

    next.addEventListener('click', async () => {
      if (busy) return;
      if (cur !== 'podaci') { const f = flow(); render(f[f.indexOf(cur) + 1]); return; }
      if (!validate()) { err.textContent = 'Upišite ime i broj telefona da bismo mogli da vam se javimo.'; err.hidden = false; return; }
      if (!ENDPOINT && !WA_NUMBER) {
        err.innerHTML = 'Slanje preko sajta još nije uključeno. Pišite nam na <a href="https://ig.me/m/pashabeautystudioo" target="_blank" rel="noopener">Instagramu</a> i zakazujemo odmah.';
        err.hidden = false; return;
      }
      busy = true; next.disabled = true; err.hidden = true;
      const v = variantObj();
      const est = estimate().replace(/<[^>]+>/g, '');
      const payload = {
        kategorija: (catObj() || {}).name || '', usluga: st.svc ? st.svc + (v ? `, ${stepName('varijanta').toLowerCase()} ${v.n}` : '') : '',
        dodaci: st.addons.join(', '), okvirno: est, termin: st.termin || '',
        ime: form.elements.ime.value.trim(), telefon: form.elements.telefon.value.trim(),
        email: form.elements.email.value.trim(), poruka: form.elements.poruka.value.trim(),
        stranica: location.pathname
      };
      // WhatsApp opens synchronously inside the click, otherwise the browser blocks the new tab
      if (WA_NUMBER) {
        const txt = ['Zdravo, želim da zakažem termin.', `Kategorija: ${payload.kategorija}`, `Usluga: ${payload.usluga}`,
          payload.dodaci ? `Dodaci: ${payload.dodaci}` : '', est, `Kada: ${payload.termin}`,
          `Ime: ${payload.ime}`, `Telefon: ${payload.telefon}`, payload.poruka ? `Poruka: ${payload.poruka}` : ''].filter(Boolean).join('\n');
        window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(txt)}`, '_blank', 'noopener');
        const dt = $('[data-done-text]', form);
        if (dt) dt.textContent = 'Otvorili smo WhatsApp sa vašim zahtevom. Pošaljite poruku i javljamo vam se da potvrdimo termin.';
      }
      try {
        // GET with URL params: Apps Script 302-redirects POSTs and drops the body (see apps-script/README.md)
        if (ENDPOINT) await fetch(`${ENDPOINT}?${new URLSearchParams(payload).toString()}`, { method: 'GET', mode: 'no-cors', keepalive: true });
        render('done');
      } catch (e) {
        err.innerHTML = 'Slanje trenutno nije moguće. Pišite nam na <a href="https://ig.me/m/pashabeautystudioo" target="_blank" rel="noopener">Instagramu</a> i zakazujemo odmah.';
        err.hidden = false;
        next.disabled = false;
      } finally { busy = false; }
    });

    // "Zakaži uslugu" buttons on the home page and ?usluga=slug on Rezervacije preselect the category
    $$('[data-service]').forEach((a) => a.addEventListener('click', () => pickCat(a.dataset.service, false)));
    render('kategorija');
    const q = new URLSearchParams(location.search).get('usluga');
    if (q) pickCat(q, false);
  });
})();
