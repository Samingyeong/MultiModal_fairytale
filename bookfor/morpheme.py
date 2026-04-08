import sys
import json
from kiwipiepy import Kiwi

kiwi = Kiwi()

# 사전 검색에 쓸 기본형 추출
# 품사 태그: NNG/NNP(명사), VV(동사), VA(형용사), MAG(부사)
SEARCH_TAGS = {'NNG', 'NNP', 'VV', 'VA', 'MAG', 'XR'}

def get_base(word):
    tokens = kiwi.tokenize(word)
    results = []
    for t in tokens:
        tag = str(t.tag).replace('Tag.', '')
        if tag in SEARCH_TAGS:
            form = t.form
            # 동사/형용사는 '다' 붙여서 기본형
            if tag in ('VV', 'VA'):
                form = form + '다'
            results.append({'form': form, 'tag': tag})
    # 결과 없으면 원본 반환
    if not results:
        results.append({'form': word, 'tag': 'UNKNOWN'})
    return results

if __name__ == '__main__':
    word = sys.argv[1] if len(sys.argv) > 1 else ''
    print(json.dumps(get_base(word), ensure_ascii=False))
