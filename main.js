/* Pasha Beauty Studio: interactions (behaviour mirrors the Salonix Framer template) */

// Paste the Apps Script URL here after running Skill 03 (form backend setup).
const ENDPOINT = '';
// Studio WhatsApp number, international format without + or spaces (e.g. '381641234567').
// When set: "Pošalji poruku" buttons open WhatsApp and the booking form hands the request to WhatsApp.
const WA_NUMBER = '';

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
      window.PashaFluid.show(s.currentSrc || s.src).then(() => {
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

  /* ---------- problem / solution cards ---------- */
  const cursorBtn = $('#cursorBtn');
  let cx = 0, cy = 0, tx = 0, ty = 0, cursorRaf = 0;
  const follow = () => {
    cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
    cursorBtn.style.setProperty('--x', cx + 'px'); cursorBtn.style.setProperty('--y', cy + 'px');
    cursorRaf = requestAnimationFrame(follow);
  };
  $$('.sol').forEach((card) => {
    const toggle = () => {
      const open = card.classList.toggle('is-open');
      card.setAttribute('aria-pressed', open);
      if (cursorBtn) cursorBtn.firstChild.textContent = open ? 'Zatvori ' : 'Pogledaj rešenje ';
    };
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    if (!cursorBtn) return;
    card.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      tx = cx = e.clientX - 20; ty = cy = e.clientY - 16;
      cursorBtn.firstChild.textContent = card.classList.contains('is-open') ? 'Zatvori ' : 'Pogledaj rešenje ';
      cursorBtn.classList.add('is-on');
      cancelAnimationFrame(cursorRaf); follow();
    });
    card.addEventListener('pointermove', (e) => { tx = e.clientX - 20; ty = e.clientY - 16; });
    card.addEventListener('pointerleave', () => { cursorBtn.classList.remove('is-on'); setTimeout(() => cancelAnimationFrame(cursorRaf), 300); });
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
  tabs.forEach((t) => {
    const on = () => { tabs.forEach((x) => x.classList.remove('is-on')); t.classList.add('is-on'); };
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

  /* ---------- booking wizard (3 steps on the home page, 4 on Rezervacije) ---------- */
  const priceData = (() => { try { const j = $('#cenovnik'); return j ? JSON.parse(j.textContent) : null; } catch (e) { return null; } })();
  $$('[data-wizard]').forEach((form) => {
    const steps = $$('[data-step]', form);
    const flow = steps.filter((s) => s.dataset.step !== 'done');
    const total = flow.length;
    const vp = $('[data-viewport]', form);
    const next = $('[data-next]', form);
    const back = $('[data-back]', form);
    const bar = $('[data-bar]', form);
    const label = $('[data-step-label]', form);
    const name = $('[data-step-name]', form);
    const err = $('[data-error]', form);
    const navRow = $('[data-nav]', form);
    const dyn = $('[data-dynamic]', form);
    const data = {};
    let idx = 0, busy = false;

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
    const isChoiceStep = (el) => !!$('.choices', el);
    const canNext = () => {
      const g = $('.choices', flow[idx]);
      return !g || !!data[g.dataset.group];
    };
    const render = (i) => {
      lockHeight(() => {
        steps.forEach((s) => { s.hidden = true; s.classList.remove('is-enter'); });
        const el = i === 'done' ? steps.find((s) => s.dataset.step === 'done') : flow[i];
        el.hidden = false; el.classList.add('is-enter');
      });
      if (i === 'done') {
        navRow.hidden = true; bar.style.width = '100%';
        label.textContent = 'Poslato'; name.textContent = '';
        return;
      }
      idx = i;
      bar.style.width = ((i + 1) / total) * 100 + '%';
      label.textContent = `Korak ${i + 1} od ${total}`;
      name.textContent = flow[i].dataset.name || '';
      back.hidden = i === 0;
      next.hidden = isChoiceStep(flow[i]); // choice steps advance on tap, so no extra button there
      next.disabled = !canNext();
      next.firstChild.textContent = i === total - 1 ? 'Pošalji zahtev' : 'Dalje';
      err.hidden = true;
    };

    const select = (btn, group) => {
      $$('.choice', group).forEach((b) => b.classList.remove('is-on'));
      btn.classList.add('is-on');
      data[group.dataset.group] = btn.dataset.value;
      // picking a category refills the "which service" step from the price list
      if (btn.dataset.slug && dyn && group !== dyn) fillServices(btn.dataset.slug);
    };
    const bind = (btn, group) => btn.addEventListener('click', () => {
      select(btn, group);
      next.disabled = false;
      // single choice auto-advances after a short beat so the selection is visible
      setTimeout(() => { if (idx < total - 1 && flow[idx].contains(btn)) render(idx + 1); }, 260);
    });
    const fillServices = (slug) => {
      const list = (priceData && priceData[slug]) || [];
      delete data[dyn.dataset.group];
      dyn.textContent = '';
      list.forEach(([n, p]) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'choice'; b.dataset.value = n;
        const s = document.createElement('span'); s.textContent = n; b.appendChild(s);
        if (p) { const sm = document.createElement('small'); sm.textContent = p; b.appendChild(sm); }
        dyn.appendChild(b); bind(b, dyn);
      });
    };
    $$('.choices', form).forEach((group) => { if (group !== dyn) $$('.choice', group).forEach((btn) => bind(btn, group)); });

    back.addEventListener('click', () => { if (idx > 0) render(idx - 1); });

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
      if (idx < total - 1) { if (canNext()) render(idx + 1); return; }
      if (!validate()) { err.textContent = 'Upišite ime i broj telefona da bismo mogli da vam se javimo.'; err.hidden = false; return; }
      if (!ENDPOINT && !WA_NUMBER) {
        err.innerHTML = 'Slanje preko sajta još nije uključeno. Pišite nam na <a href="https://ig.me/m/pashabeautystudioo" target="_blank" rel="noopener">Instagramu</a> i zakazujemo odmah.';
        err.hidden = false; return;
      }
      busy = true; next.disabled = true; err.hidden = true;
      const payload = {
        kategorija: data.kategorija || '', usluga: data.usluga || '', termin: data.termin || '',
        ime: form.elements.ime.value.trim(), telefon: form.elements.telefon.value.trim(),
        email: form.elements.email.value.trim(), poruka: form.elements.poruka.value.trim(),
        stranica: location.pathname
      };
      // WhatsApp opens synchronously inside the click, otherwise the browser blocks the new tab
      if (WA_NUMBER) {
        const txt = ['Zdravo, želim da zakažem termin.',
          `Usluga: ${payload.kategorija}${payload.usluga ? ', ' + payload.usluga : ''}`,
          `Kada: ${payload.termin}`, `Ime: ${payload.ime}`, `Telefon: ${payload.telefon}`,
          payload.poruka ? `Poruka: ${payload.poruka}` : ''].filter(Boolean).join('\n');
        window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(txt)}`, '_blank', 'noopener');
        const dt = $('[data-done-text]', form);
        if (dt && !ENDPOINT) dt.textContent = 'Otvorili smo WhatsApp sa vašim zahtevom. Pošaljite poruku i javljamo vam se da potvrdimo termin.';
      }
      try {
        if (ENDPOINT) await fetch(ENDPOINT, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
        render('done');
      } catch (e) {
        err.innerHTML = 'Slanje trenutno nije moguće. Pišite nam na <a href="https://ig.me/m/pashabeautystudioo" target="_blank" rel="noopener">Instagramu</a> i zakazujemo odmah.';
        err.hidden = false;
        next.disabled = false;
      } finally { busy = false; }
    });

    // "Zakaži uslugu" buttons (and ?usluga=slug on Rezervacije) preselect the category
    const first = $('.choices', flow[0]);
    const preselect = (slug) => {
      const btn = $$('.choice', first).find((b) => b.dataset.slug === slug || b.dataset.value === slug);
      if (!btn) return false;
      select(btn, first); render(1); return true;
    };
    $$('[data-service]').forEach((a) => a.addEventListener('click', () => preselect(a.dataset.service)));

    render(0);
    const q = new URLSearchParams(location.search).get('usluga');
    if (q) preselect(q);
  });
})();
