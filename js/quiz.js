/**
 * quiz.js
 * 難易度・ジャンル選択、3モード（作品名/作者/ジャンル当て）、
 * ランダム出題、選択肢生成、正解判定・フィードバック、
 * 連続正解カウンター、結果集計、メダル判定
 */

const Quiz = (() => {
  'use strict';

  // ===== 定数 =====
  const ALL_GENRES = ['肖像画', '風景画', '宗教画', '歴史画', '静物画', '風俗画', '浮世絵', '抽象画', '神話画'];
  const QUESTIONS_PER_ROUND = 10;

  // 連続正解演出
  const STREAK_THRESHOLDS = [
    { min: 10, text: '10連続！天才！', fire: '🔥🔥🔥' },
    { min: 5, text: '5連続！すごい！', fire: '🔥🔥' },
    { min: 3, text: '3連続正解！', fire: '🔥' }
  ];

  // メダル判定
  const MEDALS = [
    { min: 0.9, emoji: '🏆', title: 'Magnificent!', msg: '芸術の真の鑑定家です' },
    { min: 0.7, emoji: '🥈', title: 'Well Done!', msg: '素晴らしい審美眼をお持ちです' },
    { min: 0.5, emoji: '🥉', title: 'Good Effort!', msg: '美術館をもっと巡ってみよう' },
    { min: 0, emoji: '📖', title: 'Keep Exploring!', msg: '名画の世界は奥が深い！' }
  ];

  // ===== ステート =====
  let _paintings = [];
  let _mode = 'title';           // 'title' | 'artist' | 'genre'
  let _difficulty = 1;            // 1 | 2 | 3
  let _selectedGenre = 'all';     // 'all' or specific genre
  let _questions = [];
  let _currentIndex = 0;
  let _correctCount = 0;
  let _wrongCount = 0;
  let _answered = false;
  let _streak = 0;
  let _correctPaintings = [];

  // ===== ユーティリティ =====
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function getChoiceCount() {
    // difficulty 1 = 3択, difficulty 2/3 = 4択
    return _difficulty === 1 ? 3 : 4;
  }

  // ===== 初期化 =====
  function init(paintings) {
    _paintings = paintings;
    bindModeChips();
    bindDifficultyCards();
    bindGenreChips();
    bindStartButton();
    bindNextButton();
    bindResultButtons();
  }

  // ===== モード選択 (data-mode) =====
  function bindModeChips() {
    const container = document.getElementById('mode-chips');
    if (!container) return;

    container.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-mode]');
      if (!chip) return;
      container.querySelectorAll('[data-mode]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      _mode = chip.dataset.mode;
    });
  }

  // ===== 難易度選択 (data-difficulty) =====
  function bindDifficultyCards() {
    const container = document.getElementById('difficulty-cards');
    if (!container) return;

    container.addEventListener('click', (e) => {
      const card = e.target.closest('[data-difficulty]');
      if (!card) return;
      container.querySelectorAll('[data-difficulty]').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      _difficulty = parseInt(card.dataset.difficulty, 10);
    });
  }

  // ===== ジャンルチップ (data-genre) =====
  function bindGenreChips() {
    const container = document.getElementById('genre-chips');
    if (!container) return;

    container.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-genre]');
      if (!chip) return;
      container.querySelectorAll('[data-genre]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      _selectedGenre = chip.dataset.genre;
    });
  }

  // ===== スタートボタン =====
  function bindStartButton() {
    const btn = document.getElementById('btn-start');
    if (btn) {
      btn.addEventListener('click', startQuiz);
    }
  }

  // ===== 次へボタン =====
  function bindNextButton() {
    const btn = document.getElementById('btn-next');
    if (btn) {
      btn.addEventListener('click', nextQuestion);
    }
  }

  // ===== 結果画面ボタン =====
  function bindResultButtons() {
    const retryBtn = document.getElementById('btn-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', startQuiz);
    }
    const homeBtn = document.getElementById('btn-result-home');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => App.navigate('screen-home'));
    }
  }

  // ===== ホーム画面表示時 =====
  function onShowHome() {
    // ALT badge表示
    if (typeof App !== 'undefined') App.ALT.show(true);
  }

  // ===== 出題プール =====
  function getPool() {
    let pool = _paintings;

    // ジャンルフィルター
    if (_selectedGenre !== 'all') {
      pool = pool.filter(p => p.genre === _selectedGenre);
    }

    // 難易度フィルター
    pool = pool.filter(p => {
      // difficulty未設定の場合はすべて含める
      if (!p.difficulty) return true;
      return p.difficulty <= _difficulty;
    });

    return pool;
  }

  // ===== 選択肢生成 =====
  function generateChoices(painting, pool) {
    const numChoices = getChoiceCount();
    const numWrong = numChoices - 1;
    let correctAnswer, wrongAnswers = [];

    if (_mode === 'title') {
      correctAnswer = painting.title_ja;
      // 同じ作者の別作品 → 同ジャンルの別作品 → その他
      const sameArtist = pool
        .filter(x => x.id !== painting.id && x.artist_ja === painting.artist_ja)
        .map(x => x.title_ja);
      const sameGenre = pool
        .filter(x => x.id !== painting.id && x.artist_ja !== painting.artist_ja && x.genre === painting.genre)
        .map(x => x.title_ja);
      const others = pool
        .filter(x => x.id !== painting.id && x.artist_ja !== painting.artist_ja && x.genre !== painting.genre)
        .map(x => x.title_ja);

      if (sameArtist.length) wrongAnswers.push(shuffle(sameArtist)[0]);
      const sg = shuffle(sameGenre).filter(t => !wrongAnswers.includes(t));
      while (wrongAnswers.length < numWrong && sg.length) wrongAnswers.push(sg.shift());
      const ot = shuffle(others).filter(t => !wrongAnswers.includes(t));
      while (wrongAnswers.length < numWrong && ot.length) wrongAnswers.push(ot.shift());
      // 全体プールからフォールバック
      const all = shuffle(_paintings.filter(x => x.id !== painting.id).map(x => x.title_ja))
        .filter(t => !wrongAnswers.includes(t) && t !== correctAnswer);
      while (wrongAnswers.length < numWrong && all.length) wrongAnswers.push(all.shift());

    } else if (_mode === 'artist') {
      correctAnswer = painting.artist_ja;
      const sameGenreArtists = [...new Set(
        pool.filter(x => x.id !== painting.id && x.artist_ja !== painting.artist_ja && x.genre === painting.genre)
          .map(x => x.artist_ja)
      )];
      const otherArtists = [...new Set(
        pool.filter(x => x.id !== painting.id && x.artist_ja !== painting.artist_ja && x.genre !== painting.genre)
          .map(x => x.artist_ja)
      )];

      const sg = shuffle(sameGenreArtists);
      while (wrongAnswers.length < numWrong && sg.length) wrongAnswers.push(sg.shift());
      const og = shuffle(otherArtists).filter(a => !wrongAnswers.includes(a));
      while (wrongAnswers.length < numWrong && og.length) wrongAnswers.push(og.shift());
      // 全体フォールバック
      const all = [...new Set(shuffle(_paintings.filter(x => x.artist_ja !== painting.artist_ja).map(x => x.artist_ja)))]
        .filter(a => !wrongAnswers.includes(a));
      while (wrongAnswers.length < numWrong && all.length) wrongAnswers.push(all.shift());

    } else {
      // genre mode
      correctAnswer = painting.genre;
      const available = ALL_GENRES.filter(g => g !== correctAnswer);
      wrongAnswers = shuffle(available).slice(0, numWrong);
    }

    // 重複除去・正解除外・不足補完
    wrongAnswers = wrongAnswers.filter(x => x && x !== correctAnswer).slice(0, numWrong);
    while (wrongAnswers.length < numWrong) wrongAnswers.push('不明');

    return {
      painting,
      correct: correctAnswer,
      choices: shuffle([correctAnswer, ...wrongAnswers])
    };
  }

  // ===== クイズ生成 =====
  function generateQuestions() {
    const pool = getPool();
    const n = Math.min(pool.length, QUESTIONS_PER_ROUND);
    const selected = shuffle(pool).slice(0, n);
    return selected.map(p => generateChoices(p, pool));
  }

  // ===== クイズ開始 =====
  function startQuiz() {
    const pool = getPool();

    // バリデーション
    if (_mode === 'genre' && new Set(pool.map(p => p.genre)).size < 3) {
      alert('ジャンルクイズには3種類以上のジャンルが必要です');
      return;
    }
    if (pool.length < 4) {
      alert('4作品以上必要です。条件を変更してください。');
      return;
    }

    // ALT リセット
    if (typeof App !== 'undefined') {
      App.ALT.resetRound();
      App.ALT.show(false);
    }

    _questions = generateQuestions();
    _currentIndex = 0;
    _correctCount = 0;
    _wrongCount = 0;
    _streak = 0;
    _answered = false;
    _correctPaintings = [];

    App.navigate('screen-quiz');
    showQuestion();
  }

  // ===== 問題表示 =====
  function showQuestion() {
    _answered = false;
    const q = _questions[_currentIndex];
    const total = _questions.length;

    // 進捗バー
    const progressText = document.getElementById('quiz-progress-text');
    const progressFill = document.getElementById('quiz-progress-fill');
    const scoreEl = document.getElementById('quiz-score');

    if (progressText) progressText.textContent = `${_currentIndex + 1} / ${total}`;
    if (progressFill) progressFill.style.width = `${((_currentIndex + 1) / total) * 100}%`;
    if (scoreEl) scoreEl.textContent = `${_correctCount}問正解`;

    // 画像
    const imgEl = document.getElementById('quiz-painting-img');
    const paintingEl = document.getElementById('quiz-painting');
    if (imgEl) {
      imgEl.style.opacity = '0';
      imgEl.src = DataLoader.getImageUrl(q.painting);
      imgEl.onload = () => { imgEl.style.opacity = '1'; };
    }
    if (paintingEl) paintingEl.classList.remove('answered');

    // フィードバック非表示
    const fbEl = document.getElementById('quiz-feedback');
    if (fbEl) {
      fbEl.className = 'quiz-feedback';
      fbEl.innerHTML = '';
    }

    // 次へボタン非表示
    const nextBtn = document.getElementById('btn-next');
    if (nextBtn) nextBtn.classList.remove('visible');

    // ストリークバッジ非表示
    const streakBadge = document.getElementById('streak-badge');
    if (streakBadge) {
      streakBadge.className = 'streak-badge';
      streakBadge.textContent = '';
    }

    // 選択肢生成
    const choicesEl = document.getElementById('quiz-choices');
    if (!choicesEl) return;
    choicesEl.innerHTML = '';

    q.choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = choice;
      btn.addEventListener('click', (evt) => selectAnswer(btn, choice, q, evt));
      choicesEl.appendChild(btn);
    });
  }

  // ===== 回答選択 =====
  function selectAnswer(btn, selected, question, evt) {
    if (_answered) return;
    _answered = true;

    const correct = selected === question.correct;
    const fbEl = document.getElementById('quiz-feedback');
    const flashEl = document.getElementById('flash-overlay');
    const paintingEl = document.getElementById('quiz-painting');

    if (paintingEl) paintingEl.classList.add('answered');

    // 全ボタン無効化 & 正解ハイライト
    document.querySelectorAll('#quiz-choices .choice-btn').forEach(b => {
      b.disabled = true;
      if (b.textContent === question.correct) b.classList.add('correct');
    });

    if (correct) {
      _correctCount++;
      _streak++;
      _correctPaintings.push(question.painting);
      btn.classList.add('correct');

      // フラッシュ（緑）
      if (flashEl) {
        flashEl.className = 'flash-overlay flash-correct';
        setTimeout(() => { flashEl.className = 'flash-overlay'; }, 400);
      }

      // パーティクル
      showParticles(evt);

      // コレクション進捗記録
      if (typeof Collection !== 'undefined') {
        Collection.markCorrect(question.painting.id, _mode);
      }

      // ALT
      if (typeof App !== 'undefined') App.ALT.onCorrect(evt);

      // フィードバック
      if (fbEl) {
        const p = question.painting;
        let detail = '';
        const wasCollected = typeof Collection !== 'undefined' && Collection.isCollected(p.id);

        if (_mode === 'title') {
          detail = `${p.artist_ja} ／ ${p.genre}${p.year ? ' (' + p.year + ')' : ''}`;
        } else if (_mode === 'artist') {
          detail = `「${p.title_ja}」${p.genre}`;
        } else {
          detail = `「${p.title_ja}」${p.artist_ja}`;
        }
        if (wasCollected) detail += ' 🎉 コレクション達成！';

        fbEl.className = 'quiz-feedback correct visible';
        fbEl.innerHTML = `<span class="feedback-icon">⭕</span> 正解！<div class="feedback-detail">${detail}</div>`;
      }

      // 連続正解演出
      showStreakBadge();

    } else {
      _wrongCount++;
      _streak = 0;
      btn.classList.add('wrong');

      // フラッシュ（赤）
      if (flashEl) {
        flashEl.className = 'flash-overlay flash-wrong';
        setTimeout(() => { flashEl.className = 'flash-overlay'; }, 400);
      }

      // シェイク
      btn.classList.add('shake');

      if (typeof App !== 'undefined') App.ALT.onWrong();

      if (fbEl) {
        fbEl.className = 'quiz-feedback wrong visible';
        fbEl.innerHTML = `<span class="feedback-icon">❌</span> 不正解… 正解は「${question.correct}」`;
      }
    }

    // スコア更新
    const scoreEl = document.getElementById('quiz-score');
    if (scoreEl) scoreEl.textContent = `${_correctCount}問正解`;

    // 次の問題へ or 結果表示
    if (_currentIndex < _questions.length - 1) {
      const nextBtn = document.getElementById('btn-next');
      if (nextBtn) nextBtn.classList.add('visible');
    } else {
      setTimeout(showResult, 1500);
    }
  }

  // ===== パーティクル演出 =====
  function showParticles(evt) {
    const container = document.getElementById('particles-container');
    if (!container) return;

    const rect = evt && evt.target ? evt.target.getBoundingClientRect() : null;
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

    for (let i = 0; i < 12; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      p.style.setProperty('--angle', (Math.random() * 360) + 'deg');
      p.style.setProperty('--distance', (40 + Math.random() * 60) + 'px');
      p.style.animationDelay = (Math.random() * 0.2) + 's';
      container.appendChild(p);
      setTimeout(() => p.remove(), 800);
    }
  }

  // ===== 次の問題 =====
  function nextQuestion() {
    _currentIndex++;
    showQuestion();
  }

  // ===== 連続正解バッジ =====
  function showStreakBadge() {
    const badge = document.getElementById('streak-badge');
    if (!badge) return;

    for (const { min, text, fire } of STREAK_THRESHOLDS) {
      if (_streak >= min) {
        badge.textContent = `${text} ${fire}`;
        badge.className = 'streak-badge visible';
        setTimeout(() => { badge.className = 'streak-badge'; }, 2500);
        return;
      }
    }
  }

  // ===== 結果画面表示 =====
  function showResult() {
    const total = _questions.length;
    const pct = total > 0 ? _correctCount / total : 0;

    // ALT クイズ終了処理
    const levelKey = (_selectedGenre || 'all') + '_' + _mode + '_' + _difficulty;
    let altResult = null;
    if (typeof App !== 'undefined') {
      altResult = App.ALT.onQuizEnd(_correctCount, total, levelKey);
      App.ALT.show(true);
    }

    // TrailNav へスコア送信
    if (typeof TrailNav !== 'undefined' && TrailNav.reportGameResult) {
      TrailNav.reportGameResult({
        score: _correctCount * 10,
        correctCount: _correctCount,
        totalCount: total,
        maxStreak: altResult ? altResult.roundMaxCombo : 0
      });
    }

    App.navigate('screen-result');

    // メダル判定
    const medal = MEDALS.find(m => pct >= m.min) || MEDALS[MEDALS.length - 1];

    const medalEl = document.getElementById('result-medal');
    const scoreEl = document.getElementById('result-score');
    const correctEl = document.getElementById('result-correct');
    const wrongEl = document.getElementById('result-wrong');
    const gridEl = document.getElementById('result-paintings-grid');

    if (medalEl) medalEl.textContent = medal.emoji;
    if (scoreEl) scoreEl.textContent = `${Math.round(pct * 100)}%`;
    if (correctEl) correctEl.textContent = _correctCount;
    if (wrongEl) wrongEl.textContent = _wrongCount;

    // 正解作品サムネイル
    if (gridEl) {
      gridEl.innerHTML = _correctPaintings.map(p => {
        const thumb = DataLoader.getImageUrl(p, true);
        return `<div class="result-painting-item">
          <img src="${thumb}" alt="${p.title_ja}" loading="lazy">
          <span class="result-painting-title">${p.title_ja}</span>
        </div>`;
      }).join('');
    }

    // 紙吹雪（90%以上）
    if (pct >= 0.9) {
      showConfetti();
    }
  }

  // ===== 紙吹雪演出 =====
  function showConfetti() {
    const container = document.getElementById('confetti-container');
    if (!container) return;

    container.innerHTML = '';
    const colors = ['#e8b830', '#f5d76e', '#27ae60', '#e74c3c', '#3498db', '#9b59b6'];

    for (let i = 0; i < 50; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = Math.random() * 2 + 's';
      piece.style.animationDuration = (2 + Math.random() * 3) + 's';
      container.appendChild(piece);
    }

    container.classList.add('active');
    setTimeout(() => {
      container.classList.remove('active');
      container.innerHTML = '';
    }, 5000);
  }

  // ===== 公開API =====
  return {
    init,
    startQuiz,
    nextQuestion,
    onShowHome,
    getMode: () => _mode
  };
})();
