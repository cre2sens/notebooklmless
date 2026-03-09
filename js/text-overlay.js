/**
 * Text Overlay Module
 * 텍스트 오버레이 관리
 */

// 색상/폰트 추정 알고리즘 매직넘버 분리
const ALGO_CONFIG = {
    bgCornerRatio: 0.15,
    bgMaxCornerSize: 20,
    bgQuantStep: 16,
    bgFallbackThreshold: 10,
    textDiffThreshold: 40,
    textInnerRatio: 0.8,
    textQuantStep: 16,
    boldDensityThreshold: 0.18
};

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
     * 캔버스 영역에서 배경색 추출 (4코너 샘플링 + 최빈값 방식)
     * [Fix-New] 4코너에는 텍스트가 없다는 원리로 정확한 배경 샘플
     *   - 어두운/컬러 배경에서도 정확하게 동작
     *   - 코너 샘플이 부족하면 전체 영역 히스토그램 최빈값으로 fallback
     * @param {HTMLCanvasElement} canvas
     * @param {Object} rect - { x, y, width, height }
     * @param {number} scale - PDF 스케일
     * @returns {string} - hex 색상 (#RRGGBB)
     */
    extractBackgroundColor(canvas, rect, scale = 1.5) {
        const ctx = canvas.getContext('2d');

        // [Fix-New] Utils.cssToCanvas 활용
        const { x, y, width, height } = Utils.cssToCanvas(canvas, rect.x, rect.y, rect.width, rect.height);

        if (width < 1 || height < 1) {
            return '#FFFFFF';
        }

        try {
            // 코너 샘플 크기
            const cs = Math.max(2, Math.min(ALGO_CONFIG.bgMaxCornerSize, Math.floor(Math.min(width, height) * ALGO_CONFIG.bgCornerRatio)));
            const cornerPixels = [];

            // 4코너 영역 픽셀 수집
            const corners = [
                { cx: x, cy: y },
                { cx: x + width - cs, cy: y },
                { cx: x, cy: y + height - cs },
                { cx: x + width - cs, cy: y + height - cs },
            ];

            for (const { cx, cy } of corners) {
                const cw = Math.max(1, Math.min(cs, width));
                const ch = Math.max(1, Math.min(cs, height));
                if (cx < 0 || cy < 0) continue;
                const data = ctx.getImageData(cx, cy, cw, ch).data;
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] < 128) continue;
                    cornerPixels.push([data[i], data[i + 1], data[i + 2]]);
                }
            }

            // 코너 샘플이 부족하면 전체 영역으로 fallback
            const useFallback = cornerPixels.length < ALGO_CONFIG.bgFallbackThreshold;
            const samplePixels = useFallback ? (() => {
                const all = [];
                const data = ctx.getImageData(x, y, width, height).data;
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] >= 128) all.push([data[i], data[i + 1], data[i + 2]]);
                }
                return all;
            })() : cornerPixels;

            if (samplePixels.length === 0) return '#FFFFFF';

            // 설정된 단계 양자화 히스토그램 → 최빈값 선택
            const QUANT = ALGO_CONFIG.bgQuantStep;
            const histogram = {};
            for (const [r, g, b] of samplePixels) {
                const qr = Math.round(r / QUANT) * QUANT;
                const qg = Math.round(g / QUANT) * QUANT;
                const qb = Math.round(b / QUANT) * QUANT;
                const key = `${qr},${qg},${qb}`;
                histogram[key] = (histogram[key] || 0) + 1;
            }

            const [topKey] = Object.entries(histogram).sort((a, b) => b[1] - a[1])[0];
            const [r, g, b] = topKey.split(',').map(Number);

            const hex = '#' + [r, g, b].map(c =>
                Math.min(255, c).toString(16).padStart(2, '0')
            ).join('').toUpperCase();
            console.log('[배경색] 4코너 결과:', hex,
                `(코너픽셀: ${cornerPixels.length}, fallback: ${useFallback})`);
            return hex;
        } catch (error) {
            console.warn('배경색 추출 오류:', error);
            return '#FFFFFF';
        }
    },

    /**
     * 캔버스 영역에서 텍스트 색상 추출
     * [Fix-New] 임계값 40(연한 색도 캐치), WCAG 강제 흑/백 제거 → 실제 색상 보존
     * @param {HTMLCanvasElement} canvas
     * @param {Object} rect - { x, y, width, height }
     * @param {string} backgroundColor - 이미 추출된 배경색
     * @returns {string} - hex 색상 (#RRGGBB)
     */
    extractTextColor(canvas, rect, backgroundColor) {
        const ctx = canvas.getContext('2d');

        // [Fix-New] Utils.cssToCanvas 활용
        const { x, y, width, height } = Utils.cssToCanvas(canvas, rect.x, rect.y, rect.width, rect.height);

        if (width < 5 || height < 5) {
            return '#000000';
        }

        try {
            // 배경색 RGB 파싱
            const bgR = parseInt(backgroundColor.substring(1, 3), 16);
            const bgG = parseInt(backgroundColor.substring(3, 5), 16);
            const bgB = parseInt(backgroundColor.substring(5, 7), 16);

            // 배경 가장자리 텍스트 오염 최소화 (Config 비율 참고)
            const marginX = Math.floor((1 - ALGO_CONFIG.textInnerRatio) / 2 * width);
            const marginY = Math.floor((1 - ALGO_CONFIG.textInnerRatio) / 2 * height);
            const innerX = x + marginX;
            const innerY = y + marginY;
            const innerWidth = Math.max(1, Math.floor(width * ALGO_CONFIG.textInnerRatio));
            const innerHeight = Math.max(1, Math.floor(height * ALGO_CONFIG.textInnerRatio));

            const imageData = ctx.getImageData(innerX, innerY, innerWidth, innerHeight).data;

            // 배경과 다른 픽셀 수집
            const textColors = [];
            const threshold = ALGO_CONFIG.textDiffThreshold;

            for (let i = 0; i < imageData.length; i += 4) {
                const alpha = imageData[i + 3];
                if (alpha < 128) continue;

                const r = imageData[i], g = imageData[i + 1], b = imageData[i + 2];
                const diff = Math.sqrt(
                    Math.pow(r - bgR, 2) + Math.pow(g - bgG, 2) + Math.pow(b - bgB, 2)
                );
                if (diff > threshold) textColors.push([r, g, b]);
            }

            if (textColors.length === 0) {
                // 완전히 추출 불가능한 경우에만 배경 기반 fallback
                const bgBrightness = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;
                return bgBrightness > 128 ? '#000000' : '#FFFFFF';
            }

            // 설정된 단계 양자화 히스토그램 → 최빈값
            const colorCounts = {};
            const QUANT = ALGO_CONFIG.textQuantStep;
            for (const [r, g, b] of textColors) {
                const key = `${Math.round(r / QUANT) * QUANT},${Math.round(g / QUANT) * QUANT},${Math.round(b / QUANT) * QUANT}`;
                colorCounts[key] = (colorCounts[key] || 0) + 1;
            }

            const [topColorKey] = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0];
            const [tr, tg, tb] = topColorKey.split(',').map(Number);

            const textHex = '#' + [tr, tg, tb].map(c =>
                Math.min(255, c).toString(16).padStart(2, '0')
            ).join('').toUpperCase();

            // WCAG 대비비 참고 로그 (강제 변환 없음)
            const getL = (r, g, b) => {
                const s = [r, g, b].map(c => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
                return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
            };
            const L1 = getL(tr, tg, tb), L2 = getL(bgR, bgG, bgB);
            const contrast = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
            console.log('[폰트색] 추출:', textHex, '| 대비비:', contrast.toFixed(2),
                '| 후보픽셀:', textColors.length);

            // [Fix-New] WCAG 강제 변환 제거 — 실제 추출된 색상 그대로 사용
            return textHex;
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
     * Canvas 픽셀 밀도로 Bold 여부 추정 (PDF 폰트명 파싱 실패 시 보조 감지)
     * [Fix-3] 글자 픽셀(배경과 다른 픽셀) 밀도가 높으면 Bold로 추정
     * @param {HTMLCanvasElement} canvas
     * @param {Object} rect - { x, y, width, height }
     * @param {string} backgroundColor - 배경색 hex
     * @returns {boolean}
     */
    estimateIsBold(canvas, rect, backgroundColor) {
        try {
            const ctx = canvas.getContext('2d');

            // [Fix-New] Utils.cssToCanvas 활용
            const { x: cx, y: cy, width: cw, height: ch } = Utils.cssToCanvas(canvas, rect.x, rect.y, rect.width, rect.height);

            const marginX = Math.floor((1 - ALGO_CONFIG.textInnerRatio) / 2 * cw);
            const marginY = Math.floor((1 - ALGO_CONFIG.textInnerRatio) / 2 * ch);
            const x = cx + marginX;
            const y = cy + marginY;
            const w = Math.max(1, Math.floor(cw * ALGO_CONFIG.textInnerRatio));
            const h = Math.max(1, Math.floor(ch * ALGO_CONFIG.textInnerRatio));

            const bgR = parseInt(backgroundColor.substring(1, 3), 16);
            const bgG = parseInt(backgroundColor.substring(3, 5), 16);
            const bgB = parseInt(backgroundColor.substring(5, 7), 16);

            const data = ctx.getImageData(x, y, w, h).data;
            let totalPixels = 0, darkPixels = 0;

            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] < 128) continue;
                totalPixels++;
                const diff = Math.sqrt(
                    Math.pow(data[i] - bgR, 2) +
                    Math.pow(data[i + 1] - bgG, 2) +
                    Math.pow(data[i + 2] - bgB, 2)
                );
                if (diff > ALGO_CONFIG.textDiffThreshold) darkPixels++;
            }

            if (totalPixels === 0) return false;
            const density = darkPixels / totalPixels;
            console.log('[Bold 추정] 픽셀 밀도:', density.toFixed(3), `(>${ALGO_CONFIG.boldDensityThreshold} 이면 Bold)`);
            return density > ALGO_CONFIG.boldDensityThreshold;
        } catch (e) {
            return false;
        }
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
            const fontSize = overlay.size * scale;
            ctx.font = `${fontStyle}${weight} ${fontSize}px "${fontFamily}", "Noto Sans KR", sans-serif`;
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

            // [Fix-A] 영역 밖 텍스트 클리핑 — Canvas 드로잉 자체를 영역 안으로 제한
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.clip();

            // 텍스트를 영역 안에 맞게 렌더링
            const lines = this._wrapText(ctx, overlay.text, w);
            const lineHeight = fontSize * 1.2;
            const padding = 4;
            let ty = y + padding;

            for (const line of lines) {
                // [Fix-A] 다음 줄이 영역 높이를 초과하면 중단 (반쪽 잘린 행 방지)
                if (ty + fontSize > y + h - padding) break;

                ctx.fillText(line, textX, ty);

                // 밑줄 그리기
                if (overlay.isUnderline) {
                    const metrics = ctx.measureText(line);
                    let lineX = textX;
                    if (overlay.textAlign === 'center') lineX = textX - metrics.width / 2;
                    if (overlay.textAlign === 'right') lineX = textX - metrics.width;

                    ctx.beginPath();
                    ctx.strokeStyle = overlay.color;
                    ctx.lineWidth = Math.max(1, fontSize / 15);
                    const lineY = ty + fontSize * 0.95;
                    ctx.moveTo(lineX, lineY);
                    ctx.lineTo(lineX + metrics.width, lineY);
                    ctx.stroke();
                }

                ty += lineHeight;
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
     * [Phase3] Utils.wrapText()로 위임 — 중복 코드 제거
     * @private
     */
    _wrapText(ctx, text, maxWidth) {
        return Utils.wrapText(ctx, text, maxWidth, 8);
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
