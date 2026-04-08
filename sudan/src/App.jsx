import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import TextToSign from './pages/TextToSign'
import SignToText from './pages/SignToText'
import WordGallery from './pages/WordGallery'
import './App.css'

export default function App() {
  return (
    <div className="app">
      <nav className="nav">
        <span className="logo">🤚 수담</span>
        <Link to="/">텍스트 → 수어</Link>
        <Link to="/sign-to-text">수어 → 텍스트</Link>
        <Link to="/gallery">단어 갤러리</Link>
      </nav>
      <Routes>
        <Route path="/" element={<TextToSign />} />
        <Route path="/sign-to-text" element={<SignToText />} />
        <Route path="/gallery" element={<WordGallery />} />
      </Routes>
    </div>
  )
}
