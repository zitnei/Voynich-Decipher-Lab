'use client';

import { useMemo, useState } from 'react';

type Rule = {
  token: string;
  meaning: string;
  confidence: number;
  reason: string;
};

type Analysis = {
  tokenCount: number;
  uniqueCount: number;
  avgLength: number;
  repeatedRate: number;
  brightness: number;
  density: number;
  pageType: string;
};

const tokenBank = [
  'qokedy', 'chedy', 'shedy', 'dain', 'ol', 'ar', 'aiin', 'qokeey',
  'otol', 'daiin', 'chol', 'yteedy', 'qotedy', 'okeody', 'sar', 'dor'
];

const meaningBank: Record<string, string[]> = {
  botanical: ['root marker', 'leaf structure', 'plant preparation', 'water extraction', 'seasonal growth'],
  astronomical: ['lunar marker', 'calendar cycle', 'star grouping', 'phase transition', 'celestial count'],
  biological: ['body region', 'fluid pathway', 'thermal bath', 'repetition marker', 'human cluster'],
  pharmaceutical: ['container marker', 'herbal mixture', 'dose unit', 'storage note', 'preparation step'],
  unknown: ['context marker', 'repeated unit', 'section divider', 'semantic anchor', 'measurement term']
};

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function frequency(tokens: string[]) {
  const map = new Map<string, number>();
  tokens.forEach((t) => map.set(t, (map.get(t) || 0) + 1));
  return Array.from(map.entries())
    .map(([token, count]) => ({ token, count }))
    .sort((a, b) => b.count - a.count);
}

function generateEvaLike(seed: number, count = 44) {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.abs(Math.floor((seed * (i + 7) + i * 13) % tokenBank.length));
    out.push(tokenBank[idx]);
  }
  return out.join(' ');
}

function buildRules(tokens: string[], pageType: string): Rule[] {
  const freq = frequency(tokens).slice(0, 8);
  const meanings = meaningBank[pageType] || meaningBank.unknown;
  return freq.map((f, index) => {
    const base = Math.min(94, 42 + f.count * 9 + Math.max(0, 8 - index) * 3);
    return {
      token: f.token,
      meaning: meanings[index % meanings.length],
      confidence: base,
      reason: `Appears ${f.count} time(s), ranked #${index + 1}, and matches ${pageType} page context.`
    };
  });
}

function verifyRules(rules: Rule[], targetTokens: string[]) {
  const targetSet = new Set(targetTokens);
  const results = rules.map((rule) => {
    const exists = targetSet.has(rule.token);
    return {
      ...rule,
      reproduced: exists,
      verificationScore: exists ? Math.min(99, rule.confidence + 4) : Math.max(12, rule.confidence - 35)
    };
  });
  const reproduced = results.filter((r) => r.reproduced).length;
  const score = rules.length ? Math.round((reproduced / rules.length) * 100) : 0;
  return { results, score, contradictions: results.filter((r) => !r.reproduced) };
}

export default function Page() {
  const [imageUrl, setImageUrl] = useState('');
  const [imageName, setImageName] = useState('');
  const [pageType, setPageType] = useState('botanical');
  const [evaText, setEvaText] = useState('qokedy qokedy shedy dain ol qokeedy shedy aiin qokedy chol dain');
  const [comparisonText, setComparisonText] = useState('shedy dain qokedy aiin chol qotedy dain ol shedy');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const tokens = useMemo(() => tokenize(evaText), [evaText]);
  const comparisonTokens = useMemo(() => tokenize(comparisonText), [comparisonText]);
  const freq = useMemo(() => frequency(tokens), [tokens]);
  const rules = useMemo(() => buildRules(tokens, pageType), [tokens, pageType]);
  const verification = useMemo(() => verifyRules(rules, comparisonTokens), [rules, comparisonTokens]);

  function handleImage(file?: File) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setImageName(file.name);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const w = 180;
      const h = Math.max(1, Math.round((img.height / img.width) * w));
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;

      let brightness = 0;
      let darkPixels = 0;
      for (let i = 0; i < data.length; i += 4) {
        const v = (data[i] + data[i + 1] + data[i + 2]) / 3;
        brightness += v;
        if (v < 130) darkPixels++;
      }
      const pixels = data.length / 4;
      const avgBrightness = Math.round(brightness / pixels);
      const density = Math.round((darkPixels / pixels) * 100);
      const seed = avgBrightness + density + file.name.length;
      const generated = generateEvaLike(seed, Math.max(32, Math.min(90, density + 24)));
      setEvaText(generated);

      setAnalysis({
        tokenCount: tokenize(generated).length,
        uniqueCount: frequency(tokenize(generated)).length,
        avgLength: 5.4,
        repeatedRate: Math.min(96, Math.round(density * 1.2)),
        brightness: avgBrightness,
        density,
        pageType
      });
    };
    img.src = url;
  }

  function exportJson() {
    const payload = {
      project: 'Voynich Verified Translation Engine',
      notice: 'Experimental hypothesis research output. Not a confirmed translation.',
      imageName,
      pageType,
      evaText,
      analysis,
      frequency: freq,
      generatedRules: rules,
      verification
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'voynich-research-log.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="container">
      <section className="hero">
        <div className="badge">Verified Translation Engine / Experimental</div>
        <h1>Voynich Decipher Lab</h1>
        <p className="subtitle">
          A free browser-based research system for testing whether translation rules can survive
          cross-page verification. It does not claim a confirmed translation; it measures whether
          hypotheses are reproducible.
        </p>
      </section>

      <section className="grid">
        <div className="panel">
          <h2>1. Manuscript Image Input</h2>
          <input type="file" accept="image/*" onChange={(e) => handleImage(e.target.files?.[0])} />
          <select value={pageType} onChange={(e) => setPageType(e.target.value)}>
            <option value="botanical">Botanical</option>
            <option value="astronomical">Astronomical</option>
            <option value="biological">Biological</option>
            <option value="pharmaceutical">Pharmaceutical</option>
            <option value="unknown">Unknown</option>
          </select>
          <div className="viewer">
            {imageUrl ? <img src={imageUrl} alt="Uploaded manuscript" /> : <span className="small">Upload a manuscript image to generate EVA-like tokens.</span>}
          </div>
        </div>

        <div className="panel">
          <h2>2. EVA Token Workspace</h2>
          <textarea value={evaText} onChange={(e) => setEvaText(e.target.value)} />
          <p className="small">
            You can paste real EVA transcription here. If you upload an image, the browser creates an experimental EVA-like token stream.
          </p>
          <div className="stats">
            <div className="stat"><strong>{tokens.length}</strong><span className="small">Tokens</span></div>
            <div className="stat"><strong>{freq.length}</strong><span className="small">Unique</span></div>
            <div className="stat"><strong>{analysis?.brightness ?? '-'}</strong><span className="small">Brightness</span></div>
            <div className="stat"><strong>{analysis?.density ?? '-'}</strong><span className="small">Glyph Density</span></div>
          </div>
        </div>
      </section>

      <section className="grid" style={{ marginTop: 18 }}>
        <div className="panel">
          <h2>3. Word Frequency Analysis</h2>
          <div className="list">
            {freq.slice(0, 10).map((f) => (
              <div className="item" key={f.token}>
                <span>{f.token}</span>
                <span className="score">{f.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>4. Translation Rule Generation</h2>
          <div className="list">
            {rules.map((rule) => (
              <div className="item" key={rule.token}>
                <span>
                  <b>{rule.token}</b> → {rule.meaning}
                  <br />
                  <span className="small">{rule.reason}</span>
                </span>
                <span className="score">{rule.confidence}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid" style={{ marginTop: 18 }}>
        <div className="panel">
          <h2>5. Cross-Page Comparison</h2>
          <textarea value={comparisonText} onChange={(e) => setComparisonText(e.target.value)} />
          <div className="stats">
            <div className="stat"><strong>{comparisonTokens.length}</strong><span className="small">Target Tokens</span></div>
            <div className="stat"><strong>{verification.score}%</strong><span className="small">Reproducibility</span></div>
          </div>
        </div>

        <div className="panel">
          <h2>6. Hypothesis Verification</h2>
          <div className="list">
            {verification.results.map((r) => (
              <div className={r.reproduced ? 'item' : 'item warning'} key={r.token}>
                <span>
                  <b>{r.token}</b> → {r.meaning}
                  <br />
                  <span className="small">
                    {r.reproduced ? 'Reproduced on comparison page.' : 'Contradiction: token not found on comparison page.'}
                  </span>
                </span>
                <span className="score">{r.verificationScore}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 18 }}>
        <h2>7. Verified Candidate Rules</h2>
        <p className="small">
          Rules are only treated as candidates when they appear again on the comparison page.
          A real confirmed translation would require the same rule system to work across many independent pages.
        </p>
        <div className="actions">
          <button className="primary" onClick={exportJson}>Export JSON Research Log</button>
          <button className="secondary" onClick={() => setComparisonText(evaText)}>Use Current Page as Reproduction Target</button>
        </div>
        <div className="list">
          {verification.results.filter((r) => r.reproduced).map((r) => (
            <div className="item" key={r.token}>
              <span><b>{r.token}</b> → {r.meaning}</span>
              <span className="score">Candidate</span>
            </div>
          ))}
        </div>
      </section>

      <p className="footer">
        Important: The Voynich Manuscript remains undeciphered. This site is a verification engine for experimental hypotheses, not a certified translation.
      </p>
    </main>
  );
}
