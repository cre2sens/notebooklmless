/**
 * Utils — 공통 유틸리티 모듈
 * [Phase3] 각 모듈에서 중복 구현되던 함수들을 단일 파일로 통합
 *  - wrapText    : 텍스트 줄바꿈 (PDFHandler, TextOverlay 양쪽에서 사용)
 *  - escapeHtml  : XSS 방지용 HTML 이스케이프
 *  - debounce    : 실시간 미리보기 연속 호출 성능 최적화
 *  - clamp       : 숫자 범위 제한
 */

const Utils = {

    /**
     * Canvas 2D Context 기준 텍스트 줄바꿈
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} text
     * @param {number} maxWidth  - 최대 폭 (px, 내부 패딩 제외한 순수 렌더 폭)
     * @param {number} [padding=8] - 좌우 패딩 합계 (px)
     * @returns {string[]}
     */
    wrapText(ctx, text, maxWidth, padding = 8) {
        const lines = [];
        const effectiveWidth = maxWidth - padding;
        const paragraphs = text.split('\n');

        for (const paragraph of paragraphs) {
            const chars = paragraph.split('');
            let currentLine = '';

            for (const char of chars) {
                const testLine = currentLine + char;
                const { width } = ctx.measureText(testLine);

                if (width > effectiveWidth && currentLine) {
                    lines.push(currentLine);
                    currentLine = char;
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) lines.push(currentLine);
        }

        return lines;
    },

    /**
     * XSS 방지용 HTML 특수문자 이스케이프
     * @param {string} str
     * @returns {string}
     */
    escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    /**
     * 연속 호출을 지연 처리하는 debounce
     * @param {Function} fn
     * @param {number} delay - 지연 시간 (ms)
     * @returns {Function}
     */
    debounce(fn, delay) {
        let timer = null;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    /**
     * 숫자를 min~max 범위로 제한
     * @param {number} value
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    /**
     * DOM CSS 좌표를 Canvas 내부 좌표로 변환
     */
    cssToCanvas(canvas, cssX, cssY, cssWidth = 0, cssHeight = 0) {
        const cssRect = canvas.getBoundingClientRect();
        const ratioX = canvas.width / cssRect.width;
        const ratioY = canvas.height / cssRect.height;

        return {
            x: Math.floor(cssX * ratioX),
            y: Math.floor(cssY * ratioY),
            width: Math.floor(cssWidth * ratioX),
            height: Math.floor(cssHeight * ratioY)
        };
    },

    /**
     * Canvas 해상도 좌표를 PDF 좌표(스케일 복원 유무 선택)로 변환
     */
    canvasToPdf(canvasX, canvasY, canvasWidth, canvasHeight, scale) {
        return {
            x: canvasX / scale,
            y: canvasY / scale,
            width: canvasWidth / scale,
            height: canvasHeight / scale
        };
    },

    /**
     * PDF 좌표기반 렌더 좌표를 Canvas Y 반전 좌표로 보정
     * (pdf.js getViewport 등은 PDF 원점 좌하단을 기준으로 동작하는 경우가 있음)
     */
    pdfPointToCanvasPoint(pdfX, pdfY, scale, viewportHeight) {
        return {
            x: pdfX * scale,
            y: viewportHeight - (pdfY * scale)
        };
    },

    /**
     * 마우스 이벤트로부터 캔버스 기준 CSS 좌표를 계산
     * (반복되는 e.clientX - canvasRect.left 패턴을 통합)
     * @param {HTMLCanvasElement} canvas
     * @param {MouseEvent} event
     * @returns {{ x: number, y: number }}
     */
    getMousePosOnCanvas(canvas, event) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }
};

window.Utils = Utils;
