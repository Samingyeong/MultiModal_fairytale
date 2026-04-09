import sys
import json
import re
from konlpy.tag import Okt

okt = Okt()

COMPOUND_NOUNS = sorted({
    '날개옷', '홀어머니', '나무꾼', '사냥꾼', '보름달', '산꼭대기',
    '하늘나라', '옥황상제', '호박죽', '땅바닥', '문틈', '수탉',
    '팥죽', '도깨비', '선녀', '두레박', '뜬눈', '새벽녘',
    '아들딸', '색시', '노총각', '맨발', '목소리',
    '집안', '안팎', '이듬해', '식구', '마당', '부엌',
}, key=len, reverse=True)

SEARCH_TAGS = {'Noun', 'Verb', 'Adjective', 'Adverb', 'Modifier'}

STOPWORDS = {
    '것', '수', '때', '곳', '등', '및', '더', '또', '이', '그', '저',
    # 단독으로 의미 없는 동사 (보조동사/형식동사)
    '되다', '있다', '없다', '이다', '아', '어', '나', '내',
    # 분석 오류 단어
    '수가', '거지', '라면', '듯이', '보고', '타고', '안고',
    '서다', '주지', '팔면', '가쁜', '낳을', '번만', '이윽고',
    '다가', '갈수록', '잠도', '자고', '하늘만', '기어이', '우러러',
    '가요', '오니', '이제야', '절대로', '다시', '이제', '제발',
    '얼른', '혹시', '어찌', '깊이', '조심', '스레', '끝내',
    '마구', '점점', '싱글벙글',
}

# 보조동사 (단독으로는 의미 없음, 앞 동사와 결합해야 의미 있음)
AUX_VERBS = {'주다', '하다', '되다', '있다', '없다', '보다', '가다', '오다', '버리다', '놓다', '두다'}

MIMETIC = {
    '훨훨', '뻘뻘', '꼭꼭', '꽁꽁', '둥실', '냉큼', '샅샅이',
    '시름시름', '훌쩍훌쩍', '떨렁떨렁', '흔들흔들', '펄럭펄럭',
    '헐떡헐떡', '쿵쿵', '휘휘', '주르륵', '뜨끈뜨끈', '오순도순',
    '싱글벙글', '펄쩍', '둥둥', '살금살금', '살살', '꼼짝',
}

VERB_ENDINGS = ('요', '니', '죠', '지요', '네요', '어요', '아요')


def fix_tag(form, tag):
    if form in MIMETIC and tag == 'Noun':
        return 'Adverb'
    return tag


def is_bad_noun(form, tag):
    if tag != 'Noun':
        return False
    if len(form) <= 2 and form.endswith(VERB_ENDINGS):
        return True
    return False


def merge_compounds(text, keywords):
    skip = set()
    adds = []
    for compound in COMPOUND_NOUNS:
        if not re.search(re.escape(compound), text):
            continue
        parts = [k for k in keywords if k['form'] in compound and k['form'] != compound]
        if not parts:
            continue
        combined = ''.join(p['form'] for p in parts)
        if combined != compound:
            continue
        for p in parts:
            skip.add(p['form'])
        adds.append({'form': compound, 'tag': 'Noun'})

    result = adds + [k for k in keywords if k['form'] not in skip]

    def order(k):
        i = text.find(k['form'])
        return i if i >= 0 else 9999
    result.sort(key=order)

    seen, out = set(), []
    for k in result:
        if k['form'] not in seen:
            seen.add(k['form'])
            out.append(k)
    return out


def analyze_sentence(text):
    morphs = okt.pos(text, stem=True)
    raw = []
    seen = set()

    # 하다 복합동사 처리: 앞 명사 + 하다 → 명사하다 동사로 합침
    # 예: [('마련','Noun'), ('하다','Verb')] → [('마련하다','Verb')]
    merged_morphs = []
    i = 0
    while i < len(morphs):
        form, tag = morphs[i]
        if (tag == 'Verb' and form == '하다'
                and i > 0
                and merged_morphs
                and merged_morphs[-1][1] == 'Noun'):
            # 앞 명사와 합쳐서 복합동사로
            prev_form = merged_morphs.pop()[0]
            merged_morphs.append((prev_form + '하다', 'Verb'))
        else:
            merged_morphs.append((form, tag))
        i += 1

    for form, tag in merged_morphs:
        tag = fix_tag(form, tag)
        if tag not in SEARCH_TAGS:
            continue
        if form in STOPWORDS or is_bad_noun(form, tag):
            continue
        # 보조동사 단독 제거 (앞 동사와 합쳐진 경우는 이미 처리됨)
        if form in AUX_VERBS:
            continue
        if form in seen:
            continue
        if tag != 'Noun' and len(form) < 2:
            continue
        seen.add(form)
        raw.append({'form': form, 'tag': tag})

    keywords = merge_compounds(text, raw)
    return {'text': text, 'keywords': keywords, 'count': len(keywords)}


def analyze_word(word):
    morphs = okt.pos(word, stem=True)
    results = []
    for form, tag in morphs:
        tag = fix_tag(form, tag)
        if tag not in SEARCH_TAGS:
            continue
        if form in STOPWORDS or is_bad_noun(form, tag):
            continue
        results.append({'form': form, 'tag': tag})
    return results or [{'form': word, 'tag': 'Unknown'}]


if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'sentence'
    text = sys.argv[2] if len(sys.argv) > 2 else ''
    if not text:
        print(json.dumps({'error': 'no input'}, ensure_ascii=False))
        sys.exit(1)
    result = analyze_sentence(text) if mode == 'sentence' else analyze_word(text)
    print(json.dumps(result, ensure_ascii=False))
