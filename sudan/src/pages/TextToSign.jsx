import React, { useState, useRef } from 'react'
import { getSignMap } from '../data/signMap'
import './TextToSign.css'

export default function TextToSign() {
  const [text, setText] = useState('')
  const [queue, setQueue] = useState([])
  const [currentIdx, setCurrentIdx] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef(null)

  const tokenize = (input) => {
    const signMap = getSignMap()
    return input.trim().split(/\s+/).filter(w => signMap[w])
  }

  const handleTranslate = () => {
    const tokens = tokenize(text)
    if (tokens.length === 0) {
      alert('매핑된 단어가 없어요. 갤러리에서 단어를 먼저 입력해주세요.')
      return
    }
    setQueue(tokens)
    setCurrentIdx(0)
    setPlaying(true)
  }

  const handleVideoEnd = () => {
    const next = currentIdx + 1
    if (next < queue.length) {
      setCurrentIdx(next)
    } else {
      setPlaying(false)
      setCurrentIdx(-1)
    }
  }

  React.useEffect(() => {
    if (currentIdx >= 0 && videoRef.current) {
      videoRef.current.load()
      videoRef.current.play()
    }
  }, [currentIdx])

  const currentWord = currentIdx >= 0 ? queue[currentIdx] : null
  const currentSrc = currentWord ? getSignMap()[currentWord] : null
  const availableWords = Object.keys(getSignMap()).filter(k => !k.startsWith('WORD'))

  return (
    <div className="page">
      <h2>텍스트 → 수어 영상</h2>
      <p className="desc">문장을 입력하면 단어별 수어 영상을 순서대로 재생해요.</p>

      <div className="input-area">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={availableWords.length > 0 ? `예: ${availableWords.slice(0,3).join(' ')}` : '갤러리에서 단어를 먼저 입력해주세요'}
          rows={3}
        />
        <button onClick={handleTranslate}>번역하기</button>
      </div>

      {queue.length > 0 && (
        <div className="word-queue">
          {queue.map((w, i) => (
            <span key={i} className={`word-chip ${i === currentIdx ? 'active' : i < currentIdx ? 'done' : ''}`}>
              {w}
            </span>
          ))}
        </div>
      )}

      <div className="video-area">
        {currentSrc ? (
          <video ref={videoRef} onEnded={handleVideoEnd} width={400} controls>
            <source src={currentSrc} type="video/mp4" />
          </video>
        ) : (
          <div className="placeholder">
            {playing ? '재생 완료' : '번역 결과가 여기에 표시돼요'}
          </div>
        )}
      </div>

      <div className="available-words">
        {availableWords.length > 0
          ? <><strong>사용 가능한 단어:</strong> {availableWords.join(', ')}</>
          : <><strong>⚠️ 갤러리에서 단어를 입력하면 여기서 사용할 수 있어요.</strong></>
        }
      </div>
    </div>
  )
}
