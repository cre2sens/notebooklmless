/**
 * State Manager Module
 * 전역 상태를 통합하고 단방향 데이터 흐름(Unidirectional Data Flow)을 제공합니다.
 */

const STATE_DEFAULTS = {
    // 1. 도큐먼트 상태
    originalFileName: '',
    currentPage: 1,
    totalPages: 0,

    // 2. 선택 영역(Selection) 상태
    isSelecting: false,
    selectionStart: null,     // {x, y}
    selectionRect: null,      // {x, y, width, height}

    // 3. 편집(Editor) 상태 - clearSelection 시 리셋되는 항목들
    previewOverlay: null,
    textAlign: 'left',
    isBold: false,
    isItalic: false,
    isUnderline: false,
    bgOpacity: 100,
    extractedBgColor: '#FFFFFF',
    extractedTextColor: '#000000',

    // 4. 오버레이 조작 상태
    isDraggingOverlay: false,
    dragStart: null,
    isResizingOverlay: false,
    resizeHandle: null,
    currentOverlayId: null
};

class StateManager {
    constructor() {
        this.state = { ...STATE_DEFAULTS };
        this.listeners = [];
        this.history = [];          // 상태 변경 이력 (디버그용)
        this.maxHistory = 50;       // 최대 보관 건수
    }

    /**
     * 상태 변경 및 UI 동기화 트리거
     * @param {Object} updates - 변경할 상태 객체
     * @param {string} source - 디버깅용 이벤트 소스
     */
    setState(updates, source = 'unknown') {
        const prevState = { ...this.state };
        let hasChanges = false;

        for (const key in updates) {
            if (updates.hasOwnProperty(key) && this.state[key] !== updates[key]) {
                this.state[key] = updates[key];
                hasChanges = true;
            }
        }

        if (hasChanges) {
            // 디버그 히스토리에 변경 기록
            this.history.push({
                time: new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 1 }),
                source,
                changes: { ...updates }
            });
            if (this.history.length > this.maxHistory) {
                this.history.shift();
            }
            this.notifyListeners(this.state, prevState);
        }
    }

    /**
     * 특정 키의 상태값 반환
     */
    get(key) {
        return this.state[key];
    }

    /**
     * 전체 상태 반환
     */
    getAll() {
        return this.state;
    }

    /**
     * 선택/편집 상태를 완전히 초기화 (에디터 닫기)
     */
    resetEditor(source = 'resetEditor') {
        const extractParams = [
            'selectionRect', 'previewOverlay', 'textAlign', 'isBold', 'isItalic', 'isUnderline',
            'bgOpacity', 'extractedBgColor', 'extractedTextColor',
            'isDraggingOverlay', 'dragStart', 'isResizingOverlay', 'resizeHandle', 'currentOverlayId'
        ];

        const updates = {};
        for (const key of extractParams) {
            updates[key] = STATE_DEFAULTS[key];
        }

        this.setState(updates, source);
    }

    /**
     * 변경 이력 반환 (디버그용)
     */
    getHistory() {
        return this.history;
    }

    /**
     * 변경 이력 초기화
     */
    clearHistory() {
        this.history = [];
    }

    /**
     * 상태 변경 구독
     */
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notifyListeners(currentState, prevState) {
        for (const listener of this.listeners) {
            listener(currentState, prevState);
        }
    }
}

// 싱글톤 노출
window.AppState = new StateManager();
