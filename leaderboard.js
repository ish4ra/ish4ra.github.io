'use strict';
(() => {
  const firebaseConfig = {
    apiKey: 'AIzaSyDyt2DwOmljQHG2QIJQqcN_K0Hwu-K1e0A',
    authDomain: 'snake-game-leaderboard-39c92.firebaseapp.com',
    projectId: 'snake-game-leaderboard-39c92',
    storageBucket: 'snake-game-leaderboard-39c92.firebasestorage.app',
    messagingSenderId: '572360221865',
    appId: '1:572360221865:web:fb2a0617002f86bd62b5b8',
    measurementId: 'G-VNRTH0YR3Z'
  };

  const FIREBASE_VERSION = '10.14.1';
  const MAX_SCORE = 216;
  let db = null;
  let pendingScore = 0;
  let fullLeaderboardEntries = [];
  let leaderboardView = 'best';

  const loadScript = src => new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (window.firebase) return resolve();
      existing.addEventListener('load', resolve, {once:true});
      existing.addEventListener('error', reject, {once:true});
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });

  const firebaseReady = async () => {
    await loadScript(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app-compat.js`);
    await loadScript(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore-compat.js`);
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    return db;
  };

  const safeName = value => value
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20);

  const playerKey = value => safeName(String(value || 'Player')).toLowerCase();
  const scoreText = score => String(score).padStart(2, '0');

  const entryFromDoc = doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: safeName(String(data.name || 'Player')) || 'Player',
      score: Number(data.score || 0),
      createdAt: data.createdAt || null
    };
  };

  function bestPerPlayer(entries) {
    const seen = new Set();
    const best = [];
    for (const entry of entries) {
      const key = playerKey(entry.name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      best.push(entry);
    }
    return best;
  }

  function createPreview() {
    const section = document.querySelector('#playground');
    const shell = section?.querySelector('.snake-shell');
    const overlay = document.querySelector('#snake-overlay');
    if (!section || !shell || !overlay || document.querySelector('.snake-leaderboard')) return;

    const entry = document.createElement('div');
    entry.className = 'snake-score-entry';
    entry.id = 'snake-score-entry';
    entry.hidden = true;
    entry.innerHTML = `
      <div class="snake-score-entry-copy">
        <span>LEAVE YOUR MARK</span>
        <p>Save this run to the global leaderboard.</p>
      </div>
      <form id="snake-score-form" autocomplete="off">
        <label class="sr-only" for="snake-player-name">Player name</label>
        <input id="snake-player-name" name="player" type="text" maxlength="20" minlength="1" placeholder="Your name" inputmode="text" enterkeyhint="send" required>
        <button class="button primary" type="submit">Save score ↗</button>
        <span id="snake-score-status" role="status" aria-live="polite"></span>
      </form>`;
    shell.append(entry);

    const preview = document.createElement('div');
    preview.className = 'snake-leaderboard';
    preview.innerHTML = `
      <div class="snake-leaderboard-head">
        <div><span class="snake-leaderboard-kicker">GLOBAL LEADERBOARD</span><h3>Top players<span>.</span></h3></div>
        <a href="leaderboard.html">Full leaderboard ↗</a>
      </div>
      <ol id="snake-top-three" class="snake-top-three" aria-live="polite">
        <li class="is-loading"><span>01</span><strong>Loading</strong><b>--</b></li>
        <li class="is-loading"><span>02</span><strong>Loading</strong><b>--</b></li>
        <li class="is-loading"><span>03</span><strong>Loading</strong><b>--</b></li>
      </ol>`;
    section.append(preview);

    const form = document.querySelector('#snake-score-form');
    const input = document.querySelector('#snake-player-name');
    const status = document.querySelector('#snake-score-status');
    const saveButton = form.querySelector('button');

    const resetEntry = () => {
      entry.hidden = true;
      pendingScore = 0;
      status.textContent = '';
      input.disabled = false;
      saveButton.disabled = false;
      saveButton.textContent = 'Save score ↗';
    };

    const offerSave = () => {
      if (overlay.hidden) {
        resetEntry();
        return;
      }
      const score = Number.parseInt(document.querySelector('#snake-score')?.textContent || '0', 10);
      pendingScore = Number.isInteger(score) ? Math.max(0, Math.min(MAX_SCORE, score)) : 0;
      if (pendingScore < 1) {
        entry.hidden = true;
        return;
      }
      form.reset();
      input.disabled = false;
      saveButton.disabled = false;
      saveButton.textContent = 'Save score ↗';
      status.textContent = '';
      entry.hidden = false;
    };

    new MutationObserver(offerSave).observe(overlay, {attributes:true, attributeFilter:['hidden']});

    ['snake-play','snake-again','snake-auto'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', resetEntry);
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!db || pendingScore < 1) {
        status.textContent = 'Leaderboard is still loading.';
        return;
      }
      const name = safeName(input.value);
      if (!name) {
        status.textContent = 'Enter a name.';
        input.focus();
        return;
      }
      saveButton.disabled = true;
      status.textContent = 'Saving…';
      try {
        await db.collection('scores').add({
          name,
          score: pendingScore,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        status.textContent = 'Score saved.';
        input.disabled = true;
        saveButton.textContent = 'Saved ✓';
        pendingScore = 0;
        await refreshTopThree();
      } catch (error) {
        console.error('Leaderboard save failed:', error);
        status.textContent = 'Could not save. Try again.';
        saveButton.disabled = false;
      }
    });
  }

  async function refreshTopThree() {
    const list = document.querySelector('#snake-top-three');
    if (!db || !list) return;
    try {
      const snapshot = await db.collection('scores').orderBy('score', 'desc').get();
      const entries = bestPerPlayer(snapshot.docs.map(entryFromDoc)).slice(0, 3);
      list.textContent = '';
      for (let i = 0; i < 3; i++) {
        const li = document.createElement('li');
        const rank = document.createElement('span');
        const name = document.createElement('strong');
        const score = document.createElement('b');
        rank.textContent = String(i + 1).padStart(2, '0');
        if (entries[i]) {
          name.textContent = entries[i].name;
          score.textContent = scoreText(entries[i].score);
        } else {
          name.textContent = 'Open slot';
          score.textContent = '--';
          li.classList.add('is-empty');
        }
        li.append(rank, name, score);
        list.append(li);
      }
    } catch (error) {
      console.error('Leaderboard load failed:', error);
      list.innerHTML = '<li class="is-empty"><span>--</span><strong>Leaderboard unavailable</strong><b>--</b></li>';
    }
  }

  function formatDate(timestamp) {
    if (!timestamp?.toDate) return 'Just now';
    return timestamp.toDate().toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'});
  }

  function renderLeaderboardRows() {
    const body = document.querySelector('#full-leaderboard');
    const count = document.querySelector('#leaderboard-count');
    if (!body || !count) return;

    const entries = leaderboardView === 'best' ? bestPerPlayer(fullLeaderboardEntries) : fullLeaderboardEntries;
    body.textContent = '';

    if (leaderboardView === 'best') {
      count.textContent = `${entries.length} player${entries.length === 1 ? '' : 's'} · ${fullLeaderboardEntries.length} saved run${fullLeaderboardEntries.length === 1 ? '' : 's'}`;
    } else {
      count.textContent = `${entries.length} recorded run${entries.length === 1 ? '' : 's'}`;
    }

    if (!entries.length) {
      const row = document.createElement('div');
      row.className = 'leaderboard-row leaderboard-empty';
      row.textContent = 'No scores yet. Be the first.';
      body.append(row);
      return;
    }

    entries.forEach((entry, index) => {
      const row = document.createElement('div');
      row.className = 'leaderboard-row';
      const rank = document.createElement('span');
      const name = document.createElement('strong');
      const score = document.createElement('b');
      const date = document.createElement('time');
      rank.textContent = String(index + 1).padStart(2, '0');
      name.textContent = entry.name;
      score.textContent = scoreText(entry.score);
      date.textContent = formatDate(entry.createdAt);
      row.append(rank, name, score, date);
      body.append(row);
    });
  }

  function setupLeaderboardViewSwitch() {
    const controls = document.querySelectorAll('[data-leaderboard-view]');
    if (!controls.length) return;
    controls.forEach(button => {
      button.addEventListener('click', () => {
        leaderboardView = button.dataset.leaderboardView === 'all' ? 'all' : 'best';
        controls.forEach(control => {
          const active = control.dataset.leaderboardView === leaderboardView;
          control.classList.toggle('is-active', active);
          control.setAttribute('aria-pressed', String(active));
        });
        renderLeaderboardRows();
      });
    });
  }

  async function renderFullLeaderboard() {
    const body = document.querySelector('#full-leaderboard');
    const count = document.querySelector('#leaderboard-count');
    if (!body || !db) return;
    try {
      const snapshot = await db.collection('scores').orderBy('score', 'desc').get();
      fullLeaderboardEntries = snapshot.docs.map(entryFromDoc);
      renderLeaderboardRows();
    } catch (error) {
      console.error('Full leaderboard load failed:', error);
      body.innerHTML = '<div class="leaderboard-row leaderboard-empty">Leaderboard unavailable right now.</div>';
      count.textContent = 'Could not load scores';
    }
  }

  async function init() {
    createPreview();
    setupLeaderboardViewSwitch();
    try {
      await firebaseReady();
      await Promise.all([refreshTopThree(), renderFullLeaderboard()]);
    } catch (error) {
      console.error('Firebase leaderboard failed to initialize:', error);
      const list = document.querySelector('#snake-top-three');
      if (list) list.innerHTML = '<li class="is-empty"><span>--</span><strong>Leaderboard offline</strong><b>--</b></li>';
      const body = document.querySelector('#full-leaderboard');
      if (body) body.innerHTML = '<div class="leaderboard-row leaderboard-empty">Leaderboard unavailable right now.</div>';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
