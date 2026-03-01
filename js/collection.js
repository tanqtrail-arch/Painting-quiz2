/**
 * collection.js
 * LocalStorage読み書き、コレクション管理、フィルター、
 * 進捗表示、詳細モーダル、Newバッジ
 */

const Collection = (() => {
  'use strict';

  const PROGRESS_KEY = 'pq2_progress';
  const NEW_BADGE_KEY = 'pq2_new_badges';

  let _paintings = [];
  let _progress = {};       // { [id]: { title: bool, artist: bool, genre: bool } }
  let _newBadges = new Set();
  let _filterGenre = 'all';

  // ===== LocalStorage 読み書き =====
  function loadProgress() {
    try {
      _progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    } catch {
      _progress = {};
    }
    try {
      _newBadges = new Set(JSON.parse(localStorage.getItem(NEW_BADGE_KEY) || '[]'));
    } catch {
      _newBadges = new Set();
    }
  }

  function saveProgress() {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(_progress));
    localStorage.setItem(NEW_BADGE_KEY, JSON.stringify([..._newBadges]));
  }

  // ===== 正解記録 =====
  function markCorrect(paintingId, mode) {
    const id = String(paintingId);
    if (!_progress[id]) {
      _progress[id] = { title: false, artist: false, genre: false };
    }

    const wasBefore = isCollected(id);
    _progress[id][mode] = true;
    const isNow = isCollected(id);

    if (!wasBefore && isNow) {
      _newBadges.add(id);
    }

    saveProgress();
  }

  // ===== コレクション判定 =====
  function isCollected(paintingId) {
    const id = String(paintingId);
    const pr = _progress[id];
    return !!(pr && pr.title && pr.artist && pr.genre);
  }

  function getCollectedPaintings() {
    return _paintings.filter(p => isCollected(p.id));
  }

  function getCollectedCount() {
    return getCollectedPaintings().length;
  }

  function getProgressFor(paintingId) {
    return _progress[String(paintingId)] || { title: false, artist: false, genre: false };
  }

  // ===== 初期化 =====
  function init(paintings) {
    _paintings = paintings;
    loadProgress();
    bindFilters();
  }

  // ===== フィルター =====
  function bindFilters() {
    const container = document.getElementById('collection-filters');
    if (!container) return;

    container.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-genre]');
      if (!chip) return;
      container.querySelectorAll('[data-genre]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      _filterGenre = chip.dataset.genre;
      renderGrid();
    });
  }

  // ===== レンダリング =====
  function render() {
    renderProgress();
    renderGrid();
  }

  // ===== 進捗バー + カウント =====
  function renderProgress() {
    const countEl = document.getElementById('collection-count');
    const fillEl = document.getElementById('collection-progress-fill');
    const total = _paintings.length;
    const collected = getCollectedCount();

    if (countEl) countEl.textContent = `${collected} / ${total}`;
    if (fillEl && total > 0) fillEl.style.width = `${(collected / total) * 100}%`;
  }

  // ===== グリッド =====
  function renderGrid() {
    const gridEl = document.getElementById('collection-grid');
    if (!gridEl) return;

    const display = _filterGenre === 'all'
      ? _paintings
      : _paintings.filter(p => p.genre === _filterGenre);

    gridEl.innerHTML = display.map(p => {
      const id = String(p.id);
      const ic = isCollected(id);
      const isNew = _newBadges.has(id);
      const pr = getProgressFor(id);
      const thumbUrl = DataLoader.getImageUrl(p, true);

      // カードクラス
      const cardClass = ic ? 'collection-card collected' : 'collection-card locked';

      return `
        <div class="${cardClass}" data-id="${id}">
          <img class="collection-card-img" src="${thumbUrl}" alt="${p.title_ja}"
               style="${ic ? '' : 'filter:grayscale(1) brightness(.6)'}" loading="lazy">
          ${!ic ? '<span class="lock-icon">🔒</span>' : ''}
          ${isNew ? '<span class="new-badge">NEW</span>' : ''}
          <div class="collection-card-info">
            <div class="collection-card-title">${p.title_ja}</div>
            <div class="collection-card-artist">${p.artist_ja}</div>
          </div>
          <div class="collection-card-badges">
            <span class="badge-dot ${pr.title ? 'earned' : ''}" title="作品名">T</span>
            <span class="badge-dot ${pr.artist ? 'earned' : ''}" title="作者">A</span>
            <span class="badge-dot ${pr.genre ? 'earned' : ''}" title="ジャンル">G</span>
          </div>
        </div>
      `;
    }).join('');

    // カードクリックで詳細モーダル
    gridEl.querySelectorAll('.collection-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        if (id) showDetail(id);
      });
    });
  }

  // ===== 詳細モーダル =====
  function showDetail(paintingId) {
    const id = String(paintingId);
    const p = _paintings.find(x => String(x.id) === id);
    if (!p) return;

    // Newバッジを消す
    if (_newBadges.has(id)) {
      _newBadges.delete(id);
      saveProgress();
    }

    const modal = document.getElementById('screen-detail-modal');
    if (!modal) return;

    const imgEl = document.getElementById('modal-painting');
    const titleEl = document.getElementById('modal-title');
    const artistEl = document.getElementById('modal-artist');
    const yearEl = document.getElementById('modal-year');
    const museumEl = document.getElementById('modal-museum');
    const triviaEl = document.getElementById('modal-trivia-text');
    const wikiEl = document.getElementById('modal-wiki-link');
    const closeBtn = document.getElementById('modal-close-btn');

    if (imgEl) {
      imgEl.src = DataLoader.getImageUrl(p);
      imgEl.alt = p.title_ja;
      imgEl.style.filter = isCollected(id) ? '' : 'grayscale(1) brightness(.6)';
    }
    if (titleEl) titleEl.textContent = p.title_ja;
    if (artistEl) artistEl.textContent = p.artist_ja;
    if (yearEl) {
      const yearSpan = yearEl.querySelector('span');
      if (yearSpan) yearSpan.textContent = p.year || '不明';
    }
    if (museumEl) {
      const museumSpan = museumEl.querySelector('span');
      if (museumSpan) museumSpan.textContent = p.museum || '不明';
    }
    if (triviaEl) triviaEl.textContent = p.trivia || '';
    if (wikiEl) {
      wikiEl.href = `https://ja.wikipedia.org/wiki/${encodeURIComponent(p.title_ja)}`;
    }

    modal.classList.add('open');

    // 閉じるボタン
    if (closeBtn) {
      closeBtn.onclick = () => closeDetail();
    }

    // オーバーレイクリックで閉じる
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeDetail();
    }, { once: true });
  }

  function closeDetail() {
    const modal = document.getElementById('screen-detail-modal');
    if (modal) modal.classList.remove('open');
    renderGrid();
  }

  // ===== 公開API =====
  return {
    init,
    render,
    markCorrect,
    isCollected,
    getCollectedPaintings,
    getCollectedCount,
    getProgressFor,
    showDetail,
    closeDetail
  };
})();
