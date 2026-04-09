require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const https   = require('https')
const path    = require('path')
const cron    = require('node-cron')
const { spawn } = require('child_process')
const { db, IMG_DIR }        = require('./db')
const { syncBooks }          = require('./sync')
const { downloadAllImages }  = require('./images')
const { extractKeywords, getBaseForm } = require('./groq_nlp')

const app  = express()
const PORT = 4000

// ─── 사전 결과 서버 캐시 ──────────────────────────────────────
const nlpCache  = new Map()
const dictCache = new Map()

app.use(cors())
app.use(express.json())

// ─── 정적 이미지 서빙 ─────────────────────────────────────────
app.use('/images', express.static(IMG_DIR, { maxAge: '7d', etag: true }))

// ─── 책 목록 API ──────────────────────────────────────────────
app.get('/api/books', (req, res) => {
  const { type, q, year, page = '1', limit = '20' } = req.query
  const offset = (parseInt(page) - 1) * parseInt(limit)
  const lim    = parseInt(limit)

  // 조건 조합
  const conditions = []
  const params = []

  if (type && type !== 'all') { conditions.push('story_type=?'); params.push(type) }
  if (year)                   { conditions.push("substr(reg_date,1,4)=?"); params.push(year) }
  if (q)                      { conditions.push('(title LIKE ? OR creator LIKE ?)'); params.push(`%${q}%`, `%${q}%`) }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows  = db.prepare(`SELECT * FROM books ${where} ORDER BY reg_date DESC LIMIT ? OFFSET ?`).all(...params, lim, offset)
  const total = db.prepare(`SELECT COUNT(*) as c FROM books ${where}`).get(...params).c

  res.json({ total, page: parseInt(page), limit: lim, items: rows })
})

app.get('/api/books/years', (req, res) => {
  const rows = db.prepare(`SELECT DISTINCT substr(reg_date,1,4) as year, COUNT(*) as cnt FROM books GROUP BY year ORDER BY year DESC`).all()
  res.json(rows)
})

app.get('/api/books/new', (req, res) => {
  const limit = parseInt(req.query.limit || '20')
  const rows  = db.prepare(`SELECT * FROM books ORDER BY reg_date DESC LIMIT ?`).all(limit)
  res.json({ items: rows })
})

app.get('/api/books/stats', (req, res) => {
  const counts = db.prepare(`SELECT story_type, COUNT(*) as cnt FROM books GROUP BY story_type`).all()
  const total  = db.prepare(`SELECT COUNT(*) as cnt FROM books`).get()
  const last   = db.prepare(`SELECT * FROM sync_log ORDER BY id DESC LIMIT 1`).get()
  res.json({ total: total.cnt, byType: counts, lastSync: last })
})

// ─── 프록시 (영상/VTT) ────────────────────────────────────────
const NLCY_HEADERS = {
  'Referer':    'https://www.nlcy.go.kr/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Origin':     'https://www.nlcy.go.kr',
}
const vttCache = new Map()

app.get('/proxy', (req, res) => {
  const target = req.query.url
  if (!target || !target.startsWith('https://www.nlcy.go.kr/')) {
    return res.status(400).send('Invalid URL')
  }
  const ext = target.split('?')[0].split('.').pop()

  if (ext === 'vtt') {
    if (vttCache.has(target)) {
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8')
      return res.send(vttCache.get(target))
    }
    const chunks = []
    https.get(target, { headers: NLCY_HEADERS }, r => {
      r.on('data', c => chunks.push(c))
      r.on('end', () => {
        const buf = Buffer.concat(chunks)
        if (r.statusCode === 200) vttCache.set(target, buf)
        res.setHeader('Content-Type', 'text/vtt; charset=utf-8')
        res.send(buf)
      })
    }).on('error', e => res.status(502).send(e.message))
    return
  }

  // MP4 스트리밍
  const headers = { ...NLCY_HEADERS }
  if (req.headers.range) headers['Range'] = req.headers.range
  const proxyReq = https.get(target, { headers }, r => {
    if (!res.headersSent) {
      res.writeHead(r.statusCode, {
        'Content-Type':   'video/mp4',
        'Content-Length': r.headers['content-length'] || '',
        'Content-Range':  r.headers['content-range']  || '',
        'Accept-Ranges':  'bytes',
      })
    }
    r.pipe(res)
    r.on('error', () => { if (!res.headersSent) res.status(502).end() })
  })
  proxyReq.on('error', e => { if (!res.headersSent) res.status(502).send(e.message) })
  // 클라이언트가 연결 끊으면 upstream도 중단
  req.on('close', () => proxyReq.destroy())
})

// ─── 형태소 분석 (korean_nlp.py 상주 프로세스) ───────────────
app.get('/api/morpheme', async (req, res) => {
  const { mode = 'sentence', q } = req.query
  if (!q) return res.status(400).json({ error: 'q is required' })
  const cacheKey = `${mode}:${q}`
  if (nlpCache.has(cacheKey)) return res.json(nlpCache.get(cacheKey))
  try {
    const result = await runNlp(mode, q)
    nlpCache.set(cacheKey, result)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 자막 전체 일괄 분석 (책 열 때 한번에 처리)
app.post('/api/morpheme/batch', async (req, res) => {
  const { sentences } = req.body  // string[]
  if (!Array.isArray(sentences)) return res.status(400).json({ error: 'sentences required' })
  try {
    const results = await Promise.all(
      sentences.map(async s => {
        const key = `sentence:${s}`
        if (nlpCache.has(key)) return { sentence: s, ...nlpCache.get(key) }
        const r = await runNlp('sentence', s)
        nlpCache.set(key, r)
        return { sentence: s, ...r }
      })
    )
    res.json(results)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─── 단어 학습 API ────────────────────────────────────────────
// POST /api/words  { word, base_form, pos, definition, known, from_book }
app.post('/api/words', (req, res) => {
  const { word, base_form, pos, definition, known = 0, from_book = '' } = req.body
  if (!base_form) return res.status(400).json({ error: 'base_form required' })
  db.prepare(`
    INSERT INTO word_study (word, base_form, pos, definition, known, from_book)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(base_form) DO UPDATE SET
      known = excluded.known,
      definition = excluded.definition
  `).run(word || base_form, base_form, pos || '', definition || '', known, from_book)
  res.json({ ok: true })
})

// GET /api/words?known=0|1|all
app.get('/api/words', (req, res) => {
  const { known } = req.query
  let rows
  if (known === '0')      rows = db.prepare(`SELECT * FROM word_study WHERE known=0 ORDER BY created_at DESC`).all()
  else if (known === '1') rows = db.prepare(`SELECT * FROM word_study WHERE known=1 ORDER BY created_at DESC`).all()
  else                    rows = db.prepare(`SELECT * FROM word_study ORDER BY created_at DESC`).all()
  res.json(rows)
})

// PATCH /api/words/:id  { known }
app.patch('/api/words/:id', (req, res) => {
  const { known } = req.body
  db.prepare(`UPDATE word_study SET known=? WHERE id=?`).run(known, req.params.id)
  res.json({ ok: true })
})

// DELETE /api/words/:id
app.delete('/api/words/:id', (req, res) => {
  db.prepare(`DELETE FROM word_study WHERE id=?`).run(req.params.id)
  res.json({ ok: true })
})

// ─── 한국어사전 (캐시 포함) ───────────────────────────────────
const KRDICT_KEY = process.env.KRDICT_API_KEY

app.get('/dict', async (req, res) => {
  const q = req.query.q
  if (!q) return res.json([])
  if (dictCache.has(q)) return res.json(dictCache.get(q))
  try {
    const data = await new Promise((resolve, reject) => {
      const chunks = []
      https.get(`https://krdict.korean.go.kr/api/search?key=${KRDICT_KEY}&q=${encodeURIComponent(q)}&type_search=search&part=word`, r => {
        r.on('data', c => chunks.push(c))
        r.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      }).on('error', reject)
    })
    const items = []
    const matches = data.match(/<item>[\s\S]*?<\/item>/g) || []
    matches.forEach(item => {
      const word  = (item.match(/<word>([^<]+)<\/word>/)             || [])[1] || ''
      const pos   = (item.match(/<pos>([^<]+)<\/pos>/)               || [])[1] || ''
      const grade = (item.match(/<word_grade>([^<]+)<\/word_grade>/) || [])[1] || ''
      const defs  = [...item.matchAll(/<definition>([^<]+)<\/definition>/g)].map(m => m[1])
      items.push({ word, pos, grade, definitions: defs })
    })
    dictCache.set(q, items)
    res.json(items)
  } catch { res.json([]) }
})

// ─── Python NLP 프로세스 ──────────────────────────────────────
const NLP_SCRIPT = path.join(__dirname, 'korean_nlp.py')

function runNlp(mode, text) {
  return new Promise((resolve, reject) => {
    const py = spawn('python', [NLP_SCRIPT, mode, text], {
      timeout: 10000,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
    })
    const chunks = []
    py.stdout.setEncoding('utf8')
    py.stdout.on('data', d => chunks.push(d))
    py.stderr.on('data', d => console.error('[nlp stderr]', d.toString()))
    py.on('close', code => {
      try {
        resolve(JSON.parse(chunks.join('')))
      } catch (e) {
        reject(new Error('NLP parse error'))
      }
    })
    py.on('error', reject)
  })
}

function startPython() {
  // python 실행 가능 여부 확인 (상주 프로세스 없이 per-request spawn 방식)
  const py = spawn('python', ['--version'])
  py.on('error', () => console.warn('[nlp] python을 찾을 수 없습니다. 형태소 분석 기능이 비활성화됩니다.'))
  py.on('close', code => {
    if (code === 0) console.log('[nlp] Python 사용 가능 — 형태소 분석 준비 완료')
  })
}

// ─── 수동 동기화 ──────────────────────────────────────────────
app.post('/admin/sync', async (req, res) => {
  try {
    const count = await syncBooks()
    await downloadAllImages()
    res.json({ ok: true, count })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ─── 서버 시작 ────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`📚 book-backend 실행 중: http://localhost:${PORT}`)
  startPython()  // Python 상주 프로세스 시작

  const cnt = db.prepare(`SELECT COUNT(*) as c FROM books`).get().c
  if (cnt === 0) {
    console.log('[init] DB 비어있음 → 최초 동기화 시작...')
    try { await syncBooks(); await downloadAllImages() }
    catch (e) { console.error('[init] 동기화 실패:', e.message) }
  } else {
    console.log(`[init] DB에 ${cnt}개 책 로드됨`)
    downloadAllImages().catch(() => {})
  }

  cron.schedule('0 3 * * *', async () => {
    console.log('[cron] 자동 동기화 시작...')
    await syncBooks().catch(console.error)
    await downloadAllImages().catch(console.error)
  })
})
