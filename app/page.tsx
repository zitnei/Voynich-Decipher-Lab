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
  'otol', 'daiin', 'chol', 'yteedy', 'qotedy', 'okeody', 'sar', 'dor',
  'qokain', 'sheol', 'cthey', 'okar'
];

const meaningBank: Record<string, string[]> = {
  botanical: ['root marker', 'leaf structure', 'plant preparation', 'water extraction', 'seasonal growth', 'growth phase'],
  astronomical: ['lunar marker', 'calendar cycle', 'star grouping', 'phase transition', 'celestial count', 'season marker'],
  biological: ['body region', 'fluid pathway', 'thermal bath', 'repetition marker', 'human cluster', 'procedure marker'],
  pharmaceutical: ['container marker', 'herbal mixture', 'dose unit', 'storage note', 'preparation step', 'compound marker'],
  unknown: ['context marker', 'repeated unit', 'section divider', 'semantic anchor', 'measurement term', 'topic marker']
};

function tokenize(text: string) {
  return text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
}

function frequency(tokens: string[]) {
  const map = new Map<string, number>();
  tokens.forEach((t) => map.set(t, (map.get(t) || 0) + 1));
  return Array.from(map.entries()).map(([token, count]) => ({ token, count })).sort((a, b) => b.count - a.count);
}

function generateEvaLike(seed: number, count = 52) {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.abs(Math.floor((seed * (i + 7) + i * 13 + (i % 5) * 11) % tokenBank.length));
    out.push(tokenBank[idx]);
  }
  return out.join(' ');
}

function buildRules(tokens: string[], pageType: string): Rule[] {
  const freq = frequency(tokens).slice(0, 10);
  const meanings = meaningBank[pageType] || meaningBank.unknown;
  return freq.map((f, index) => {
    const base = Math.min(94, 38 + f.count * 8 + Math.max(0, 10 - index) * 3);
    return {
      token: f.token,
      meaning: meanings[index % meanings.length],
      confidence: base,
      reason: `Appears ${f.count} time(s), ranked #${index + 1}, and is mapped to the ${pageType} context.`
    };
  });
}

function verifyRules(rules: Rule[], targetTokens: string[]) {
  const targetSet = new Set(targetTokens);
  const targetFreq = frequency(targetTokens);
  const targetMap = new Map(targetFreq.map((x) => [x.token, x.count]));
  const results = rules.map((rule) => {
    const count = targetMap.get(rule.token) || 0;
    const reproduced = count > 0;
    return {
      ...rule,
      reproduced,
      targetCount: count,
      verificationScore: reproduced ? Math.min(99, rule.confidence + count * 3) : Math.max(8, rule.confidence - 42)
    };
  });
  const reproduced = results.filter((r) => r.reproduced).length;
  const score = rules.length ? Math.round((reproduced / rules.length) * 100) : 0;
  return { results, score, contradictions: results.filter((r) => !r.reproduced) };
}

function generatePaperReport(args: {
  pageType: string;
  imageName: string;
  tokens: string[];
  freq: {token: string; count: number}[];
  rules: Rule[];
  verification: ReturnType<typeof verifyRules>;
  analysis: Analysis | null;
}) {
  const { pageType, imageName, tokens, freq, rules, verification, analysis } = args;
  const candidateRules = verification.results.filter((r) => r.reproduced);
  const contradictions = verification.contradictions;

  return `Title
Voynich Scientific Decipherment Platform: A Reproducible Rule-Verification Workflow

Abstract
This report describes an experimental workflow for testing whether proposed Voynich Manuscript translation rules remain consistent across independent page samples. The system does not claim a confirmed decipherment. It generates token hypotheses, proposes rule mappings, tests the rules against a comparison page, and reports reproducibility and contradiction evidence.

Input
Image file: ${imageName || 'not provided'}
Page category: ${pageType}
Token count: ${tokens.length}
Unique tokens: ${freq.length}
Image brightness: ${analysis?.brightness ?? 'not measured'}
Glyph density: ${analysis?.density ?? 'not measured'}

Method
1. Generate or paste EVA-like transcription tokens.
2. Calculate token frequency and repetition patterns.
3. Propose candidate translation rules from page category and token rank.
4. Apply the same rules to an independent comparison page.
5. Score reproducibility and list contradictions.
6. Export JSON logs so other researchers can repeat the test.

Top Token Frequencies
${freq.slice(0, 10).map((f, i) => `${i + 1}. ${f.token}: ${f.count}`).join('\n') || 'No tokens'}

Candidate Translation Rules
${rules.map((r, i) => `${i + 1}. ${r.token} -> ${r.meaning} (${r.confidence}%)`).join('\n') || 'No rules'}

Verification Result
Reproducibility score: ${verification.score}%
Reproduced candidate rules: ${candidateRules.length}
Contradictions: ${contradictions.length}

Falsifiability
This hypothesis should be rejected or weakened if:
- the same token mapping fails across independent manuscript pages
- high-confidence rules appear only in one local sample
- rules contradict the page category or visual context
- reproduced tokens do not preserve consistent semantic roles
- statistical patterns are indistinguishable from generated noise

Conclusion
The current result is ${verification.score >= 70 ? 'a stronger candidate for further manual review' : verification.score >= 40 ? 'a weak-to-moderate candidate that needs more independent pages' : 'not strong enough for a confirmed translation claim'}.
A confirmed translation would require consistent results across many pages, external expert review, and transparent publication of the rule set and corpus.`;
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
  const paperReport = useMemo(() => generatePaperReport({ pageType, imageName, tokens, freq, rules, verification, analysis }), [pageType, imageName, tokens, freq, rules, verification, analysis]);

  const scientificReadiness = Math.round(
    verification.score * 0.45 +
    Math.min(100, rules.length * 8) * 0.2 +
    Math.min(100, freq.length * 5) * 0.15 +
    (analysis ? 20 : 0)
  );

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
      const seed = avgBrightness + density + file.name.length + pageType.length;
      const generated = generateEvaLike(seed, Math.max(36, Math.min(110, density + 34)));
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
      project: 'Voynich Scientific Decipherment Platform',
      notice: 'Experimental hypothesis research output. Not a confirmed translation.',
      imageName,
      pageType,
      evaText,
      comparisonText,
      analysis,
      frequency: freq,
      generatedRules: rules,
      verification,
      scientificReadiness,
      paperReport
    };
    download('voynich-research-log.json', JSON.stringify(payload, null, 2), 'application/json');
  }

  function exportReport() {
    download('voynich-paper-report.txt', paperReport, 'text/plain');
  }

  function download(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="container">
      <section className="hero">
        <div className="badge">Scientific Decipherment Platform / Experimental</div>
        <h1>Voynich Scientific Decipherment Platform</h1>
        <p className="subtitle">
          A free browser-based research system for testing whether proposed translation rules can survive
          independent page verification. It is built for reproducibility, contradiction detection, and paper-style reporting.
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
            Paste real EVA transcription here when available. Image upload creates an experimental EVA-like token stream for demonstration.
          </p>
          <div className="stats">
            <div className="stat"><strong>{tokens.length}</strong><span className="small">Tokens</span></div>
            <div className="stat"><strong>{freq.length}</strong><span className="small">Unique</span></div>
            <div className="stat"><strong>{analysis?.brightness ?? '-'}</strong><span className="small">Brightness</span></div>
            <div className="stat"><strong>{analysis?.density ?? '-'}</strong><span className="small">Glyph Density</span></div>
          </div>
        </div>
      </section>

      <section className="three" style={{ marginTop: 18 }}>
        <div className="panel">
          <h2>3. Word Frequency</h2>
          <div className="list">
            {freq.slice(0, 10).map((f) => (
              <div className="item" key={f.token}><span>{f.token}</span><span className="score">{f.count}</span></div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>4. Translation Rule Engine</h2>
          <div className="list">
            {rules.map((rule) => (
              <div className="item" key={rule.token}>
                <span><b>{rule.token}</b> → {rule.meaning}<br /><span className="small">{rule.reason}</span></span>
                <span className="score">{rule.confidence}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>5. Scientific Readiness</h2>
          <div className="stats">
            <div className="stat"><strong>{verification.score}%</strong><span className="small">Reproducibility</span></div>
            <div className="stat"><strong>{verification.contradictions.length}</strong><span className="small">Contradictions</span></div>
            <div className="stat"><strong>{scientificReadiness}%</strong><span className="small">Readiness</span></div>
            <div className="stat"><strong>{rules.length}</strong><span className="small">Rules</span></div>
          </div>
          <p className="small">
            A real confirmed translation would need high reproducibility across many independent pages, not only one comparison field.
          </p>
        </div>
      </section>

      <section className="grid" style={{ marginTop: 18 }}>
        <div className="panel">
          <h2>6. Cross-Page Comparison</h2>
          <textarea value={comparisonText} onChange={(e) => setComparisonText(e.target.value)} />
          <div className="actions">
            <button className="secondary" onClick={() => setComparisonText(evaText)}>Use Current Page as Target</button>
          </div>
        </div>

        <div className="panel">
          <h2>7. Hypothesis Verification</h2>
          <div className="list">
            {verification.results.map((r) => (
              <div className={r.reproduced ? 'item ok' : 'item warning'} key={r.token}>
                <span>
                  <b>{r.token}</b> → {r.meaning}<br />
                  <span className="small">
                    {r.reproduced ? `Reproduced. Target count: ${r.targetCount}` : 'Contradiction: token not found on comparison page.'}
                  </span>
                </span>
                <span className="score">{r.verificationScore}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid" style={{ marginTop: 18 }}>
        <div className="panel">
          <h2>8. Falsifiability Checklist</h2>
          <div className="list">
            <div className={verification.score >= 70 ? 'item ok' : 'item fail'}><span>Independent-page reproducibility above 70%</span><span className="score">{verification.score >= 70 ? 'Pass' : 'Fail'}</span></div>
            <div className={verification.contradictions.length <= Math.max(1, rules.length * 0.3) ? 'item ok' : 'item fail'}><span>Contradictions under control</span><span className="score">{verification.contradictions.length}</span></div>
            <div className={freq.length >= 5 ? 'item ok' : 'item fail'}><span>Enough unique tokens for a weak statistical sample</span><span className="score">{freq.length}</span></div>
            <div className={analysis ? 'item ok' : 'item warning'}><span>Image-derived metadata included</span><span className="score">{analysis ? 'Yes' : 'No'}</span></div>
          </div>
        </div>

        <div className="panel">
          <h2>9. Export Research Evidence</h2>
          <p className="small">
            Export data for GitHub, papers, expert review, and reproducibility checks.
          </p>
          <div className="actions">
            <button className="primary" onClick={exportJson}>Export JSON Research Log</button>
            <button className="primary" onClick={exportReport}>Export Paper-Style Report</button>
          </div>
          <div className="list">
            {verification.results.filter((r) => r.reproduced).map((r) => (
              <div className="item ok" key={r.token}>
                <span><b>{r.token}</b> → {r.meaning}</span>
                <span className="score">Candidate</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 18 }}>
        <h2>Generated Paper-Style Report</h2>
        <div className="report">{paperReport}</div>
      </section>

      <p className="footer">
        Important: The Voynich Manuscript remains undeciphered. This system is a scientific verification workflow for experimental hypotheses, not a certified translation.
      </p>
    </main>
  );
}
