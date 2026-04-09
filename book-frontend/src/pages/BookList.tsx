import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import BookCard from '../components/BookCard'
import { fetchBooks, fetchNewBooks } from '../api/library'
import { CATEGORIES } from '../constants/categories'
import type { Book, CategoryId } from '../types'
import './BookList.css'

const PAGE_SIZE = 20

export default function BookList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const categoryParam = (searchParams.get('category') || 'all') as CategoryId
  const qParam = searchParams.get('q') || ''

  const [books, setBooks]   = useState<Book[]>([])
  const [total, setTotal]   = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage]     = useState(1)
  const [inputVal, setInputVal] = useState(qParam)
  const [search, setSearch] = useState(qParam)

  const currentCat = CATEGORIES.find(c => c.id === categoryParam) || CATEGORIES[0]

  const load = useCallback(async (p: number) => {
    setLoading(true)
    try {
      if (categoryParam === 'new' && !search) {
        const items = await fetchNewBooks(20)
        setBooks(items)
        setTotal(items.length)
      } else {
        const { items, total } = await fetchBooks(
          search,
          currentCat.source,
          currentCat.storyType,
          p,
          PAGE_SIZE
        )
        setBooks(items)
        setTotal(total)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [search, categoryParam, currentCat.source, currentCat.storyType])

  useEffect(() => {
    setPage(1)
    load(1)
  }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function handleSearch() {
    setSearch(inputVal.trim())
    setPage(1)
  }

  function handleCategory(id: CategoryId) {
    setSearchParams({ category: id })
    setSearch('')
    setInputVal('')
    setPage(1)
  }

  function handlePage(p: number) {
    setPage(p)
    load(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openBook(book: Book) {
    const p = new URLSearchParams({
      thumb:     book.thumbnail,
      nlcyThumb: book.nlcyThumb || book.thumbnail,
      title:     book.title,
      desc:      book.description,
      url:       book.url,
    })
    navigate(`/reader?${p}`)
  }

  return (
    <div className="booklist">
      <div className="booklist-header">
        <div className="booklist-search">
          <input
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="책 제목, 저자 검색..."
          />
          <button onClick={handleSearch}>검색</button>
        </div>
        <div className="booklist-tabs">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`booklist-tab ${cat.id === categoryParam ? 'active' : ''}`}
              style={cat.id === categoryParam ? { background: cat.color } : {}}
              onClick={() => handleCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 결과 수 */}
      {!loading && total > 0 && (
        <p className="booklist-count">총 {total}권</p>
      )}

      {loading ? (
        <div className="booklist-loading">불러오는 중...</div>
      ) : books.length === 0 ? (
        <div className="booklist-empty">검색 결과가 없어요.</div>
      ) : (
        <div className="booklist-grid">
          {books.map((book, i) => (
            <BookCard key={i} book={book} onClick={() => openBook(book)} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="booklist-pagination">
          {page > 1 && <button className="page-btn" onClick={() => handlePage(page - 1)}>‹</button>}
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
            const start = Math.max(1, page - 4)
            const p = start + i
            if (p > totalPages) return null
            return (
              <button
                key={p}
                className={`page-btn ${p === page ? 'active' : ''}`}
                onClick={() => handlePage(p)}
              >
                {p}
              </button>
            )
          })}
          {page < totalPages && <button className="page-btn" onClick={() => handlePage(page + 1)}>›</button>}
        </div>
      )}
    </div>
  )
}
