const { GoogleGenerativeAI } = require('@google/generative-ai')

const GEMINI_KEY = process.env.GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(GEMINI_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })

// 결과 캐시 (같은 문장 반복 호출 방지)
const cache = new Map()

/**
 * 문장에서 수어 매핑용 핵심 단어 추출
 * @param {string} text
 * @returns {Promise<{keywords: {form: string, tag: string}[], count: number}>}
 */
async function extractKeywords(text) {
  if (cache.has(text)) return cache.get(text)

  const prompt = `다음 한국어 문장에서 수어로 표현할 핵심 단어만 추출해줘.
규칙:
- 명사, 동사, 형용사 위주로 추출
- 동사/형용사는 기본형(~다)으로 변환 (예: 물리쳤습니다 → 물리치다)
- 조사, 어미, 접속사, 불용어(것, 수, 때 등)는 제외
- 중복 제거
- JSON 배열만 반환 (설명 없이)

형식: [{"form":"단어","tag":"품사"}]
품사는 Noun/Verb/Adjective/Adverb 중 하나

문장: "${text}"

JSON:`

  try {
    const result = await model.generateContent(prompt)
    const raw = result.response.text().trim()
    // JSON 부분만 추출
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const keywords = JSON.parse(jsonMatch[0])
    const out = { text, keywords, count: keywords.length }
    cache.set(text, out)
    return out
  } catch (e) {
    console.error('[gemini] 오류:', e.message)
    // 실패 시 빈 결과 반환
    return { text, keywords: [], count: 0, error: e.message }
  }
}

/**
 * 단어 하나의 기본형 추출
 */
async function getBaseForm(word) {
  if (cache.has('word:' + word)) return cache.get('word:' + word)

  const prompt = `한국어 단어 "${word}"의 기본형과 품사를 알려줘.
JSON만 반환: {"form":"기본형","tag":"Noun|Verb|Adjective|Adverb"}
JSON:`

  try {
    const result = await model.generateContent(prompt)
    const raw = result.response.text().trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON')
    const out = [JSON.parse(jsonMatch[0])]
    cache.set('word:' + word, out)
    return out
  } catch {
    return [{ form: word, tag: 'Unknown' }]
  }
}

module.exports = { extractKeywords, getBaseForm }
