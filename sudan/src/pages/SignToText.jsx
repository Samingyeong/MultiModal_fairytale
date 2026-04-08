import React, { useRef, useState, useEffect } from 'react'
import './SignToText.css'

export default function SignToText() {
  const videoRef = useRef(null)
  const [streaming, setStreaming] = useState(false)
  const [result, setResult] = useState('')
  const [status, setStatus] = useState('카메라를 시작하면 수어를 인식해요.')

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      videoRef.current.srcObject = stream
      setStreaming(true)
      setStatus('카메라 실행 중... (AI 모델 연동 후 인식 시작)')
    } catch (e) {
      setStatus('카메라 접근 권한이 필요해요.')
    }
  }

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject
    stream?.getTracks().forEach(t => t.stop())
    videoRef.current.srcObject = null
    setStreaming(false)
    setStatus('카메라를 시작하면 수어를 인식해요.')
  }

  useEffect(() => {
    return () => stopCamera()
  }, [])

  return (
    <div className="page">
      <h2>수어 → 텍스트</h2>
      <p className="desc">웹캠으로 수어를 보여주면 텍스트로 변환해요.</p>

      <div className="camera-area">
        <video ref={videoRef} autoPlay playsInline muted className={streaming ? '' : 'hidden'} />
        {!streaming && <div className="cam-placeholder">📷 카메라 대기 중</div>}
      </div>

      <div className="controls">
        {!streaming
          ? <button onClick={startCamera}>카메라 시작</button>
          : <button className="stop" onClick={stopCamera}>카메라 중지</button>
        }
      </div>

      <div className="status">{status}</div>

      {result && (
        <div className="result-box">
          <strong>인식 결과:</strong> {result}
        </div>
      )}

      <div className="notice">
        ⚠️ AI Hub 데이터셋으로 모델 학습 후 실제 인식 기능이 활성화돼요.<br />
        현재는 카메라 스트리밍만 동작해요.
      </div>
    </div>
  )
}
