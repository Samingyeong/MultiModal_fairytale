import React, { useState } from 'react'
import './WordGallery.css'

const WORDS = Array.from({ length: 20 }, (_, i) => {
  const id = 1501 + i
  return { id: `WORD${id}`, src: `/signs/NIA_SL_WORD${id}_REAL01_F.mp4`, label: '' }
})

export default function WordGallery() {
  const [labels, setLabels] = useState(() => {
    const saved = localStorage.getItem('wordLabels')
    return saved ? JSON.parse(saved) : {}
  })
  const [editing, setEditing] = useState(null)
  const [input, setInput] = useState('')

  const saveLabel = (id) => {
    const next = { ...labels, [id]: input }
    setLabels(next)
    localStorage.setItem('wordLabels', JSON.stringify(next))
    setEditing(null)
    setInput('')
  }

  return (
    <div className="gallery-page">
      <h2>단어 확인 갤러리</h2>
      <p className="desc">영상을 보고 어떤 단어인지 입력해두세요. 입력한 단어는 번역 기능에서 바로 사용할 수 있어요.</p>
      <div className="grid">
        {WORDS.map(({ id, src }) => (
          <div key={id} className="card">
            <video src={src} controls width="200" />
            <div className="card-label">
              {editing === id ? (
                <div className="edit-row">
                  <input
                    autoFocus
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveLabel(id)}
                    placeholder="단어 입력"
                  />
                  <button onClick={() => saveLabel(id)}>저장</button>
                </div>
              ) : (
                <div className="label-row" onClick={() => { setEditing(id); setInput(labels[id] || '') }}>
                  {labels[id]
                    ? <span className="labeled">{labels[id]}</span>
                    : <span className="unlabeled">클릭해서 단어 입력</span>
                  }
                </div>
              )}
              <span className="word-id">{id}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
