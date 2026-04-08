const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')
const url = require('url')

const PORT = 3000
const vttCache = new Map()

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.mp4':  'video/mp4',
  '.vtt':  'text/vtt',
}

const PROXY_HEADERS = {
  'Referer': 'https://www.nlcy.go.kr/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Origin': 'https://www.nlcy.go.kr',
}

function fetchRemote(targetUrl, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(targetUrl, { headers }, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }))
    })
    req.on('error', reject)
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true)
  const pathname = parsed.pathname

  // /dict?q=단어
  if (pathname === '/dict') {
    const q = parsed.query.q
    if (!q) { res.writeHead(400); res.end('[]'); return }
    try {
      const dictUrl = `https://krdict.korean.go.kr/api/search?key=${process.env.KRDICT_API_KEY || 'YOUR_KRDICT_API_KEY'}&q=${encodeURIComponent(q)}&type_search=search&part=word`
      const { body } = await fetchRemote(dictUrl)
      const data = body.toString('utf8')
      const items = []
      const matches = data.match(/<item>[\s\S]*?<\/item>/g) || []
      matches.forEach(item => {
        const word  = (item.match(/<word>([^<]+)<\/word>/) || [])[1] || ''
        const pos   = (item.match(/<pos>([^<]+)<\/pos>/) || [])[1] || ''
        const grade = (item.match(/<word_grade>([^<]+)<\/word_grade>/) || [])[1] || ''
        const defs  = [...item.matchAll(/<definition>([^<]+)<\/definition>/g)].map(m => m[1])
        items.push({ word, pos, grade, definitions: defs })
      })
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' })
      res.end(JSON.stringify(items))
    } catch (e) { res.writeHead(200); res.end('[]') }
    return
  }

  // /proxy?url=...
  if (pathname === '/proxy') {
    const target = parsed.query.url
    if (!target || !target.startsWith('https://www.nlcy.go.kr/')) {
      res.writeHead(400); res.end('Invalid URL'); return
    }

    const ext = path.extname(target.split('?')[0])

    // VTT: 캐시
    if (ext === '.vtt') {
      if (vttCache.has(target)) {
        res.writeHead(200, { 'Content-Type': 'text/vtt; charset=utf-8', 'Access-Control-Allow-Origin': '*' })
        res.end(vttCache.get(target))
        return
      }
      try {
        const { status, body } = await fetchRemote(target, PROXY_HEADERS)
        if (status === 200) vttCache.set(target, body)
        res.writeHead(status, { 'Content-Type': 'text/vtt; charset=utf-8', 'Access-Control-Allow-Origin': '*' })
        res.end(body)
      } catch (e) { res.writeHead(502); res.end(e.message) }
      return
    }

    // MP4: 스트리밍
    const headers = { ...PROXY_HEADERS }
    if (req.headers.range) headers['Range'] = req.headers.range
    https.get(target, { headers }, proxyRes => {
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': MIME[ext] || 'video/mp4',
        'Content-Length': proxyRes.headers['content-length'] || '',
        'Content-Range': proxyRes.headers['content-range'] || '',
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
      })
      proxyRes.pipe(res)
    }).on('error', e => { res.writeHead(502); res.end(e.message) })
    return
  }

  // 정적 파일
  const filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname)
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404); res.end('Not found'); return }
    const ext = path.extname(filePath)
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' })
    fs.createReadStream(filePath).pipe(res)
  })
})

server.listen(PORT, () => console.log(`서버 실행 중: http://localhost:${PORT}`))
