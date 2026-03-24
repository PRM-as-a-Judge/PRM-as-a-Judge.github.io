/* Global site visit counter (low-visibility corner widget). */
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('site-visit-counter')) return;

  var style = document.createElement('style');
  style.id = 'site-visit-counter-style';
  style.textContent = [
    '#site-visit-counter {',
    '  position: fixed;',
    '  right: 8px;',
    '  bottom: 6px;',
    '  z-index: 20;',
    '  font-family: "Source Sans 3", Arial, sans-serif;',
    '  font-size: 9px;',
    '  line-height: 1;',
    '  color: rgba(0,0,0,0.32);',
    '  letter-spacing: 0.02em;',
    '  pointer-events: none;',
    '  user-select: none;',
    '}'
  ].join('\n');
  document.head.appendChild(style);

  var counter = document.createElement('div');
  counter.id = 'site-visit-counter';
  counter.setAttribute('aria-hidden', 'true');
  counter.innerHTML = 'Visits <span id="busuanzi_value_site_pv">...</span>';
  document.body.appendChild(counter);

  var sitePvEl = document.getElementById('busuanzi_value_site_pv');

  function requestSitePv() {
    var cbName = 'BusuanziCallback_' + Math.floor(Math.random() * 1e12);
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://busuanzi.ibruce.info/busuanzi?jsonpCallback=' +
      cbName + '&_t=' + Date.now();

    window[cbName] = function(data) {
      if (sitePvEl && data && typeof data.site_pv !== 'undefined') {
        sitePvEl.textContent = String(data.site_pv);
      }
      try { delete window[cbName]; } catch (e) { window[cbName] = undefined; }
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    script.onerror = function() {
      if (sitePvEl) sitePvEl.textContent = '--';
      try { delete window[cbName]; } catch (e) { window[cbName] = undefined; }
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    document.head.appendChild(script);
  }

  requestSitePv();

  window.addEventListener('pageshow', function(event) {
    if (event.persisted) requestSitePv();
  });
})();
