/**
 * Font Detector Module
 * 로컬 폰트 설치 여부 확인 및 다운로드 안내
 */

const FontDetector = {
  // 폰트 다운로드 정보
  fontDownloadInfo: {
    'Noto Sans KR': {
      url: 'https://fonts.google.com/specimen/Noto+Sans+KR',
      name: 'Google Fonts'
    },
    'NanumGothic': {
      url: 'https://hangeul.naver.com/font',
      name: '네이버 한글'
    },
    '나눔고딕': {
      url: 'https://hangeul.naver.com/font',
      name: '네이버 한글'
    },
    'Pretendard': {
      url: 'https://github.com/orioncactus/pretendard/releases',
      name: 'GitHub'
    },
    'Malgun Gothic': {
      url: 'https://docs.microsoft.com/ko-kr/typography/font-list/malgun-gothic',
      name: 'Windows 기본 폰트'
    },
    '맑은 고딕': {
      url: 'https://docs.microsoft.com/ko-kr/typography/font-list/malgun-gothic',
      name: 'Windows 기본 폰트'
    },
    'Apple SD Gothic Neo': {
      url: 'https://developer.apple.com/fonts/',
      name: 'macOS 기본 폰트'
    }
  },

  // 폰트 별칭 매핑
  fontAliases: {
    '맑은 고딕': 'Malgun Gothic',
    '나눔고딕': 'NanumGothic'
  },

  /**
   * 폰트가 시스템에 설치되어 있는지 확인
   * @param {string} fontName - 확인할 폰트명
   * @returns {boolean}
   */
  isFontInstalled(fontName) {
    // 웹폰트는 항상 사용 가능으로 처리
    if (fontName === 'Noto Sans KR') {
      return true;
    }

    // document.fonts.check API 사용
    if (document.fonts && document.fonts.check) {
      // 다양한 크기로 테스트하여 정확도 향상
      const testSizes = ['12px', '16px', '24px'];
      
      for (const size of testSizes) {
        try {
          const result = document.fonts.check(`${size} "${fontName}"`);
          if (result) return true;
        } catch (e) {
          console.warn(`Font check failed for ${fontName}:`, e);
        }
      }
      
      // 별칭도 확인
      const alias = this.fontAliases[fontName];
      if (alias) {
        for (const size of testSizes) {
          try {
            if (document.fonts.check(`${size} "${alias}"`)) return true;
          } catch (e) {}
        }
      }
    }

    // Fallback: Canvas 기반 감지
    return this._canvasDetect(fontName);
  },

  /**
   * Canvas를 이용한 폰트 감지 (Fallback)
   * @private
   */
  _canvasDetect(fontName) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const testString = '가나다라마바사 ABCDEFG 1234567';
    
    // 기본 폰트로 측정
    ctx.font = '72px monospace';
    const baseWidth = ctx.measureText(testString).width;
    
    // 테스트 폰트로 측정
    ctx.font = `72px "${fontName}", monospace`;
    const testWidth = ctx.measureText(testString).width;
    
    // 너비가 다르면 폰트가 적용된 것
    return baseWidth !== testWidth;
  },

  /**
   * 폰트 다운로드 정보 반환
   * @param {string} fontName
   * @returns {Object|null}
   */
  getFontDownloadInfo(fontName) {
    return this.fontDownloadInfo[fontName] || 
           this.fontDownloadInfo[this.fontAliases[fontName]] || 
           null;
  },

  /**
   * 모든 권장 폰트의 설치 상태 확인
   * @returns {Array}
   */
  checkAllFonts() {
    const fonts = [
      'Noto Sans KR',
      'Malgun Gothic',
      'NanumGothic',
      'Pretendard',
      'Apple SD Gothic Neo'
    ];

    return fonts.map(font => ({
      name: font,
      installed: this.isFontInstalled(font),
      downloadInfo: this.getFontDownloadInfo(font)
    }));
  },

  /**
   * 한글 지원 가능한 폰트인지 확인
   * @param {string} fontName
   * @returns {boolean}
   */
  isKoreanCompatible(fontName) {
    const koreanFonts = [
      'Noto Sans KR',
      'Malgun Gothic',
      '맑은 고딕',
      'NanumGothic',
      '나눔고딕',
      'Pretendard',
      'Apple SD Gothic Neo',
      'Dotum',
      '돋움',
      'Gulim',
      '굴림',
      'Batang',
      '바탕'
    ];

    return koreanFonts.some(f => 
      f.toLowerCase() === fontName.toLowerCase()
    );
  }
};

// 전역 객체로 노출
window.FontDetector = FontDetector;
