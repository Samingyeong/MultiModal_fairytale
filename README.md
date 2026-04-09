# 멀티모달 동화 학습 플랫폼

장애아동을 포함한 모든 아이들이 동화로 한국어를 배울 수 있는 AI 기반 학습 서비스입니다.
영상·자막·단어 사전·수어·필기 따라쓰기를 하나의 플랫폼에 통합했습니다.

---

## 프로젝트 구성

```
.
├── book-frontend/   # React 19 + TypeScript 프론트엔드
├── book-backend/    # Node.js + Express + SQLite 백엔드
├── sudan/           # 수어 번역 서비스 (개발 중)
├── writing_imitate/ # 필기 인식 테스트 (Google Vision API)
├── svg/             # 공용 SVG 에셋
├── AI_SAMPLE/       # NIA 한국 수어 키포인트 라벨링 데이터
└── 기획서.md        # 아이디어 기획서
```

---

## book-frontend

React 기반 동화 학습 UI

**주요 화면**
- 홈화면: 추천 동화(API 연동), 카테고리 슬라이더, 학습 카드
- 동화 목록: 카테고리/검색 필터, 페이지네이션
- 리더: 영상+자막 병렬 뷰, 단어 클릭 사전, 필기 따라쓰기

**실행**
```bash
cd book-frontend
npm install
npm run dev
# http://localhost:5173
```

---

## book-backend

동화 데이터 수집·제공 API 서버

**주요 기능**
- 문화공공데이터광장 API로 동화 목록 자동 동기화 (매일 03:00 cron)
- NLCY 영상·VTT 자막 프록시 (CORS 우회)
- KoNLPy(Okt) 기반 한국어 형태소 분석 (`/api/morpheme`)
- 한국어기초사전 API 연동 (`/dict`)
- 개인 단어장 CRUD (`/api/words`)

**실행**
```bash
cd book-backend
npm install
node server.js
# http://localhost:4000
```

**환경변수 (.env)**
```
CULTURE_API_KEY=...     # 문화공공데이터광장
CULTURE_API_KEY2=...
KRDICT_API_KEY=...      # 한국어기초사전
GROQ_API_KEY=...        # Groq LLM (형태소 보정)
GEMINI_API_KEY=...      # Google Gemini
```

**Python 의존성** (형태소 분석)
```bash
pip install konlpy
```

---

## sudan

한국 수어 번역 서비스 (개발 중)

NIA 수어 키포인트 데이터셋을 활용한 수어 동작 시각화

```bash
cd sudan
npm install
npm run dev
```

---

## writing_imitate

Google Vision API 기반 필기 인식 테스트

```bash
cd writing_imitate
npx serve .
# http://localhost:3000/test.html
```

`test.js`의 `API_KEY`에 Google Vision API 키 입력 필요

---

## 활용 데이터 및 기술

| 항목 | 내용 |
|------|------|
| 동화 영상·자막 | 국립어린이청소년도서관 (NLCY) 다국어 동화 |
| 동화 메타데이터 | 문화공공데이터광장 API_LIB_048 |
| 수어 키포인트 | NIA 한국 수어 라벨링 데이터셋 (2D/3D) |
| 한국어 사전 | 국립국어원 한국어기초사전 API |
| 형태소 분석 | KoNLPy (Okt) + Groq Llama 3.1 |
| 필기 인식 | Google Vision API |
