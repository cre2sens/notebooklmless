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
     * [Perf-2] 배경색 추출 최적화: 전체 페이지 렌더링 대신 축소 스케일(miniScale)로
     *          소형 캔버스만 생성하여 메모리·CPU 사용량을 대폭 절감
     * @param {number} pageNum
     * @param {Object} rect - {x, y, width, height} (원본 scale 기준 캔버스 좌표)
     * @param {number} scale - 현재 표시 스케일
     */
    async getBackgroundColorAt(pageNum, rect, scale) {
        if (!this._pdfDoc) return '#ffffff';

        try {
            const page = await this._pdfDoc.getPage(pageNum);

            // 색상 추출 전용 저해상도 스케일 (0.15 ≈ 전체 스케일의 1/10 면적)
            const miniScale = 0.15;
            const scaleRatio = miniScale / scale; // 원본→미니 변환 비율

            const viewport = page.getViewport({ scale: miniScale });
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = Math.ceil(viewport.width);
            tempCanvas.height = Math.ceil(viewport.height);
            const tempCtx = tempCanvas.getContext('2d');

            await page.render({
                canvasContext: tempCtx,
                viewport: viewport
            }).promise;

            // rect 좌표를 miniScale 기준으로 변환
            const miniRect = {
                x: rect.x * scaleRatio,
                y: rect.y * scaleRatio,
                width: Math.max(2, rect.width * scaleRatio),
                height: Math.max(2, rect.height * scaleRatio)
            };

            return TextOverlay.extractBackgroundColor(tempCanvas, miniRect, miniScale);
        } catch (error) {
            console.error(`페이지 ${pageNum} 배경색 추출 오류:`, error);
            return '#ffffff';
        }
    },

    /**
     * 선택 영역 내 텍스트의 폰트 정보 추출
     * @param {number} pageNum - 페이지 번호
     * @param {Object} pdfRect - PDF 좌표계 기준 영역 {x, y, width, height}
     * @param {number} scale - 현재 스케일
     * @returns {Promise<Object>} - { fontName, fontSize, isBold, isItalic, fontFamily, fontWeight }
     */
    async getTextInfoInRect(pageNum, pdfRect, scale) {
        if (!this._pdfDoc) {
            return { fontName: null, fontSize: null, isBold: false, isItalic: false };
        }

        try {
            const page = await this._pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: scale });
            const textContent = await page.getTextContent();

            const matchingItems = [];

            for (const item of textContent.items) {
                if (!item.str || !item.str.trim()) continue;

                // transform: [scaleX, skewX, skewY, scaleY, translateX, translateY]
                // 폰트 크기는 보통 transform[0] 또는 transform[3]
                const fontSize = Math.abs(item.transform[0]) || Math.abs(item.transform[3]);
                const pdfX = item.transform[4];
                const pdfY = item.transform[5];

                // PDF 좌표계 → 캔버스 좌표계 변환
                const canvasX = pdfX * scale;
                const canvasY = viewport.height - (pdfY * scale);

                // 선택 영역과 겹치는지 확인 (좌표계 변환 후)
                const rectLeft = pdfRect.x;
                const rectRight = pdfRect.x + pdfRect.width;
                const rectTop = pdfRect.y;
                const rectBottom = pdfRect.y + pdfRect.height;

                if (canvasX >= rectLeft && canvasX <= rectRight &&
                    canvasY >= rectTop && canvasY <= rectBottom) {
                    matchingItems.push({
                        text: item.str,
                        fontName: item.fontName || '',
                        fontSize: fontSize
                    });
                }
            }

            if (matchingItems.length === 0) {
                return { fontName: null, fontSize: null, isBold: false, isItalic: false };
            }

            // 가장 빈도 높은 폰트명과 평균 폰트 크기 계산
            const fontCounts = {};
            let totalFontSize = 0;

            for (const item of matchingItems) {
                fontCounts[item.fontName] = (fontCounts[item.fontName] || 0) + 1;
                totalFontSize += item.fontSize;
            }

            const dominantFont = Object.entries(fontCounts)
                .sort((a, b) => b[1] - a[1])[0][0];
            const avgFontSize = Math.round(totalFontSize / matchingItems.length);

            // 폰트 스타일 추론 — 정규화 전·후 모두 검사 (PDF 임베딩 폰트 대응)
            const lowerFont = dominantFont.toLowerCase();

            // 폰트명 정규화: ABCD+FontName, 구분자 제거 후 소문자
            const normalizeFont = (name) => name
                .replace(/^[A-Z]+\+/, '')   // ABCD+ 접두사 제거 (임베딩 폰트)
                .replace(/[-_,\s]+/g, '')    // 구분자 제거
                .toLowerCase();

            const normFont = normalizeFont(dominantFont);

            // Bold 키워드: 정규화 전·후 모두 검사
            // 확장 패턴: BD(Bold축약), BK(Black), Hv(Heavy), Blk(Black), ExBd(ExtraBold), UlBd(UltraBold)
            const boldPattern = /bold|heavy|black|semibold|demibold|extrabold|ultrabold|bd$|bk$|blk|hvt|hv$|exbd|ulbd/;
            const isBold = boldPattern.test(lowerFont) || boldPattern.test(normFont);

            // Italic 키워드: 정규화 전·후 모두 검사
            const italicPattern = /italic|oblique|it$|ob$/;
            const isItalic = italicPattern.test(lowerFont) || italicPattern.test(normFont);

            // OCR 텍스트에 한글 포함 여부
            const hasKorean = /[\uAC00-\uD7A3]/.test(
                elements && elements.textInput ? elements.textInput.value : ''
            );

            // 확장 폰트 매핑 테이블
            let fontFamily = 'Malgun Gothic'; // 기본값 (Windows 한글)
            let fontWeight = '400';

            if (normFont.includes('pretendard')) {
                fontFamily = 'Pretendard';
            } else if (normFont.includes('nanumgothic') || normFont.includes('nanumbarungothic')) {
                fontFamily = 'Nanum Gothic';
            } else if (normFont.includes('nanummyeongjo') || normFont.includes('batang') || normFont.includes('barung')) {
                fontFamily = 'Nanum Gothic'; // 명조계 → Nanum Gothic으로 fallback
            } else if (normFont.includes('malgun') || normFont.includes('malg')) {
                fontFamily = 'Malgun Gothic';
            } else if (normFont.includes('notosans') || normFont.includes('notokr')) {
                fontFamily = 'Noto Sans KR';
            } else if (normFont.includes('gothic') || normFont.includes('dotum') || normFont.includes('gulim')) {
                fontFamily = hasKorean ? 'Malgun Gothic' : 'Noto Sans KR';
            } else if (normFont.includes('arial') || normFont.includes('helvetica') || normFont.includes('freesans')) {
                fontFamily = hasKorean ? 'Malgun Gothic' : 'Noto Sans KR';
            } else if (normFont.includes('times') || normFont.includes('georgia') || normFont.includes('serif')) {
                fontFamily = hasKorean ? 'Nanum Gothic' : 'Noto Sans KR';
            } else if (normFont.includes('calibri') || normFont.includes('cambria') || normFont.includes('tahoma')) {
                fontFamily = hasKorean ? 'Malgun Gothic' : 'Noto Sans KR';
            } else {
                // 미매핑 → 한글 여부로 분기
                fontFamily = hasKorean ? 'Malgun Gothic' : 'Noto Sans KR';
            }

            // 굵기 추론
            if (isBold) {
                if (/semibold|demibold/.test(lowerFont)) {
                    fontWeight = '600';
                } else {
                    fontWeight = '700';
                }
            } else if (/medium/.test(lowerFont)) {
                fontWeight = '500';
            }

            console.log('폰트 정보 추출:', { dominantFont, avgFontSize, isBold, isItalic, fontFamily, fontWeight });

            return {
                fontName: dominantFont,
                fontSize: avgFontSize,
                isBold,
                isItalic,
                fontFamily,
                fontWeight
            };

        } catch (error) {
            console.error('텍스트 정보 추출 오류:', error);
            return { fontName: null, fontSize: null, isBold: false, isItalic: false };
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
     * [Phase3] Utils.wrapText()로 위임 — 중복 코드 제거
     * @private
     */
    _wrapText(ctx, text, maxWidth) {
        return Utils.wrapText(ctx, text, maxWidth, 0);
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
