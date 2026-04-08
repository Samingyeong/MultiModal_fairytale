// 단어 → 수어 영상 경로 매핑
// 갤러리(/gallery)에서 단어를 입력하면 localStorage에 저장됩니다
// 아래는 기본 ID 매핑 (갤러리에서 단어 입력 후 자동으로 사용됩니다)

const BASE_MAP = {
  'WORD1501': '/signs/NIA_SL_WORD1501_REAL01_F.mp4',
  'WORD1502': '/signs/NIA_SL_WORD1502_REAL01_F.mp4',
  'WORD1503': '/signs/NIA_SL_WORD1503_REAL01_F.mp4',
  'WORD1504': '/signs/NIA_SL_WORD1504_REAL01_F.mp4',
  'WORD1505': '/signs/NIA_SL_WORD1505_REAL01_F.mp4',
  'WORD1506': '/signs/NIA_SL_WORD1506_REAL01_F.mp4',
  'WORD1507': '/signs/NIA_SL_WORD1507_REAL01_F.mp4',
  'WORD1508': '/signs/NIA_SL_WORD1508_REAL01_F.mp4',
  'WORD1509': '/signs/NIA_SL_WORD1509_REAL01_F.mp4',
  'WORD1510': '/signs/NIA_SL_WORD1510_REAL01_F.mp4',
  'WORD1511': '/signs/NIA_SL_WORD1511_REAL01_F.mp4',
  'WORD1512': '/signs/NIA_SL_WORD1512_REAL01_F.mp4',
  'WORD1513': '/signs/NIA_SL_WORD1513_REAL01_F.mp4',
  'WORD1514': '/signs/NIA_SL_WORD1514_REAL01_F.mp4',
  'WORD1515': '/signs/NIA_SL_WORD1515_REAL01_F.mp4',
  'WORD1516': '/signs/NIA_SL_WORD1516_REAL01_F.mp4',
  'WORD1517': '/signs/NIA_SL_WORD1517_REAL01_F.mp4',
  'WORD1518': '/signs/NIA_SL_WORD1518_REAL01_F.mp4',
  'WORD1519': '/signs/NIA_SL_WORD1519_REAL01_F.mp4',
  'WORD1520': '/signs/NIA_SL_WORD1520_REAL01_F.mp4',
}

// 갤러리에서 입력한 단어명으로 역매핑 생성 (예: '안녕' → '/signs/...')
const buildSignMap = () => {
  const labels = JSON.parse(localStorage.getItem('wordLabels') || '{}')
  const map = { ...BASE_MAP }
  Object.entries(labels).forEach(([wordId, label]) => {
    if (label && BASE_MAP[wordId]) {
      map[label] = BASE_MAP[wordId]
    }
  })
  return map
}

export const getSignMap = () => buildSignMap()
