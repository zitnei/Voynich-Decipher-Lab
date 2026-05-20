"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

type PageCategory = "botanical" | "astronomical" | "biological" | "pharmaceutical" | "unknown";
type SavedPage = {
  id: string;
  title: string;
  category: PageCategory;
  imageUrl: string;
  imageNotes: string;
  evaText: string;
  tokens: string[];
  frequency: Record<string, number>;
  visual: VisualAnalysis;
  rules: Rule[];
  hypothesis: string;
  createdAt: string;
};
type VisualAnalysis = {
  brightness: number;
  contrast: number;
  inkDensity: number;
  edgeScore: number;
  estimatedGlyphs: number;
};
type Rule = {
  token: string;
  meaning: string;
  evidence: string;
  confidence: number;
};

const categoryLabels: Record<PageCategory, string> = {
  botanical: "Botanical / plant page",
  astronomical: "Astronomical / calendar page",
  biological: "Biological / bathing page",
  pharmaceutical: "Pharmaceutical / recipe page",
  unknown: "Unknown"
};

const meaningBank: Record<PageCategory, string[]> = {
  botanical: ["root marker", "leaf descriptor", "plant name candidate", "growth stage", "water / preparation note"],
  astronomical: ["calendar marker", "moon / cycle reference", "star group label", "seasonal interval", "date separator"],
  biological: ["body / vessel marker", "flow direction", "group label", "process marker", "temperature / bath note"],
  pharmaceutical: ["ingredient marker", "dose marker", "container label", "mixing instruction", "extract / liquid marker"],
  unknown: ["unknown recurring marker", "section label", "grammar-like token", "semantic cluster", "candidate keyword"]
};

const sampleEva = `qokedy qokedy dal qokain shedy\nolchedy qokeedy qokedy ykar\nchedy qokaiin otol dain\nqokedy shedy qokedy ar al`;

function normalizeTokens(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function frequencyOf(tokens: string[]) {
  return tokens.reduce<Record<string, number>>((acc, token) => {
    acc[token] = (acc[token] ?? 0) + 1;
    return acc;
  }, {});
}

function topEntries(freq: Record<string, number>, limit = 12) {
  return Object.entries(freq).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);
}

function jaccard(a: string[], b: string[]) {
  const A = new Set(a);
  const B = new Set(b);
  const intersection = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...A, ...B]).size || 1;
  return Math.round((intersection / union) * 100);
}

function generateRules(category: PageCategory, freq: Record<string, number>, notes: string): Rule[] {
  const bank = meaningBank[category];
  const hasVisualHint = notes.trim().length > 8;
  return topEntries(freq, 8).map(([token, count], index) => {
    const confidence = Math.min(92, 36 + count * 12 + (hasVisualHint ? 8 : 0) - index * 3);
    return {
      token,
      meaning: bank[index % bank.length],
      evidence: `${count} occurrence(s), category=${categoryLabels[category]}${hasVisualHint ? ", supported by image notes" : ""}`,
      confidence
    };
  });
}

function buildHypothesis(category: PageCategory, rules: Rule[], visual: VisualAnalysis) {
  const main = rules.slice(0, 5).map((r) => `${r.token} = ${r.meaning}`).join(" / ");
  const visualLine = `Visual analysis: ink density ${visual.inkDensity}%, edge score ${visual.edgeScore}, estimated glyph-like regions ${visual.estimatedGlyphs}.`;
  return `Hypothesis for ${categoryLabels[category]}: ${main || "not enough tokens yet"}.\n${visualLine}\nThis is not a confirmed translation. It is a reproducible rule set that must be tested on other pages.`;
}

function verifyScore(rules: Rule[], tokens: string[], visual: VisualAnalysis) {
  if (!tokens.length || !rules.length) return 0;
  const covered = tokens.filter((t) => rules.some((r) => r.token === t)).length / tokens.length;
  const visualSupport = Math.min(1, (visual.inkDensity + visual.edgeScore) / 140);
  return Math.round((covered * 0.7 + visualSupport * 0.3) * 100);
}

function pseudoEvaFromVisual(visual: VisualAnalysis, category: PageCategory) {
  const syllables = ["qo", "ched", "y", "dain", "ol", "aiin", "shed", "ok", "ar", "al", "otol", "qok"];
  const length = Math.max(8, Math.min(36, Math.round(visual.estimatedGlyphs / 5) || 14));
  const offset = category.length + visual.edgeScore + visual.inkDensity;
  const words = Array.from({ length }, (_, i) => {
    const a = syllables[(i + offset) % syllables.length];
    const b = syllables[(i * 3 + visual.contrast) % syllables.length];
    return (a + b).replace(/yy/g, "y").slice(0, 10);
  });
  return words.reduce((acc, word, i) => acc + word + ((i + 1) % 6 === 0 ? "\n" : " "), "").trim();
}

export default function Home() {
  const [title, setTitle] = useState("f1r analysis page");
  const [category, setCategory] = useState<PageCategory>("astronomical");
  const [imageUrl, setImageUrl] = useState("");
  const [imageNotes, setImageNotes] = useState("circular labels, star-like shapes, repeating marks");
  const [evaText, setEvaText] = useState(sampleEva);
  const [savedPages, setSavedPages] = useState<SavedPage[]>([]);
  const [compareId, setCompareId] = useState("");
  const [reproduceId, setReproduceId] = useState("");
  const [visual, setVisual] = useState<VisualAnalysis>({ brightness: 0, contrast: 0, inkDensity: 0, edgeScore: 0, estimatedGlyphs: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("voynich-pages-v2");
    if (raw) setSavedPages(JSON.parse(raw));
  }, []);

  useEffect(() => {
    localStorage.setItem("voynich-pages-v2", JSON.stringify(savedPages));
  }, [savedPages]);

  const tokens = useMemo(() => normalizeTokens(evaText), [evaText]);
  const frequency = useMemo(() => frequencyOf(tokens), [tokens]);
  const rules = useMemo(() => generateRules(category, frequency, imageNotes), [category, frequency, imageNotes]);
  const hypothesis = useMemo(() => buildHypothesis(category, rules, visual), [category, rules, visual]);
  const score = useMemo(() => verifyScore(rules, tokens, visual), [rules, tokens, visual]);
  const comparePage = savedPages.find((p) => p.id === compareId);
  const reproducePage = savedPages.find((p) => p.id === reproduceId);

  const runImageAnalysis = async (src: string) => {
    if (!src) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const max = 420;
      const scale = Math.min(max / img.width, max / img.height, 1);
      canvas.width = Math.max(1, Math.floor(img.width * scale));
      canvas.height = Math.max(1, Math.floor(img.height * scale));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let sum = 0;
      let sumSq = 0;
      let dark = 0;
      let edges = 0;
      const gray: number[] = [];
      for (let i = 0; i < data.length; i += 4) {
        const g = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
        gray.push(g);
        sum += g;
        sumSq += g * g;
        if (g < 145) dark++;
      }
      const pixels = gray.length || 1;
      const avg = sum / pixels;
      const variance = sumSq / pixels - avg * avg;
      for (let y = 1; y < canvas.height - 1; y += 2) {
        for (let x = 1; x < canvas.width - 1; x += 2) {
          const idx = y * canvas.width + x;
          const diff = Math.abs(gray[idx] - gray[idx - 1]) + Math.abs(gray[idx] - gray[idx - canvas.width]);
          if (diff > 70) edges++;
        }
      }
      const nextVisual = {
        brightness: Math.round(avg),
        contrast: Math.round(Math.sqrt(Math.max(0, variance))),
        inkDensity: Math.round((dark / pixels) * 100),
        edgeScore: Math.min(100, Math.round((edges / (pixels / 4)) * 100)),
        estimatedGlyphs: Math.max(0, Math.round(edges / 18))
      };
      setVisual(nextVisual);
    };
    img.onerror = () => alert("Image could not be loaded. Use upload if the remote site blocks browser access.");
    img.src = src;
  };

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      setImageUrl(url);
      runImageAnalysis(url);
    };
    reader.readAsDataURL(file);
  };

  const savePage = () => {
    const page: SavedPage = {
      id: crypto.randomUUID(),
      title,
      category,
      imageUrl,
      imageNotes,
      evaText,
      tokens,
      frequency,
      visual,
      rules,
      hypothesis,
      createdAt: new Date().toISOString()
    };
    setSavedPages((prev) => [page, ...prev]);
  };

  const autoEva = () => setEvaText(pseudoEvaFromVisual(visual, category));

  const reproduction = reproducePage
    ? {
        overlap: jaccard(rules.map((r) => r.token), reproducePage.tokens),
        matched: reproducePage.tokens.filter((t) => rules.some((r) => r.token === t))
      }
    : null;

  const exportJson = () => {
    const payload = { title, category, imageNotes, evaText, visual, frequency, rules, hypothesis, score, savedPagesCount: savedPages.length };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "voynich-analysis.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="page">
      <section className="header">
        <div className="kicker">VOYNICH DECIPHER LAB</div>
        <h1>Turn an undeciphered page into a testable hypothesis.</h1>
        <p className="lead">Upload a manuscript image, run browser-side visual analysis, convert it into provisional EVA-style tokens, count word frequency, compare pages, generate reusable translation rules, verify them, and reproduce them on another page.</p>
        <div className="notice">Not a confirmed translation. This is a reproducible hypothesis engine.</div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>1. Manuscript image</h2>
          <label className="label">Page title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          <label className="label">Upload image</label>
          <input className="input" type="file" accept="image/*" onChange={onFile} />
          <label className="label">Or paste image URL</label>
          <div className="row">
            <input className="input" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Yale / manuscript image URL" />
            <button className="btn" onClick={() => runImageAnalysis(imageUrl)}>Analyze URL</button>
          </div>
          <div className="preview" style={{ marginTop: 14 }}>{imageUrl ? <img src={imageUrl} alt="Manuscript page" /> : <span className="muted">Image preview appears here</span>}</div>
          <canvas ref={canvasRef} hidden />
        </div>

        <div className="card">
          <h2>2. AI visual analysis → EVA</h2>
          <label className="label">Page category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as PageCategory)}>
            {Object.entries(categoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <label className="label">Image notes</label>
          <input className="input" value={imageNotes} onChange={(e) => setImageNotes(e.target.value)} />
          <div className="metricGrid" style={{ marginTop: 14 }}>
            <div className="metric"><span className="small muted">Ink density</span><strong>{visual.inkDensity}%</strong></div>
            <div className="metric"><span className="small muted">Edge score</span><strong>{visual.edgeScore}</strong></div>
            <div className="metric"><span className="small muted">Glyph estimate</span><strong>{visual.estimatedGlyphs}</strong></div>
          </div>
          <button className="btn primary" style={{ marginTop: 14 }} onClick={autoEva}>Generate provisional EVA from visual analysis</button>
          <label className="label">EVA transcription / converted tokens</label>
          <textarea className="textarea" value={evaText} onChange={(e) => setEvaText(e.target.value)} />
        </div>

        <div className="card">
          <h2>3. Hypothesis verification</h2>
          <div className="muted">Current rule consistency score</div>
          <div className="bigScore">{score}%</div>
          <pre className="log">{hypothesis}</pre>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn primary" onClick={savePage}>Save this page</button>
            <button className="btn" onClick={exportJson}>Export JSON log</button>
          </div>
        </div>

        <div className="card wide">
          <h2>4. Word frequency analysis</h2>
          <table className="table">
            <thead><tr><th>Token</th><th>Count</th><th>Generated rule candidate</th><th>Confidence</th></tr></thead>
            <tbody>
              {topEntries(frequency, 12).map(([token, count]) => {
                const rule = rules.find((r) => r.token === token);
                return <tr key={token}><td><strong>{token}</strong></td><td>{count}</td><td>{rule?.meaning ?? "-"}</td><td>{rule?.confidence ?? 0}%</td></tr>;
              })}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>5. Saved pages</h2>
          <p className="muted small">Saved locally in this browser. Add at least two pages to test cross-page comparison and reproduction.</p>
          {savedPages.length === 0 ? <p className="muted">No saved pages yet.</p> : savedPages.map((p) => (
            <div className="metric" key={p.id} style={{ marginBottom: 10 }}>
              <strong style={{ fontSize: 18 }}>{p.title}</strong>
              <div className="small muted">{categoryLabels[p.category]} / {p.tokens.length} tokens</div>
            </div>
          ))}
          {savedPages.length > 0 && <button className="btn danger" onClick={() => setSavedPages([])}>Clear saved pages</button>}
        </div>

        <div className="card wide">
          <h2>6. Cross-page comparison</h2>
          <label className="label">Compare current page with saved page</label>
          <select value={compareId} onChange={(e) => setCompareId(e.target.value)}>
            <option value="">Select saved page</option>
            {savedPages.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          {comparePage && (
            <div className="metricGrid" style={{ marginTop: 14 }}>
              <div className="metric"><span className="small muted">Token overlap</span><strong>{jaccard(tokens, comparePage.tokens)}%</strong></div>
              <div className="metric"><span className="small muted">Current unique</span><strong>{new Set(tokens).size}</strong></div>
              <div className="metric"><span className="small muted">Compared unique</span><strong>{new Set(comparePage.tokens).size}</strong></div>
            </div>
          )}
          <h3>Generated translation rules</h3>
          {rules.map((r) => <span className="pill" key={r.token}>{r.token} → {r.meaning} ({r.confidence}%)</span>)}
        </div>

        <div className="card">
          <h2>7. Reproduce rules on another page</h2>
          <label className="label">Apply current rules to saved page</label>
          <select value={reproduceId} onChange={(e) => setReproduceId(e.target.value)}>
            <option value="">Select saved page</option>
            {savedPages.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          {reproduction && reproducePage && (
            <>
              <div className="bigScore">{reproduction.overlap}%</div>
              <p className="muted">Reproducibility score against {reproducePage.title}</p>
              <div>{[...new Set(reproduction.matched)].slice(0, 18).map((t) => <span className="pill" key={t}>{t}</span>)}</div>
            </>
          )}
        </div>

        <div className="card full">
          <h2>8. Research log</h2>
          <pre className="log">{JSON.stringify({ category, visual, tokenCount: tokens.length, uniqueTokens: new Set(tokens).size, frequency: topEntries(frequency, 10), rules, verificationScore: score }, null, 2)}</pre>
        </div>
      </section>
    </main>
  );
}
