# MultiModal Fairytale

멀티모달 동화 학습 플랫폼

## 프로젝트 구성

### bookfor/
한국 전래동화 학습 서비스
- 국립어린이청소년도서관 다국어 동화 영상 제공
- 자막 기반 단어 학습 + 사전 연동
- 따라쓰기 기능

**실행 방법:**
```bash
cd bookfor
node server.js
# http://localhost:3000
```

**필요한 API 키 (.env 또는 환경변수):**
- `CULTURE_API_KEY` - 문화공공데이터광장 API 키
- `KRDICT_API_KEY` - 한국어기초사전 API 키

### writing_imitate/
AI 따라쓰기 테스트 (Google Vision API 연동)

**실행 방법:**
```bash
cd writing_imitate
npx serve .
# http://localhost:3000/test.html
```

**필요한 API 키:**
- `test.js`의 `API_KEY`에 Google Vision API 키 입력

### sudan/
한국 수어 번역 서비스 (개발 중)

**실행 방법:**
```bash
cd sudan
npm install
npm run dev
```
