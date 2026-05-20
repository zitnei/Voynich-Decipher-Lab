'use client';

import { useMemo, useState } from 'react';

type Mode = 'herbal' | 'astronomy' | 'balneology' | 'cipher';

const sampleEva = `qokedy qokedy dal qokain shedy
olchedy qokeedy qokedy ykar
chedy qokaiin otol dain
qokedy shedy qokedy ar al`;

const modeText: Record<Mode, string> = {
  herbal: '薬草・植物ページ仮説',
  astronomy: '星図・暦ページ仮説',
  balneology: '浴場・人体ページ仮説',
  cipher: '暗号・記号体系仮説'
};

function tokenize(text: string) {
  return text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
}

function frequency(tokens: string[]) {
  const map = new Map<string, number>();
  for (const t of tokens) map.set(t, (map.get(t) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
}

function score(tokens: string[], mode: Mode) {
  const total = Math.max(tokens.length, 1);
  const repeatRate = tokens.length - new Set(tokens).size;
  const qRate = tokens.filter(t => t.startsWith('qo') || t.includes('qok')).length / total;
  const lengthAvg = tokens.reduce((a, b) => a + b.length, 0) / total;
  const base = Math.min(72, 28 + repeatRate * 6 + qRate * 22 + Math.abs(6 - lengthAvg) * 2);
  const modeBonus = mode === 'cipher' ? 7 : 3;
  return Math.round(Math.max(18, Math.min(86, base + modeBonus)));
}

function hypothesis(tokens: string[], mode: Mode, imageHint: string) {
  const top = frequency(tokens).slice(0, 5).map(([w]) => w);
  const common = top.length ? top.join(' / ') : '未入力';
  const hint = imageHint.trim() || '画像特徴なし';

  const body: Record<Mode, string> = {
    herbal: `このページは、植物・根・水分・採取時期に関する記録という仮説で読む。頻出語 ${common} は、植物部位・処理方法・量の単位を表す可能性がある。画像ヒント「${hint}」と一致する場合、薬草書としての説明力が上がる。`,
    astronomy: `このページは、月・星・季節周期に関する記録という仮説で読む。頻出語 ${common} は、日付・方角・周期語の候補になる。画像ヒント「${hint}」が円形図や星形図なら、暦表として検証する。`,
    balneology: `このページは、水・身体・浴場・治療手順の記録という仮説で読む。頻出語 ${common} は、部位名・流れ・温度・処置順の候補になる。画像ヒント「${hint}」が人体や水路なら説明力が上がる。`,
    cipher: `これは自然言語ではなく、置換・省略・接辞操作を含む暗号体系という仮説で読む。頻出語 ${common} は、単語ではなく暗号ブロックの可能性がある。同じ規則で別ページを読めるかが最重要。`
  };

  return `${body[mode]}\n\n重要：これは確定翻訳ではありません。ヴォイニッチ手稿は未解読のため、この結果は「検証用の仮説」です。正しい主張にするには、同じルールで別ページも一貫して読める必要があります。`;
}

export default function Home() {
  const [imageUrl, setImageUrl] = useState('');
  const [eva, setEva] = useState(sampleEva);
  const [mode, setMode] = useState<Mode>('herbal');
  const [imageHint, setImageHint] = useState('植物のような図、根、葉、円形ラベル');
  const tokens = useMemo(() => tokenize(eva), [eva]);
  const freq = useMemo(() => frequency(tokens), [tokens]);
  const confidence = useMemo(() => score(tokens, mode), [tokens, mode]);
  const result = useMemo(() => hypothesis(tokens, mode, imageHint), [tokens, mode, imageHint]);

  return (
    <main className="container">
      <section className="hero">
        <div>
          <div className="eyebrow">Voynich Decipher Lab</div>
          <h1>未解読文書を、検証できる仮説にする。</h1>
          <p className="sub">画像、EVA文字起こし、ページ分類、単語頻度から「翻訳候補」を作ります。確定翻訳ではなく、他ページで再現できるかを検証する研究ツールです。</p>
        </div>
        <div className="badge">確定ではなく、反証可能な仮説</div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>1. 手稿画像</h2>
          <label className="label">画像URL</label>
          <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Yaleなどの画像URLを貼る" />
          <div className="imageBox" style={{ marginTop: 12 }}>
            {imageUrl ? <img src={imageUrl} alt="Voynich manuscript page" /> : <div className="placeholder">ここに手稿画像が表示されます。<br />まずは画像URLを貼ってください。</div>}
          </div>
          <p className="small">Yale Digital Collections の画像や、自分で保存した研究用画像URLを使えます。</p>
        </div>

        <div className="card">
          <h2>2. EVA文字起こし</h2>
          <label className="label">ページ種別</label>
          <select value={mode} onChange={e => setMode(e.target.value as Mode)}>
            <option value="herbal">薬草・植物</option>
            <option value="astronomy">星図・暦</option>
            <option value="balneology">浴場・人体</option>
            <option value="cipher">暗号体系</option>
          </select>
          <label className="label">画像の特徴メモ</label>
          <input value={imageHint} onChange={e => setImageHint(e.target.value)} />
          <label className="label">EVAテキスト</label>
          <textarea value={eva} onChange={e => setEva(e.target.value)} />
          <div className="row">
            <div className="kv"><span>単語数</span><b>{tokens.length}</b></div>
            <div className="kv"><span>種類数</span><b>{new Set(tokens).size}</b></div>
          </div>
        </div>

        <div className="card">
          <h2>3. 仮説翻訳・検証</h2>
          <div className="small">選択中：{modeText[mode]}</div>
          <div className="score">{confidence}%</div>
          <div className="small">仮説の内部整合性スコア。正解率ではありません。</div>
          <hr style={{ borderColor: 'rgba(255,255,255,.1)', margin: '16px 0' }} />
          <div className="result">{result}</div>
          <h2 style={{ marginTop: 18 }}>頻出トークン</h2>
          <div>{freq.map(([w, c]) => <span key={w} className="token">{w} × {c}</span>)}</div>
        </div>
      </section>

      <div className="footer">Data note: Voynich Manuscript is still undeciphered. This app is for hypothesis generation and reproducible testing.</div>
    </main>
  );
}
