// Loaded first by every example page. It gives the site scripts the $ helper,
// tells Playlive which site this is, and lets Playlive see what the page does:
// uncaught errors and console.error calls become warnings in Results, and every
// storage key the site writes is recorded so Reset can clear it.
// Each site lives in examples/html/<id>/, so the folder name is the site id.
window.__trSite = location.pathname.replace(/\/[^/]*$/, '').split('/').pop();
window.$ = id => document.getElementById(id);

window.__trErrors = [];
addEventListener('error', e => window.__trErrors.push(e.message || 'Script error'));
addEventListener('unhandledrejection', e =>
  window.__trErrors.push('Unhandled promise rejection: ' + ((e.reason && e.reason.message) || e.reason)));
(function () {
  const original = console.error;
  console.error = function () {
    window.__trErrors.push([].map.call(arguments, String).join(' '));
    return original.apply(console, arguments);
  };
})();

(function () {
  try {
    const proto = Storage.prototype, original = proto.setItem;
    proto.setItem = function (key) {
      try {
        const area = this === window.sessionStorage ? 'session' : 'local';
        window.parent.__trRecordKey(window.__trSite, area, String(key));
      } catch (e) {}
      return original.apply(this, arguments);
    };
  } catch (e) {}
})();
