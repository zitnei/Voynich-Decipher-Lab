'use client';

import { useMemo, useState } from 'react';
import data from '../data/book-analysis.json';

type PageData = {
  pageNo: number;
  image: string;
  category: string;
  brightness: number;
  glyphDensity: number;
  missingOrLowConfidence: boolean;
  evaCandidate: string;
  topTokens: { token: string; count: number }[];
  translations: Record<string, string>;
};

const pages = (data as any).pages as PageData[];
const theories = (data as any).theories as Record<string, string>;

export default function Page() {
  const [pageNo, setPageNo] = useState(3);
  const [theory, setTheory] = useState('medievalLatin');
  const [showEva, setShowEva] = useState(true);

  const page = useMemo(() => pages.find(p => p.pageNo === pageNo) || pages[0], [pageNo]);
  const max = pages.length;

  function prev() {
    setPageNo(n => Math.max(1, n - 1));
  }

  function next() {
    setPageNo(n => Math.min(max, n + 1));
  }

  function jump(e: React.ChangeEvent<HTMLInputElement>) {
    const n = Number(e.target.value);
    if (Number.isFinite(n)) setPageNo(Math.max(1, Math.min(max, n)));
  }

  return (
    <main className="book">
      <header className="top">
        <div className="title">
          <h1>ヴォイニッチ手稿 日本語仮説訳リーダー</h1>
          <p>左に原稿、右に日本語仮説訳。理論を切り替えて本のように読めます。</p>
        </div>
        <div className="controls">
          <select className="select" value={theory} onChange={e => setTheory(e.target.value)}>
            {Object.entries(theories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
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
              <img src={page.image} alt={`Voynich page ${page.pageNo}`} />
            </div>
          </div>
        </article>

        <article className="page rightPage">
          <div className="pageInner">
            <div className="meta">
              <span>日本語仮説訳</span>
              <span>{theories[theory]}</span>
            </div>
            <div className="jp">{page.translations[theory]}</div>

            <div className="tokens">
              {page.topTokens.map(t => <span className="token" key={t.token}>{t.token} × {t.count}</span>)}
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
        <button className="btn primary" onClick={prev}>← 前のページ</button>
        <div className="notice">これは確定翻訳ではありません。6つの言語仮説から作った日本語の仮説訳です。</div>
        <button className="btn primary" onClick={next}>次のページ →</button>
      </nav>

      <section className="thumbs">
        {pages.map(p => (
          <button className={p.pageNo === pageNo ? 'thumb active' : 'thumb'} key={p.pageNo} onClick={() => setPageNo(p.pageNo)}>
            <img src={p.image} alt={`page ${p.pageNo}`} />
            {p.pageNo}
          </button>
        ))}
      </section>
    </main>
  );
}
