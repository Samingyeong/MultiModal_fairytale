const LANGS = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'ch', label: '中文' },
  { code: 'th', label: 'ภาษาไทย' },
  { code: 'mo', label: 'Монгол' },
]

const params = new URLSearchParams(location.search)
const thumbnail = decodeURIComponent(params.get('thumb') || '')
const title     = decodeURIComponent(params.get('title') || '')
const storyUrl  = decodeURIComponent(params.get('url') || '')
let currentLang = 'ko'
let cues = []
let currentMode = 'book'

document.getElementById('bookTitle').textContent = title
document.getElementById('backBtn').addEventListener('click', () => history.back())

function proxy(u) { return `/proxy?url=${encodeURIComponent(u)}` }
function getVideoUrl(lang) { return proxy(thumbnail.replace('.png', `_${lang}.mp4`)) }
function getVttUrl(lang)   { return proxy(thumbnail.replace('.png', `_${lang}.vtt`)) }

// 조사/어미 제거 (빠른 규칙 기반)
function extractBase(word) {
  const josa = ['을','를','이','가','은','는','도','의','에서','에게','한테','에','로','으로','와','과','랑','이랑','하고','부터','까지','만','조차','마저']
  for (const j of josa.sort((a,b) => b.length - a.length)) {
    if (word.endsWith(j) && word.length > j.length + 1)
      return word.slice(0, word.length - j.length)
  }
  const endings = ['았어요','었어요','겠어요','았습니다','었습니다','아요','어요','아서','어서','았다','었다','겠다','는다','고','며','면','지만','는데','은데','아','어','게','니','자','습니다','ㅂ니다','하는','해서','해도','했다','했어','하고']
  for (const e of endings.sort((a,b) => b.length - a.length)) {
    if (word.endsWith(e) && word.length > e.length + 1)
      return word.slice(0, word.length - e.length) + '다'
  }
  return word
}

// 사전 캐시
const dictCache = new Map()

async function lookupDict(word) {
  const base = extractBase(word)
  const candidates = [...new Set([base, word])]
  for (const q of candidates) {
    if (dictCache.has(q)) return dictCache.get(q)
    try {
      const res = await fetch(`/dict?q=${encodeURIComponent(q)}`)
      const items = await res.json()
      if (items.length) {
        dictCache.set(q, items)
        return items
      }
    } catch {}
  }
  return []
}

// 언어 버튼
const langBar = document.getElementById('langBar')
LANGS.forEach(l => {
  const btn = document.createElement('button')
  btn.className = `lang-btn ${l.code === 'ko' ? 'active' : ''}`
  btn.textContent = l.label
  btn.addEventListener('click', () => {
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    currentLang = l.code
    loadVideo(l.code, currentMode === 'watch' ? 'watchVideoWrap' : 'videoWrap')
    if (currentMode === 'book') loadSubtitles(l.code)
  })
  langBar.appendChild(btn)
})

// 모드 탭
document.querySelectorAll('.mode-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'))
    tab.classList.add('active')
    currentMode = tab.dataset.mode
    if (currentMode === 'book') {
      document.getElementById('bookMode').classList.remove('hidden')
      document.getElementById('watchMode').classList.add('hidden')
      loadVideo(currentLang, 'videoWrap')
      loadSubtitles(currentLang)
    } else {
      document.getElementById('bookMode').classList.add('hidden')
      document.getElementById('watchMode').classList.remove('hidden')
      loadVideo(currentLang, 'watchVideoWrap')
    }
  })
})

function loadVideo(lang, containerId) {
  const wrap = document.getElementById(containerId)
  if (!wrap) return
  wrap.innerHTML = `
    <video id="mainVideo_${containerId}" controls width="100%"
      style="border-radius:10px;background:#000"
      src="${getVideoUrl(lang)}"
      poster="${proxy(thumbnail)}"
      oncontextmenu="return false">
      <track kind="subtitles" srclang="${lang}" src="${getVttUrl(lang)}" default>
    </video>
  `
  const video = document.getElementById(`mainVideo_${containerId}`)
  if (containerId === 'videoWrap') {
    video?.addEventListener('timeupdate', syncSubtitle)
  }
  // 영상 로드 실패 시 원본 사이트 링크로 대체
  video?.addEventListener('error', () => {
    wrap.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
        min-height:200px;background:#1a1a2e;border-radius:10px;color:white;gap:12px;padding:24px;text-align:center">
        <img src="${proxy(thumbnail)}" style="width:120px;border-radius:8px" onerror="this.style.display='none'">
        <p style="font-size:14px;color:#aaa">이 동화의 영상은 원본 서버에서 제공되지 않아요.</p>
        ${storyUrl ? `<a href="${storyUrl}" target="_blank"
          style="padding:8px 20px;background:#e94560;color:white;border-radius:8px;text-decoration:none;font-size:14px">
          🔗 원본 사이트에서 보기</a>` : ''}
      </div>
    `
  })
}

// VTT 파싱
function parseVtt(text) {
  const lines = text.replace(/\r/g, '').split('\n')
  const result = []
  let i = 0
  while (i < lines.length) {
    if (lines[i].includes('-->')) {
      const [s, e] = lines[i].split('-->')
      const start = timeToSec(s.trim()), end = timeToSec(e.trim())
      const textLines = []
      i++
      while (i < lines.length && lines[i].trim()) { textLines.push(lines[i]); i++ }
      if (textLines.length) result.push({ start, end, text: textLines.join(' ') })
    }
    i++
  }
  return result
}

function timeToSec(t) {
  const p = t.split(':')
  return p.length === 3 ? +p[0]*3600 + +p[1]*60 + parseFloat(p[2]) : +p[0]*60 + parseFloat(p[1])
}
function secToTime(s) {
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`
}

async function loadSubtitles(lang) {
  const list = document.getElementById('subtitleList')
  list.innerHTML = '<p class="loading-msg">자막을 불러오는 중...</p>'
  try {
    const res = await fetch(getVttUrl(lang))
    if (!res.ok) throw new Error()
    cues = parseVtt(await res.text())
    renderSubtitles()
  } catch {
    list.innerHTML = '<p class="loading-msg">이 언어의 자막이 없어요.</p>'
    cues = []
  }
}

function renderSubtitles() {
  const list = document.getElementById('subtitleList')
  list.innerHTML = ''
  cues.forEach((cue, idx) => {
    const div = document.createElement('div')
    div.className = 'subtitle-cue'
    div.dataset.idx = idx
    const wordSpans = cue.text.split(/(\s+)/).map(w =>
      w.trim() ? `<span class="word" data-word="${w.trim()}">${w}</span>` : w
    ).join('')
    div.innerHTML = `<div class="time">${secToTime(cue.start)}</div><div class="text">${wordSpans}</div>`
    div.querySelector('.time').addEventListener('click', () => {
      const v = document.getElementById('mainVideo_videoWrap')
      if (v) v.currentTime = cue.start
    })
    div.querySelectorAll('.word').forEach(span => {
      span.addEventListener('click', () => openWordPanel(span.dataset.word))
    })
    list.appendChild(div)
  })
}

function syncSubtitle() {
  const v = document.getElementById('mainVideo_videoWrap')
  if (!v || !cues.length) return
  const t = v.currentTime
  document.querySelectorAll('.subtitle-cue').forEach((el, idx) => {
    const cue = cues[idx]
    const active = t >= cue.start && t <= cue.end
    el.classList.toggle('active', active)
    if (active) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}

// 단어 패널
async function openWordPanel(word) {
  const panel = document.getElementById('wordPanel')
  const content = document.getElementById('wordPanelContent')
  panel.classList.remove('hidden')
  content.innerHTML = `<div class="dict-word">${word}</div><p style="color:#aaa;font-size:13px;margin-top:8px">검색 중...</p>`
  drawGuide(word)

  const items = await lookupDict(word)
  if (!items.length) {
    content.innerHTML = `<div class="dict-word">${word}</div><p style="color:#aaa;font-size:13px;margin-top:8px">사전에서 찾을 수 없어요.</p>`
    return
  }
  const base = extractBase(word)
  const exact = items.find(i => i.word === word) || items.find(i => i.word === base) || items[0]
  content.innerHTML = `
    <div class="dict-word">${exact.word}
      <span class="dict-grade grade-${exact.grade}">${exact.grade || ''}</span>
    </div>
    <div class="dict-meta">${exact.pos || ''}</div>
    <hr class="dict-divider">
    ${exact.definitions.map((d, i) => `
      <div class="dict-def">
        <div class="dict-def-num">${i + 1}</div>
        <div class="dict-def-text">${d}</div>
      </div>`).join('')}
  `
}

document.getElementById('wordPanelClose').addEventListener('click', () => {
  document.getElementById('wordPanel').classList.add('hidden')
})

function drawGuide(word) {
  const ctx = document.getElementById('guideCanvas').getContext('2d')
  ctx.clearRect(0, 0, 360, 100)
  ctx.font = 'bold 60px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#333'
  ctx.fillText(word.length > 5 ? word.slice(0,5)+'…' : word, 180, 50)
  document.getElementById('inputCanvas').getContext('2d').clearRect(0, 0, 360, 100)
  initDrawing()
}

function initDrawing() {
  const canvas = document.getElementById('inputCanvas')
  const ctx = canvas.getContext('2d')
  let drawing = false
  canvas.onpointerdown = e => {
    drawing = true; ctx.beginPath()
    const r = canvas.getBoundingClientRect()
    ctx.moveTo(e.clientX - r.left, e.clientY - r.top)
  }
  canvas.onpointermove = e => {
    if (!drawing) return
    const r = canvas.getBoundingClientRect()
    ctx.lineTo(e.clientX - r.left, e.clientY - r.top)
    ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke()
  }
  canvas.onpointerup = () => { drawing = false }
}

document.getElementById('clearBtn').addEventListener('click', () => {
  document.getElementById('inputCanvas').getContext('2d').clearRect(0, 0, 360, 100)
})

// 초기 로드
loadVideo('ko', 'videoWrap')
loadSubtitles('ko')
