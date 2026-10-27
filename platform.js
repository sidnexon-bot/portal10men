/* 10base – rozpoznání platformy pro spodní plovoucí lištu.
   Apple (iPhone, iPad, Mac) a vše ostatní → "liquid glass"; Android → styl Samsung One UI.
   Pro vyzkoušení: přidej ?platform=apple nebo ?platform=android do adresy. */
(function () {
  var q = new URLSearchParams(location.search).get('platform');
  var android = q === 'android' || (q !== 'apple' && /Android/i.test(navigator.userAgent || ''));
  document.documentElement.setAttribute('data-platform', android ? 'android' : 'apple');
})();

/* Energie: záložka je skrytá (viz redesign.css, blok 8). Aplikace si 10 minut pamatuje poslední
   záložku; kdyby to byla Energie, otevře se místo ní Přehled. Zpět: smazat tento blok. */
(function () {
  try {
    var k = '10base_state', s = JSON.parse(sessionStorage.getItem(k) || 'null');
    if (s && s.tab === 'energy') { s.tab = 'dashboard'; sessionStorage.setItem(k, JSON.stringify(s)); }
  } catch (e) { /* bez uloženého stavu není co opravovat */ }
})();

/* Barva lišty prohlížeče (theme-color) sleduje režim aplikace: černá v tmavém režimu (OLED),
   jinak světlá. Zůstane jediný tag a ručně přepnutý režim se projeví hned. */
document.addEventListener('DOMContentLoaded', function () {
  function sync() {
    var c = document.body.classList.contains('dark') ? '#000000' : '#f2f2f7';
    var tags = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < tags.length; i++) {
      if (i > 0) { tags[i].remove(); continue; }
      tags[i].removeAttribute('media'); tags[i].setAttribute('content', c);
    }
  }
  sync();
  new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
});

/* Menu profilu: zavření klávesou Esc (zavírání klikem mimo řeší app.js). */
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  var m = document.getElementById('profileMenu');
  if (m && !m.classList.contains('hidden')) m.classList.add('hidden');
});
