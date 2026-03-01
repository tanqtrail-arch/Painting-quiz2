/**
 * data-loader.js
 * paintings.json の fetch、画像プリロード、エラーフォールバック、
 * ジャンル/難易度フィルター、ダミーデータ5件フォールバック
 */

const DataLoader = (() => {
  'use strict';

  // ダミーデータ5件（paintings.json が取得できない場合のフォールバック）
  const DUMMY_PAINTINGS = [
    {
      id: 1,
      title_ja: 'モナ・リザ',
      title_en: 'Mona Lisa',
      artist_ja: 'レオナルド・ダ・ヴィンチ',
      artist_en: 'Leonardo da Vinci',
      year: '1503-1519',
      genre: '肖像画',
      museum: 'ルーヴル美術館',
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Mona_Lisa.jpg/600px-Mona_Lisa.jpg',
      image_thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Mona_Lisa.jpg/300px-Mona_Lisa.jpg',
      wiki_filename: 'Mona_Lisa.jpg',
      difficulty: 1,
      trivia: '実はこの絵、ナポレオンが自分の寝室にかざっていたことがある。描かれた女性が誰なのか、500年たった今でもナゾが残っている。'
    },
    {
      id: 2,
      title_ja: '星月夜',
      title_en: 'The Starry Night',
      artist_ja: 'フィンセント・ファン・ゴッホ',
      artist_en: 'Vincent van Gogh',
      year: '1889',
      genre: '風景画',
      museum: 'ニューヨーク近代美術館',
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/600px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
      image_thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/300px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
      wiki_filename: 'Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
      difficulty: 1,
      trivia: 'ゴッホが精神病院に入院していたときに描いた絵。窓から見た夜空に想像を加えて、うずまく星空を表現した。'
    },
    {
      id: 3,
      title_ja: '最後の晩餐',
      title_en: 'The Last Supper',
      artist_ja: 'レオナルド・ダ・ヴィンチ',
      artist_en: 'Leonardo da Vinci',
      year: '1495-1498',
      genre: '宗教画',
      museum: 'サンタ・マリア・デッレ・グラツィエ教会',
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/The_Last_Supper_-_Leonardo_Da_Vinci_-_High_Resolution_32x16.jpg/600px-The_Last_Supper_-_Leonardo_Da_Vinci_-_High_Resolution_32x16.jpg',
      image_thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/The_Last_Supper_-_Leonardo_Da_Vinci_-_High_Resolution_32x16.jpg/300px-The_Last_Supper_-_Leonardo_Da_Vinci_-_High_Resolution_32x16.jpg',
      wiki_filename: 'The_Last_Supper_-_Leonardo_Da_Vinci_-_High_Resolution_32x16.jpg',
      difficulty: 1,
      trivia: '壁に直接描かれたこの絵は、完成直後から少しずつはがれ始めた。何度も修復されて今の姿になっている。'
    },
    {
      id: 4,
      title_ja: '真珠の耳飾りの少女',
      title_en: 'Girl with a Pearl Earring',
      artist_ja: 'ヨハネス・フェルメール',
      artist_en: 'Johannes Vermeer',
      year: '1665頃',
      genre: '肖像画',
      museum: 'マウリッツハイス美術館',
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/600px-1665_Girl_with_a_Pearl_Earring.jpg',
      image_thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/300px-1665_Girl_with_a_Pearl_Earring.jpg',
      wiki_filename: '1665_Girl_with_a_Pearl_Earring.jpg',
      difficulty: 1,
      trivia: '「北のモナ・リザ」とも呼ばれるこの絵。描かれた少女が誰なのかは今でもわかっていない。'
    },
    {
      id: 5,
      title_ja: '神奈川沖浪裏',
      title_en: 'The Great Wave off Kanagawa',
      artist_ja: '葛飾北斎',
      artist_en: 'Katsushika Hokusai',
      year: '1831頃',
      genre: '浮世絵',
      museum: 'メトロポリタン美術館',
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/600px-Tsunami_by_hokusai_19th_century.jpg',
      image_thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/300px-Tsunami_by_hokusai_19th_century.jpg',
      wiki_filename: 'Tsunami_by_hokusai_19th_century.jpg',
      difficulty: 1,
      trivia: '北斎がこの絵を描いたのは70歳すぎ。世界で最も有名な日本の絵で、ゴッホやドビュッシーにも影響を与えた。'
    }
  ];

  let _paintings = [];
  let _loaded = false;
  let _loadPromise = null;

  /**
   * paintings.json を fetch し、失敗時はダミーデータにフォールバック
   */
  async function load() {
    if (_loadPromise) return _loadPromise;
    _loadPromise = _doLoad();
    return _loadPromise;
  }

  async function _doLoad() {
    // paintings.json の取得を試みる
    try {
      const res = await fetch('data/paintings.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const arr = Array.isArray(json) ? json : (json.paintings || []);
      if (arr.length > 0) {
        _paintings = arr;
        _loaded = true;
        console.log(`[DataLoader] paintings.json loaded: ${arr.length} paintings`);
        return _paintings;
      }
    } catch (e) {
      console.warn('[DataLoader] paintings.json の読み込みに失敗:', e.message);
    }

    // フォールバック: ダミーデータを使用
    console.log('[DataLoader] ダミーデータ(5件)を使用');
    _paintings = DUMMY_PAINTINGS.map(p => ({ ...p }));
    _loaded = true;
    return _paintings;
  }

  /** 画像のプリロード（最大同時接続数制限付き） */
  function preloadImages(paintings, { useThumb = false, concurrency = 4 } = {}) {
    const urls = paintings.map(p => useThumb ? (p.image_thumb || p.image) : p.image).filter(Boolean);
    let idx = 0;

    function loadNext() {
      if (idx >= urls.length) return Promise.resolve();
      const url = urls[idx++];
      return new Promise(resolve => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = resolve;
        img.src = url;
      }).then(loadNext);
    }

    const workers = [];
    for (let i = 0; i < Math.min(concurrency, urls.length); i++) {
      workers.push(loadNext());
    }
    return Promise.all(workers);
  }

  /** 画像URLを取得（フォールバック付き） */
  function getImageUrl(painting, thumb = false) {
    if (thumb) {
      return painting.image_thumb || painting.image || '';
    }
    return painting.image || '';
  }

  /** ジャンルでフィルター */
  function filterByGenre(paintings, genres) {
    if (!genres || genres.length === 0) return paintings;
    const genreSet = new Set(genres);
    return paintings.filter(p => genreSet.has(p.genre));
  }

  /** 難易度でフィルター */
  function filterByDifficulty(paintings, difficulty) {
    if (!difficulty) return paintings;
    return paintings.filter(p => p.difficulty === difficulty);
  }

  /** 全ジャンル一覧を取得 */
  function getGenres(paintings) {
    return [...new Set((paintings || _paintings).map(p => p.genre))].filter(Boolean);
  }

  /** 全作品を取得 */
  function getAll() {
    return _paintings;
  }

  /** ロード済みか */
  function isLoaded() {
    return _loaded;
  }

  return {
    load,
    preloadImages,
    getImageUrl,
    filterByGenre,
    filterByDifficulty,
    getGenres,
    getAll,
    isLoaded,
    DUMMY_PAINTINGS
  };
})();
