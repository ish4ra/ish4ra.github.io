'use strict';
(() => {
  const STORAGE_KEY = 'ishara-clean-scroll-target';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const cleanUrl = () => {
    if (!location.hash) return;
    history.replaceState(history.state, '', location.pathname + location.search);
  };

  const focusTarget = element => {
    const hadTabindex = element.hasAttribute('tabindex');
    if (!hadTabindex) element.setAttribute('tabindex', '-1');
    try { element.focus({preventScroll:true}); } catch { element.focus(); }
    if (!hadTabindex) {
      element.addEventListener('blur', () => element.removeAttribute('tabindex'), {once:true});
    }
  };

  const scrollToTarget = (id, focus = false, instant = false) => {
    if (!id) return false;
    const target = document.getElementById(id);
    if (!target) return false;
    target.scrollIntoView({
      behavior: instant || reducedMotion.matches ? 'auto' : 'smooth',
      block: 'start'
    });
    if (focus) {
      const delay = instant || reducedMotion.matches ? 0 : 260;
      setTimeout(() => focusTarget(target), delay);
    }
    return true;
  };

  const queueScroll = (id, focus = false, instant = false) => {
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToTarget(id, focus, instant)));
  };

  const savePageTarget = (href, target, focus = false) => {
    try {
      const url = new URL(href, location.href);
      if (url.origin !== location.origin || !target) return;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        path: url.pathname,
        target,
        focus: !!focus
      }));
    } catch {}
  };

  const consumePendingTarget = () => {
    let pending = null;
    try {
      pending = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    } catch {}
    if (!pending || pending.path !== location.pathname || !pending.target) return false;
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    queueScroll(pending.target, !!pending.focus, true);
    return true;
  };

  const consumeLegacyHash = () => {
    if (!location.hash) return false;
    let target = '';
    try { target = decodeURIComponent(location.hash.slice(1)); }
    catch { target = location.hash.slice(1); }
    cleanUrl();
    if (!target) return false;
    queueScroll(target, false, true);
    return true;
  };

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[data-scroll-target],a[data-page-target]');
    if (!link) return;

    const localTarget = link.dataset.scrollTarget;
    if (localTarget) {
      event.preventDefault();
      cleanUrl();
      scrollToTarget(localTarget, link.hasAttribute('data-focus-target'));
      return;
    }

    const pageTarget = link.dataset.pageTarget;
    if (!pageTarget) return;

    let url;
    try { url = new URL(link.href, location.href); } catch { return; }
    if (url.origin !== location.origin) return;

    if (url.pathname === location.pathname) {
      event.preventDefault();
      cleanUrl();
      scrollToTarget(pageTarget, link.hasAttribute('data-focus-target'));
      return;
    }

    savePageTarget(link.href, pageTarget, link.hasAttribute('data-focus-target'));
  });

  addEventListener('hashchange', () => {
    if (location.hash) consumeLegacyHash();
  });

  const init = () => {
    const hadPending = consumePendingTarget();
    if (!hadPending) consumeLegacyHash();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }
})();