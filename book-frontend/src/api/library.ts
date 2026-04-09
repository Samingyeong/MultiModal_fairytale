import type { Book } from '../types'

const BASE = 'http://localhost:4000'

// ─── 백엔드 응답 → Book 타입 변환 ────────────────────────────
function toBook(row: Record<string, string>): Book {
  // thumbnail: 원본 nlcy URL (DB에 항상 저장됨)
  // local_img: 로컬 캐시 경로 (있으면 이미지 표시에 사용)
  const displayThumb = row.local_img
    ? `http://localhost:4000${row.local_img}`
    : row.thumbnail ? `/proxy?url=${encodeURIComponent(row.thumbnail)}` : ''

  return {
    title:       row.title       || '',
    description: row.description || '',
    thumbnail:   displayThumb,
    url:         row.url         || '',
    creator:     row.creator     || '',
    regDate:     row.reg_date    || '',
    language:    '',
    collectionDb: row.collection || '',
    storyType:   (row.story_type as Book['storyType']) || 'creative',
    source:      (row.source     as Book['source'])    || 'multilang',
    // 원본 nlcy URL 보존 (영상/VTT 경로 계산용)
    nlcyThumb:   row.thumbnail   || '',
  }
}

// ─── 공개 API ────────────────────────────────────────────────
export async function fetchBooks(
  keyword: string,
  _source: 'multilang' | 'kpicture' | 'all' = 'all',
  storyTypeFilter?: Book['storyType'],
  page = 1,
  limit = 20
): Promise<{ items: Book[]; total: number }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (keyword)         params.set('q',    keyword)
  if (storyTypeFilter) params.set('type', storyTypeFilter)

  const res  = await fetch(`${BASE}/api/books?${params}`)
  const data = await res.json()
  return {
    total: data.total,
    items: (data.items as Record<string, string>[]).map(toBook),
  }
}

export async function fetchNewBooks(limit = 20): Promise<Book[]> {
  const res  = await fetch(`${BASE}/api/books/new?limit=${limit}`)
  const data = await res.json()
  return (data.items as Record<string, string>[]).map(toBook)
}

// ─── URL 헬퍼 ─────────────────────────────────────────────────
export function proxy(url: string) {
  if (!url) return ''
  // 이미 로컬 URL이면 그대로
  if (url.startsWith('http://localhost') || url.startsWith('/')) return url
  return `/proxy?url=${encodeURIComponent(url)}`
}
export function getProxiedThumb(thumbnail: string) { return thumbnail }

export function getVideoUrl(thumbnail: string, lang = 'ko') {
  if (!thumbnail) return ''
  // thumbnail이 로컬 이미지 경로면 → 원본 URL에서 mp4 경로 추출 불가
  // thumbnail이 nlcy URL이면 → 프록시 경유
  const base = thumbnail.startsWith('http://localhost')
    ? '' // 로컬 이미지는 영상 URL 없음 (원본 URL 필요)
    : thumbnail
  if (!base) return ''
  return `/proxy?url=${encodeURIComponent(base.replace('.png', `_${lang}.mp4`))}`
}

export function getVttUrl(thumbnail: string, lang = 'ko') {
  if (!thumbnail) return ''
  const base = thumbnail.startsWith('http://localhost') ? '' : thumbnail
  if (!base) return ''
  return `/proxy?url=${encodeURIComponent(base.replace('.png', `_${lang}.vtt`))}`
}

// ─── 형태소 분석 ─────────────────────────────────────────────
export interface MorphToken { form: string; tag: string }
export interface MorphResult { text: string; keywords: (MorphToken & { start: number; len: number })[]; count: number }

export async function analyzeWord(word: string): Promise<MorphToken[]> {
  const res = await fetch(`${BASE}/api/morpheme?mode=word&q=${encodeURIComponent(word)}`)
  return res.json()
}

export async function analyzeSentence(text: string): Promise<MorphResult> {
  const res = await fetch(`${BASE}/api/morpheme?mode=sentence&q=${encodeURIComponent(text)}`)
  return res.json()
}

// ─── 한국어사전 ───────────────────────────────────────────────
export interface DictItem { word: string; pos: string; grade: string; definitions: string[] }

export function extractBase(word: string): string {
  const josa = ['을','를','이','가','은','는','도','의','에서','에게','한테','에','로','으로','와','과','랑','이랑','하고','부터','까지','만','조차','마저']
  for (const j of [...josa].sort((a, b) => b.length - a.length))
    if (word.endsWith(j) && word.length > j.length + 1) return word.slice(0, -j.length)
  const endings = ['았어요','었어요','겠어요','았습니다','었습니다','아요','어요','아서','어서','았다','었다','겠다','는다','고','며','면','지만','는데','은데','아','어','게','니','자','습니다','ㅂ니다','하는','해서','해도','했다','했어','하고']
  for (const e of [...endings].sort((a, b) => b.length - a.length))
    if (word.endsWith(e) && word.length > e.length + 1) return word.slice(0, -e.length) + '다'
  return word
}

const dictCache = new Map<string, DictItem[]>()
export async function lookupDict(word: string): Promise<DictItem[]> {
  const base = extractBase(word)
  for (const q of [...new Set([base, word])]) {
    if (dictCache.has(q)) return dictCache.get(q)!
    try {
      const res   = await fetch(`${BASE}/dict?q=${encodeURIComponent(q)}`)
      const items: DictItem[] = await res.json()
      if (items.length) { dictCache.set(q, items); return items }
    } catch {}
  }
  return []
}
