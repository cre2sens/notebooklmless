/**
 * OCR 결과 텍스트 후처리 및 교정 모듈
 */
const TextCorrector = {
    /**
     * 텍스트 교정 수행
     * @param {string} text 
     * @returns {string}
     */
    correct(text) {
        if (!text) return text;

        let corrected = text;

        // 1. 줄바꿈 정리
        // 문장 부호(.!?) 뒤의 줄바꿈은 유지하고, 그 외의 줄바꿈(문장 중간)은 공백으로 변경
        // 예: "안녕하세요\n반갑습니다" -> "안녕하세요 반갑습니다"
        // 예: "끝났습니다.\n다음" -> "끝났습니다.\n다음" (유지)
        corrected = corrected.replace(/([가-힣a-zA-Z0-9,])\n([가-힣a-zA-Z0-9])/g, '$1 $2');

        // 2. OCR 노이즈 제거
        // 파이프(|), 언더바(_) 등이 단어 사이에 뜬금없이 끼어있는 경우 제거 (단, 코딩 텍스트 등은 주의 필요하므로 앞뒤 공백 있을 때만)
        corrected = corrected.replace(/\s+[|_]\s+/g, ' ');

        // 3. 문장 부호 정리
        // 마침표 중복 (..) -> (.)
        corrected = corrected.replace(/\.{2,}/g, '.');
        // 쉼표 중복 (,,) -> (,)
        corrected = corrected.replace(/,{2,}/g, ',');

        // 4. 한글 조사/어미 앞 공백 제거 (보수적 적용)
        // OCR 오류로 "학교 에" 처럼 인식되는 경우 "학교에"로 수정
        const particles = '은|는|이|가|을|를|에|의|와|과|로|으로|에서|에게|도|만|처럼';
        const endings = '입니다|습니다|합니다|나요|까요|세요|네요|구나|아요|어요|하죠|하네';

        // [한글] + [공백] + [조사/어미] + [공백/문장부호/끝]
        const pattern = new RegExp(`([가-힣])\\s+(${particles}|${endings})(?=[\\s\\.,!?]|$)`, 'g');
        corrected = corrected.replace(pattern, '$1$2');

        // 5. 공백 정리 (연속 공백 -> 1개)
        corrected = corrected.replace(/\s+/g, ' ');

        return corrected.trim();
    }
};

// 전역 객체로 노출
window.TextCorrector = TextCorrector;
