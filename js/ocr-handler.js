/**
 * OCR Handler Module
 * Tesseract.js v4/v5를 이용한 한국어 OCR
 */

const OCRHandler = {
    _worker: null,
    _initialized: false,
    _isProcessing: false,
    _initPromise: null,

    /**
     * Tesseract 워커 초기화
     */
    async init() {
        if (this._initialized && this._worker) return;

        // 중복 초기화 방지
        if (this._initPromise) {
            return this._initPromise;
        }

        this._initPromise = this._doInit();
        return this._initPromise;
    },

    async _doInit() {
        try {
            console.log('OCR 엔진 초기화 시작...');

            // Tesseract 라이브러리 확인
            if (typeof Tesseract === 'undefined') {
                throw new Error('Tesseract.js 라이브러리가 로드되지 않았습니다.');
            }

            console.log('Tesseract 버전:', Tesseract.version || 'unknown');

            // Tesseract 워커 생성 (한국어 + 영어)
            // 사용자 피드백: eng+kor 시 한글 띄어쓰기 오류 발생 -> kor+eng로 복구
            this._worker = await Tesseract.createWorker('kor+eng', 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        console.log(`OCR 진행률: ${Math.round(m.progress * 100)}%`);
                    } else {
                        console.log('OCR 상태:', m.status);
                    }
                },
                errorHandler: err => {
                    console.error('Tesseract Worker 오류:', err);
                }
            });

            this._initialized = true;
            console.log('OCR 엔진 초기화 완료');
        } catch (error) {
            console.error('OCR 엔진 초기화 실패:', error);
            this._initPromise = null;
            this._initialized = false;
            throw error;
        }
    },

    /**
     * 이미지에서 텍스트 인식
     * @param {HTMLCanvasElement|HTMLImageElement|string} source - 이미지 소스
     * @param {Object} options - 인식 옵션
     * @returns {Promise<Object>} - { text, confidence }
     */
    async recognizeImage(source, options = {}) {
        if (!this._initialized || !this._worker) {
            await this.init();
        }

        if (this._isProcessing) {
            throw new Error('이미 OCR 처리 중입니다. 잠시 후 다시 시도해주세요.');
        }

        this._isProcessing = true;

        try {
            console.log('OCR recognize 시작...');
            const result = await this._worker.recognize(source, options);
            console.log('OCR recognize 완료');

            return {
                text: result.data.text ? result.data.text.trim() : '',
                confidence: result.data.confidence || 0,
                words: result.data.words || [],
                lines: result.data.lines || []
            };
        } catch (error) {
            console.error('OCR recognize 오류 상세:', error);
            const msg = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
            throw new Error(`텍스트 인식 실패: ${msg}`);
        } finally {
            this._isProcessing = false;
        }
    },

    /**
     * 캔버스의 특정 영역을 잘라서 OCR 수행
     * @param {HTMLCanvasElement} canvas
     * @param {Object} rect - { x, y, width, height }
     */
    async recognizeCanvasArea(canvas, rect) {
        // 영역 유효성 검사
        if (!rect || rect.width < 5 || rect.height < 5) {
            throw new Error('선택 영역이 너무 작습니다.');
        }

        // 좌표를 정수로 변환하고 캔버스 범위 내로 제한
        const x = Math.max(0, Math.floor(rect.x));
        const y = Math.max(0, Math.floor(rect.y));
        const width = Math.min(canvas.width - x, Math.floor(rect.width));
        const height = Math.min(canvas.height - y, Math.floor(rect.height));

        if (width <= 0 || height <= 0) {
            throw new Error('유효하지 않은 선택 영역입니다.');
        }

        console.log('OCR 영역:', { x, y, width, height });

        // 영역을 새 캔버스에 복사
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        tempCanvas.width = width;
        tempCanvas.height = height;

        // 하얀 배경으로 초기화 (OCR 인식률 향상)
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, width, height);

        tempCtx.drawImage(
            canvas,
            x, y, width, height,
            0, 0, width, height
        );

        // OCR 수행 (전체 이미지 인식)
        return this.recognizeImage(tempCanvas);
    },

    /**
     * OCR 처리 중인지 확인
     */
    isProcessing() {
        return this._isProcessing;
    },

    /**
     * 인식 신뢰도 레벨 반환
     * @param {number} confidence
     * @returns {string}
     */
    getConfidenceLevel(confidence) {
        if (confidence >= 80) return '높음';
        if (confidence >= 50) return '보통';
        return '낮음';
    },

    /**
     * 리소스 정리
     */
    async cleanup() {
        if (this._worker) {
            try {
                await this._worker.terminate();
            } catch (e) {
                console.warn('워커 종료 오류:', e);
            }
            this._worker = null;
        }
        this._initialized = false;
        this._isProcessing = false;
        this._initPromise = null;
    }
};

// 전역 객체로 노출
window.OCRHandler = OCRHandler;
