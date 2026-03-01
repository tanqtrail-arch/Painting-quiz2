# Painting Quiz v2 — 現状分析レポート

> 分析日: 2026-03-02
> 対象: index.html, js/app.js, js/quiz.js, js/collection.js, js/data-loader.js, css/style.css, trail-nav.js

---

## 1. ファイル構成と役割

| ファイル | 行数 | 役割 |
|---|---|---|
| `index.html` | 331行 | SPA HTML。全画面(home/quiz/result/collection/settings/modal)、タブバー、ALTバッジ、チュートリアルオーバーレイ |
| `js/app.js` | 381行 | アプリ初期化、画面切替(hash-based routing)、タブバー管理、チュートリアル(3スライド)、ALTオブジェクト、設定画面、LocalStorageマイグレーション |
| `js/quiz.js` | 558行 | クイズロジック全体。モード/難易度/ジャンル選択、出題プール生成、選択肢生成(同ジャンル/同作者優先)、正解判定、フィードバック演出、連続正解、紙吹雪、結果画面 |
| `js/collection.js` | 235行 | コレクション(図鑑)管理。LocalStorage読み書き、正解記録、コレクション判定(3モード全正解)、グリッド描画、詳細モーダル、Newバッジ |
| `js/data-loader.js` | 196行 | paintings.json のfetch、ダミーデータ5件フォールバック、画像プリロード(並列制御)、URL取得ヘルパー |
| `css/style.css` | 1545行 | 全スタイル。CSS変数、画面システム、タブバー、クイズUI、コレクション、モーダル、ALT Badge、アニメーション、レスポンシブ(600px/960px) |
| `trail-nav.js` | 265行 | TrailNav v2 連携モジュール。認証(URLパラメータ)、ナビバー生成、ゲーム結果送信、TGP3.2への遷移 |

---

## 2. ALT連携（ALTコイン/報酬システム）

### 2.1 ローカルALTオブジェクト（app.js内）

`App.ALT` オブジェクトはアプリ内の **ローカルALTカウンター** として機能する。サーバーと直接通信しない。

```
場所: app.js 220-316行
```

| プロパティ/メソッド | 説明 |
|---|---|
| `total` | 累積ALT（ページ内、永続化なし） |
| `combo` | 現在の連続正解コンボ |
| `roundAlt` | 今回のラウンドで獲得したALT合計 |
| `roundMaxCombo` | 今回のラウンドの最大コンボ数 |
| `clearedLevels` | Set。クリア済みレベルキー管理 |
| `addAlt(n, x, y)` | ALT加算 + フロートアニメーション表示 |
| `showCombo(c)` | コンボ数フラッシュ表示（2以上で発動） |
| `getRewardForCombo(c)` | コンボ報酬: 1ALT(通常), 2ALT(2-3連続), 3ALT(4+連続) |
| `onCorrect(evt)` | 正解時: combo++、報酬計算、ALT加算、コンボ表示 |
| `onWrong()` | 不正解時: combo=0 |
| `resetRound()` | ラウンド開始時のリセット |
| `onQuizEnd(correct, total, levelKey)` | クイズ終了時: スターボーナス(5/10/20)＋初クリアボーナス(30) |

**ALTの流れ:**
1. クイズ開始 → `ALT.resetRound()`, `ALT.show(false)`
2. 正解毎 → `ALT.onCorrect(evt)` → `addAlt()` でフロート表示
3. 不正解毎 → `ALT.onWrong()` → コンボリセット
4. クイズ終了 → `ALT.onQuizEnd()` → スターボーナス加算
5. 結果画面 → `ALT.show(true)` でバッジ再表示

### 2.2 UI要素

```html
<!-- index.html 18-22行 -->
<div class="alt-badge" id="altBadge">
  <span class="alt-icon">🪙</span>
  <span class="alt-val" id="altDisplay">0</span>
  <span class="alt-unit">ALT</span>
</div>
```

CSS（style.css 1320-1377行）:
- `.alt-badge`: 右上固定バッジ（ゴールド枠）
- `.alt-float`: +N ALT フロートアニメーション（上に飛ぶ緑文字）
- `.combo-flash`: コンボ表示（中央に拡大→消え）

### 2.3 注意点
- **ALT totalはLocalStorageに保存されていない**（ページリロードで0に戻る）
- `clearedLevels`もメモリ内のみ（永続化されない）
- ローカルALTはあくまでUI演出用。実際の永続的なALT付与は TrailNav 経由で行う

---

## 3. TrailSDK連携（TrailNav v2）

### 3.1 読み込みと初期化

```html
<!-- index.html 316-328行 -->
<script src="trail-nav.js"></script>
<script>
  if (typeof TrailNav !== 'undefined') {
    TrailNav.init({
      gameName: '絵画クイズ',
      gameId: 'Painting-quiz2',
      gameEmoji: '🖼️',
      gameHomeId: 'screen-home',
      tgp32Url: 'https://trail-game-pro-3-2.onrender.com',
      apiBase: 'https://trail-game-pro-3-2.onrender.com/api',
    });
  }
</script>
```

### 3.2 TrailNav モジュール構成（trail-nav.js）

| 機能 | 詳細 |
|---|---|
| **認証** | URLパラメータ解析: `token`, `player`, `student_id`, `class_name`, `tenant_slug`, `tenant_id`, `return_url` |
| **ナビバー** | 上部固定バー(44px): ホームボタン + 「他のゲームで学ぶ」ボタン + ALT表示 |
| **goToTGP32()** | `return_url` → `tgp32Url/app/` → フォールバック画面 の優先順で遷移 |
| **goToGameHome()** | `window.showGameHome()` or `config.gameHomeId` のelementをactive化 |
| **reportGameResult()** | `POST /api/external/game-result` でスコア送信 |

### 3.3 スコア送信（quiz.js → TrailNav）

```javascript
// quiz.js 483-490行（showResult関数内）
if (typeof TrailNav !== 'undefined' && TrailNav.reportGameResult) {
  TrailNav.reportGameResult({
    score: _correctCount * 10,        // 正解数×10ポイント
    correctCount: _correctCount,       // 正解数
    totalCount: total,                 // 全問題数
    maxStreak: altResult ? altResult.roundMaxCombo : 0  // 最大コンボ
  });
}
```

### 3.4 API通信仕様

```
POST {apiBase}/external/game-result
Content-Type: application/json

{
  "player": "(URLパラメータから)",
  "game_id": "Painting-quiz2",
  "game_name": "絵画クイズ",
  "score": 70,
  "correct_count": 7,
  "total_count": 10,
  "max_streak": 5
}
```

レスポンスに `data.alt` があれば `currentAlt` に加算し、TrailNavバーのALT表示を更新。

### 3.5 二重ALT表示の問題
- **App.ALT** → アプリ内の `.alt-badge`（右上ゴールドバッジ）にローカルALTを表示
- **TrailNav** → TrailNavバーの `.tn-alt`（上部バー右端）にサーバーALTを表示
- 両方が同時に表示されるため、**2つの異なるALT値が画面に出る可能性がある**

---

## 4. LocalStorage 使用状況

### 4.1 キー一覧

| キー | 管理元 | 型 | 用途 |
|---|---|---|---|
| `pq2_progress` | collection.js | JSON Object | コレクション進捗。`{ "1": { title: true, artist: false, genre: true }, ... }` |
| `pq2_new_badges` | collection.js | JSON Array | 新しくコレクション達成した作品IDリスト（Newバッジ表示用） |
| `pq2_tutorial_shown` | app.js | `"1"` | チュートリアル表示済みフラグ |
| `pq2_sound` | app.js | `"true"/"false"` | 効果音ON/OFF |
| `pq2_animation` | app.js | `"true"/"false"` | アニメーションON/OFF |
| `pq4_progress` (旧) | — | JSON Object | 旧バージョンのコレクション進捗 |
| `pq4` (旧) | — | — | 旧バージョンデータ |

### 4.2 マイグレーション処理

```javascript
// app.js 319-331行
function migrateLocalStorage() {
  const oldProgress = localStorage.getItem('pq4_progress');
  const newProgress = localStorage.getItem('pq2_progress');
  if (oldProgress && !newProgress) {
    localStorage.setItem('pq2_progress', oldProgress);
  }
}
```

- `pq4_progress` → `pq2_progress` への一方向コピー（新キーが未作成の場合のみ）
- 旧データの削除はリセット時のみ行われる

### 4.3 リセット処理

```javascript
// app.js 205-215行（設定画面のリセットボタン）
localStorage.removeItem('pq2_progress');
localStorage.removeItem('pq2_new_badges');
localStorage.removeItem('pq2_tutorial_shown');
localStorage.removeItem('pq4_progress');  // 旧形式もクリア
localStorage.removeItem('pq4');
```

### 4.4 コレクション判定ロジック

```javascript
// collection.js 56-60行
function isCollected(paintingId) {
  const pr = _progress[id];
  return !!(pr && pr.title && pr.artist && pr.genre);
}
```

- 1つの作品に対して **title/artist/genre の3モード全て正解** → コレクション達成
- 達成時に `_newBadges` Set に追加 → renderGridでNEWバッジ表示
- 詳細モーダルを開くとNEWバッジ消去

### 4.5 永続化されていないデータ
- `App.ALT.total`（累積ALT） → リロードで0に戻る
- `App.ALT.clearedLevels`（初クリア判定） → リロードで空になる
- クイズ中の状態（問題/スコア/ストリーク） → 画面遷移で消える

---

## 5. データフロー図

```
[paintings.json] → DataLoader.load() → App.state.paintings
                                            ↓
                                    Quiz.init(paintings)
                                    Collection.init(paintings)
                                            ↓
┌──────────── クイズフロー ────────────┐
│ startQuiz() → showQuestion() → selectAnswer()      │
│    ↓正解        ↓不正解                              │
│ Collection.markCorrect()   ALT.onWrong()            │
│ ALT.onCorrect()            streak=0                 │
│    ↓                                                 │
│ showResult()                                         │
│    ├→ ALT.onQuizEnd() → スターボーナス加算           │
│    └→ TrailNav.reportGameResult() → サーバーへ送信   │
└──────────────────────────────────────┘
                                            ↓
                            LocalStorage: pq2_progress 更新
```

---

## 6. 既知の課題・改善ポイント

### 6.1 ALT関連
- ALT累積値がLocalStorageに保存されていない（ページリロードで消失）
- `clearedLevels`（初クリアボーナス判定）も永続化されていない
- App.ALT(ローカル) と TrailNav(サーバー) で二重ALT表示される可能性

### 6.2 データ関連
- `data/paintings.json` が存在しない（dataディレクトリは空）
- ダミーデータ5件(data-loader.js内)で動作するフォールバック有り
- scriptsディレクトリも空（fetch-paintings.js / validate-images.js 未作成）

### 6.3 コード品質
- quiz.js の `showStreakBadge()` で streak-badge に `visible` クラスを付けているが、CSSでは `.streak-badge.show` を定義 → **クラス名不一致**
- `btn-next` の表示制御: JSは `visible` クラスを使用、CSSは `.btn-next.show` を定義 → **クラス名不一致**
- `quiz-feedback` の表示: JSは `correct visible` / `wrong visible` クラスを使用、CSSは `.quiz-feedback.correct-text` / `.quiz-feedback.wrong-text` を定義 → **クラス名不一致**
- tutorial-overlay: JSは `style.display` で制御、CSSは `.show` クラスで制御 → 混在（動作はする）

### 6.4 機能未実装
- 効果音（トグルはあるが音声ファイル/再生コードなし）
- 出題数の変更機能（設定画面に表示はあるが変更UIなし、固定10問）
- `scripts/fetch-paintings.js` / `scripts/validate-images.js` 未作成

---

## 7. 外部依存

| 依存先 | 用途 |
|---|---|
| Google Fonts (Noto Sans JP) | Webフォント |
| Wikimedia Commons | 絵画画像の取得(image/image_thumb URL) |
| TGP3.2 API (`trail-game-pro-3-2.onrender.com`) | TrailNav: ゲーム結果送信、ALT付与 |
| Wikipedia (ja.wikipedia.org) | 詳細モーダルの「もっと知りたい」リンク |

---

## 8. 画面ID と遷移

```
[screen-home] ──(スタート)──→ [screen-quiz] ──(全問終了)──→ [screen-result]
      ↑                                                            │
      ├──────────(ホームに戻る)────────────────────────────────────┘
      ├──────────(もう一回)→ [screen-quiz] に直接
      │
[screen-collection] ──(カードタップ)──→ [screen-detail-modal]
      │
[screen-settings]

タブバー: screen-home / screen-collection / screen-settings
```
