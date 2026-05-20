'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type PageRecord = {
  id: string
  category: string
  notes: string
  eva: string
  tokens: string[]
  freq: Record<string, number>
  imageStats: ImageStats | null
  rules: Rule[]
  createdAt: string
}

type ImageStats = {
  brightness: number
  contrast: number
  warmInkRatio: number
  edgeDensity: number
  estimatedType: string
}

type Rule = {
  token: string
  meaning: string
  reason: string
  confidence: number
}

const sampleEva = `qokedy qokedy dal qokain shedy
olchedy qokeedy qokedy ykar
chedy qokaiin otol dain
qokedy shedy qokedy ar al`

const categories = [
  '植物・薬草ページ',
  '星図・暦ページ',
  '生物・人体ページ',
  '薬学・容器ページ',
  '不明ページ',
]

const meaningBank: Record<string, string[]> = {
  '植物・薬草ページ': ['root marker', 'leaf reference', 'plant preparation', 'growth cycle', 'herbal mixture'],
  '星図・暦ページ': ['calendar marker', 'lunar cycle', 'seasonal period', 'star group', 'ritual date'],
  '生物・人体ページ': ['body marker', 'flow reference', 'bath section', 'figure group', 'anatomical relation'],
  '薬学・容器ページ': ['container label', 'dose marker', 'compound step', 'storage note', 'mixture relation'],
  '不明ページ': ['section marker', 'repeated label', 'unknown noun', 'relation marker', 'context token'],
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function frequency(tokens: string[]) {
  return tokens.reduce<Record<string, number>>((acc, token) => {
    acc[token] = (acc[token] ?? 0) + 1
    return acc
  }, {})
}

function generateEvaLike(stats: ImageStats | null, category: string) {
  const base = category.includes('星')
    ? ['qokedy', 'shedy', 'dal', 'qokain', 'olchedy', 'dain']
    : category.includes('植物')
    ? ['qokedy', 'chedy', 'ol', 'qokeedy', 'ykar', 'shol']
    : category.includes('薬')
    ? ['qokain', 'dain', 'otol', 'shedy', 'qokedy', 'ar']
    : ['qokedy', 'shedy', 'olchedy', 'qokeedy', 'dain', 'ykar']

  const density = stats ? Math.max(3, Math.min(8, Math.round(stats.edgeDensity * 14))) : 5
  const lines: string[] = []
  for (let i = 0; i < 4; i++) {
    const words = []
    for (let j = 0; j < density; j++) {
      words.push(base[(i + j + Math.floor((stats?.brightness ?? 90) / 30)) % base.length])
    }
    lines.push(words.join(' '))
  }
  return lines.join('\n')
}

function makeRules(freq: Record<string, number>, category: string, notes: string): Rule[] {
  const meanings = meaningBank[category] ?? meaningBank['不明ページ']
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([token, count], index) => {
      const confidence = Math.min(86, 38 + count * 8 + (notes.length > 12 ? 6 : 0) + (category !== '不明ページ' ? 7 : 0) - index * 2)
      return {
        token,
        meaning: meanings[index % meanings.length],
        confidence,
        reason: `${token} は ${count} 回出現。ページ分類「${category}」と画像メモから、${meanings[index % meanings.length]} の候補として扱う。`,
      }
    })
}

function verifyRules(tokens: string[], rules: Rule[], category: string, previousPages: PageRecord[]) {
  if (!rules.length) return { score: 0, text: 'ルールがまだありません。EVAテキストを入れて解析してください。' }
  const tokenSet = new Set(tokens)
  const matched = rules.filter(rule => tokenSet.has(rule.token))
  const base = Math.round((matched.length / rules.length) * 100)
  const sameCategoryPages = previousPages.filter(p => p.category === category)
  const categoryBonus = sameCategoryPages.length ? 8 : 0
  const score = Math.min(94, base + categoryBonus)
  const text = matched.length
    ? `生成ルール ${rules.length} 個中 ${matched.length} 個がこのページで再出現。別ページでも同じ語が同じ分類で出るかを見ることで、仮説の再現性を検証できます。`
    : '生成したルールがこのページでは再出現していません。仮説として弱い可能性があります。'
  return { score, text }
}

function comparePages(current: PageRecord | null, pages: PageRecord[]) {
  if (!current || !pages.length) return []
  const currentSet = new Set(current.tokens)
  return pages
    .filter(p => p.id !== current.id)
    .map(page => {
      const shared = page.tokens.filter(t => currentSet.has(t))
      const uniqueShared = Array.from(new Set(shared))
      const similarity = Math.round((uniqueShared.length / Math.max(1, new Set([...current.tokens, ...page.tokens]).size)) * 100)
      return { page, shared: uniqueShared, similarity }
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5)
}

export default function Home() {
  const [imageUrl, setImageUrl] = useState('')
  const [imageSrc, setImageSrc] = useState('')
  const [category, setCategory] = useState(categories[0])
  const [notes, setNotes] = useState('植物のような図、根、葉、円形ラベル')
  const [eva, setEva] = useState(sampleEva)
  const [imageStats, setImageStats] = useState<ImageStats | null>(null)
  const [pages, setPages] = useState<PageRecord[]>([])
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('voynich-pages')
    if (saved) setPages(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem('voynich-pages', JSON.stringify(pages))
  }, [pages])

  const tokens = useMemo(() => tokenize(eva), [eva])
  const freq = useMemo(() => frequency(tokens), [tokens])
  const rules = useMemo(() => makeRules(freq, category, notes), [freq, category, notes])

  const current: PageRecord = useMemo(() => ({
    id: 'current',
    category,
    notes,
    eva,
    tokens,
    freq,
    imageStats,
    rules,
    createdAt: new Date().toISOString(),
  }), [category, notes, eva, tokens, freq, imageStats, rules])

  const verification = useMemo(() => verifyRules(tokens, rules, category, pages), [tokens, rules, category, pages])
  const comparisons = useMemo(() => comparePages(current, pages), [current, pages])

  function handleUrl() {
    if (!imageUrl.trim()) return
    setImageSrc(imageUrl.trim())
  }

  function handleFile(file: File | null) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImageSrc(String(reader.result))
    reader.readAsDataURL(file)
  }

  function analyzeImage(img: HTMLImageElement) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = 240
    canvas.width = size
    canvas.height = size
    ctx.drawImage(img, 0, 0, size, size)
    const data = ctx.getImageData(0, 0, size, size).data

    let total = 0
    let totalSq = 0
    let warmInk = 0
    let edge = 0

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
      total += lum
      totalSq += lum * lum
      if (r > g && g > b && lum < 190) warmInk++
      if (i > 4) {
        const prev = 0.2126 * data[i - 4] + 0.7152 * data[i - 3] + 0.0722 * data[i - 2]
        if (Math.abs(lum - prev) > 38) edge++
      }
    }

    const pixels = data.length / 4
    const brightness = total / pixels
    const variance = totalSq / pixels - brightness * brightness
    const contrast = Math.sqrt(Math.max(0, variance))
    const warmInkRatio = warmInk / pixels
    const edgeDensity = edge / pixels

    let estimatedType = '不明ページ'
    if (edgeDensity > 0.16 && warmInkRatio > 0.08) estimatedType = '植物・薬草ページ'
    if (contrast > 62 && edgeDensity > 0.12) estimatedType = '星図・暦ページ'
    if (warmInkRatio > 0.14 && contrast < 58) estimatedType = '薬学・容器ページ'

    setImageStats({
      brightness: Math.round(brightness),
      contrast: Math.round(contrast),
      warmInkRatio: Number(warmInkRatio.toFixed(3)),
      edgeDensity: Number(edgeDensity.toFixed(3)),
      estimatedType,
    })
  }

  function autoEva() {
    setEva(generateEvaLike(imageStats, category))
  }

  function savePage() {
    const record: PageRecord = {
      ...current,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    setPages(prev => [record, ...prev].slice(0, 20))
  }

  function clearPages() {
    setPages([])
  }

  const topFreq = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10)

  return (
    <main>
      <section className="hero">
        <div>
          <div className="kicker">VOYNICH DECIPHER LAB</div>
          <h1>未解読文書を、検証できる仮説にする。</h1>
          <p className="lead">
            OpenAI APIなし・無料で動くブラウザ解析版です。画像アップロード、簡易画像解析、EVA風変換、
            単語頻度、他ページ比較、翻訳ルール生成、仮説検証、別ページ再現テストを行います。
          </p>
        </div>
        <div className="badge">無料 / APIキー不要 / Vercel対応</div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>1. 手稿画像</h2>
          <label>画像アップロード</label>
          <input type="file" accept="image/*" onChange={e => handleFile(e.target.files?.[0] ?? null)} />

          <label>または画像URL</label>
          <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Yaleなどの画像URL" />
          <button onClick={handleUrl}>URL画像を表示</button>

          <div className="preview">
            {imageSrc ? (
              <img src={imageSrc} alt="manuscript" onLoad={e => analyzeImage(e.currentTarget)} />
            ) : (
              <span>ここに手稿画像が表示されます。</span>
            )}
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <div className="result">
            <h3>2. AI風 画像解析</h3>
            {imageStats ? (
              <div className="small">
                明度: {imageStats.brightness} / コントラスト: {imageStats.contrast}<br />
                インク比率: {imageStats.warmInkRatio} / 線密度: {imageStats.edgeDensity}<br />
                推定ページ: <b>{imageStats.estimatedType}</b>
              </div>
            ) : <p className="small">画像を入れるとブラウザ内で解析します。</p>}
          </div>
        </div>

        <div className="card">
          <h2>3. EVA変換・単語頻度</h2>
          <label>ページ分類</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>

          <label>画像メモ</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} />

          <label>EVAテキスト</label>
          <textarea value={eva} onChange={e => setEva(e.target.value)} />

          <button onClick={autoEva}>画像特徴からEVA風テキストを作る</button>
          <button onClick={savePage}>このページを保存して比較対象にする</button>

          <div className="columns">
            <div>
              <h3>頻出トークン</h3>
              <table className="table">
                <tbody>
                  {topFreq.map(([token, count]) => (
                    <tr key={token}><td>{token}</td><td>{count}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h3>保存ページ</h3>
              <p className="score">{pages.length}</p>
              <button onClick={clearPages}>保存ページを消す</button>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>4〜8. ルール生成・検証・再現</h2>
          <p className="small">仮説再現スコア</p>
          <div className="score">{verification.score}%</div>
          <p className="small">{verification.text}</p>

          <div className="result">
            <h3>翻訳ルール候補</h3>
            {rules.map(rule => (
              <div key={rule.token} className="token">
                {rule.token} → {rule.meaning} / {rule.confidence}%
              </div>
            ))}
          </div>

          <div className="result">
            <h3>仮説翻訳</h3>
            <p>
              このページは「{category}」として読み、頻出語{' '}
              {topFreq.slice(0, 4).map(([t]) => t).join(' / ')} を中心に、
              {rules[0]?.meaning ?? 'section marker'} と {rules[1]?.meaning ?? 'context token'} の関係を持つ記録という仮説で検証します。
            </p>
          </div>

          <div className="result">
            <h3>5. 他ページ比較</h3>
            {comparisons.length ? comparisons.map(item => (
              <div key={item.page.id} className="small" style={{ marginBottom: 12 }}>
                類似度 {item.similarity}% / {item.page.category}<br />
                共通語: {item.shared.slice(0, 8).join(', ') || 'なし'}
              </div>
            )) : <p className="small">保存ページがあると比較できます。1ページ保存 → 別ページを解析してください。</p>}
          </div>
        </div>
      </section>

      <div className="notice">
        重要：これは確定翻訳ではありません。ヴォイニッチ手稿は未解読です。
        このアプリは、同じルールが別ページでも再現できるかを検証するための無料ブラウザ研究ツールです。
      </div>
    </main>
  )
}
