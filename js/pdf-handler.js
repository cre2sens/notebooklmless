/**
 * PDF Handler Module
 * PDF 렌더링 및 수정 (PDF.js + pdf-lib)
 */

const PDFHandler = {
    // PDF.js 워커 설정
    _initialized: false,
    _pdfDoc: null,
    _pdfLibDoc: null,
    _pdfBytes: null,
    _currentPage: 1,
    _scale: 1.5,
    _pageCanvases: new Map(),

    /**
     * PDF.js 초기화
     */
    async init() {
        if (this._initialized) return;

        // PDF.js 라이브러리 확인
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF.js 라이브러리가 로드되지 않았습니다.');
        }

        // PDF.js 워커 설정
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        this._initialized = true;
        console.log('PDF.js 초기화 완료');
    },

    /**
     * 파일을 Uint8Array로 읽기
     * @param {File} file
     * @returns {Promise<Uint8Array>}
     */
    _readFileAsUint8Array(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const arrayBuffer = reader.result;
                resolve(new Uint8Array(arrayBuffer));
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    },

    /**
     * PDF 파일 로딩
     * @param {File|ArrayBuffer|Uint8Array} source
     * @returns {Promise<Object>}
     */
    async loadPDF(source) {
        await this.init();

        try {
            let uint8Array;

            if (source instanceof File) {
                console.log('파일 읽기 시작:', source.name);
                uint8Array = await this._readFileAsUint8Array(source);
                console.log('파일 읽기 완료, 크기:', uint8Array.length);
            } else if (source instanceof ArrayBuffer) {
                uint8Array = new Uint8Array(source);
            } else if (source instanceof Uint8Array) {
                uint8Array = source;
            } else {
                throw new Error('지원되지 않는 소스 형식입니다.');
            }

            // 원본 바이트 저장 (pdf-lib용)
            this._pdfBytes = uint8Array.slice();

            // PDF.js용 복사본 생성
            const pdfJsBytes = uint8Array.slice();

            // PDF.js로 로드 (렌더링용)
            console.log('PDF.js 로딩 시작...');
            const loadingTask = pdfjsLib.getDocument({ data: pdfJsBytes });
            this._pdfDoc = await loadingTask.promise;
            console.log('PDF.js 로딩 완료, 페이지 수:', this._pdfDoc.numPages);

            // pdf-lib로도 로드 (수정용)
            if (typeof PDFLib !== 'undefined') {
                console.log('pdf-lib 로딩 시작...');
                try {
                    this._pdfLibDoc = await PDFLib.PDFDocument.load(this._pdfBytes, {
                        ignoreEncryption: true
                    });
                    console.log('pdf-lib 로딩 완료');
                } catch (pdfLibError) {
                    console.warn('pdf-lib 로딩 실패 (수정 기능 제한됨):', pdfLibError);
                    this._pdfLibDoc = null;
                }
            } else {
                console.warn('pdf-lib 라이브러리가 로드되지 않았습니다.');
                this._pdfLibDoc = null;
            }

            return {
                numPages: this._pdfDoc.numPages,
                pdfDoc: this._pdfDoc
            };

        } catch (error) {
            console.error('PDF 로딩 오류:', error);
            throw new Error(`PDF 로딩 실패: ${error.message}`);
        }
    },

    /**
     * 페이지 렌더링
     * @param {number} pageNum - 페이지 번호 (1부터 시작)
     * @param {HTMLCanvasElement} canvas
     * @param {number} scale - 스케일 (기본 1.5)
     */
    async renderPage(pageNum, canvas, scale = null) {
        if (!this._pdfDoc) {
            throw new Error('PDF가 로드되지 않았습니다.');
        }

        try {
            const useScale = scale || this._scale;
            const page = await this._pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: useScale });

            const ctx = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
                canvasContext: ctx,
                viewport: viewport
            }).promise;

            this._currentPage = pageNum;
            this._pageCanvases.set(pageNum, { canvas, viewport });

            return viewport;
        } catch (error) {
            console.error('페이지 렌더링 오류:', error);
            throw error;
        }
    },

    /**
     * 썸네일 렌더링
     * @param {number} pageNum
     * @param {HTMLCanvasElement} canvas
     */
    async renderThumbnail(pageNum, canvas) {
        return this.renderPage(pageNum, canvas, 0.3);
    },

    /**
     * 확대/축소
     * @param {number} scale - 스케일
     */
    setScale(scale) {
        this._scale = Math.max(0.25, Math.min(3, scale));
        return this._scale;
    },

    getScale() {
        return this._scale;
    },

    /**
     * 현재 페이지 객체 반환 (PDF.js에서)
     */
    async getPageObject(pageNum = null) {
        const pageToGet = pageNum || this._currentPage;
        if (!this._pdfDoc || !pageToGet) return null;
        return await this._pdfDoc.getPage(pageToGet);
    },

    /**
     * 특정 페이지의 특정 영역에서 배경색 추출
     * @param {number} pageNum 
     * @param {Object} rect - {x, y, width, height}
     * @param {number} scale 
     */
    async getBackgroundColorAt(pageNum, rect, scale) {
        if (!this._pdfDoc) return '#ffffff';

        try {
            const page = await this._pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: scale });

            // 임시 캔버스 생성 (추출용이므로 작게 만들 수도 있지만 호환성을 위해 viewport 크기로)
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = viewport.width;
            tempCanvas.height = viewport.height;
            const tempCtx = tempCanvas.getContext('2d');

            // 해당 페이지 렌더링
            await page.render({
                canvasContext: tempCtx,
                viewport: viewport
            }).promise;

            // 색상 추출 (TextOverlay 모듈의 메서드 활용)
            return TextOverlay.extractBackgroundColor(tempCanvas, rect, scale);
        } catch (error) {
            console.error(`페이지 ${pageNum} 배경색 추출 오류:`, error);
            return '#ffffff';
        }
    },

    /**
     * 텍스트 오버레이 추가 (pdf-lib 사용) - 캔버스 이미지 방식
     * @param {number} pageNum
     * @param {Object} overlay - { x, y, width, height, text, font, size, color, backgroundColor }
     */
    async addTextOverlay(pageNum, overlay) {
        if (!this._pdfLibDoc) {
            console.warn('pdf-lib가 로드되지 않아 오버레이를 추가할 수 없습니다.');
            return;
        }

        const pages = this._pdfLibDoc.getPages();
        const page = pages[pageNum - 1];

        if (!page) {
            throw new Error(`페이지 ${pageNum}을 찾을 수 없습니다.`);
        }

        // 오프스크린 캔버스에 텍스트 렌더링
        const canvas = document.createElement('canvas');
        const drawScale = 2; // 고해상도 (변수명 scale에서 drawScale로 변경하여 혼동 방지)
        canvas.width = overlay.width * drawScale;
        canvas.height = overlay.height * drawScale;

        const ctx = canvas.getContext('2d');

        // 배경색 채우기 (투명도 적용)
        ctx.save();
        const opacity = (overlay.bgOpacity !== undefined ? overlay.bgOpacity : 100) / 100;
        ctx.globalAlpha = opacity;
        ctx.fillStyle = overlay.backgroundColor || '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        // 텍스트 그리기
        ctx.fillStyle = overlay.color || '#000000';

        // 폰트 스타일 문자열 조합
        let fontStyle = '';
        if (overlay.isItalic) fontStyle += 'italic ';

        let weight = overlay.fontWeight || '400';
        if (overlay.isBold) weight = 'bold'; // 명시적 Bold 토글 우선

        const fontFamily = overlay.fontFamily || overlay.font || 'Pretendard';
        const fontSize = overlay.size * drawScale;
        const fontSpec = `${fontStyle}${weight} ${fontSize}px "${fontFamily}"`;

        // 폰트 로딩 대기 (웹폰트 적용 보장)
        try {
            await document.fonts.load(fontSpec);
        } catch (e) {
            console.warn('Font loading check failed:', fontSpec, e);
        }

        ctx.font = `${fontSpec}, "Noto Sans KR", "Malgun Gothic", sans-serif`;
        ctx.textBaseline = 'top';

        // 정렬 설정
        let textX = 4;
        if (overlay.textAlign === 'center') {
            ctx.textAlign = 'center';
            textX = canvas.width / 2;
        } else if (overlay.textAlign === 'right') {
            ctx.textAlign = 'right';
            textX = canvas.width - 4;
        } else {
            ctx.textAlign = 'left';
        }

        // 텍스트 줄바꿈 처리
        const lines = this._wrapText(ctx, overlay.text, canvas.width - 8);
        let y = 4;
        for (const line of lines) {
            ctx.fillText(line, textX, y);

            // 밑줄 그리기
            if (overlay.isUnderline) {
                const metrics = ctx.measureText(line);
                let lineX = textX;
                if (overlay.textAlign === 'center') lineX = textX - metrics.width / 2;
                if (overlay.textAlign === 'right') lineX = textX - metrics.width;

                ctx.beginPath();
                ctx.strokeStyle = overlay.color || '#000000';
                ctx.lineWidth = Math.max(1, (overlay.size * drawScale) / 15);
                const lineY = y + (overlay.size * drawScale) * 0.95;
                ctx.moveTo(lineX, lineY);
                ctx.lineTo(lineX + metrics.width, lineY);
                ctx.stroke();
            }

            y += overlay.size * drawScale * 1.2;
        }

        // 캔버스를 PNG 이미지로 변환 (알파 채널 포함)
        const imageDataUrl = canvas.toDataURL('image/png');
        const imageBytes = this._dataUrlToBytes(imageDataUrl);

        // PDF에 이미지 임베드
        const pngImage = await this._pdfLibDoc.embedPng(imageBytes);

        // 페이지 좌표계 변환 (PDF는 좌하단이 원점)
        const pageHeight = page.getHeight();
        const pdfY = pageHeight - overlay.y - overlay.height;

        // 이미지 그리기
        page.drawImage(pngImage, {
            x: overlay.x,
            y: pdfY,
            width: overlay.width,
            height: overlay.height,
        });
    },

    /**
     * 텍스트 줄바꿈
     * @private
     */
    _wrapText(ctx, text, maxWidth) {
        const lines = [];
        const paragraphs = text.split('\n');

        for (const paragraph of paragraphs) {
            const words = paragraph.split('');
            let currentLine = '';

            for (const char of words) {
                const testLine = currentLine + char;
                const metrics = ctx.measureText(testLine);

                if (metrics.width > maxWidth && currentLine) {
                    lines.push(currentLine);
                    currentLine = char;
                } else {
                    currentLine = testLine;
                }
            }

            if (currentLine) {
                lines.push(currentLine);
            }
        }

        return lines;
    },

    /**
     * Data URL을 Uint8Array로 변환
     * @private
     */
    _dataUrlToBytes(dataUrl) {
        const base64 = dataUrl.split(',')[1];
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    },

    /**
     * 색상 문자열을 RGB로 파싱
     * @private
     */
    _parseColor(colorStr) {
        const hex = colorStr.replace('#', '');
        return {
            r: parseInt(hex.substring(0, 2), 16) / 255,
            g: parseInt(hex.substring(2, 4), 16) / 255,
            b: parseInt(hex.substring(4, 6), 16) / 255
        };
    },

    /**
     * 수정된 PDF 내보내기
     * @returns {Promise<Blob>}
     */
    async exportPDF() {
        if (!this._pdfLibDoc) {
            throw new Error('PDF가 로드되지 않았습니다.');
        }

        const pdfBytes = await this._pdfLibDoc.save();
        return new Blob([pdfBytes], { type: 'application/pdf' });
    },

    /**
     * 페이지 수 반환
     */
    getPageCount() {
        return this._pdfDoc ? this._pdfDoc.numPages : 0;
    },

    /**
     * 현재 페이지 번호 반환
     */
    getCurrentPage() {
        return this._currentPage;
    },

    /**
     * 리소스 정리
     */
    cleanup() {
        if (this._pdfDoc) {
            this._pdfDoc.destroy();
            this._pdfDoc = null;
        }
        this._pdfLibDoc = null;
        this._pdfBytes = null;
        this._pageCanvases.clear();
        this._currentPage = 1;
        this._initialized = false;
    }
};

// 전역 객체로 노출
window.PDFHandler = PDFHandler;
