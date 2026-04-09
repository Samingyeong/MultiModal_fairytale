"""
extract_story.py — VTT 자막에서 동화 본문 추출 후 형태소 분석 → txt 저장
"""
import urllib.request
import re
import os
import sys
_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _DIR)
from korean_nlp import analyze_sentence

NLCY_HEADERS = {
    'Referer': 'https://www.nlcy.go.kr/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Origin': 'https://www.nlcy.go.kr',
}

BOOK_TITLE = '선녀와 나무꾼'
VTT_URL    = 'https://www.nlcy.go.kr/multiLanguageStory/2010/Nlcy_016_142/Nlcy_016_142_ko.vtt'


def fetch_vtt(url: str) -> str:
    req = urllib.request.Request(url, headers=NLCY_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f'VTT 다운로드 실패: {e}')
        return ''


def parse_vtt(text: str) -> list:
    lines = text.replace('\r', '').split('\n')
    sentences = []
    for line in lines:
        line = line.strip()
        if not line or line.startswith('WEBVTT') or '-->' in line or line.isdigit():
            continue
        line = re.sub(r'<[^>]+>', '', line)
        if line:
            sentences.append(line)
    return sentences


def run(sentences: list) -> dict:
    full_text = ' '.join(sentences)
    sentence_results = []
    for sent in sentences:
        r = analyze_sentence(sent)
        sentence_results.append({'sentence': sent, 'keywords': r['keywords']})

    # 전체 단어 빈도
    freq = {}
    for s in sentence_results:
        for kw in s['keywords']:
            freq[kw['form']] = freq.get(kw['form'], 0) + 1

    top_words = sorted(freq.items(), key=lambda x: -x[1])[:30]
    return {
        'title': BOOK_TITLE,
        'total_sentences': len(sentences),
        'sentences': sentence_results,
        'top_words': top_words,
    }


def save_txt(result: dict, path: str):
    lines = []
    lines.append(f'=== {result["title"]} — 형태소 분석 결과 (개선판) ===')
    lines.append(f'총 문장 수: {result["total_sentences"]}')
    lines.append('')
    lines.append('─── 자주 나온 단어 TOP 30 ───')
    for i, (word, cnt) in enumerate(result['top_words'], 1):
        lines.append(f'  {i:2}. {word} ({cnt}회)')
    lines.append('')
    lines.append('─── 문장별 키워드 분석 ───')
    for i, s in enumerate(result['sentences'], 1):
        kws = ', '.join(f"{k['form']}({k['tag']})" for k in s['keywords'])
        lines.append(f'[{i:3}] {s["sentence"]}')
        lines.append(f'      → {kws if kws else "(키워드 없음)"}')
        lines.append('')
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f'저장 완료: {path}')


if __name__ == '__main__':
    print(f'[1] VTT 다운로드...')
    vtt_text = fetch_vtt(VTT_URL)
    sentences = parse_vtt(vtt_text) if vtt_text else []
    print(f'[2] 자막 파싱: {len(sentences)}개 문장')
    print(f'[3] 형태소 분석 중...')
    result = run(sentences)
    out_path = os.path.join(os.path.dirname(__file__), f'{BOOK_TITLE}_분석_v2.txt')
    save_txt(result, out_path)
    print('\n상위 10개 단어:')
    for word, cnt in result['top_words'][:10]:
        print(f'  {word}: {cnt}회')
