(function () {
  'use strict';

  var body = document.body;
  var button = document.getElementById('langToggle');
  var storageKey = 'prmJudgeDocLanguage';
  var page = body.getAttribute('data-page') || '';
  var hashId = decodeURIComponent(window.location.hash.slice(1));
  var advancedIds = new Set([
    'manifest', 'outputs', 'defaults', 'choose-backend', 'modes', 'multi-view',
    'multi-gpu', 'progress-standard', 'postprocess', 'metrics', 'custom-prm', 'recipes',
    'zh-manifest', 'zh-outputs', 'zh-defaults', 'zh-choose-backend', 'zh-modes',
    'zh-multi-view', 'zh-multi-gpu', 'zh-progress-standard', 'zh-postprocess',
    'zh-metrics', 'zh-custom-prm', 'zh-recipes'
  ]);
  var quickStartIds = new Set(['overview', 'quick-start', 'zh-overview', 'zh-quick-start']);

  if (page === 'quickstart' && advancedIds.has(hashId)) {
    window.location.replace('advanced.html' + window.location.hash);
    return;
  }
  if (page === 'advanced' && quickStartIds.has(hashId)) {
    window.location.replace('doc.html' + window.location.hash);
    return;
  }

  function setLanguage(lang) {
    var normalized = lang === 'zh' ? 'zh' : 'en';
    body.setAttribute('data-lang', normalized);
    document.documentElement.setAttribute('lang', normalized === 'zh' ? 'zh-CN' : 'en');
    document.title = normalized === 'zh'
      ? body.getAttribute('data-title-zh')
      : body.getAttribute('data-title-en');
    try {
      window.localStorage.setItem(storageKey, normalized);
    } catch (error) {
      // Ignore storage errors in restricted browser contexts.
    }
  }

  function languageFromHash() {
    var id = decodeURIComponent(window.location.hash.slice(1));
    var target = id ? document.getElementById(id) : null;
    if (!target) return null;
    if (target.closest('.lang-zh')) return 'zh';
    if (target.closest('.lang-en')) return 'en';
    return null;
  }

  function scrollToHashTarget() {
    var id = decodeURIComponent(window.location.hash.slice(1));
    var target = id ? document.getElementById(id) : null;
    if (!target) return;
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        var root = document.documentElement;
        var previousBehavior = root.style.scrollBehavior;
        var nav = document.querySelector('.site-nav');
        var offset = (nav ? nav.getBoundingClientRect().height : 0) + 16;
        var top = window.scrollY + target.getBoundingClientRect().top - offset;
        root.style.scrollBehavior = 'auto';
        window.scrollTo(0, Math.max(0, top));
        root.style.scrollBehavior = previousBehavior;
      });
    });
  }

  var initialLanguage = languageFromHash() || 'en';
  try {
    initialLanguage = languageFromHash() || window.localStorage.getItem(storageKey) || 'en';
  } catch (error) {
    initialLanguage = languageFromHash() || 'en';
  }

  setLanguage(initialLanguage);
  scrollToHashTarget();
  window.addEventListener('load', scrollToHashTarget);

  if (button) {
    button.addEventListener('click', function () {
      setLanguage(body.getAttribute('data-lang') === 'zh' ? 'en' : 'zh');
    });
  }

  window.addEventListener('hashchange', function () {
    var newId = decodeURIComponent(window.location.hash.slice(1));
    if (page === 'quickstart' && advancedIds.has(newId)) {
      window.location.replace('advanced.html' + window.location.hash);
      return;
    }
    if (page === 'advanced' && quickStartIds.has(newId)) {
      window.location.replace('doc.html' + window.location.hash);
      return;
    }
    var hashLanguage = languageFromHash();
    if (hashLanguage) setLanguage(hashLanguage);
    scrollToHashTarget();
  });
})();
