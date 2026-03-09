/**
 * Font Matcher Module
 * PDF 임베디드 폰트명과 추출된 폰트 속성들을 바탕으로
 * 웹에서 사용 가능한 폰트 패밀리 및 굵기를 추론합니다.
 */

const FONT_MAPPING_DATA = {
    // 폰트명에 포함된 키워드로 패밀리 추론
    familyPatterns: [
        { match: /pretendard/i, family: 'Pretendard' },
        { match: /nanumgothic|nanumbarungothic/i, family: 'Nanum Gothic' },
        { match: /nanummyeongjo|batang|barung/i, family: 'Nanum Gothic' }, // 명조계 폴백
        { match: /malgun|malg/i, family: 'Malgun Gothic' },
        { match: /notosans|notokr/i, family: 'Noto Sans KR' }
    ],

    // 영문/일반 폰트일 경우 한글 포함 여부에 따른 스마트 폴백
    fallbackPatterns: [
        { match: /gothic|dotum|gulim/i, koFallback: 'Malgun Gothic', enFallback: 'Noto Sans KR' },
        { match: /arial|helvetica|freesans/i, koFallback: 'Malgun Gothic', enFallback: 'Noto Sans KR' },
        { match: /times|georgia|serif/i, koFallback: 'Nanum Gothic', enFallback: 'Noto Sans KR' },
        { match: /calibri|cambria|tahoma/i, koFallback: 'Malgun Gothic', enFallback: 'Noto Sans KR' }
    ],

    // Bold/Italic 축약어 정규식
    boldPatterns: /bold|heavy|black|semibold|demibold|extrabold|ultrabold|bd$|bk$|blk|hvt|hv$|exbd|ulbd/i,
    italicPatterns: /italic|oblique|it$|ob$/i,
    semiBoldPatterns: /semibold|demibold/i,
    mediumPatterns: /medium/i
};

class FontMatcher {
    /**
     * 폰트명 정규화 (임베딩 폰트 접두사 및 구분자 제거)
     */
    static normalizeFontName(name) {
        if (!name) return '';
        return name
            .replace(/^[A-Z]+\+/, '')   // ABCD+ 접두사 제거
            .replace(/[-_,\s]+/g, '')    // 구분자 제거
            .toLowerCase();
    }

    /**
     * PDF 폰트 정보를 웹 폰트 정보로 매핑
     * @param {string} rawFontName - PDF에서 추출한 원본 폰트명
     * @param {boolean} hasKorean - 텍스트에 한글 포함 여부
     * @returns {Object} - { fontFamily, fontWeight, isBold, isItalic }
     */
    static matchFont(rawFontName, hasKorean = false) {
        const lowerFont = rawFontName.toLowerCase();
        const normFont = this.normalizeFontName(rawFontName);

        // 1. 스타일(Bold/Italic) 추론 (원본명 및 정규화명 모두 검사)
        const isBold = FONT_MAPPING_DATA.boldPatterns.test(lowerFont) || FONT_MAPPING_DATA.boldPatterns.test(normFont);
        const isItalic = FONT_MAPPING_DATA.italicPatterns.test(lowerFont) || FONT_MAPPING_DATA.italicPatterns.test(normFont);

        // 2. 굵기(Weight) 세부 추론
        let fontWeight = '400';
        if (isBold) {
            fontWeight = FONT_MAPPING_DATA.semiBoldPatterns.test(lowerFont) ? '600' : '700';
        } else if (FONT_MAPPING_DATA.mediumPatterns.test(lowerFont)) {
            fontWeight = '500';
        }

        // 3. 폰트 패밀리 추론
        let fontFamily = hasKorean ? 'Malgun Gothic' : 'Noto Sans KR'; // 최종 폴백 변경

        // 명시적 패밀리 매칭
        const matchedFamily = FONT_MAPPING_DATA.familyPatterns.find(p => p.match.test(normFont));
        if (matchedFamily) {
            fontFamily = matchedFamily.family;
        } else {
            // 한글 포함 여부를 고려한 스마트 매칭
            const fallbackOption = FONT_MAPPING_DATA.fallbackPatterns.find(p => p.match.test(normFont));
            if (fallbackOption) {
                fontFamily = hasKorean ? fallbackOption.koFallback : fallbackOption.enFallback;
            }
        }

        return { fontFamily, fontWeight, isBold, isItalic };
    }
}

// 전역 싱글톤으로 노출
window.FontMatcher = FontMatcher;
