/**
 * Text Overlay Module
 * 텍스트 오버레이 관리
 */

const TextOverlay = {
    _overlays: [],
    _currentPageOverlays: new Map(),
    _overlayIdCounter: 0,

    /**
     * 새 오버레이 생성
     * @param {number} pageNum
     * @param {Object} rect - { x, y, width, height }
     * @param {Object} options - { text, font, size, color, backgroundColor }
     * @returns {Object} overlay
     */
    create(pageNum, rect, options) {
        const overlay = {
            id: ++this._overlayIdCounter,
            pageNum,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            text: options.text || '',
            font: options.font || 'Noto Sans KR',
            fontFamily: options.fontFamily || options.font || 'Noto Sans KR',
            fontWeight: options.fontWeight || '400',
            size: options.size || 24,
            color: options.color || '#000000',
            backgroundColor: options.backgroundColor || '#FFFFFF',
            textAlign: options.textAlign || 'left',
            isBold: !!options.isBold,
            isItalic: !!options.isItalic,
            isUnderline: !!options.isUnderline,
            bgOpacity: options.bgOpacity !== undefined ? options.bgOpacity : 100,
            createdAt: Date.now()
        };

        this._overlays.push(overlay);

        // 페이지별 오버레이 관리
        if (!this._currentPageOverlays.has(pageNum)) {
            this._currentPageOverlays.set(pageNum, []);
        }
        this._currentPageOverlays.get(pageNum).push(overlay);

        return overlay;
    },

    /**
     * ID로 오버레이 조회
     * @param {number} id
     * @returns {Object}
     */
    get(id) {
        return this._overlays.find(o => o.id === id);
    },

    /**
     * 캔버스 영역에서 평균 배경색 추출
     * @param {HTMLCanvasElement} canvas
     * @param {Object} rect - { x, y, width, height }
     * @param {number} scale - PDF 스케일
     * @returns {string} - hex 색상 (#RRGGBB)
     */
    extractBackgroundColor(canvas, rect, scale = 1.5) {
        const ctx = canvas.getContext('2d');

        // 스케일 적용된 좌표
        const x = Math.floor(rect.x);
        const y = Math.floor(rect.y);
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);

        // 영역이 너무 작으면 기본 흰색 반환
        if (width < 1 || height < 1) {
            return '#FFFFFF';
        }

        try {
            // 영역 가장자리에서 색상 샘플링 (테두리 픽셀들)
            const samples = [];

            // 상단 가장자리
            const topData = ctx.getImageData(x, y, width, 1).data;
            for (let i = 0; i < topData.length; i += 4) {
                samples.push([topData[i], topData[i + 1], topData[i + 2]]);
            }

            // 하단 가장자리
            const bottomData = ctx.getImageData(x, y + height - 1, width, 1).data;
            for (let i = 0; i < bottomData.length; i += 4) {
                samples.push([bottomData[i], bottomData[i + 1], bottomData[i + 2]]);
            }

            // 좌측 가장자리
            const leftData = ctx.getImageData(x, y, 1, height).data;
            for (let i = 0; i < leftData.length; i += 4) {
                samples.push([leftData[i], leftData[i + 1], leftData[i + 2]]);
            }

            // 우측 가장자리
            const rightData = ctx.getImageData(x + width - 1, y, 1, height).data;
            for (let i = 0; i < rightData.length; i += 4) {
                samples.push([rightData[i], rightData[i + 1], rightData[i + 2]]);
            }

            if (samples.length === 0) {
                return '#FFFFFF';
            }

            // 평균 색상 계산
            let r = 0, g = 0, b = 0;
            for (const [sr, sg, sb] of samples) {
                r += sr;
                g += sg;
                b += sb;
            }
            r = Math.round(r / samples.length);
            g = Math.round(g / samples.length);
            b = Math.round(b / samples.length);

            // Hex로 변환
            const hex = '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
            console.log('추출된 배경색:', hex);
            return hex.toUpperCase();
        } catch (error) {
            console.warn('배경색 추출 오류:', error);
            return '#FFFFFF';
        }
    },

    /**
     * 캔버스 영역에서 텍스트 색상 추출 (배경과 가장 대비되는 색상)
     * @param {HTMLCanvasElement} canvas
     * @param {Object} rect - { x, y, width, height }
     * @param {string} backgroundColor - 이미 추출된 배경색
     * @returns {string} - hex 색상 (#RRGGBB)
     */
    extractTextColor(canvas, rect, backgroundColor) {
        const ctx = canvas.getContext('2d');

        // 스케일 적용된 좌표
        const x = Math.floor(rect.x);
        const y = Math.floor(rect.y);
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);

        // 영역이 너무 작으면 기본 검정색 반환
        if (width < 5 || height < 5) {
            return '#000000';
        }

        try {
            // 배경색 RGB 파싱
            const bgR = parseInt(backgroundColor.substring(1, 3), 16);
            const bgG = parseInt(backgroundColor.substring(3, 5), 16);
            const bgB = parseInt(backgroundColor.substring(5, 7), 16);

            // 영역 내부에서 픽셀 샘플링 (가운데 영역)
            const innerX = x + Math.floor(width * 0.2);
            const innerY = y + Math.floor(height * 0.2);
            const innerWidth = Math.max(1, Math.floor(width * 0.6));
            const innerHeight = Math.max(1, Math.floor(height * 0.6));

            const imageData = ctx.getImageData(innerX, innerY, innerWidth, innerHeight).data;

            // 배경과 다른 색상들 수집
            const textColors = [];
            const threshold = 30; // 배경과 구분하는 임계값

            for (let i = 0; i < imageData.length; i += 4) {
                const r = imageData[i];
                const g = imageData[i + 1];
                const b = imageData[i + 2];

                // 배경색과의 차이 계산
                const diff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);

                if (diff > threshold) {
                    textColors.push([r, g, b]);
                }
            }

            if (textColors.length === 0) {
                // 배경과 대비되는 색상이 없으면 배경 기준으로 검/흰 결정
                const bgBrightness = (bgR + bgG + bgB) / 3;
                return bgBrightness > 128 ? '#000000' : '#FFFFFF';
            }

            // 가장 많이 등장하는 색상 찾기 (대략적인 양자화)
            const colorCounts = {};
            for (const [r, g, b] of textColors) {
                // 색상 양자화 (8단계)
                const qr = Math.round(r / 32) * 32;
                const qg = Math.round(g / 32) * 32;
                const qb = Math.round(b / 32) * 32;
                const key = `${qr},${qg},${qb}`;
                colorCounts[key] = (colorCounts[key] || 0) + 1;
            }

            // 가장 많은 색상 선택
            let maxCount = 0;
            let dominantColor = [0, 0, 0];
            for (const [key, count] of Object.entries(colorCounts)) {
                if (count > maxCount) {
                    maxCount = count;
                    const [r, g, b] = key.split(',').map(Number);
                    dominantColor = [r, g, b];
                }
            }

            const hex = '#' + dominantColor.map(c => Math.min(255, c).toString(16).padStart(2, '0')).join('');
            console.log('추출된 텍스트 색상:', hex);
            return hex.toUpperCase();
        } catch (error) {
            console.warn('텍스트 색상 추출 오류:', error);
            return '#000000';
        }
    },

    /**
     * 오버레이 업데이트
     * @param {number} id
     * @param {Object} updates
     */
    update(id, updates) {
        const overlay = this._overlays.find(o => o.id === id);
        if (overlay) {
            Object.assign(overlay, updates);
        }
        return overlay;
    },

    /**
     * 오버레이 삭제
     * @param {number} id
     */
    remove(id) {
        const index = this._overlays.findIndex(o => o.id === id);
        if (index !== -1) {
            const overlay = this._overlays[index];
            this._overlays.splice(index, 1);

            // 페이지별 목록에서도 제거
            const pageOverlays = this._currentPageOverlays.get(overlay.pageNum);
            if (pageOverlays) {
                const pageIndex = pageOverlays.findIndex(o => o.id === id);
                if (pageIndex !== -1) {
                    pageOverlays.splice(pageIndex, 1);
                }
            }
        }
    },

    /**
     * 특정 페이지의 오버레이 가져오기
     * @param {number} pageNum
     * @returns {Array}
     */
    getPageOverlays(pageNum) {
        return this._currentPageOverlays.get(pageNum) || [];
    },

    /**
     * 모든 오버레이 가져오기
     * @returns {Array}
     */
    getAllOverlays() {
        return [...this._overlays];
    },

    /**
     * 특정 오버레이의 순수 콘텐츠만 렌더링 (배경 + 텍스트)
     * @param {HTMLCanvasElement} canvas
     * @param {Object} overlay
     * @param {number} scale
     */
    renderOverlay(canvas, overlay, scale = 1.5) {
        const ctx = canvas.getContext('2d');

        const x = overlay.x * scale;
        const y = overlay.y * scale;
        const w = overlay.width * scale;
        const h = overlay.height * scale;

        ctx.save();

        // 배경 투명도 적용
        const opacity = (overlay.bgOpacity !== undefined ? overlay.bgOpacity : 100) / 100;
        ctx.globalAlpha = opacity;

        // 배경 (추출된 배경색 사용)
        ctx.fillStyle = overlay.backgroundColor || '#FFFFFF';
        ctx.fillRect(x, y, w, h);

        ctx.globalAlpha = 1.0; // 텍스트는 불투명하게 (필요 시 조절 가능)

        // 텍스트
        if (overlay.text) {
            ctx.fillStyle = overlay.color;

            // 폰트 스타일 문자열 조합
            let fontStyle = '';
            if (overlay.isItalic) fontStyle += 'italic ';

            let weight = overlay.fontWeight || '400';
            if (overlay.isBold) weight = 'bold'; // 명시적 Bold 토글 우선

            const fontFamily = overlay.fontFamily || overlay.font || 'Pretendard';
            ctx.font = `${fontStyle}${weight} ${overlay.size * scale}px "${fontFamily}", "Noto Sans KR", sans-serif`;
            ctx.textBaseline = 'top';

            // 정렬 설정
            let textX = x + 4;
            if (overlay.textAlign === 'center') {
                ctx.textAlign = 'center';
                textX = x + w / 2;
            } else if (overlay.textAlign === 'right') {
                ctx.textAlign = 'right';
                textX = x + w - 4;
            } else {
                ctx.textAlign = 'left';
            }

            // 텍스트를 영역 안에 맞게 렌더링
            const lines = this._wrapText(ctx, overlay.text, w);
            let ty = y + 4;

            for (const line of lines) {
                ctx.fillText(line, textX, ty);

                // 밑줄 그리기
                if (overlay.isUnderline) {
                    const metrics = ctx.measureText(line);
                    let lineX = textX;
                    if (overlay.textAlign === 'center') lineX = textX - metrics.width / 2;
                    if (overlay.textAlign === 'right') lineX = textX - metrics.width;

                    ctx.beginPath();
                    ctx.strokeStyle = overlay.color;
                    ctx.lineWidth = Math.max(1, (overlay.size * scale) / 15);
                    const lineY = ty + (overlay.size * scale) * 0.95;
                    ctx.moveTo(lineX, lineY);
                    ctx.lineTo(lineX + metrics.width, lineY);
                    ctx.stroke();
                }

                ty += overlay.size * scale * 1.2;
            }
        }

        ctx.restore();
    },

    /**
     * 캔버스에 오버레이 미리보기 렌더링 (가이드라인 및 핸들 포함)
     * @param {HTMLCanvasElement} canvas
     * @param {Object} overlay
     * @param {number} scale - PDF 스케일
     */
    renderPreview(canvas, overlay, scale = 1.5, showHandles = true) {
        const ctx = canvas.getContext('2d');

        const x = overlay.x * scale;
        const y = overlay.y * scale;
        const w = overlay.width * scale;
        const h = overlay.height * scale;

        // 1. 기본 콘텐츠 렌더링
        this.renderOverlay(canvas, overlay, scale);

        // 2. 테두리 가이드라인 (미리보기 시에만 표시)
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);

        // 3. 리사이즈 핸들 렌더링
        if (showHandles) {
            this._renderResizeHandles(ctx, x, y, w, h);
        }
    },

    /**
     * 리사이즈 핸들 렌더링
     * @private
     */
    _renderResizeHandles(ctx, x, y, w, h) {
        const handleSize = 8;
        const halfHandle = handleSize / 2;

        ctx.fillStyle = '#6366f1';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;

        // 8개 핸들 위치: 4 모서리 + 4 변 중앙
        const handles = [
            { x: x - halfHandle, y: y - halfHandle },                           // top-left
            { x: x + w / 2 - halfHandle, y: y - halfHandle },                   // top-center
            { x: x + w - halfHandle, y: y - halfHandle },                       // top-right
            { x: x + w - halfHandle, y: y + h / 2 - halfHandle },               // right-center
            { x: x + w - halfHandle, y: y + h - halfHandle },                   // bottom-right
            { x: x + w / 2 - halfHandle, y: y + h - halfHandle },               // bottom-center
            { x: x - halfHandle, y: y + h - halfHandle },                       // bottom-left
            { x: x - halfHandle, y: y + h / 2 - halfHandle },                   // left-center
        ];

        for (const handle of handles) {
            ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
            ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
        }
    },

    /**
     * 마우스 위치에서 리사이즈 핸들 감지
     * @param {Object} overlay - 오버레이 객체
     * @param {number} mouseX - 마우스 X (캔버스 좌표)
     * @param {number} mouseY - 마우스 Y (캔버스 좌표)
     * @param {number} scale - PDF 스케일
     * @returns {string|null} - 핸들 이름 또는 null
     */
    getResizeHandle(overlay, mouseX, mouseY, scale = 1.5) {
        const handleSize = 12; // 클릭 영역은 약간 더 크게
        const halfHandle = handleSize / 2;

        const x = overlay.x * scale;
        const y = overlay.y * scale;
        const w = overlay.width * scale;
        const h = overlay.height * scale;

        // 핸들 위치와 이름
        const handles = [
            { name: 'nw', x: x, y: y },                           // top-left
            { name: 'n', x: x + w / 2, y: y },                    // top-center
            { name: 'ne', x: x + w, y: y },                       // top-right
            { name: 'e', x: x + w, y: y + h / 2 },                // right-center
            { name: 'se', x: x + w, y: y + h },                   // bottom-right
            { name: 's', x: x + w / 2, y: y + h },                // bottom-center
            { name: 'sw', x: x, y: y + h },                       // bottom-left
            { name: 'w', x: x, y: y + h / 2 },                    // left-center
        ];

        for (const handle of handles) {
            if (mouseX >= handle.x - halfHandle && mouseX <= handle.x + halfHandle &&
                mouseY >= handle.y - halfHandle && mouseY <= handle.y + halfHandle) {
                return handle.name;
            }
        }

        return null;
    },

    /**
     * 핸들에 따른 커서 스타일 반환
     */
    getResizeCursor(handleName) {
        const cursors = {
            'nw': 'nw-resize',
            'n': 'n-resize',
            'ne': 'ne-resize',
            'e': 'e-resize',
            'se': 'se-resize',
            's': 's-resize',
            'sw': 'sw-resize',
            'w': 'w-resize'
        };
        return cursors[handleName] || 'move';
    },

    /**
     * 페이지의 모든 오버레이 렌더링
     * @param {HTMLCanvasElement} canvas
     * @param {number} pageNum
     * @param {number} scale
     */
    renderPageOverlays(canvas, pageNum, scale = 1.5) {
        const overlays = this.getPageOverlays(pageNum);
        for (const overlay of overlays) {
            // 저장된 오버레이는 가이드라인 없이 순수 콘텐츠만 렌더링
            this.renderOverlay(canvas, overlay, scale);
        }
    },

    /**
     * 텍스트 줄바꿈 처리
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

                if (metrics.width > maxWidth - 8 && currentLine) {
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
     * 모든 오버레이 초기화
     */
    clearAll() {
        this._overlays = [];
        this._currentPageOverlays.clear();
    },

    /**
     * 특정 페이지 오버레이 초기화
     * @param {number} pageNum
     */
    clearPage(pageNum) {
        const pageOverlays = this._currentPageOverlays.get(pageNum) || [];
        for (const overlay of pageOverlays) {
            const index = this._overlays.findIndex(o => o.id === overlay.id);
            if (index !== -1) {
                this._overlays.splice(index, 1);
            }
        }
        this._currentPageOverlays.set(pageNum, []);
    }
};

// 전역 객체로 노출
window.TextOverlay = TextOverlay;
