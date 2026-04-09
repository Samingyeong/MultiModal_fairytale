import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../constants/categories'
import { fetchBooks } from '../api/library'
import type { Book } from '../types'
import './Home.css'

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

const BOOK_SVGS = [
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

      <div className="home-body">
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
                  src={BOOK_SVGS[i % BOOK_SVGS.length]}
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

            {/* 큰 책 일러스트 */}
            <div className="featured-book-wrap">
              {featured?.thumbnail ? (
                <img src={featured.thumbnail} alt={featured.title} className="featured-book-img" />
              ) : (
                <img src="/svg/book-red.svg" alt="featured book" className="featured-book-svg" />
              )}
              {/* 책 제목 오버레이 */}
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
