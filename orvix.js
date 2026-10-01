'use strict';
(() => {
  const root = document.documentElement;
  const themeButton = document.querySelector('#theme');

  try {
    const saved = localStorage.getItem('ishara-theme');
    if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;
  } catch {}

  function syncTheme() {
    const dark = root.dataset.theme === 'dark';
    themeButton.textContent = dark ? '☼' : '☾';
    themeButton.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
  }

  syncTheme();
  themeButton.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    syncTheme();
    try { localStorage.setItem('ishara-theme', root.dataset.theme); } catch {}
  });

  document.querySelector('#year').textContent = new Date().getFullYear();

  const releasesUrl = 'https://github.com/ish4ra/Orvix/releases';
  const cards = {
    windows: document.querySelector('[data-platform="windows"]'),
    android: document.querySelector('[data-platform="android"]'),
    tv: document.querySelector('[data-platform="tv"]'),
    macos: document.querySelector('[data-platform="macos"]')
  };

  const formatSize = bytes => bytes ? `${(bytes / 1024 / 1024).toFixed(bytes > 100 * 1024 * 1024 ? 0 : 1)} MB` : '';

  function setAsset(card, asset, version) {
    if (!card) return;
    const meta = card.querySelector('[data-asset-meta]');
    if (!asset) {
      card.href = releasesUrl;
      if (meta) meta.textContent = `${version} · View release`;
      return;
    }
    card.href = asset.browser_download_url;
    if (meta) meta.textContent = `${version} · ${formatSize(asset.size)}`;
  }

  async function loadLatestRelease() {
    try {
      const response = await fetch('https://api.github.com/repos/ish4ra/Orvix/releases?per_page=10', {
        headers: { Accept: 'application/vnd.github+json' }
      });
      if (!response.ok) throw new Error(`GitHub API ${response.status}`);
      const releases = await response.json();
      const release = releases.find(item => !item.draft && Array.isArray(item.assets) && item.assets.length);
      if (!release) throw new Error('No published release assets');

      const assets = release.assets;
      const find = pattern => assets.find(asset => pattern.test(asset.name));
      const version = release.tag_name || release.name || 'Latest';

      setAsset(cards.windows, find(/Orvix-Setup-.*-Windows-x64\.exe$/i), version);
      setAsset(cards.android, find(/Orvix-.*-Android-Mobile\.apk$/i), version);
      setAsset(cards.tv, find(/Orvix-.*-Android-TV\.apk$/i), version);
      setAsset(cards.macos, find(/Orvix-.*-macOS\.zip$/i), version);

      document.querySelector('#release-version').textContent = version;
      document.querySelector('#release-channel').textContent = release.prerelease ? 'LATEST BETA' : 'LATEST STABLE';
      document.querySelector('#release-date').textContent = release.published_at
        ? `Published ${new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric'}).format(new Date(release.published_at))}`
        : 'Newest published release';
    } catch (error) {
      document.querySelector('#release-channel').textContent = 'GITHUB RELEASES';
      document.querySelector('#release-version').textContent = 'Latest available';
      document.querySelector('#release-date').textContent = 'Open Releases to choose the newest build';
      Object.values(cards).forEach(card => { if (card) card.href = releasesUrl; });
    }
  }

  loadLatestRelease();
})();