// 설정 값
const API_KEY = 'YOUR_GOOGLE_VISION_API_KEY'; // Google Vision API 키를 입력하세요
const TARGET_WORD = "아버지";

// 요소 가져오기
const guideCanvas = document.getElementById('guideCanvas');
const inputCanvas = document.getElementById('inputCanvas');
const guideCtx = guideCanvas.getContext('2d');

// 1. 가이드 글자 그리기 (페이지 열리자마자 실행)
window.onload = () => {
    guideCtx.font = 'bold 100px sans-serif';
    guideCtx.textAlign = 'center';
    guideCtx.textBaseline = 'middle';
    guideCtx.fillStyle = '#999';
    guideCtx.fillText(TARGET_WORD, 200, 100);
};

// 2. 그리기 기능 설정 (SignaturePad 라이브러리 사용)
const signaturePad = new SignaturePad(inputCanvas, {
    minWidth: 4,
    maxWidth: 8,
    penColor: 'black'
});

// 3. 다시 쓰기 버튼
document.getElementById('clear').addEventListener('click', () => {
    signaturePad.clear();
});

// 4. 제출 및 AI 인식 (Google Vision API 호출)
document.getElementById('submit').addEventListener('click', async () => {
    if (signaturePad.isEmpty()) {
        alert("글씨를 먼저 써주세요!");
        return;
    }

    // 캔버스 내용을 흰 배경과 합성 후 Base64로 변환
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = inputCanvas.width;
    exportCanvas.height = inputCanvas.height;
    const exportCtx = exportCanvas.getContext('2d');
    exportCtx.fillStyle = 'white';
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    exportCtx.drawImage(inputCanvas, 0, 0);
    const base64Image = exportCanvas.toDataURL('image/png').split(',')[1];

    const requestData = {
        requests: [{
            image: { content: base64Image },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            imageContext: { languageHints: ['ko'] }
        }]
    };

    try {
        const data = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.onload = () => {
                const parsed = JSON.parse(xhr.responseText);
                if (xhr.status !== 200) {
                    reject(new Error(`API 오류 ${xhr.status}: ${parsed.error?.message || xhr.responseText}`));
                } else {
                    resolve(parsed);
                }
            };
            xhr.onerror = () => reject(new Error('네트워크 오류 - CORS 또는 인터넷 연결 확인'));
            xhr.send(JSON.stringify(requestData));
        });

            const recognizedText = data.responses[0].fullTextAnnotation?.text?.trim() || "";

        console.log("인식 결과:", recognizedText);

        if (recognizedText.includes(TARGET_WORD)) {
            alert(`🎉 정답! '${TARGET_WORD}'를 정말 잘 썼어요!`);
        } else {
            alert(`아쉬워요! 인식된 글자: "${recognizedText}"\n다시 도전해볼까요?`);
        }
    } catch (error) {
        console.error("API 오류:", error);
        alert("인식 과정에서 오류가 발생했습니다.");
    }
});