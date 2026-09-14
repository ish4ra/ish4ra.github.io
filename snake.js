'use strict';
(() => {
  const load = (src) => {
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.head.append(script);
  };
  load('snake-core.js?v=20');
  load('leaderboard.js?v=1');
})();
