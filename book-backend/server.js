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

const app  = express()
const PORT = 4000
const NLP_SCRIPT = path.join(__dirname, 'korean_nlp.py')

// ─── Python korean_nlp.py 호출 헬퍼 ──────────────────────────
function runNlp(mode, text) {
  return new Promise((resolve, reject) => {
    const py = spawn('python', [NLP_SCRIPT, mode, text], {
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    })
    let out = '', err = ''
    py.stdout.on('data', d => out += d.toString())
    py.stderr.on('data', d => err += d.toString())
    py.on('close', code => {
      if (code !== 0) return reject(new Error(err || `exit ${code}`))
      try { resolve(JSON.parse(out.trim())) }
      catch { reject(new Error('JSON parse error: ' + out)) }
    })
    py.on('error', reject)
    setTimeout(() => { py.kill(); reject(new Error('timeout')) }, 15000)
  })
}

app.use(cors())
app.use(express.json())

// ─── 정적 이미지 서빙 ─────────────────────────────────────────
app.use('/images', express.static(IMG_DIR, { maxAge: '7d', etag: true }))

// ─── 책 목록 API ──────────────────────────────────────────────
app.get('/api/books', (req, res) => {
  const { type, q, page = '1', limit = '20' } = req.query
  const offset = (parseInt(page) - 1) * parseInt(limit)
  const lim    = parseInt(limit)
  let rows, total

  if (q) {
    const like = `%${q}%`
    if (type && type !== 'all') {
      rows  = db.prepare(`SELECT * FROM books WHERE story_type=? AND (title LIKE ? OR creator LIKE ?) ORDER BY reg_date DESC LIMIT ? OFFSET ?`).all(type, like, like, lim, offset)
      total = db.prepare(`SELECT COUNT(*) as c FROM books WHERE story_type=? AND (title LIKE ? OR creator LIKE ?)`).get(type, like, like).c
    } else {
      rows  = db.prepare(`SELECT * FROM books WHERE title LIKE ? OR creator LIKE ? ORDER BY reg_date DESC LIMIT ? OFFSET ?`).all(like, like, lim, offset)
      total = db.prepare(`SELECT COUNT(*) as c FROM books WHERE title LIKE ? OR creator LIKE ?`).get(like, like).c
    }
  } else if (type && type !== 'all') {
    rows  = db.prepare(`SELECT * FROM books WHERE story_type=? ORDER BY reg_date DESC LIMIT ? OFFSET ?`).all(type, lim, offset)
    total = db.prepare(`SELECT COUNT(*) as c FROM books WHERE story_type=?`).get(type).c
  } else {
    rows  = db.prepare(`SELECT * FROM books ORDER BY reg_date DESC LIMIT ? OFFSET ?`).all(lim, offset)
    total = db.prepare(`SELECT COUNT(*) as c FROM books`).get().c
  }

  res.json({ total, page: parseInt(page), limit: lim, items: rows })
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
  https.get(target, { headers }, r => {
    res.writeHead(r.statusCode, {
      'Content-Type':   'video/mp4',
      'Content-Length': r.headers['content-length'] || '',
      'Content-Range':  r.headers['content-range']  || '',
      'Accept-Ranges':  'bytes',
    })
    r.pipe(res)
  }).on('error', e => res.status(502).send(e.message))
})

// ─── 형태소 분석 (korean_nlp.py) ─────────────────────────────
// GET /api/morpheme?mode=word&q=살았어
// GET /api/morpheme?mode=sentence&q=어느 시골집에 암탉이 살았어
app.get('/api/morpheme', async (req, res) => {
  const { mode = 'sentence', q } = req.query
  if (!q) return res.status(400).json({ error: 'q is required' })
  try {
    const result = await runNlp(mode, q)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─── 한국어사전 ───────────────────────────────────────────────
const KRDICT_KEY = process.env.KRDICT_API_KEY || '7C7752C49997907B4BDCB176729D802B'
const dictCache  = new Map()

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
