const Groq = require('groq-sdk')
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

async function test() {
  const r = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{
      role: 'user',
      content: '다음 문장에서 수어로 표현할 핵심 단어만 추출해줘. 동사/형용사는 기본형(~다)으로. JSON 배열만 반환.\n형식: [{"form":"단어","tag":"Noun|Verb|Adjective|Adverb"}]\n\n문장: "엄마와 함께 지하철을 탄 호기심 많은 아이는 다른 사람들의 가방 속이 궁금해요."'
    }],
    max_tokens: 200
  })
  console.log(r.choices[0].message.content)
}
test().catch(console.error)
