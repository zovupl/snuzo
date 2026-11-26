/* SNUZO — baner zgody na cookies. Samodzielny, bez zależności.
   Zapis: localStorage "snuzo-consent" = {necessary:true, analytics:bool, marketing:bool, ts}
   API:   window.snuzoCookies.open()  — pokazuje baner z ustawieniami
          window.snuzoCookies.get()   — zwraca zapisaną zgodę albo null
   Zdarzenie: document "snuzo-consent" (detail = obiekt zgody) po każdym zapisie. */
(function () {
  'use strict';
  var KEY = 'snuzo-consent';
  var POLICY = 'polityka-prywatnosci.html#cookies';
  var root, panel, tA, tM, lastFocus;

  function read() {
    try {
      var v = JSON.parse(window.localStorage.getItem(KEY));
      return v && typeof v === 'object' && v.necessary ? v : null;
    } catch (e) { return null; }
  }
  function write(analytics, marketing) {
    var c = { necessary: true, analytics: !!analytics, marketing: !!marketing, ts: new Date().toISOString() };
    try { window.localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* tryb prywatny itp. */ }
    try { document.dispatchEvent(new CustomEvent('snuzo-consent', { detail: c })); } catch (e) {}
    close();
    return c;
  }

  function build() {
    root = document.createElement('div');
    root.id = 'snuzo-cc';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'false');
    root.setAttribute('aria-labelledby', 'snuzo-cc-t');
    root.setAttribute('aria-describedby', 'snuzo-cc-d');
    root.hidden = true;
    root.innerHTML =
      '<p class="cc-kick">Zanim zaczniesz</p>' +
      '<h2 id="snuzo-cc-t">Pliki cookies</h2>' +
      '<p id="snuzo-cc-d">Używamy plików cookies niezbędnych do działania sklepu (koszyk, płatność, bezpieczeństwo). ' +
      'Za Twoją zgodą użyjemy też cookies analitycznych i marketingowych. Zgodę możesz w każdej chwili zmienić. ' +
      'Szczegóły w <a href="' + POLICY + '">Polityce prywatności</a>.</p>' +
      '<div class="cc-panel" id="snuzo-cc-p" hidden>' +
        '<div class="cc-row"><div><b>Niezbędne</b><small>Koszyk, płatność, bezpieczeństwo, zapamiętanie wyboru cookies.</small></div><span class="cc-always">Zawsze</span></div>' +
        '<div class="cc-row"><div><b id="snuzo-cc-la">Analityczne</b><small>Anonimowe statystyki odwiedzin, by ulepszać sklep.</small></div>' +
          '<label class="cc-tg"><input type="checkbox" id="snuzo-cc-a" aria-labelledby="snuzo-cc-la"><span class="cc-sw" aria-hidden="true"></span></label></div>' +
        '<div class="cc-row"><div><b id="snuzo-cc-lm">Marketingowe</b><small>Dopasowanie reklam i mierzenie ich skuteczności.</small></div>' +
          '<label class="cc-tg"><input type="checkbox" id="snuzo-cc-m" aria-labelledby="snuzo-cc-lm"><span class="cc-sw" aria-hidden="true"></span></label></div>' +
      '</div>' +
      '<div class="cc-btns">' +
        '<button type="button" class="cc-pri" data-cc="all">Akceptuję wszystkie</button>' +
        '<button type="button" class="cc-sec" data-cc="nec">Tylko niezbędne</button>' +
        '<button type="button" class="cc-sec" data-cc="set" aria-expanded="false" aria-controls="snuzo-cc-p">Ustawienia</button>' +
      '</div>';
    document.body.appendChild(root);
    panel = root.querySelector('#snuzo-cc-p');
    tA = root.querySelector('#snuzo-cc-a');
    tM = root.querySelector('#snuzo-cc-m');

    root.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-cc]');
      if (!b) return;
      var a = b.getAttribute('data-cc');
      if (a === 'all') write(true, true);
      else if (a === 'nec') write(false, false);
      else if (a === 'set') {
        if (panel.hidden) { showPanel(true); }
        else { write(tA.checked, tM.checked); }
      }
    });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) { e.preventDefault(); showPanel(false); }
    });
  }

  function showPanel(on) {
    var b = root.querySelector('[data-cc="set"]');
    panel.hidden = !on;
    b.setAttribute('aria-expanded', on ? 'true' : 'false');
    b.textContent = on ? 'Zapisz wybór' : 'Ustawienia';
    if (on) tA.focus(); else b.focus();
  }

  function open(withSettings) {
    if (!root) build();
    var c = read();
    tA.checked = !!(c && c.analytics);
    tM.checked = !!(c && c.marketing);
    lastFocus = document.activeElement;
    root.hidden = false;
    if (withSettings) showPanel(true);
    else { showPanel(false); root.querySelector('.cc-pri').focus(); }
  }
  function close() {
    if (!root) return;
    root.hidden = true;
    if (lastFocus && lastFocus.focus && document.contains(lastFocus)) { try { lastFocus.focus(); } catch (e) {} }
  }

  window.snuzoCookies = {
    open: function () { open(true); },
    get: function () { return read(); }
  };

  function init() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-cookies-open]');
      if (t) { e.preventDefault(); window.snuzoCookies.open(); }
    });
    if (!read()) whenAgeClosed(function () { if (!read()) open(false); });
  }

  /* Bramka wieku (#age bez atrybutu hidden) ma pierwszeństwo: baner pokazujemy dopiero po jej zamknięciu. */
  function ageOpen() {
    var a = document.getElementById('age');
    return !!(a && !a.hidden);
  }
  function whenAgeClosed(cb) {
    if (!ageOpen()) { cb(); return; }
    var done = false, a = document.getElementById('age'), mo, iv;
    function check() {
      if (done || ageOpen()) return;
      done = true;
      if (mo) mo.disconnect();
      clearInterval(iv);
      setTimeout(cb, 300); // chwila po zniknięciu bramki, żeby fokus nie skakał
    }
    if (window.MutationObserver) {
      mo = new MutationObserver(check);
      mo.observe(a, { attributes: true, attributeFilter: ['hidden'] });
    }
    iv = setInterval(check, 400); // zapas, gdyby bramka została podmieniona w DOM
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
