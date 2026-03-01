/**
 * app.js
 * アプリ初期化・画面切り替え・タブバー管理・
 * 初回チュートリアル(3スライド)・グローバルステート・ALT連携
 */

const App = (() => {
  'use strict';

  // ===== グローバルステート =====
  const state = {
    currentScreen: 'screen-home',
    paintings: [],
    soundEnabled: true,
    animationEnabled: true,
    version: '2.0.0'
  };

  // 有効な画面ID一覧
  const SCREENS = [
    'screen-home',
    'screen-quiz',
    'screen-result',
    'screen-collection',
    'screen-settings'
  ];

  // タブバー: data-screen → 画面ID
  const TAB_TO_SCREEN = {
    'screen-home': 'screen-home',
    'screen-collection': 'screen-collection',
    'screen-settings': 'screen-settings'
  };

  // 画面 → 対応するタブのdata-screen値
  function getTabForScreen(screen) {
    if (screen === 'screen-quiz' || screen === 'screen-result') return 'screen-home';
    return screen;
  }

  // ===== 画面切り替え =====
  function navigate(screen) {
    if (!SCREENS.includes(screen)) return;
    state.currentScreen = screen;
    window.location.hash = screen;
    showScreen(screen);
  }

  function showScreen(screen) {
    // 全画面を非表示
    SCREENS.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove('active');
      }
    });

    // 対象画面を表示
    const targetEl = document.getElementById(screen);
    if (targetEl) {
      requestAnimationFrame(() => targetEl.classList.add('active'));
    }

    // タブバー更新
    updateTabBar(screen);

    // 画面固有コールバック
    if (screen === 'screen-home' && typeof Quiz !== 'undefined') {
      Quiz.onShowHome();
    }
    if (screen === 'screen-collection' && typeof Collection !== 'undefined') {
      Collection.render();
    }
    if (screen === 'screen-settings') {
      initSettings();
    }
  }

  function updateTabBar(screen) {
    const tabBar = document.getElementById('tab-bar');
    if (!tabBar) return;
    const activeScreen = getTabForScreen(screen);
    tabBar.querySelectorAll('.tab-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.screen === activeScreen);
    });
  }

  function handleHashChange() {
    const hash = window.location.hash.replace('#', '') || 'screen-home';
    if (SCREENS.includes(hash)) {
      showScreen(hash);
    }
  }

  // ===== タブバー初期化 =====
  function initTabBar() {
    const tabBar = document.getElementById('tab-bar');
    if (!tabBar) return;

    tabBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-item');
      if (!btn) return;
      const screen = btn.dataset.screen;
      if (screen) navigate(screen);
    });
  }

  // ===== チュートリアル (初回のみ・3スライド) =====
  const TUTORIAL_KEY = 'pq2_tutorial_shown';

  const TUTORIAL_SLIDES = [
    { emoji: '🎨', title: 'クイズに答えよう', text: '世界の名画を見て、作品名・作者・ジャンルを当てよう！' },
    { emoji: '📖', title: 'コレクションを集めよう', text: '3つのモード全てで正解すると、その作品がコレクションに加わるよ！' },
    { emoji: '🏆', title: '目指せ全作品制覇！', text: '全ての名画をコレクションして、美術館マスターになろう！' }
  ];

  function initTutorial() {
    if (localStorage.getItem(TUTORIAL_KEY)) {
      // チュートリアル済み → 非表示
      const overlay = document.getElementById('tutorial-overlay');
      if (overlay) overlay.style.display = 'none';
      return;
    }

    const overlay = document.getElementById('tutorial-overlay');
    if (!overlay) return;

    let currentSlide = 0;

    const emojiEl = document.getElementById('tutorial-emoji');
    const headingEl = document.getElementById('tutorial-heading');
    const descEl = document.getElementById('tutorial-desc');
    const btn = document.getElementById('tutorial-btn');
    const dots = overlay.querySelectorAll('.tutorial-dot');

    function renderSlide() {
      const slide = TUTORIAL_SLIDES[currentSlide];
      if (emojiEl) emojiEl.textContent = slide.emoji;
      if (headingEl) headingEl.textContent = slide.title;
      if (descEl) descEl.textContent = slide.text;

      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlide);
      });

      if (btn) {
        btn.textContent = currentSlide < TUTORIAL_SLIDES.length - 1 ? '次へ' : 'はじめる！';
      }
    }

    if (btn) {
      btn.addEventListener('click', () => {
        currentSlide++;
        if (currentSlide >= TUTORIAL_SLIDES.length) {
          localStorage.setItem(TUTORIAL_KEY, '1');
          overlay.style.display = 'none';
        } else {
          renderSlide();
        }
      });
    }

    overlay.style.display = '';
    renderSlide();
  }

  // ===== 設定画面 =====
  function initSettings() {
    // サウンドトグル
    const soundToggle = document.getElementById('toggle-sound');
    if (soundToggle) {
      const isOn = localStorage.getItem('pq2_sound') !== 'false';
      soundToggle.classList.toggle('on', isOn);
      soundToggle.setAttribute('aria-checked', isOn);

      // クリックイベント（重複防止のため一度削除してから付ける）
      soundToggle.onclick = () => {
        const newVal = !soundToggle.classList.contains('on');
        localStorage.setItem('pq2_sound', newVal);
        state.soundEnabled = newVal;
        soundToggle.classList.toggle('on', newVal);
        soundToggle.setAttribute('aria-checked', newVal);
      };
    }

    // アニメーショントグル
    const animToggle = document.getElementById('toggle-animation');
    if (animToggle) {
      const isOn = localStorage.getItem('pq2_animation') !== 'false';
      animToggle.classList.toggle('on', isOn);
      animToggle.setAttribute('aria-checked', isOn);

      animToggle.onclick = () => {
        const newVal = !animToggle.classList.contains('on');
        localStorage.setItem('pq2_animation', newVal);
        state.animationEnabled = newVal;
        animToggle.classList.toggle('on', newVal);
        animToggle.setAttribute('aria-checked', newVal);
      };
    }

    // リセットボタン
    const resetBtn = document.getElementById('btn-reset-data');
    if (resetBtn) {
      resetBtn.onclick = () => {
        if (!confirm('本当にリセットしますか？\nコレクションと進捗データがすべて削除されます。')) return;
        localStorage.removeItem('pq2_progress');
        localStorage.removeItem('pq2_new_badges');
        localStorage.removeItem('pq2_tutorial_shown');
        // 旧形式もクリア
        localStorage.removeItem('pq4_progress');
        localStorage.removeItem('pq4');
        if (typeof Collection !== 'undefined') Collection.render();
        alert('リセットしました');
      };
    }
  }

  // ===== ALT連携 (既存コードからの移植) =====
  const ALT = {
    total: 0,
    combo: 0,
    roundAlt: 0,
    roundMaxCombo: 0,
    clearedLevels: new Set(),

    updateUI() {
      const el = document.getElementById('altDisplay');
      if (el) el.textContent = this.total;
    },

    show(visible) {
      const badge = document.getElementById('altBadge');
      if (badge) badge.classList.toggle('alt-badge-hide', !visible);
    },

    addAlt(n, x, y) {
      this.total += n;
      this.roundAlt += n;
      this.updateUI();
      const f = document.createElement('div');
      f.className = 'alt-float';
      f.textContent = '+' + n + ' ALT';
      f.style.left = (x || window.innerWidth / 2 - 40) + 'px';
      f.style.top = (y || window.innerHeight / 2 - 60) + 'px';
      document.body.appendChild(f);
      setTimeout(() => f.remove(), 1300);
    },

    showCombo(c) {
      if (c < 2) return;
      const f = document.createElement('div');
      f.className = 'combo-flash';
      f.textContent = c + ' COMBO!';
      document.body.appendChild(f);
      setTimeout(() => f.remove(), 900);
    },

    getRewardForCombo(c) {
      if (c >= 4) return 3;
      if (c >= 2) return 2;
      return 1;
    },

    onCorrect(evt) {
      this.combo++;
      if (this.combo > this.roundMaxCombo) this.roundMaxCombo = this.combo;
      const reward = this.getRewardForCombo(this.combo);
      const rect = evt && evt.target ? evt.target.getBoundingClientRect() : null;
      const x = rect ? rect.left + rect.width / 2 - 30 : null;
      const y = rect ? rect.top - 20 : null;
      this.addAlt(reward, x, y);
      this.showCombo(this.combo);
    },

    onWrong() {
      this.combo = 0;
    },

    resetRound() {
      this.roundAlt = 0;
      this.combo = 0;
      this.roundMaxCombo = 0;
    },

    getStars(correct, total) {
      const pct = correct / total;
      if (pct >= 1) return 3;
      if (pct >= 0.8) return 2;
      return 1;
    },

    getStarBonus(stars) {
      if (stars === 3) return 20;
      if (stars === 2) return 10;
      return 5;
    },

    onQuizEnd(correct, total, levelKey) {
      const stars = this.getStars(correct, total);
      const starBonus = this.getStarBonus(stars);
      this.total += starBonus;
      this.roundAlt += starBonus;

      let firstClear = false;
      if (!this.clearedLevels.has(levelKey)) {
        this.clearedLevels.add(levelKey);
        this.total += 30;
        this.roundAlt += 30;
        firstClear = true;
      }
      this.updateUI();

      return { stars, starBonus, firstClear, roundAlt: this.roundAlt, roundMaxCombo: this.roundMaxCombo };
    }
  };

  // ===== LocalStorage マイグレーション =====
  function migrateLocalStorage() {
    const oldProgress = localStorage.getItem('pq4_progress');
    const newProgress = localStorage.getItem('pq2_progress');

    if (oldProgress && !newProgress) {
      try {
        localStorage.setItem('pq2_progress', oldProgress);
        console.log('[App] マイグレーション完了: pq4_progress → pq2_progress');
      } catch (e) {
        console.warn('[App] マイグレーション失敗:', e);
      }
    }
  }

  // ===== 初期化 =====
  async function init() {
    migrateLocalStorage();
    state.soundEnabled = localStorage.getItem('pq2_sound') !== 'false';
    state.animationEnabled = localStorage.getItem('pq2_animation') !== 'false';

    // データ読み込み
    state.paintings = await DataLoader.load();

    // サムネイルをバックグラウンドでプリロード
    DataLoader.preloadImages(state.paintings, { useThumb: true });

    // チュートリアル
    initTutorial();

    // タブバー初期化
    initTabBar();

    // hash-based routing
    window.addEventListener('hashchange', handleHashChange);

    // ALT UI初期化
    ALT.updateUI();

    // Quiz / Collection 初期化
    if (typeof Quiz !== 'undefined') Quiz.init(state.paintings);
    if (typeof Collection !== 'undefined') Collection.init(state.paintings);

    // 初期画面表示
    handleHashChange();

    console.log(`[App] Painting Quiz v${state.version} initialized with ${state.paintings.length} paintings`);
  }

  // DOMContentLoaded で起動
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    state,
    navigate,
    showScreen,
    ALT,
    SCREENS
  };
})();
