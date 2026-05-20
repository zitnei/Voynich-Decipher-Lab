'use client';

import { useMemo, useState } from 'react';
import data from '../data/real-engine-data.json';

type Score = {
  score: number;
  mappedRatio: number;
  categoryScore: number;
  structureScore: number;
  zipfScore: number;
};

type Translation = {
  japanese: string;
  mappings: { token: string; source: string; jp: string; count: number }[];
  intermediate: string;
};

type TokenBox = { token: string; x: number; y: number; w: number; h: number; label: string };

type PageData = {
  pageNo: number;
  image: string;
  category: string;
  brightness: number;
  glyphDensity: number;
  missingOrLowConfidence: boolean;
  evaCandidate: string;
  topTokens: { token: string; count: number }[];
  tokenBoxes: TokenBox[];
  hypothesisScores: Record<string, Score>;
  bestHypothesis: string;
  translationPercent: number;
  translations: Record<string, Translation>;
};

const pages = (data as any).pages as PageData[];
const hypotheses = (data as any).hypotheses as Record<string, { label: string; description: string }>;

export default function Page() {
  const [pageNo, setPageNo] = useState(3);
  const [theory, setTheory] = useState('auto');
  const [showEva, setShowEva] = useState(true);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);

  const page = useMemo(() => pages.find(p => p.pageNo === pageNo) || pages[0], [pageNo]);
  const max = pages.length;
  const selectedTheory = theory === 'auto' ? page.bestHypothesis : theory;
  const selectedBox = page.tokenBoxes.find(b => b.token === selectedToken) || null;
  const currentTranslation = page.translations[selectedTheory];
  const currentScore = page.hypothesisScores[selectedTheory];

  function move(delta: number) {
    setSelectedToken(null);
    setZoomOpen(false);
    setPageNo(n => Math.max(1, Math.min(max, n + delta)));
  }

  function jump(e: React.ChangeEvent<HTMLInputElement>) {
    const n = Number(e.target.value);
    if (Number.isFinite(n)) {
      setSelectedToken(null);
      setZoomOpen(false);
      setPageNo(Math.max(1, Math.min(max, n)));
    }
  }

  function clickToken(token: string) {
    setSelectedToken(token);
    setZoomOpen(true);
  }

  return (
    <main className="book">
      <header className="top">
        <div className="title">
          <h1>ヴォイニッチ手稿 本物寄り仮説エンジン</h1>
          <p>5仮説＋偽書仮説をスコア比較し、最も整合する日本語仮説訳を表示します。</p>
        </div>
        <div className="controls">
          <select className="select" value={theory} onChange={e => setTheory(e.target.value)}>
            <option value="auto">自動選択：最も高スコア</option>
            {Object.entries(hypotheses).map(([key, v]) => <option key={key} value={key}>{v.label}</option>)}
          </select>
          <input className="select" type="number" value={pageNo} min={1} max={max} onChange={jump} />
          <button className="btn" onClick={() => setShowEva(v => !v)}>{showEva ? 'EVAを隠す' : 'EVAを表示'}</button>
        </div>
      </header>

      <section className="spread">
        <article className="page">
          <div className="pageInner">
            <div className="meta">
              <span>原稿ページ {page.pageNo} / {max}</span>
              <span>{page.category}</span>
            </div>
            <div className="imageWrap">
              <div className="imageStage">
                <img src={page.image} alt={`Voynich page ${page.pageNo}`} />
                {selectedBox && (
                  <div
                    className="marker"
                    style={{
                      left: `${selectedBox.x / 700 * 100}%`,
                      top: `${selectedBox.y / 700 * 100}%`,
                      width: `${selectedBox.w / 700 * 100}%`,
                      height: `${selectedBox.h / 700 * 100}%`
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </article>

        <article className="page rightPage">
          <div className="pageInner">
            <div className="meta">
              <span>日本語仮説訳</span>
              <span>{hypotheses[selectedTheory].label}</span>
            </div>

            <div className="percentBox">
              <b>翻訳対応率：{currentScore.mappedRatio}% / 仮説スコア：{currentScore.score}%</b>
              <div className="bar"><div className="barFill" style={{ width: `${currentScore.score}%` }} /></div>
              <div className="eva" style={{ marginTop: 10 }}>
                翻訳対応率＝EVA候補トークンが辞書/仮説語彙に対応した割合。仮説スコア＝対応率＋構造＋Zipf＋ページ分類の総合点。
              </div>
            </div>

            <div className="jp">{currentTranslation.japanese}</div>

            <div className="eva">
              <b>中間表現:</b><br />
              {currentTranslation.intermediate}
            </div>

            <div className="tokens">
              {page.topTokens.map(t => (
                <button
                  className={selectedToken === t.token ? 'token active' : 'token'}
                  key={t.token}
                  onClick={() => clickToken(t.token)}
                >
                  {t.token} × {t.count}
                </button>
              ))}
            </div>

            <div className="scoreGrid">
              {Object.entries(page.hypothesisScores).map(([key, s]) => (
                <div className={key === selectedTheory ? 'scoreItem active' : 'scoreItem'} key={key}>
                  <b>{hypotheses[key].label}</b><br />
                  総合 {s.score}% / 対応 {s.mappedRatio}% / 構造 {s.structureScore}% / Zipf {s.zipfScore}%
                </div>
              ))}
            </div>

            {showEva && (
              <div className="eva">
                <b>EVA候補:</b><br />
                {page.evaCandidate || '欠落/低信頼ページのため候補なし'}
              </div>
            )}

            <div className="eva">
              信頼メモ：{page.missingOrLowConfidence ? 'このページは低信頼/欠落扱い。訳は保留推奨。' : `画像密度 ${page.glyphDensity} / 明るさ ${page.brightness}`}
            </div>
          </div>
        </article>
      </section>

      <nav className="bottom">
        <button className="btn primary" onClick={() => move(-1)}>← 前のページ</button>
        <div className="notice">これは確定翻訳ではありません。辞書・構造・統計で5仮説＋偽書仮説を比較する研究版です。</div>
        <button className="btn primary" onClick={() => move(1)}>次のページ →</button>
      </nav>

      <section className="thumbs">
        {pages.map(p => (
          <button className={p.pageNo === pageNo ? 'thumb active' : 'thumb'} key={p.pageNo} onClick={() => setPageNo(p.pageNo)}>
            <img src={p.image} alt={`page ${p.pageNo}`} />
            {p.pageNo}
          </button>
        ))}
      </section>

      {zoomOpen && selectedBox && (
        <div className="modal" onClick={() => setZoomOpen(false)}>
          <div className="modalLabel">{selectedBox.label} / クリックで戻る</div>
          <button className="close" onClick={() => setZoomOpen(false)}>×</button>
          <div className="modalInner">
            <img src={page.image} alt={`zoom page ${page.pageNo}`} />
            <div
              className="marker"
              style={{
                left: `${selectedBox.x / 700 * 100}%`,
                top: `${selectedBox.y / 700 * 100}%`,
                width: `${selectedBox.w / 700 * 100}%`,
                height: `${selectedBox.h / 700 * 100}%`
              }}
            />
          </div>
        </div>
      )}
    </main>
  );
}
