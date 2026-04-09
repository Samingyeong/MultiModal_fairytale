import { useNavigate } from 'react-router-dom'

interface Props { title: string }

export default function Placeholder({ title }: Props) {
  const navigate = useNavigate()
  return (
    <div style={{ textAlign: 'center', padding: '120px 32px' }}>
      <h2 style={{ fontSize: 32, color: '#FFB256', marginBottom: 16 }}>{title}</h2>
      <p style={{ color: '#aaa', marginBottom: 32 }}>준비 중입니다.</p>
      <button
        onClick={() => navigate('/')}
        style={{ padding: '10px 28px', background: '#FFB256', color: '#fff',
          border: 'none', borderRadius: 24, fontSize: 16, cursor: 'pointer' }}
      >
        홈으로
      </button>
    </div>
  )
}
