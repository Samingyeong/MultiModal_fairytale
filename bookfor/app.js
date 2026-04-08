const SERVICE_KEY = process.env.CULTURE_API_KEY || 'YOUR_CULTURE_API_KEY'
const API_URL = 'https://api.kcisa.kr/openapi/service/rest/meta14/getNLCF031801'

let allItems = [] // 전체 중복제거된 목록
let currentPage = 1
let currentKeyword = ''
const PAGE_SIZE = 10

async function fetchAllStories(keyword) {
  const firstRes = await fetchStories(keyword, 1, 100)
  let items = firstRes.items
  const total = firstRes.total

  if (total > 100) {
    const secondRes = await fetchStories(keyword, 2, 100)
    items = items.concat(secondRes.items)
  }

  // 썸네일 URL의 연도 기준으로 최신순 정렬 (2025 > 2012 > 2011 > 2010)
  items.sort((a, b) => {
    const yearA = parseInt((a.thumbnail.match(/\/(\d{4})\//) || [0, 0])[1])
    const yearB = parseInt((b.thumbnail.match(/\/(\d{4})\//) || [0, 0])[1])
    return yearB - yearA
  })

  // 중복 제거 (thumbnail 기준, 최신 것만 남김 - 이미 최신순 정렬됐으므로 첫 번째가 최신)
  const seen = new Set()
  return items.filter(item => {
    const key = item.thumbnail || item.title
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function fetchStories(keyword, page, numOfRows = PAGE_SIZE) {
  const params = new URLSearchParams({
    serviceKey: SERVICE_KEY,
    numOfRows: numOfRows,
    pageNo: page,
  })
  if (keyword) params.append('keyword', keyword)

  const res = await fetch(`${API_URL}?${params}`)
  const text = await res.text()

  // XML 파싱
  const parser = new DOMParser()
  const xml = parser.parseFromString(text, 'text/xml')

  const items = [...xml.querySelectorAll('item')].map(item => ({
    title:       item.querySelector('title')?.textContent || '',
    description: item.querySelector('description')?.textContent || '',
    thumbnail:   item.querySelector('referenceIdentifier')?.textContent || '',
    url:         item.querySelector('url')?.textContent || '',
    creator:     item.querySelector('creator')?.textContent || '',
    regDate:     item.querySelector('regDate')?.textContent?.slice(0, 10) || '',
    language:    item.querySelector('language')?.textContent || '',
  }))

  const total = parseInt(xml.querySelector('totalCount')?.textContent || '0')
  return { items, total }
}

function renderBooks(items) {
  const grid = document.getElementById('bookList')
  grid.innerHTML = ''

  if (items.length === 0) {
    document.getElementById('noResult').classList.remove('hidden')
    return
  }
  document.getElementById('noResult').classList.add('hidden')

  items.forEach(item => {
    const card = document.createElement('div')
    card.className = 'book-card'
    card.innerHTML = `
      <div class="book-cover ${item.thumbnail ? '' : 'no-img'}">
        ${item.thumbnail
          ? `<img src="${proxy(item.thumbnail)}" alt="${item.title}" onerror="this.parentElement.classList.add('no-img');this.remove();this.parentElement.innerHTML='📖'">`
          : '📖'}
      </div>
      <div class="book-info">
        <div class="book-title">${item.title}</div>
        <div class="book-author">${item.creator || '국립어린이청소년도서관'}</div>
        <div class="book-badges">
          <span class="badge badge-normal">한국전래동화</span>
          ${item.regDate ? `<span class="badge" style="background:#f5f5f5;color:#666">${item.regDate}</span>` : ''}
        </div>
      </div>
    `
    card.addEventListener('click', () => {
      const p = new URLSearchParams({
        thumb: item.thumbnail,
        title: item.title,
        desc: item.description,
        url: item.url,
      })
      location.href = `reader.html?${p}`
    })
    grid.appendChild(card)
  })
}

function proxy(targetUrl) {
  if (!targetUrl) return ''
  return `/proxy?url=${encodeURIComponent(targetUrl)}`
}

function getVideoUrl(thumbnail, lang = 'ko') {
  if (!thumbnail) return null
  return proxy(thumbnail.replace('.png', `_${lang}.mp4`))
}

function getVttUrl(thumbnail, lang = 'ko') {
  if (!thumbnail) return null
  return proxy(thumbnail.replace('.png', `_${lang}.vtt`))
}

const LANGS = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'ch', label: '中文' },
  { code: 'th', label: 'ภาษาไทย' },
  { code: 'mo', label: 'Монгол' },
]

function buildVideoHtml(thumbnail, lang) {
  const videoSrc = getVideoUrl(thumbnail, lang)
  const thumbSrc = thumbnail ? proxy(thumbnail) : ''
  const trackTags = LANGS.map(l =>
    `<track label="${l.label}" kind="subtitles" srclang="${l.code}" src="${getVttUrl(thumbnail, l.code)}" ${l.code === lang ? 'default' : ''}>`
  ).join('')
  return `
    <video id="storyVideo" controls width="100%"
      style="border-radius:10px;background:#000;margin-bottom:12px"
      src="${videoSrc}" poster="${thumbSrc}"
      oncontextmenu="return false">
      ${trackTags}
    </video>
  `
}

function openModal(item) {
  const modal = document.getElementById('modal')
  const body = document.getElementById('modalBody')

  const langButtons = LANGS.map(l =>
    `<button class="lang-btn ${l.code === 'ko' ? 'active' : ''}" data-lang="${l.code}">${l.label}</button>`
  ).join('')

  body.innerHTML = `
    <h2 style="margin-bottom:8px">${item.title}</h2>
    <p style="font-size:13px;color:#888;margin-bottom:12px">✍️ ${item.creator || '국립어린이청소년도서관'} · ${item.regDate}</p>
    <div class="lang-bar">${langButtons}</div>
    <div id="videoWrap">${buildVideoHtml(item.thumbnail, 'ko')}</div>
    <div style="padding:14px;background:#f8f9fa;border-radius:8px;line-height:1.8;font-size:14px;color:#444">
      ${item.description || '줄거리 정보가 없어요.'}
    </div>
  `

  body.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      body.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      const lang = btn.dataset.lang
      // video 태그 통째로 교체해야 track이 제대로 적용됨
      document.getElementById('videoWrap').innerHTML = buildVideoHtml(item.thumbnail, lang)
    })
  })

  modal.classList.remove('hidden')
}

function renderPagination(total, page) {
  const totalPages = Math.min(Math.ceil(total / PAGE_SIZE), 20)
  const pag = document.getElementById('pagination')
  pag.innerHTML = ''
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button')
    btn.className = `page-btn ${i === page ? 'active' : ''}`
    btn.textContent = i
    btn.addEventListener('click', () => { currentPage = i; loadBooks() })
    pag.appendChild(btn)
  }
}

async function loadBooks() {
  const loading = document.getElementById('loading')
  document.getElementById('bookList').innerHTML = ''
  document.getElementById('noResult').classList.add('hidden')
  loading.classList.remove('hidden')

  try {
    if (currentPage === 1) {
      allItems = await fetchAllStories(currentKeyword)
    }
    loading.classList.add('hidden')

    const start = (currentPage - 1) * PAGE_SIZE
    const pageItems = allItems.slice(start, start + PAGE_SIZE)
    renderBooks(pageItems)
    renderPagination(allItems.length, currentPage)
  } catch (e) {
    loading.classList.add('hidden')
    document.getElementById('noResult').classList.remove('hidden')
    console.error(e)
  }
}

// 이벤트
document.getElementById('searchBtn').addEventListener('click', () => {
  currentKeyword = document.getElementById('searchInput').value.trim()
  currentPage = 1
  allItems = []
  loadBooks()
})
document.getElementById('searchInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('searchBtn').click()
})
document.getElementById('modalClose').addEventListener('click', () => {
  document.getElementById('modal').classList.add('hidden')
})
document.getElementById('modal').addEventListener('click', e => {
  if (e.target === document.getElementById('modal'))
    document.getElementById('modal').classList.add('hidden')
})

// 카테고리 탭 숨기기 (단일 데이터소스)
document.querySelector('.category-tabs').style.display = 'none'

loadBooks()
