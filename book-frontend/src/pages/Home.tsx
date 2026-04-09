import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../constants/categories'
import { fetchBooks } from '../api/library'
import type { Book } from '../types'
import './Home.css'

const DAYS = ['일','월','화','수','목','금','토']
const _today = new Date()
const todayDay = DAYS[_today.getDay()]
const todayDate = `${_today.getMonth()+1}/${_today.getDate()}`
// 오늘 기준 앞 3개, 뒤 3개 — 순환
const todayIdx = _today.getDay()
const prevDays = [-3, -2, -1].map(offset => DAYS[(todayIdx + offset + 7) % 7])
const nextDays  = [1, 2, 3].map(offset => DAYS[(todayIdx + offset) % 7])

const STUDY_CARDS = [
  {
    id: 'today',
    label: '오늘의 학습',
    border: '#FF8B8B',
    labelBg: '#FF8B8B',
    path: '/study/today',
    layers: [
      { src: '/svg/today_monkey.svg', cls: 'layer-monkey' },
    ],
  },
  {
    id: 'quiz',
    label: '퀴즈 연습',
    border: '#75D069',
    labelBg: '#75D069',
    path: '/study/quiz',
    layers: [
      { src: '/svg/quiz_x.svg',      cls: 'layer-quiz-x' },
      { src: '/svg/quix_o.svg',      cls: 'layer-quiz-o' },
      { src: '/svg/quiz_q.svg',      cls: 'layer-quiz-q' },
      { src: '/svg/quiz_monkey.svg', cls: 'layer-monkey' },
    ],
  },
  {
    id: 'word',
    label: '단어 공부',
    border: '#1FA7E1',
    labelBg: '#1FA7E1',
    path: '/study/word',
    layers: [
      { src: '/svg/word_apple.svg',    cls: 'layer-word-apple' },
      { src: '/svg/word_homework.svg', cls: 'layer-word-hw' },
      { src: '/svg/word_monkey.svg',   cls: 'layer-monkey' },
    ],
  },
  {
    id: 'sentence',
    label: '문장 공부',
    border: '#FFB256',
    labelBg: '#FFB256',
    path: '/study/sentence',
    layers: [
      { src: '/svg/i like_rectangle.svg',   cls: 'layer-sent-r1' },
      { src: '/svg/나는 사과가 좋아요.svg',  cls: 'layer-sent-t1' },
      { src: '/svg/hello-rectangle.svg',    cls: 'layer-sent-r2' },
      { src: '/svg/친구에게 인사해요.svg',   cls: 'layer-sent-t2' },
      { src: '/svg/sentence_monkey.svg',    cls: 'layer-monkey' },
    ],
  },
]

const BOOK_SVGS: Record<string, string> = {
  all: '/svg/book_all.svg',
}
const BOOK_SVG_LIST = [
  '/svg/book-red.svg',
  '/svg/book-purple.svg',
  '/svg/book-green.svg',
  '/svg/book-yellow.svg',
  '/svg/book-mint.svg',
  '/svg/book-violet.svg',
  '/svg/book-blue.svg',
]

const FEATURED_TITLES = ['암탉과 누렁이']

export default function Home() {
  const navigate = useNavigate()
  const sliderRef = useRef<HTMLDivElement>(null)
  const [featured, setFeatured] = useState<Book | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchVal, setSearchVal] = useState('')

  useEffect(() => {
    fetchBooks('암탉과 누렁이', 'all', 'korean', 1, 10).then(({ items }) => {
      const found = items.find(b => FEATURED_TITLES.some(t => b.title.includes(t)))
      if (found) setFeatured(found)
    }).catch(() => {})
  }, [])

  function scrollSlider(dir: number) {
    sliderRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' })
  }

  return (
    <div className="home">
      {/* 배경 장식 */}
      <div className="home-bg-left" />
      <div className="home-bg-right" />
      <img src="/svg/Union.svg"   alt="" className="home-deco home-deco-tl" />
      <img src="/svg/Union-2.svg" alt="" className="home-deco home-deco-br" />
      <img src="/svg/Union-1.svg" alt="" className="home-deco home-deco-tr" />

      <div className="home-body">
        {/* 날짜 바 */}
        <div className="home-datebar-row">
          <div className={`home-calendar ${searchOpen ? 'collapsed' : ''}`}>
            <button className="cal-arrow">‹</button>
            <div className="cal-days-group">
              {prevDays.map(d => <span key={d} className="cal-day-item">{d}</span>)}
            </div>
            <div className="cal-today-pill">
              <span className="cal-date">{todayDate}</span>
              <span className="cal-today-day">{todayDay}</span>
            </div>
            <div className="cal-days-group">
              {nextDays.map(d => <span key={d} className="cal-day-item">{d}</span>)}
            </div>
            <button className="cal-arrow">›</button>
          </div>
          <div className={`home-searchbar-wrap ${searchOpen ? 'open' : ''}`}>
            <form onSubmit={e => { e.preventDefault(); if (searchVal.trim()) navigate(`/books?q=${encodeURIComponent(searchVal.trim())}`) }}>
              <input
                autoFocus={searchOpen}
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                placeholder="검색어를 입력하세요"
              />
            </form>
          </div>
          <button className="datebar-icon-btn"><img src="/svg/calender.svg" alt="달력" /></button>
          <button className="datebar-icon-btn" onClick={() => { setSearchOpen(v => !v); setSearchVal('') }}>
            <img src="/svg/home_search.svg" alt="검색" />
          </button>
        </div>
        {/* 카테고리 슬라이더 */}
        <div className="cat-slider-wrap">
          <button className="cat-arrow cat-arrow-left" onClick={() => scrollSlider(-1)}>‹</button>
          <div className="cat-slider" ref={sliderRef}>
            {CATEGORIES.map((cat, i) => (
              <div
                key={cat.id}
                className="cat-book"
                onClick={() => navigate(`/books?category=${cat.id}`)}
              >
                <img
                  src={BOOK_SVGS[cat.id] ?? BOOK_SVG_LIST[i % BOOK_SVG_LIST.length]}
                  alt={cat.label}
                  className="cat-book-svg"
                />
                <span className="cat-label">{cat.label}</span>
              </div>
            ))}
          </div>
          <button className="cat-arrow cat-arrow-right" onClick={() => scrollSlider(1)}>›</button>
        </div>

        {/* 메인 패널 */}
        <div className="home-panels">
          {/* 왼쪽: 추천 동화 */}
          <div className="panel panel-featured">
            {/* Best seller 별 */}
            <div className="best-badge">
              <img src="/svg/best.svg" alt="Best seller" className="best-badge-img" />
            </div>

            {/* 큰 책 UI + 동그란 썸네일 오버레이 */}
            <div className="featured-book-wrap">
              <img src="/svg/book-red.svg" alt="book" className="featured-book-svg" />
              <div className="featured-thumb-circle">
                {featured?.thumbnail
                  ? <img src={featured.thumbnail} alt={featured.title} className="featured-thumb-img" />
                  : <span className="featured-thumb-placeholder">📖</span>
                }
              </div>
              <div className="featured-book-title-overlay">{featured?.title ?? '암탉과 누렁이'}</div>
            </div>

            {/* 설명 */}
            <div className="featured-info">
              <h3 className="featured-title">{featured?.title ?? '암탉과 누렁이'}</h3>
              <p className="featured-desc">
                {featured?.description ?? '로딩 중...'}
              </p>
              <button className="featured-btn" onClick={() => {
                if (featured) {
                  const p = new URLSearchParams({
                    thumb:     featured.thumbnail,
                    nlcyThumb: featured.nlcyThumb || featured.thumbnail,
                    title:     featured.title,
                    desc:      featured.description,
                    url:       featured.url,
                  })
                  navigate(`/reader?${p}`)
                } else {
                  navigate('/books?category=korean')
                }
              }}>
                읽으러 가기 →
              </button>
            </div>
          </div>

          {/* 오른쪽: 학습 카드 2×2 */}
          <div className="panel panel-study">
            <div className="study-grid">
              {STUDY_CARDS.map(card => (
                <div
                  key={card.label}
                  className={`study-card ${card.id}`}
                  style={{ border: `3px solid ${card.border}` }}
                  onClick={() => navigate(card.path)}
                >
                  <div className="study-card-scene">
                    {card.layers.map((layer, i) => (
                      <img
                        key={i}
                        src={layer.src}
                        alt=""
                        className={`study-layer ${layer.cls}`}
                      />
                    ))}
                  </div>
                  <div className="study-label-bar" style={{ background: card.labelBg }}>
                    {card.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
