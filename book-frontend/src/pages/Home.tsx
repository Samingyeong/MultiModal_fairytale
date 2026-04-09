import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../constants/categories'
import './Home.css'

const STUDY_CARDS = [
  { label: '오늘의 학습', bg: '#FF8B8B', emoji: '📚', path: '/study/today' },
  { label: '퀴즈 연습',   bg: '#75D069', emoji: '❓', path: '/study/quiz' },
  { label: '단어 공부',   bg: '#1FA7E1', emoji: '🔤', path: '/study/word' },
  { label: '문장 공부',   bg: '#FFB256', emoji: '✏️', path: '/study/sentence' },
]

const BOOK_COLORS = [
  { cover: '#F16F6F', spine: '#CE5656', bottom: '#AB4444' },
  { cover: '#7E65DA', spine: '#6049B0', bottom: '#483587' },
  { cover: '#8BBE71', spine: '#6F922D', bottom: '#516C1E' },
  { cover: '#EEB654', spine: '#D6853E', bottom: '#BA6418' },
  { cover: '#A4EAEA', spine: '#7BBEBE', bottom: '#4D8888' },
  { cover: '#B387E2', spine: '#8659B6', bottom: '#5B2C8E' },
  { cover: '#7191E7', spine: '#4868BD', bottom: '#29458F' },
]

export default function Home() {
  const navigate = useNavigate()
  const sliderRef = useRef<HTMLDivElement>(null)

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
            {CATEGORIES.map((cat, i) => {
              const c = BOOK_COLORS[i % BOOK_COLORS.length]
              return (
                <div
                  key={cat.id}
                  className="cat-book"
                  onClick={() => navigate(`/books?category=${cat.id}`)}
                >
                  <div className="cat-book-3d" style={{ '--cover': c.cover, '--spine': c.spine, '--bottom': c.bottom } as React.CSSProperties}>
                    <div className="book-spine-side" />
                    <div className="book-front" />
                    <div className="book-bottom-strip" />
                    <div className="book-page-strip" />
                    <div className="book-bookmark" />
                  </div>
                  <span className="cat-label">{cat.label}</span>
                </div>
              )
            })}
          </div>
          <button className="cat-arrow cat-arrow-right" onClick={() => scrollSlider(1)}>›</button>
        </div>

        {/* 메인 패널 */}
        <div className="home-panels">
          {/* 왼쪽: 추천 동화 */}
          <div className="panel panel-featured">
            {/* Best seller 별 */}
            <div className="best-badge">
              <div className="best-star">
                <span>Best</span>
                <span>seller</span>
              </div>
            </div>

            {/* 큰 책 일러스트 */}
            <div className="featured-book-wrap">
              <div className="featured-book-3d">
                <div className="fb-spine" />
                <div className="fb-cover" />
                <div className="fb-bottom" />
                <div className="fb-pages" />
                <div className="fb-bookmark" />
              </div>
              {/* 책 제목 오버레이 */}
              <div className="featured-book-title-overlay">선녀와 나무꾼</div>
            </div>

            {/* 설명 */}
            <div className="featured-info">
              <h3 className="featured-title">선녀와 나무꾼</h3>
              <p className="featured-desc">
                아주 옛날 한 마을에 나무꾼이 홀어머니를 모시고 살고 있었습니다.
                어느 날 나무꾼이 부지런히 나무를 베고 있었는데, 사냥꾼에게 쫓기던
                사슴 한 마리가 달려와서는 살려 달라고 애원했습니다. 나무꾼은 쌓아 놓은
                나뭇더미 속에 사슴을 숨겨서 사냥꾼으로부터 구해 주었는데...
              </p>
              <button className="featured-btn" onClick={() => navigate('/books?category=korean')}>
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
                  className="study-card"
                  style={{ background: card.bg }}
                  onClick={() => navigate(card.path)}
                >
                  <div className="study-card-top">
                    <span className="study-emoji">{card.emoji}</span>
                  </div>
                  <span className="study-label">{card.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
