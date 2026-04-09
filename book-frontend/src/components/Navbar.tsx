import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import './Navbar.css'

const NAV_ITEMS = [
  { label: '동화학습', path: '/books' },
  { label: '내 오답노트', path: '/notes' },
  { label: '학부모케어', path: '/parent' },
]

// 오늘 날짜 기반 요일 표시
const DAYS = ['일','월','화','수','목','금','토']
const today = new Date()
const todayDay = DAYS[today.getDay()]
const todayDate = `${today.getMonth()+1}/${today.getDate()}`
const prevDays = DAYS.slice(0, today.getDay()).slice(-3)
const nextDays = DAYS.slice(today.getDay()+1).slice(0, 3)

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (search.trim()) navigate(`/books?q=${encodeURIComponent(search.trim())}`)
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* 로고 */}
        <Link to="/" className="navbar-logo">홈화면</Link>

        {/* 메뉴 */}
        <div className="navbar-menu">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`navbar-link ${pathname.startsWith(item.path) ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* 날짜 캘린더 */}
        <div className="navbar-calendar">
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

        {/* 검색 */}
        <form className="navbar-search" onSubmit={handleSearch}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="검색어를 입력하세요"
          />
          <button type="submit" className="search-btn">🔍</button>
        </form>

        {/* 유저 */}
        <div className="navbar-user">
          <div className="user-info">
            <span className="user-name">사민경</span>
            <span className="user-type">어린이</span>
          </div>
          <div className="user-avatar">
            <div className="avatar-circle" />
          </div>
        </div>
      </div>
    </nav>
  )
}
