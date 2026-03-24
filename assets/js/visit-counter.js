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
    '}',
    '#site-visit-counter a {',
    '  color: inherit;',
    '  text-decoration: none;',
    '}'
  ].join('\n');
  document.head.appendChild(style);

  var counter = document.createElement('div');
  counter.id = 'site-visit-counter';
  counter.setAttribute('aria-hidden', 'true');
  counter.innerHTML = 'Visits <span id="busuanzi_value_site_pv">...</span>';
  document.body.appendChild(counter);

  if (!document.querySelector('script[data-site-counter=\"busuanzi\"]')) {
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js';
    script.setAttribute('data-site-counter', 'busuanzi');
    document.head.appendChild(script);
  }
})();
