/**
 * Main Application
 * NotebookLM 슬라이드 닥터
 */

(function () {
    'use strict';

    // DOM Elements
    const elements = {
        // Upload
        uploadArea: document.getElementById('uploadArea'),
        fileInput: document.getElementById('fileInput'),

        // Canvas
        canvasContainer: document.getElementById('canvasContainer'),
        pdfCanvas: document.getElementById('pdfCanvas'),
        overlayCanvas: document.getElementById('overlayCanvas'),
        selectionBox: document.getElementById('selectionBox'),
        canvasControls: document.getElementById('canvasControls'),

        // Thumbnails
        thumbnailContainer: document.getElementById('thumbnailContainer'),
        pageCount: document.getElementById('pageCount'),

        // Controls
        zoomInBtn: document.getElementById('zoomInBtn'),
        zoomOutBtn: document.getElementById('zoomOutBtn'),
        zoomSlider: document.getElementById('zoomSlider'),
        zoomLevel: document.getElementById('zoomLevel'),
        fitScreenBtn: document.getElementById('fitScreenBtn'),
        downloadBtn: document.getElementById('downloadBtn'),
        applyBtn: document.getElementById('applyBtn'),
        applyAllBtn: document.getElementById('applyAllBtn'),
        resetBtn: document.getElementById('resetBtn'),

        // Editor
        editorContent: document.getElementById('editorContent'),
        editorForm: document.getElementById('editorForm'),
        ocrResult: document.getElementById('ocrResult'),
        textInput: document.getElementById('textInput'),
        fontSelect: document.getElementById('fontSelect'),
        fontWarning: document.getElementById('fontWarning'),
        fontDownloadLink: document.getElementById('fontDownloadLink'),
        fontSize: document.getElementById('fontSize'),
        fontColor: document.getElementById('fontColor'),
        previewBtn: document.getElementById('previewBtn'),
        // applyBtn은 위의 elements.applyBtn(33번째 줄)과 중복 선언이었으므로 제거 [Fix-1]
        themeToggleBtn: document.getElementById('themeToggleBtn'),

        // Rich Text Controls
        btnBold: document.getElementById('btnBold'),
        btnItalic: document.getElementById('btnItalic'),
        btnUnderline: document.getElementById('btnUnderline'),
        btnAlignLeft: document.getElementById('btnAlignLeft'),
        btnAlignCenter: document.getElementById('btnAlignCenter'),
        btnAlignRight: document.getElementById('btnAlignRight'),
        bgOpacity: document.getElementById('bgOpacity'),
        bgOpacityValue: document.getElementById('bgOpacityValue'),

        // Overlay List
        overlayList: document.getElementById('overlayList'),
        overlayItems: document.getElementById('overlayItems'),
        clearAllBtn: document.getElementById('clearAllBtn'),

        // Loading & Toast
        loadingOverlay: document.getElementById('loadingOverlay'),
        loadingText: document.getElementById('loadingText'),
        toastContainer: document.getElementById('toastContainer'),

        // ── 신규 UI v2 요소 ──
        // 단축키 패널
        shortcutHelpBtn: document.getElementById('shortcutHelpBtn'),
        kbdPanel: document.getElementById('kbdPanel'),
        kbdBackdrop: document.getElementById('kbdBackdrop'),
        kbdCloseBtn: document.getElementById('kbdCloseBtn'),

        // 패널 접기
        panelLeft: document.getElementById('panelLeft'),
        collapseLeftBtn: document.getElementById('collapseLeftBtn'),

        // 폰트 크기 스피너
        fontSizeDecBtn: document.getElementById('fontSizeDecBtn'),
        fontSizeIncBtn: document.getElementById('fontSizeIncBtn'),
        fontColorHex: document.getElementById('fontColorHex'),
        colorPresets: document.getElementById('colorPresets'),
        bgColorPresets: document.getElementById('bgColorPresets'),

        // 배경색 편집
        bgColor: document.getElementById('bgColor'),
        bgColorHex: document.getElementById('bgColorHex'),

        // 스포이드 (EyeDropper)
        eyeDropperFontBtn: document.getElementById('eyeDropperFontBtn'),
        eyeDropperBgBtn: document.getElementById('eyeDropperBgBtn'),

        // OCR 신뢰도
        ocrConfidence: document.getElementById('ocrConfidence'),

        // 스텝바
        step1: document.getElementById('step1'),
        step2: document.getElementById('step2'),
        step3: document.getElementById('step3'),
        step4: document.getElementById('step4'),

        // ── 디버그 콘솔 ──
        debugPanel: document.getElementById('debugPanel'),
        debugCloseBtn: document.getElementById('debugCloseBtn'),
        debugClearBtn: document.getElementById('debugClearBtn'),
        debugStateView: document.getElementById('debugStateView'),
        debugLogView: document.getElementById('debugLogView'),
        debugLogCount: document.getElementById('debugLogCount')
    };

    // Application State
    // Application State는 이제 js/state-manager.js의 AppState 싱글톤이 담당합니다.

    // ========================================
    // Initialization
    // ========================================

    function init() {
        // ── 필수 라이브러리 로딩 확인 (초기화 전 진단) ──
        const libCheck = [
            { name: 'PDF.js (pdfjsLib)', loaded: typeof pdfjsLib !== 'undefined' },
            { name: 'pdf-lib (PDFLib)', loaded: typeof PDFLib !== 'undefined' },
            { name: 'Tesseract.js', loaded: typeof Tesseract !== 'undefined' }
        ];
        const failed = libCheck.filter(l => !l.loaded);
        if (failed.length > 0) {
            const msg = '⚠️ 필수 라이브러리 로딩 실패:\n' +
                failed.map(l => '  • ' + l.name).join('\n') +
                '\n\n인터넷 연결을 확인하거나 페이지를 새로고침해 주세요.\n(Chrome 브라우저에서 HTTP 서버로 실행하면 더 안정적입니다)';
            alert(msg);
            console.error('라이브러리 로딩 실패:', failed.map(l => l.name));
        }
        libCheck.forEach(l => console.log('[초기화]', l.name, l.loaded ? '✅' : '❌ 로딩 실패'));

        // 테마 초기화
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        }

        bindEvents();
        AppState.subscribe(syncUI);
        console.log('NotebookLM 슬라이드 닥터 초기화 완료');
    }

    // ========================================
    // UI 동기화 (단방향 데이터 흐름)
    // ========================================
    function syncUI() {
        updateToolbarUI();
        updateDebugPanel();
    }

    function bindEvents() {
        // Theme Toggle
        if (elements.themeToggleBtn) {
            elements.themeToggleBtn.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
            });
        }

        // File Upload
        elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
        elements.fileInput.addEventListener('change', handleFileSelect);

        // Drag and Drop
        elements.uploadArea.addEventListener('dragover', handleDragOver);
        elements.uploadArea.addEventListener('dragleave', handleDragLeave);
        elements.uploadArea.addEventListener('drop', handleDrop);

        // Canvas Selection
        elements.pdfCanvas.addEventListener('mousedown', handleSelectionStart);
        elements.pdfCanvas.addEventListener('mousemove', handleSelectionMove);
        elements.pdfCanvas.addEventListener('mouseup', handleSelectionEnd);
        elements.pdfCanvas.addEventListener('mouseleave', handleSelectionEnd);

        // Zoom Controls
        elements.zoomInBtn.addEventListener('click', () => handleZoom(0.25));
        elements.zoomOutBtn.addEventListener('click', () => handleZoom(-0.25));
        elements.zoomSlider.addEventListener('input', handleZoomSlider);
        elements.fitScreenBtn.addEventListener('click', handleFitToScreen);


        // Font Selection
        elements.fontSelect.addEventListener('change', handleFontChange);

        // 실시간 미리보기 업데이트
        elements.fontSize.addEventListener('input', updateLivePreview);
        elements.fontColor.addEventListener('input', updateLivePreview);

        // 배경색 편집 이벤트
        if (elements.bgColor) {
            elements.bgColor.addEventListener('input', () => {
                const c = elements.bgColor.value;
                if (elements.bgColorHex) elements.bgColorHex.value = c;
                AppState.setState({ extractedBgColor: c });
                updateLivePreview();
            });
        }
        if (elements.bgColorHex) {
            elements.bgColorHex.addEventListener('change', () => {
                let v = elements.bgColorHex.value.trim();
                if (!v.startsWith('#')) v = '#' + v;
                if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                    elements.bgColor.value = v;
                    AppState.setState({ extractedBgColor: v });
                    updateLivePreview();
                }
            });
        }
        elements.textInput.addEventListener('input', updateLivePreview);
        elements.bgOpacity.addEventListener('input', handleOpacityChange);

        // 정렬 및 스타일 버튼
        elements.btnBold.addEventListener('click', () => toggleStyle('bold'));
        elements.btnItalic.addEventListener('click', () => toggleStyle('italic'));
        elements.btnUnderline.addEventListener('click', () => toggleStyle('underline'));
        elements.btnAlignLeft.addEventListener('click', () => setAlignment('left'));
        elements.btnAlignCenter.addEventListener('click', () => setAlignment('center'));
        elements.btnAlignRight.addEventListener('click', () => setAlignment('right'));

        // 스포이드 (EyeDropper API)
        if (window.EyeDropper) {
            if (elements.eyeDropperFontBtn) {
                elements.eyeDropperFontBtn.addEventListener('click', () => handleEyeDropper('font'));
            }
            if (elements.eyeDropperBgBtn) {
                elements.eyeDropperBgBtn.addEventListener('click', () => handleEyeDropper('bg'));
            }
        } else {
            // EyeDropper API 미지원 브라우저에서는 버튼을 숨기지 않고 알림 표시
            const alertMsg = '사용 중인 브라우저 또는 환경에서 스포이드 기능(EyeDropper API)을 지원하지 않습니다. Chrome 등 지원 브라우저를 이용해 주세요.';
            if (elements.eyeDropperFontBtn) elements.eyeDropperFontBtn.addEventListener('click', () => alert(alertMsg));
            if (elements.eyeDropperBgBtn) elements.eyeDropperBgBtn.addEventListener('click', () => alert(alertMsg));
        }

        // Actions
        elements.previewBtn.addEventListener('click', handlePreview);
        elements.applyBtn.addEventListener('click', handleApply);
        elements.applyAllBtn.addEventListener('click', handleApplyAll);
        elements.resetBtn.addEventListener('click', handleReset);
        elements.downloadBtn.addEventListener('click', handleDownload);

        // Overlay 드래그 (overlayCanvas에서 처리)
        elements.overlayCanvas.addEventListener('mousedown', handleOverlayDragStart);
        elements.overlayCanvas.addEventListener('mousemove', handleOverlayDragMove);
        elements.overlayCanvas.addEventListener('mouseup', handleOverlayDragEnd);
        elements.overlayCanvas.addEventListener('mouseleave', handleOverlayDragEnd);
        elements.overlayCanvas.addEventListener('wheel', handleCanvasWheel, { passive: false });
        // downloadBtn 이벤트는 위(148번째 줄)에서 이미 등록됨 → 중복 제거 [Fix-2]
        elements.clearAllBtn.addEventListener('click', handleClearAll);

        // ─── 키보드 단축키 (Ctrl+B / Ctrl+I / Ctrl+U) [Phase4-KB] ───────────────
        document.addEventListener('keydown', (e) => {
            // ? 키 → 단축키 패널 토글 (textInput 포커스 중 제외)
            if (e.key === '?' && document.activeElement !== elements.textInput) {
                e.preventDefault();
                toggleKbdPanel();
                return;
            }
            // Escape → 단축키 패널 닫기 + 선택 영역 취소
            if (e.key === 'Escape') {
                closeKbdPanel();
                // 선택 영역이 있고 아직 적용 전이면 취소
                if (AppState.get('selectionRect') || AppState.get('previewOverlay')) {
                    clearSelection();
                }
                return;
            }

            if (!e.ctrlKey && !e.metaKey) return;

            // Ctrl+Shift+D → 디버그 콘솔 토글
            if (e.shiftKey && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                toggleDebugPanel();
                return;
            }

            const active = document.activeElement;
            if (active && active.tagName === 'SELECT') return;

            switch (e.key.toLowerCase()) {
                case 'b': e.preventDefault(); toggleStyle('bold'); break;
                case 'i': e.preventDefault(); toggleStyle('italic'); break;
                case 'u': e.preventDefault(); toggleStyle('underline'); break;
                case 'enter': // Ctrl+Enter → 적용
                    e.preventDefault();
                    if (!elements.applyBtn.disabled) handleApply();
                    break;
                case '=': // Ctrl++ (등호 키)
                case '+':
                    e.preventDefault();
                    handleZoom(0.25);
                    break;
                case '-': // Ctrl+-
                    e.preventDefault();
                    handleZoom(-0.25);
                    break;
                case '0': // Ctrl+0 → 화면 맞춤
                    e.preventDefault();
                    handleFitToScreen();
                    break;
            }
        });
        // ─────────────────────────────────────────────────────────────────────

        // ── 선택 영역 외부 클릭 시 선택 취소 ──────────────────────────────────
        document.addEventListener('mousedown', (e) => {
            // 선택 영역이 없거나 현재 드래그 중이면 무시
            if (!AppState.get('selectionRect') || AppState.get('isSelecting')) return;

            // 아래 요소 내부 클릭은 정상 작동 (선택 유지)
            const keepElements = [
                elements.pdfCanvas,      // 새 영역 드래그
                elements.overlayCanvas,  // 미리보기 드래그
                elements.selectionBox,   // 선택 박스
                elements.editorForm,     // 편집 패널
                elements.editorContent,  // 편집 영역
            ];
            const isInsideUI = keepElements.some(el => el && el.contains(e.target));
            if (!isInsideUI) {
                clearSelection();
            }
        });
        // ──────────────────────────────────────────────────────────────────────

        // ── 단축키 패널 ──
        if (elements.shortcutHelpBtn) {
            elements.shortcutHelpBtn.addEventListener('click', toggleKbdPanel);
        }
        if (elements.kbdCloseBtn) {
            elements.kbdCloseBtn.addEventListener('click', closeKbdPanel);
        }
        if (elements.kbdBackdrop) {
            elements.kbdBackdrop.addEventListener('click', closeKbdPanel);
        }

        // ── 패널 접기 ──
        if (elements.collapseLeftBtn) {
            elements.collapseLeftBtn.addEventListener('click', toggleLeftPanel);
        }

        // ── 폰트 크기 스피너 ──
        if (elements.fontSizeDecBtn) {
            elements.fontSizeDecBtn.addEventListener('click', () => {
                const cur = parseInt(elements.fontSize.value) || 24;
                elements.fontSize.value = Math.max(8, cur - 1);
                updateLivePreview();
            });
        }
        if (elements.fontSizeIncBtn) {
            elements.fontSizeIncBtn.addEventListener('click', () => {
                const cur = parseInt(elements.fontSize.value) || 24;
                elements.fontSize.value = Math.min(200, cur + 1);
                updateLivePreview();
            });
        }

        // ── 컬러 피커 ↔ HEX 입력 동기화 ──
        if (elements.fontColor && elements.fontColorHex) {
            elements.fontColor.addEventListener('input', () => {
                elements.fontColorHex.value = elements.fontColor.value;
                updateLivePreview();
            });
            elements.fontColorHex.addEventListener('input', () => {
                const hex = elements.fontColorHex.value;
                if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                    elements.fontColor.value = hex;
                    updateLivePreview();
                }
            });
        }

        // ── 컬러 프리셋 ──
        if (elements.colorPresets) {
            elements.colorPresets.addEventListener('click', (e) => {
                const preset = e.target.closest('.color-preset');
                if (!preset) return;
                const color = preset.dataset.color;
                if (!color) return;
                elements.fontColor.value = color;
                if (elements.fontColorHex) elements.fontColorHex.value = color;
                // 선택 표시
                preset.classList.add('selected');
                updateLivePreview();
            });
        }

        // ── 배경색 프리셋 ──
        if (elements.bgColorPresets) {
            elements.bgColorPresets.addEventListener('click', (e) => {
                const preset = e.target.closest('.color-preset');
                if (!preset) return;
                const color = preset.dataset.color;
                if (!color) return;

                // 투명 예외 처리
                if (color === 'transparent') {
                    AppState.setState({ extractedBgColor: 'transparent', bgOpacity: 0 });
                    if (elements.bgOpacity) elements.bgOpacity.value = 0;
                    if (elements.bgOpacityValue) elements.bgOpacityValue.textContent = '0%';
                } else {
                    elements.bgColor.value = color;
                    if (elements.bgColorHex) elements.bgColorHex.value = color;
                    AppState.setState({ extractedBgColor: color });

                    // 여태 투명 상태였다면 불투명도로 리셋
                    if (AppState.get('bgOpacity') === 0) {
                        AppState.setState({ bgOpacity: 100 });
                        if (elements.bgOpacity) elements.bgOpacity.value = 100;
                        if (elements.bgOpacityValue) elements.bgOpacityValue.textContent = '100%';
                    }
                }

                // 선택 표시
                elements.bgColorPresets.querySelectorAll('.color-preset').forEach(p => p.classList.remove('selected'));
                preset.classList.add('selected');
                updateLivePreview();
            });
        }

        // ── 디버그 콘솔 이벤트 ──
        if (elements.debugCloseBtn) {
            elements.debugCloseBtn.addEventListener('click', toggleDebugPanel);
        }
        if (elements.debugClearBtn) {
            elements.debugClearBtn.addEventListener('click', () => {
                AppState.clearHistory();
                updateDebugPanel();
            });
        }
        if (elements.debugPanel) {
            elements.debugPanel.querySelectorAll('.debug-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabName = tab.dataset.tab;
                    elements.debugPanel.querySelectorAll('.debug-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    elements.debugPanel.querySelectorAll('.debug-content').forEach(c => c.classList.remove('active'));
                    if (tabName === 'state') {
                        elements.debugStateView.classList.add('active');
                    } else {
                        elements.debugLogView.classList.add('active');
                    }
                    updateDebugPanel();
                });
            });
        }
    }

    // ========================================
    // Step Bar 관리
    // ========================================

    function setStep(stepNum) {
        const steps = [elements.step1, elements.step2, elements.step3, elements.step4];
        steps.forEach((el, idx) => {
            if (!el) return;
            const n = idx + 1;
            el.classList.remove('active', 'done');
            if (n < stepNum) el.classList.add('done');
            else if (n === stepNum) el.classList.add('active');
        });
    }

    // ========================================
    // 디버그 콘솔 (Ctrl+Shift+D)
    // ========================================

    function toggleDebugPanel() {
        if (!elements.debugPanel) return;
        const isOpen = !elements.debugPanel.hidden;
        elements.debugPanel.hidden = isOpen;
        if (!isOpen) updateDebugPanel();
    }

    function updateDebugPanel() {
        if (!elements.debugPanel || elements.debugPanel.hidden) return;

        // 상태 탭 갱신
        if (elements.debugStateView && elements.debugStateView.classList.contains('active')) {
            const state = AppState.getAll();
            // 값을 사람이 읽기 좋게 포맷팅 (null, 객체, 배열 등)
            const formatted = {};
            for (const [k, v] of Object.entries(state)) {
                if (v === null) formatted[k] = null;
                else if (typeof v === 'object') formatted[k] = v;
                else formatted[k] = v;
            }
            elements.debugStateView.textContent = JSON.stringify(formatted, null, 2);
        }

        // 로그 탭 갱신
        const history = AppState.getHistory();
        if (elements.debugLogCount) {
            elements.debugLogCount.textContent = history.length;
        }

        if (elements.debugLogView && elements.debugLogView.classList.contains('active')) {
            if (history.length === 0) {
                elements.debugLogView.innerHTML = '<div class="debug-log-empty">상태 변경 이력이 없습니다</div>';
            } else {
                // 최신 것이 위로 (역순)
                const html = history.slice().reverse().map(entry => {
                    const changesStr = Object.entries(entry.changes)
                        .map(([k, v]) => {
                            const val = v === null ? 'null'
                                : typeof v === 'object' ? JSON.stringify(v)
                                    : String(v);
                            return `${k}: ${val}`;
                        })
                        .join(', ');
                    return `<div class="debug-log-entry">` +
                        `<span class="debug-log-time">${entry.time}</span>` +
                        `<span class="debug-log-source">[${entry.source}]</span>` +
                        `<span class="debug-log-changes">${Utils.escapeHtml(changesStr)}</span>` +
                        `</div>`;
                }).join('');
                elements.debugLogView.innerHTML = html;
            }
        }
    }

    // ========================================
    // 단축키 패널 토글
    // ========================================

    function toggleKbdPanel() {
        if (!elements.kbdPanel) return;
        const isOpen = elements.kbdPanel.classList.contains('open');
        if (isOpen) closeKbdPanel();
        else openKbdPanel();
    }

    function openKbdPanel() {
        if (!elements.kbdPanel) return;
        elements.kbdPanel.classList.add('open');
        if (elements.kbdBackdrop) elements.kbdBackdrop.classList.add('open');
    }

    function closeKbdPanel() {
        if (!elements.kbdPanel) return;
        elements.kbdPanel.classList.remove('open');
        if (elements.kbdBackdrop) elements.kbdBackdrop.classList.remove('open');
    }

    // ========================================
    // 패널 접기 토글
    // ========================================

    function toggleLeftPanel() {
        if (!elements.panelLeft) return;
        const collapsed = elements.panelLeft.classList.toggle('collapsed');
        // 아이콘 방향 전환
        if (elements.collapseLeftBtn) {
            const svg = elements.collapseLeftBtn.querySelector('svg polyline');
            if (svg) {
                svg.setAttribute('points', collapsed ? '9 18 15 12 9 6' : '15 18 9 12 15 6');
            }
        }
    }

    // ========================================
    // File Handling
    // ========================================

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) loadPDF(file);
    }

    function handleDragOver(e) {
        e.preventDefault();
        elements.uploadArea.querySelector('.upload-content').classList.add('drag-over');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        elements.uploadArea.querySelector('.upload-content').classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        elements.uploadArea.querySelector('.upload-content').classList.remove('drag-over');

        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            loadPDF(file);
        } else {
            showToast('PDF 파일만 업로드할 수 있습니다.', 'error');
        }
    }

    async function loadPDF(file) {
        showLoading('PDF 로딩 중...');

        try {
            console.log('PDF 파일 로딩 시작:', file.name, file.size, 'bytes');
            AppState.setState({ originalFileName: file.name }); // 원본 파일명 저장

            const result = await PDFHandler.loadPDF(file);
            AppState.setState({ totalPages: result.numPages });
            AppState.setState({ currentPage: 1 });

            elements.pageCount.textContent = AppState.get('totalPages');

            // UI 전환
            elements.uploadArea.hidden = true;
            elements.canvasContainer.hidden = false;
            elements.canvasControls.hidden = false;
            elements.downloadBtn.disabled = false;
            setStep(2); // 스텝: 영역 선택으로

            // 썸네일 생성
            await renderThumbnails();

            // 첫 페이지 렌더링 (화면에 맞춤으로 시작)
            // await renderCurrentPage(); -> handleFitToScreen이 내부적으로 renderCurrentPage 호출
            await handleFitToScreen();

            showToast('PDF 로딩 완료', 'success');
        } catch (error) {
            console.error('PDF 로딩 실패:', error);
            // 에러 유형별 상세 메시지
            let msg = error.message || String(error);
            if (msg.includes('pdfjsLib') || msg.includes('라이브러리')) {
                msg = 'PDF.js 라이브러리가 로드되지 않았습니다. 인터넷 연결을 확인하세요.';
            } else if (msg.includes('password') || msg.includes('encrypt')) {
                msg = '암호가 설정된 PDF는 지원되지 않습니다.';
            } else if (msg.includes('Invalid PDF')) {
                msg = '유효하지 않은 PDF 파일입니다.';
            }
            showToast(`PDF 로딩 실패: ${msg}`, 'error');
        } finally {
            hideLoading();
        }
    }

    // ========================================
    // Rendering
    // ========================================

    async function renderThumbnails() {
        // [Perf-1] 썸네일 병렬 렌더링: DOM 생성 → 배치 병렬 렌더링
        elements.thumbnailContainer.innerHTML = '';
        const BATCH_SIZE = 8; // 한 번에 최대 8개 병렬 처리 (메모리 과부하 방지)

        // 1단계: 모든 DOM 요소 먼저 생성 (레이아웃 미리 확정)
        const canvasMap = new Map(); // pageNum → canvas 참조
        for (let i = 1; i <= AppState.get('totalPages'); i++) {
            const item = document.createElement('div');
            item.className = 'thumbnail-item' + (i === 1 ? ' active' : '');
            item.dataset.page = i;

            const canvas = document.createElement('canvas');
            const number = document.createElement('span');
            number.className = 'thumbnail-number';
            number.textContent = i;

            item.appendChild(canvas);
            item.appendChild(number);
            elements.thumbnailContainer.appendChild(item);
            item.addEventListener('click', () => goToPage(i));
            canvasMap.set(i, canvas);
        }

        // 2단계: BATCH_SIZE 단위로 병렬 렌더링
        for (let start = 1; start <= AppState.get('totalPages'); start += BATCH_SIZE) {
            const end = Math.min(start + BATCH_SIZE - 1, AppState.get('totalPages'));
            const batch = [];
            for (let i = start; i <= end; i++) {
                batch.push(PDFHandler.renderThumbnail(i, canvasMap.get(i)));
            }
            await Promise.all(batch);
        }
    }

    async function renderCurrentPage() {
        await PDFHandler.renderPage(AppState.get('currentPage'), elements.pdfCanvas);

        // 오버레이 캔버스 크기 동기화
        elements.overlayCanvas.width = elements.pdfCanvas.width;
        elements.overlayCanvas.height = elements.pdfCanvas.height;

        // 오버레이 캔버스 위치 동기화
        elements.overlayCanvas.style.left = elements.pdfCanvas.offsetLeft + 'px';
        elements.overlayCanvas.style.top = elements.pdfCanvas.offsetTop + 'px';

        // 기존 오버레이 렌더링
        TextOverlay.renderPageOverlays(
            elements.overlayCanvas,
            AppState.get('currentPage'),
            PDFHandler.getScale()
        );

        // 줌 레벨 표시
        updateZoomDisplay();
    }

    async function goToPage(pageNum) {
        if (pageNum < 1 || pageNum > AppState.get('totalPages')) return;

        AppState.setState({ currentPage: pageNum });

        // 썸네일 활성 상태 업데이트
        document.querySelectorAll('.thumbnail-item').forEach(item => {
            item.classList.toggle('active', parseInt(item.dataset.page) === pageNum);
        });

        await renderCurrentPage();
        clearSelection();
    }

    // ========================================
    // Zoom Controls
    // ========================================

    function updateZoomDisplay() {
        const scale = PDFHandler.getScale();
        const percent = Math.round(scale * 100);
        elements.zoomLevel.textContent = percent + '%';
        elements.zoomSlider.value = percent;
    }

    async function handleZoomSlider(e) {
        const percent = parseInt(e.target.value);
        const newScale = percent / 100;
        PDFHandler.setScale(newScale);
        await renderCurrentPage();
    }

    async function handleFitToScreen() {
        // 컨테이너 크기 가져오기
        const containerWidth = elements.canvasContainer.clientWidth - 40; // padding
        const containerHeight = elements.canvasContainer.clientHeight - 40;

        // 현재 PDF 페이지 크기 가져오기 (스케일 1 기준)
        // AppState.get('currentPage')를 명시적으로 전달하여 렌더링 전이라도 페이지 정보 획득
        const page = await PDFHandler.getPageObject(AppState.get('currentPage'));
        if (!page) return;

        const viewport = page.getViewport({ scale: 1 });
        const pageWidth = viewport.width;
        const pageHeight = viewport.height;

        // 맞춤 스케일 계산       
        const scaleX = containerWidth / pageWidth;
        const scaleY = containerHeight / pageHeight;
        const fitScale = Math.min(scaleX, scaleY, 2); // 최대 200%

        PDFHandler.setScale(Math.max(0.25, fitScale));
        await renderCurrentPage();
    }
    // Selection
    // ========================================

    function getCanvasOffset() {
        // 캔버스의 컨테이너 기준 오프셋 계산
        const containerRect = elements.canvasContainer.getBoundingClientRect();
        const canvasRect = elements.pdfCanvas.getBoundingClientRect();
        return {
            left: canvasRect.left - containerRect.left + elements.canvasContainer.scrollLeft,
            top: canvasRect.top - containerRect.top + elements.canvasContainer.scrollTop
        };
    }

    function handleSelectionStart(e) {
        // [Fix] 새 선택 시작 시 이전 previewOverlay 초기화 (Stale State 방지)
        // 이전 오버레이가 남아있으면 새 영역의 폰트가 이전 좌표에 렌더링되는 버그 발생
        AppState.setState({ previewOverlay: null });
        elements.overlayCanvas.style.pointerEvents = 'none';
        elements.overlayCanvas.style.cursor = 'default';

        const mousePos = Utils.getMousePosOnCanvas(elements.pdfCanvas, e);
        const offset = getCanvasOffset();

        AppState.setState({ isSelecting: true });
        AppState.setState({
            selectionStart: {
                x: mousePos.x,
                y: mousePos.y
            }
        });

        elements.selectionBox.hidden = false;
        elements.selectionBox.style.left = (offset.left + AppState.get('selectionStart').x) + 'px';
        elements.selectionBox.style.top = (offset.top + AppState.get('selectionStart').y) + 'px';
        elements.selectionBox.style.width = '0';
        elements.selectionBox.style.height = '0';
    }

    function handleSelectionMove(e) {
        if (!AppState.get('isSelecting')) return;

        const mousePos = Utils.getMousePosOnCanvas(elements.pdfCanvas, e);
        const offset = getCanvasOffset();

        const currentX = mousePos.x;
        const currentY = mousePos.y;

        const x = Math.min(AppState.get('selectionStart').x, currentX);
        const y = Math.min(AppState.get('selectionStart').y, currentY);
        const width = Math.abs(currentX - AppState.get('selectionStart').x);
        const height = Math.abs(currentY - AppState.get('selectionStart').y);

        elements.selectionBox.style.left = (offset.left + x) + 'px';
        elements.selectionBox.style.top = (offset.top + y) + 'px';
        elements.selectionBox.style.width = width + 'px';
        elements.selectionBox.style.height = height + 'px';

        AppState.setState({ selectionRect: { x, y, width, height } });
    }

    async function handleSelectionEnd(e) {
        if (!AppState.get('isSelecting')) return;
        AppState.setState({ isSelecting: false });

        // 최소 크기 확인
        if (!AppState.get('selectionRect') ||
            AppState.get('selectionRect').width < 10 ||
            AppState.get('selectionRect').height < 10) {
            clearSelection();
            return;
        }

        // 에디터 패널 표시
        elements.editorContent.hidden = true;
        elements.editorForm.hidden = false;
        setStep(3); // 스텝: 텍스트 편집으로

        // 배경색 및 텍스트 색상 자동 추출
        const scale = PDFHandler.getScale();
        const backgroundColor = TextOverlay.extractBackgroundColor(
            elements.pdfCanvas,
            AppState.get('selectionRect'),
            scale
        );
        const textColor = TextOverlay.extractTextColor(
            elements.pdfCanvas,
            AppState.get('selectionRect'),
            backgroundColor
        );

        // [Fix-1] 추출된 배경색을 state에 캐시 (handlePreview/handleApply에서 재사용)
        AppState.setState({ extractedBgColor: backgroundColor });

        // 추출된 색상을 입력 필드에 적용
        elements.fontColor.value = textColor;
        if (elements.fontColorHex) elements.fontColorHex.value = textColor;

        // 배경색을 배경색 피커에 동기화
        if (elements.bgColor) elements.bgColor.value = backgroundColor;
        if (elements.bgColorHex) elements.bgColorHex.value = backgroundColor;

        // OCR 수행 (이후 글자 수를 고려하여 폰트 크기가 지능적으로 설정됨)
        await performOCR();
    }

    function clearSelection() {
        elements.selectionBox.hidden = true;
        AppState.setState({ selectionRect: null });

        elements.editorContent.hidden = false;
        const emptyState = elements.editorContent.querySelector('.empty-state');
        if (emptyState) emptyState.hidden = false;

        elements.editorForm.hidden = true;

        // 미리보기 상태 초기화
        AppState.setState({ previewOverlay: null });
        AppState.setState({ isDraggingOverlay: false });
        AppState.setState({ dragStart: null });

        // 리사이즈 상태 초기화
        AppState.setState({ isResizingOverlay: false });
        AppState.setState({ resizeHandle: null });

        // 리치 텍스트 상태 초기화
        AppState.setState({ textAlign: 'left' });
        AppState.setState({ isBold: false });
        AppState.setState({ isItalic: false });
        AppState.setState({ isUnderline: false });
        AppState.setState({ bgOpacity: 100 });
        AppState.setState({ extractedBgColor: '#FFFFFF' }); // [Fix-1] 배경색 캐시 초기화

        // overlayCanvas 드래그 비활성화
        elements.overlayCanvas.style.pointerEvents = 'none';
        elements.overlayCanvas.style.cursor = 'default';
    }

    function toggleStyle(style) {
        if (style === 'bold') AppState.setState({ isBold: !AppState.get('isBold') });
        if (style === 'italic') AppState.setState({ isItalic: !AppState.get('isItalic') });
        if (style === 'underline') AppState.setState({ isUnderline: !AppState.get('isUnderline') });
        updateToolbarUI();
        updateLivePreview();
    }

    function setAlignment(align) {
        AppState.setState({ textAlign: align });
        updateToolbarUI();
        updateLivePreview();
    }

    function handleOpacityChange(e) {
        AppState.setState({ bgOpacity: parseInt(e.target.value) });
        updateToolbarUI();
        updateLivePreview();
    }

    // ========================================
    // 스포이드 (EyeDropper API)
    // ========================================
    async function handleEyeDropper(mode) {
        try {
            const eyeDropper = new EyeDropper();
            const result = await eyeDropper.open();
            const color = result.sRGBHex; // '#rrggbb' 형식

            if (mode === 'font') {
                // 글자색 적용
                elements.fontColor.value = color;
                if (elements.fontColorHex) elements.fontColorHex.value = color;
            } else if (mode === 'bg') {
                // 배경색 적용
                if (elements.bgColor) elements.bgColor.value = color;
                if (elements.bgColorHex) elements.bgColorHex.value = color;
                AppState.setState({ extractedBgColor: color });
            }

            // 라이브 프리뷰 갱신 (syncUI가 구독 중이므로 상태 변경만으로 충분)
            // font 모드는 AppState에 별도 색상 상태가 없어 수동 갱신 필요
            updateLivePreview();

            console.log(`[스포이드] ${mode === 'font' ? '글자색' : '배경색'} → ${color}`);
        } catch (err) {
            // 사용자가 ESC로 취소한 경우
            if (err.name !== 'AbortError') {
                console.error('[스포이드] 오류:', err);
            }
        }
    }

    function updateToolbarUI() {
        elements.btnBold.classList.toggle('active', AppState.get('isBold'));
        elements.btnItalic.classList.toggle('active', AppState.get('isItalic'));
        elements.btnUnderline.classList.toggle('active', AppState.get('isUnderline'));
        elements.btnAlignLeft.classList.toggle('active', AppState.get('textAlign') === 'left');
        elements.btnAlignCenter.classList.toggle('active', AppState.get('textAlign') === 'center');
        elements.btnAlignRight.classList.toggle('active', AppState.get('textAlign') === 'right');
        elements.bgOpacity.value = AppState.get('bgOpacity');
        elements.bgOpacityValue.textContent = AppState.get('bgOpacity') + '%';
    }

    // ========================================
    // OCR
    // ========================================

    async function performOCR() {
        if (!AppState.get('selectionRect')) return;

        elements.ocrResult.innerHTML = '<span class="placeholder">인식 중... (처음 실행 시 언어 데이터 다운로드)</span>';
        if (elements.ocrConfidence) elements.ocrConfidence.hidden = true;

        try {
            console.log('OCR 시작, 영역:', AppState.get('selectionRect'));
            const result = await OCRHandler.recognizeCanvasArea(
                elements.pdfCanvas,
                AppState.get('selectionRect')
            );
            console.log('OCR 결과:', result);

            // 텍스트 보정 및 문법 오류 수정 (제안)
            if (result && result.text) {
                const originalText = result.text;
                // TextCorrector를 통해 줄바꿈, 노이즈 등 정리
                const correctedText = window.TextCorrector ? window.TextCorrector.correct(originalText) : originalText;

                if (originalText !== correctedText) {
                    console.log('문법/오타 보정:', originalText, '->', correctedText);
                    result.text = correctedText;
                }
            }

            if (result && result.text && result.text.trim()) {
                const confidence = result.confidence ? result.confidence.toFixed(0) : '0';
                const level = OCRHandler.getConfidenceLevel(result.confidence || 0);

                // OCR 신뢰도 배지 업데이트
                if (elements.ocrConfidence) {
                    elements.ocrConfidence.textContent = confidence + '%';
                    elements.ocrConfidence.className = 'ocr-confidence' + (parseFloat(confidence) < 70 ? ' low' : '');
                    elements.ocrConfidence.hidden = false;
                }

                // OCR 결과 텍스트만 표시 (XSS 방지: textContent 사용)
                elements.ocrResult.textContent = result.text;
                elements.textInput.value = result.text;

                // [Fix-C] 자동 정렬: 1줄이면 중앙 정렬, 여러 줄이면 좌측 정렬 기반
                if (result.text.includes('\n')) {
                    AppState.setState({ textAlign: 'left' });
                } else {
                    AppState.setState({ textAlign: 'center' });
                }
                updateToolbarUI();

                // [Fix-B] 폰트 크기: 이진 탐색으로 영역에 꼭 맞는 최대 크기 실측 계산
                const text = result.text;
                const scale = PDFHandler.getScale();
                const rect = AppState.get('selectionRect');
                const pdfWidth = rect.width / scale;   // PDF 좌표계 너비
                const pdfHeight = rect.height / scale; // PDF 좌표계 높이
                const padding = 8;                     // 상하좌우 패딩 합계

                // 임시 Canvas에서 wrapText 기반 실측 수행
                const measureCanvas = document.createElement('canvas');
                const measureCtx = measureCanvas.getContext('2d');

                // 현재 선택된 폰트 정보
                const fontValue = elements.fontSelect.value;
                const [fontFamily] = fontValue.includes('|') ? fontValue.split('|') : [fontValue, '400'];
                const isBold = AppState.get('isBold');
                const isItalic = AppState.get('isItalic');
                const fontWeight = isBold ? 'bold' : '400';
                const fontStyleStr = isItalic ? 'italic ' : '';

                /**
                 * 주어진 폰트 크기로 wrapText 후 총 필요 높이 반환 (PDF 좌표계)
                 */
                function measureTotalHeight(fontSize) {
                    measureCtx.font = `${fontStyleStr}${fontWeight} ${fontSize}px "${fontFamily}", "Noto Sans KR", sans-serif`;
                    const lines = Utils.wrapText(measureCtx, text, pdfWidth, padding);
                    return lines.length * fontSize * 1.2 + padding;
                }

                // 이진 탐색: 영역 높이에 맞는 최대 폰트 크기 탐색
                let lo = 8, hi = 120;
                while (lo < hi - 1) {
                    const mid = Math.floor((lo + hi) / 2);
                    if (measureTotalHeight(mid) <= pdfHeight) {
                        lo = mid; // 더 크게 시도
                    } else {
                        hi = mid; // 너무 크면 줄임
                    }
                }

                // lo = 영역에 맞는 최대 폰트 크기 (최종 검증)
                const finalFontSize = measureTotalHeight(lo) <= pdfHeight ? lo : Math.max(8, lo - 1);
                elements.fontSize.value = finalFontSize;
                console.log(`[Fix-B] 폰트 크기 이진탐색 결과: ${finalFontSize}px (영역 ${pdfWidth.toFixed(0)}×${pdfHeight.toFixed(0)}pt)`);
            } else {
                elements.ocrResult.innerHTML = '<span class="placeholder">텍스트를 인식하지 못했습니다. 직접 입력해주세요.</span>';
                elements.textInput.value = '';
            }
        } catch (error) {
            console.error('OCR 오류 상세:', error);
            console.error('OCR 오류 메시지:', error.message);
            if (error.stack) console.error('OCR 오류 스택:', error.stack);

            elements.ocrResult.innerHTML = `<div class="error-message">OCR 처리 중 오류 발생. 직접 입력해주세요.<br><small>${error.message}</small></div>`;
            showToast('텍스트 인식 실패: ' + error.message, 'error');
        }

        // PDF에서 폰트 정보 추출 및 자동 적용
        try {
            const scale = PDFHandler.getScale();
            const fontInfo = await PDFHandler.getTextInfoInRect(
                AppState.get('currentPage'),
                AppState.get('selectionRect'),
                scale
            );

            if (fontInfo && fontInfo.fontName) {
                // 폰트 패밀리 및 굵기 설정
                const fontValue = `${fontInfo.fontFamily}|${fontInfo.fontWeight}`;

                // fontSelect에서 해당 옵션 찾기
                const options = Array.from(elements.fontSelect.options);
                const matchingOption = options.find(opt => opt.value === fontValue);

                if (matchingOption) {
                    elements.fontSelect.value = fontValue;
                } else {
                    // Bold 감지 시 Bold/SemiBold 옵션 우선 탐색
                    let familyOption;
                    if (fontInfo.isBold) {
                        familyOption =
                            options.find(opt => opt.value === `${fontInfo.fontFamily}|700`) ||
                            options.find(opt => opt.value === `${fontInfo.fontFamily}|600`) ||
                            options.find(opt => opt.value.startsWith(fontInfo.fontFamily) && opt.value.includes('700')) ||
                            options.find(opt => opt.value.startsWith(fontInfo.fontFamily) && opt.value.includes('600'));
                    }
                    // Bold 옵션 없으면 같은 패밀리의 아무 옵션
                    if (!familyOption) {
                        familyOption = options.find(opt => opt.value.startsWith(fontInfo.fontFamily));
                    }
                    if (familyOption) elements.fontSelect.value = familyOption.value;
                }

                // 폰트 크기 설정 (PDF에서 추출된 값 우선, 없으면 기존 계산 유지)
                if (fontInfo.fontSize && fontInfo.fontSize > 0) {
                    const suggestedSize = Math.max(12, Math.min(120, Math.round(fontInfo.fontSize)));
                    elements.fontSize.value = suggestedSize;
                }

                // Bold 버튼 상태 설정 [Fix-3: AppState.get('richTextStyles') → AppState.get('isBold')]
                if (fontInfo.isBold) {
                    elements.btnBold.classList.add('active');
                    AppState.setState({ isBold: true });
                } else {
                    elements.btnBold.classList.remove('active');
                    AppState.setState({ isBold: false });
                }

                // Italic 버튼 상태 설정 [Fix-3: AppState.get('richTextStyles') → AppState.get('isItalic')]
                if (fontInfo.isItalic) {
                    elements.btnItalic.classList.add('active');
                    AppState.setState({ isItalic: true });
                } else {
                    elements.btnItalic.classList.remove('active');
                    AppState.setState({ isItalic: false });
                }

                console.log('PDF 폰트 자동 적용:', fontValue, 'Bold:', fontInfo.isBold, 'Italic:', fontInfo.isItalic);
            } else {
                // PDF에서 폰트 정보를 추출하지 못한 경우 Canvas 픽셀밀도 보조 감지 사용
                const currentText = elements.textInput.value;
                if (currentText && currentText.trim()) {
                    const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(currentText);
                    // [Fix-3] Canvas 픽셀밀도로 Bold 추정
                    const boldEstimated = TextOverlay.estimateIsBold(
                        elements.pdfCanvas,
                        AppState.get('selectionRect'),
                        AppState.get('extractedBgColor') || '#FFFFFF'
                    );
                    if (boldEstimated) {
                        elements.fontSelect.value = hasKorean ? 'Malgun Gothic|400' : 'Noto Sans KR|400';
                        // Bold는 B 버튼 토글로 적용 (fontSelect에 따로 Bold 옵션 없는 경우)
                        const opts = Array.from(elements.fontSelect.options);
                        const boldOpt = opts.find(o => o.value === (hasKorean ? 'Pretendard|700' : 'Noto Sans KR|400'));
                        if (boldOpt) elements.fontSelect.value = boldOpt.value;
                        elements.btnBold.classList.add('active');
                        AppState.setState({ isBold: true });
                    } else {
                        elements.fontSelect.value = hasKorean ? 'Pretendard|400' : 'Noto Sans KR|400';
                        elements.btnBold.classList.remove('active');
                        AppState.setState({ isBold: false });
                    }
                    console.log('[폰트 fallback] Bold 픽셀밀도 추정:', boldEstimated);
                }
            }

            // 폰트 변경 반영 (async 함수이므로 await 필수)
            await handleFontChange();
        } catch (fontError) {
            console.warn('폰트 정보 추출 실패, 기본값 사용:', fontError);
            // 폴백: 기존 로직
            const currentText = elements.textInput.value;
            if (currentText && currentText.trim()) {
                const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(currentText);
                elements.fontSelect.value = hasKorean ? "Pretendard|400" : "Noto Sans KR|400";
            }
            await handleFontChange();
        }
    }

    // ========================================
    // Font Handling
    // ========================================

    async function handleFontChange() {
        const value = elements.fontSelect.value;
        const [family, weight] = value.includes('|') ? value.split('|') : [value, '400'];

        const fontName = family;
        const isInstalled = FontDetector.isFontInstalled(fontName);

        if (!isInstalled) {
            const info = FontDetector.getFontDownloadInfo(fontName);
            elements.fontWarning.hidden = false;
            if (info) {
                elements.fontDownloadLink.href = info.url;
                elements.fontDownloadLink.textContent = info.name;
            }
        } else {
            elements.fontWarning.hidden = true;
        }

        // 웹폰트 로드 대기 — Canvas는 폰트가 완전히 로드되어야 올바르게 렌더링됨
        try {
            const fontSpec = `${weight} 24px "${family}"`;
            await document.fonts.load(fontSpec);
            // 폴백 폰트도 미리 로드
            await document.fonts.load(`${weight} 24px "Noto Sans KR"`);
        } catch (e) {
            // 폰트 로드 실패해도 렌더링은 진행
        }

        // 선택 즉시 미리보기 반영
        if (AppState.get('previewOverlay')) {
            AppState.get('previewOverlay').fontFamily = family;
            AppState.get('previewOverlay').fontWeight = weight;
            AppState.get('previewOverlay').font = family;
            updateLivePreview();
        } else if (AppState.get('selectionRect')) {
            // 미리보기 전에 폰트를 변경한 경우: 자동으로 미리보기 생성
            handlePreview();
        }
    }

    // ========================================
    // Overlay Actions
    // ========================================

    function handlePreview() {
        if (!AppState.get('selectionRect')) return;

        const scale = PDFHandler.getScale();

        // [Fix-1] 이미 추출된 배경색 캐시 사용 (없으면 재추출)
        const backgroundColor = AppState.get('extractedBgColor') && AppState.get('extractedBgColor') !== '#FFFFFF'
            ? AppState.get('extractedBgColor')
            : TextOverlay.extractBackgroundColor(elements.pdfCanvas, AppState.get('selectionRect'), scale);

        const value = elements.fontSelect.value;
        const [family, weight] = value.includes('|') ? value.split('|') : [value, '400'];

        const overlay = {
            x: AppState.get('selectionRect').x / scale,
            y: AppState.get('selectionRect').y / scale,
            width: AppState.get('selectionRect').width / scale,
            height: AppState.get('selectionRect').height / scale,
            text: elements.textInput.value,
            font: family,          // 호환성
            fontFamily: family,    // 신규
            fontWeight: weight,    // 신규
            size: parseInt(elements.fontSize.value) || 24, // [Fix] NaN 방어
            color: elements.fontColor.value,
            backgroundColor: backgroundColor,
            textAlign: AppState.get('textAlign'),
            isBold: AppState.get('isBold'),
            isItalic: AppState.get('isItalic'),
            isUnderline: AppState.get('isUnderline'),
            bgOpacity: AppState.get('bgOpacity')
        };

        // 미리보기 상태 저장 (드래그 가능하도록)
        AppState.setState({ previewOverlay: overlay });

        // overlayCanvas를 클릭 가능하도록 설정
        elements.overlayCanvas.style.pointerEvents = 'auto';
        elements.overlayCanvas.style.cursor = 'move';

        // 선택 박스 숨기기
        elements.selectionBox.hidden = true;

        renderPreviewOverlay();
    }

    function renderPreviewOverlay() {
        const scale = PDFHandler.getScale();
        const ctx = elements.overlayCanvas.getContext('2d');
        ctx.clearRect(0, 0, elements.overlayCanvas.width, elements.overlayCanvas.height);

        // 기존 오버레이 렌더링
        TextOverlay.renderPageOverlays(elements.overlayCanvas, AppState.get('currentPage'), scale);

        // 미리보기 렌더링
        if (AppState.get('previewOverlay')) {
            TextOverlay.renderPreview(elements.overlayCanvas, AppState.get('previewOverlay'), scale);
        }
    }

    function updateLivePreview() {
        // [Fix] previewOverlay가 없고 selectionRect가 있으면 미리보기 자동 생성
        if (!AppState.get('previewOverlay')) {
            if (AppState.get('selectionRect')) handlePreview();
            return;
        }

        // 현재 입력 값으로 오버레이 업데이트
        AppState.get('previewOverlay').text = elements.textInput.value;

        const value = elements.fontSelect.value;
        const [family, weight] = value.includes('|') ? value.split('|') : [value, '400'];

        AppState.get('previewOverlay').font = family;
        AppState.get('previewOverlay').fontFamily = family;
        AppState.get('previewOverlay').fontWeight = weight;

        AppState.get('previewOverlay').size = parseInt(elements.fontSize.value) || 24;
        AppState.get('previewOverlay').color = elements.fontColor.value;
        AppState.get('previewOverlay').textAlign = AppState.get('textAlign');
        AppState.get('previewOverlay').isBold = AppState.get('isBold');
        AppState.get('previewOverlay').isItalic = AppState.get('isItalic');
        AppState.get('previewOverlay').isUnderline = AppState.get('isUnderline');
        AppState.get('previewOverlay').bgOpacity = AppState.get('bgOpacity');
        AppState.get('previewOverlay').backgroundColor = AppState.get('extractedBgColor') || AppState.get('previewOverlay').backgroundColor;

        renderPreviewOverlay();
    }

    // ========================================
    // Overlay Dragging
    // ========================================

    function handleOverlayDragStart(e) {
        if (!AppState.get('previewOverlay')) return;

        const scale = PDFHandler.getScale();
        const mousePos = Utils.getMousePosOnCanvas(elements.overlayCanvas, e);
        const mouseX = mousePos.x;
        const mouseY = mousePos.y;

        // 리사이즈 핸들 체크
        const handle = TextOverlay.getResizeHandle(AppState.get('previewOverlay'), mouseX, mouseY, scale);

        if (handle) {
            // 리사이즈 모드
            AppState.setState({ isResizingOverlay: true });
            AppState.setState({ resizeHandle: handle });
            AppState.setState({
                dragStart: {
                    x: mouseX,
                    y: mouseY,
                    overlayX: AppState.get('previewOverlay').x,
                    overlayY: AppState.get('previewOverlay').y,
                    overlayWidth: AppState.get('previewOverlay').width,
                    overlayHeight: AppState.get('previewOverlay').height
                }
            });
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // 오버레이 영역 내부인지 확인 (드래그 모드)
        const ox = AppState.get('previewOverlay').x * scale;
        const oy = AppState.get('previewOverlay').y * scale;
        const ow = AppState.get('previewOverlay').width * scale;
        const oh = AppState.get('previewOverlay').height * scale;

        if (mouseX >= ox && mouseX <= ox + ow &&
            mouseY >= oy && mouseY <= oy + oh) {
            AppState.setState({ isDraggingOverlay: true });
            AppState.setState({
                dragStart: {
                    x: mouseX,
                    y: mouseY,
                    overlayX: AppState.get('previewOverlay').x,
                    overlayY: AppState.get('previewOverlay').y
                }
            });
            e.preventDefault();
            e.stopPropagation();
        }
    }

    function handleOverlayDragMove(e) {
        const scale = PDFHandler.getScale();
        const mousePos = Utils.getMousePosOnCanvas(elements.overlayCanvas, e);
        const mouseX = mousePos.x;
        const mouseY = mousePos.y;

        // 리사이즈 중
        if (AppState.get('isResizingOverlay') && AppState.get('previewOverlay')) {
            const deltaX = (mouseX - AppState.get('dragStart').x) / scale;
            const deltaY = (mouseY - AppState.get('dragStart').y) / scale;

            // 핸들에 따라 크기/위치 조정
            const handle = AppState.get('resizeHandle');
            let newX = AppState.get('dragStart').overlayX;
            let newY = AppState.get('dragStart').overlayY;
            let newW = AppState.get('dragStart').overlayWidth;
            let newH = AppState.get('dragStart').overlayHeight;

            // 수평 리사이즈
            if (handle.includes('w')) {
                newX = AppState.get('dragStart').overlayX + deltaX;
                newW = AppState.get('dragStart').overlayWidth - deltaX;
            } else if (handle.includes('e')) {
                newW = AppState.get('dragStart').overlayWidth + deltaX;
            }

            // 수직 리사이즈
            if (handle.includes('n')) {
                newY = AppState.get('dragStart').overlayY + deltaY;
                newH = AppState.get('dragStart').overlayHeight - deltaY;
            } else if (handle.includes('s')) {
                newH = AppState.get('dragStart').overlayHeight + deltaY;
            }

            // 최소 크기 제한
            const minSize = 20;
            if (newW >= minSize && newH >= minSize) {
                AppState.get('previewOverlay').x = newX;
                AppState.get('previewOverlay').y = newY;
                AppState.get('previewOverlay').width = newW;
                AppState.get('previewOverlay').height = newH;

                // selectionRect도 업데이트
                AppState.get('selectionRect').x = newX * scale;
                AppState.get('selectionRect').y = newY * scale;
                AppState.get('selectionRect').width = newW * scale;
                AppState.get('selectionRect').height = newH * scale;
            }

            renderPreviewOverlay();
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // 드래그 중
        if (AppState.get('isDraggingOverlay') && AppState.get('previewOverlay')) {
            // 이동량 계산
            const deltaX = (mouseX - AppState.get('dragStart').x) / scale;
            const deltaY = (mouseY - AppState.get('dragStart').y) / scale;

            // 새 위치 계산
            AppState.get('previewOverlay').x = AppState.get('dragStart').overlayX + deltaX;
            AppState.get('previewOverlay').y = AppState.get('dragStart').overlayY + deltaY;

            // selectionRect도 업데이트 (apply에서 사용)
            AppState.get('selectionRect').x = AppState.get('previewOverlay').x * scale;
            AppState.get('selectionRect').y = AppState.get('previewOverlay').y * scale;

            // 재렌더링
            renderPreviewOverlay();

            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // 커서 변경 (호버 시)
        if (AppState.get('previewOverlay')) {
            const handle = TextOverlay.getResizeHandle(AppState.get('previewOverlay'), mouseX, mouseY, scale);
            if (handle) {
                elements.overlayCanvas.style.cursor = TextOverlay.getResizeCursor(handle);
            } else {
                // 오버레이 영역 내부인지 확인
                const ox = AppState.get('previewOverlay').x * scale;
                const oy = AppState.get('previewOverlay').y * scale;
                const ow = AppState.get('previewOverlay').width * scale;
                const oh = AppState.get('previewOverlay').height * scale;

                if (mouseX >= ox && mouseX <= ox + ow &&
                    mouseY >= oy && mouseY <= oy + oh) {
                    elements.overlayCanvas.style.cursor = 'move';
                } else {
                    elements.overlayCanvas.style.cursor = 'default';
                }
            }
        }
    }

    function handleOverlayDragEnd(e) {
        if (AppState.get('isDraggingOverlay') || AppState.get('isResizingOverlay')) {
            AppState.setState({ isDraggingOverlay: false });
            AppState.setState({ isResizingOverlay: false });
            AppState.setState({ resizeHandle: null });
            AppState.setState({ dragStart: null });
        }
    }

    function handleCanvasWheel(e) {
        // 편집 상태(미리보기 오버레이가 있을 때)에서만 작동
        if (!AppState.get('previewOverlay')) return;

        // 브라우저 기본 스크롤 방지
        e.preventDefault();

        // 휠 방향에 따라 크기 조절 (위로: 증가, 아래로: 감소)
        const delta = e.deltaY < 0 ? 1 : -1;
        let currentSize = parseInt(elements.fontSize.value) || 24;
        let newSize = currentSize + delta;

        // 범위 제한 (8px ~ 200px)
        newSize = Math.max(8, Math.min(200, newSize));

        if (newSize !== currentSize) {
            elements.fontSize.value = newSize;
            updateLivePreview();

            // 툴팁이나 토스트로 현재 크기 표시 (선택 사항 - 여기서는 간단히 로깅)
            console.log('휠로 폰트 크기 조절:', newSize);
        }
    }

    async function handleApplyAll() {
        if (!AppState.get('selectionRect') && !AppState.get('previewOverlay')) {
            showToast('워터마크 영역을 먼저 드래그하여 선택해 주세요.', 'info');
            return;
        }

        if (!confirm(`모든 페이지(${AppState.get('totalPages')}장)의 해당 위치를 배경색으로 덮어씁니다. 진행하시겠습니까?`)) {
            return;
        }

        showLoading('모든 페이지 적용 중...');

        try {
            const scale = PDFHandler.getScale();
            const rect = AppState.get('previewOverlay') ? {
                x: AppState.get('previewOverlay').x * scale,
                y: AppState.get('previewOverlay').y * scale,
                width: AppState.get('previewOverlay').width * scale,
                height: AppState.get('previewOverlay').height * scale
            } : AppState.get('selectionRect');

            const baseOptions = {
                text: '', // 워터마크 제거이므로 텍스트 비움
                font: 'Pretendard',
                size: 1,
                color: '#000000',
                bgOpacity: 100
            };

            // 모든 페이지 순회
            for (let p = 1; p <= AppState.get('totalPages'); p++) {
                // 각 페이지의 해당 위치 배경색 추출
                const bgColor = await PDFHandler.getBackgroundColorAt(p, rect, scale);

                const overlayData = {
                    rect: {
                        x: rect.x / scale,
                        y: rect.y / scale,
                        width: rect.width / scale,
                        height: rect.height / scale
                    },
                    options: { ...baseOptions, backgroundColor: bgColor }
                };

                TextOverlay.create(p, overlayData.rect, overlayData.options);

                // 진행도 표시
                if (p % 5 === 0 || p === AppState.get('totalPages')) {
                    showLoading(`처리 중... (${p}/${AppState.get('totalPages')})`);
                }
            }

            // UI 업데이트
            updateOverlayList();

            // 현재 페이지 재렌더링
            const ctx = elements.overlayCanvas.getContext('2d');
            ctx.clearRect(0, 0, elements.overlayCanvas.width, elements.overlayCanvas.height);
            TextOverlay.renderPageOverlays(elements.overlayCanvas, AppState.get('currentPage'), scale);

            showToast('모든 페이지에 적용되었습니다.', 'success');
        } catch (error) {
            console.error('일괄 적용 중 오류 발생:', error);
            showToast('일괄 적용 실패: ' + error.message, 'error');
        } finally {
            hideLoading();
            clearSelection();
            elements.selectionBox.hidden = true;
        }
    }

    function handleApply() {
        if (!AppState.get('selectionRect') && !AppState.get('previewOverlay')) return;

        try {
            const scale = PDFHandler.getScale();

            let overlayData;

            // 미리보기 오버레이가 있으면 그 데이터 사용 (드래그로 이동된 위치 반영)
            if (AppState.get('previewOverlay')) {
                overlayData = {
                    rect: {
                        x: AppState.get('previewOverlay').x,
                        y: AppState.get('previewOverlay').y,
                        width: AppState.get('previewOverlay').width,
                        height: AppState.get('previewOverlay').height
                    },
                    options: {
                        text: elements.textInput.value,
                        font: AppState.get('previewOverlay').fontFamily || AppState.get('previewOverlay').font,
                        fontFamily: AppState.get('previewOverlay').fontFamily || AppState.get('previewOverlay').font,
                        fontWeight: AppState.get('previewOverlay').fontWeight || '400',
                        size: parseInt(elements.fontSize.value),
                        color: elements.fontColor.value,
                        backgroundColor: AppState.get('previewOverlay').backgroundColor,
                        textAlign: AppState.get('textAlign'),
                        isBold: AppState.get('isBold'),
                        isItalic: AppState.get('isItalic'),
                        bgOpacity: AppState.get('bgOpacity')
                    }
                };
            } else {
                // 미리보기 없이 바로 적용하는 경우
                const backgroundColor = TextOverlay.extractBackgroundColor(
                    elements.pdfCanvas,
                    AppState.get('selectionRect'),
                    scale
                );
                overlayData = {
                    rect: {
                        x: AppState.get('selectionRect').x / scale,
                        y: AppState.get('selectionRect').y / scale,
                        width: AppState.get('selectionRect').width / scale,
                        height: AppState.get('selectionRect').height / scale
                    },
                    options: {
                        text: elements.textInput.value,
                        font: elements.fontSelect.value.split('|')[0], // 호환성
                        fontFamily: elements.fontSelect.value.split('|')[0],
                        fontWeight: elements.fontSelect.value.split('|')[1] || '400',
                        size: parseInt(elements.fontSize.value),
                        color: elements.fontColor.value,
                        backgroundColor: backgroundColor,
                        textAlign: AppState.get('textAlign'),
                        isBold: AppState.get('isBold'),
                        isItalic: AppState.get('isItalic'),
                        bgOpacity: AppState.get('bgOpacity')
                    }
                };
            }

            const overlay = TextOverlay.create(AppState.get('currentPage'), overlayData.rect, overlayData.options);

            // 오버레이 목록 업데이트
            updateOverlayList();

            // 캔버스 재렌더링
            const ctx = elements.overlayCanvas.getContext('2d');
            ctx.clearRect(0, 0, elements.overlayCanvas.width, elements.overlayCanvas.height);
            TextOverlay.renderPageOverlays(elements.overlayCanvas, AppState.get('currentPage'), scale);

            setStep(4); // 스텝: 저장 완료
            showToast('텍스트 오버레이가 적용되었습니다.', 'success');
        } catch (error) {
            console.error('적용 중 오류 발생:', error);
            showToast('적용 실패: ' + error.message, 'error');
        } finally {
            // 선택 초기화 (에러 여부와 관계없이 실행)
            clearSelection();
            // 편집선 명시적 제거
            elements.selectionBox.hidden = true;
        }
    }

    function updateOverlayList() {
        const overlays = TextOverlay.getAllOverlays();

        if (overlays.length === 0) {
            elements.overlayList.hidden = true;
            return;
        }

        elements.overlayList.hidden = false;

        // [Fix-XSS] innerHTML 대신 DOM API로 안전하게 생성 (o.text XSS 방지)
        elements.overlayItems.innerHTML = '';
        for (const o of overlays) {
            const li = document.createElement('li');
            li.dataset.id = o.id;

            // 타입 도트 (일반 편집=indigo, 워터마크=teal)
            const dot = document.createElement('span');
            dot.className = 'overlay-dot' + (o.text === '' ? ' watermark' : '');
            li.appendChild(dot);

            // 페이지 번호 배지
            const page = document.createElement('span');
            page.className = 'overlay-page';
            page.textContent = `p${o.pageNum || 1}`;
            li.appendChild(page);

            // 텍스트
            const spanText = document.createElement('span');
            spanText.className = 'overlay-text';
            spanText.title = '클릭하여 수정';
            spanText.textContent = o.text || '(워터마크 제거)';
            spanText.addEventListener('click', () => App.editOverlay(o.id));
            li.appendChild(spanText);

            // 삭제 버튼
            const btnDel = document.createElement('button');
            btnDel.className = 'overlay-delete';
            btnDel.title = '삭제';
            btnDel.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            btnDel.addEventListener('click', () => App.removeOverlay(o.id));
            li.appendChild(btnDel);

            elements.overlayItems.appendChild(li);
        }
    }

    function removeOverlay(id) {
        TextOverlay.remove(id);
        updateOverlayList();

        // 캔버스 재렌더링
        const ctx = elements.overlayCanvas.getContext('2d');
        ctx.clearRect(0, 0, elements.overlayCanvas.width, elements.overlayCanvas.height);
        TextOverlay.renderPageOverlays(elements.overlayCanvas, AppState.get('currentPage'), PDFHandler.getScale());
    }

    function editOverlay(id) {
        const overlay = TextOverlay.get(id);
        if (!overlay) return;

        // 1. 기존 오버레이 삭제 (수정 모드 진입)
        removeOverlay(id);

        // 2. 선택 영역 및 페이지 복원
        // 만약 다른 페이지라면 페이지 이동 필요
        if (AppState.get('currentPage') !== overlay.pageNum) {
            goToPage(overlay.pageNum).then(() => {
                // 페이지 이동 후 실행 (비동기 고려 필요하지만 간단히 처리)
                setupEditMode(overlay);
            });
        } else {
            setupEditMode(overlay);
        }
    }

    function setupEditMode(overlay) {
        const scale = PDFHandler.getScale();

        // 선택 영역 설정
        AppState.setState({
            selectionRect: {
                x: overlay.x * scale,
                y: overlay.y * scale,
                width: overlay.width * scale,
                height: overlay.height * scale
            }
        });

        // UI에 선택 박스 표시
        elements.selectionBox.style.left = AppState.get('selectionRect').x + 'px';
        elements.selectionBox.style.top = AppState.get('selectionRect').y + 'px';
        elements.selectionBox.style.width = AppState.get('selectionRect').width + 'px';
        elements.selectionBox.style.height = AppState.get('selectionRect').height + 'px';
        elements.selectionBox.hidden = false;

        // 폼 데이터 복원
        elements.textInput.value = overlay.text;
        elements.fontSize.value = overlay.size;
        elements.fontColor.value = overlay.color;

        const family = overlay.fontFamily || overlay.font;
        const weight = overlay.fontWeight || '400';
        // 폰트 선택값 복원 (값 매칭 확인 필요)
        // options 중에 해당 값이 있는지 확인하고 없으면 기본값? 
        // 그냥 값 설정하면 select가 알아서 매칭 (매칭 안되면 빈값)
        elements.fontSelect.value = `${family}|${weight}`;
        if (!elements.fontSelect.value) {
            // 파이프 형식이 아닐 수 있음 (구 데이터)
            elements.fontSelect.value = family;
        }

        // 리치 텍스트 상태 복원
        AppState.setState({ textAlign: overlay.textAlign || 'left' });
        AppState.setState({ isBold: !!overlay.isBold });
        AppState.setState({ isItalic: !!overlay.isItalic });
        AppState.setState({ isUnderline: !!overlay.isUnderline });
        AppState.setState({ bgOpacity: overlay.bgOpacity !== undefined ? overlay.bgOpacity : 100 });
        updateToolbarUI();

        // 에디터 UI 표시
        elements.editorContent.querySelector('.empty-state').hidden = true;
        elements.editorForm.hidden = false;
        elements.ocrResult.innerHTML = '<span class="placeholder">기존 텍스트 편집 중</span>';

        // 미리보기 강제 실행
        handlePreview();

        // 포커스
        elements.textInput.focus();
    }

    function handleClearAll() {
        TextOverlay.clearAll();
        updateOverlayList();

        const ctx = elements.overlayCanvas.getContext('2d');
        ctx.clearRect(0, 0, elements.overlayCanvas.width, elements.overlayCanvas.height);

        showToast('모든 수정 사항이 삭제되었습니다.', 'success');
    }

    // ========================================
    // Zoom
    // ========================================

    async function handleZoom(delta) {
        PDFHandler.setScale(PDFHandler.getScale() + delta);
        await renderCurrentPage(); // [Fix-5: await 추가]
        updateZoomDisplay();       // [Fix-4: 중복 함수 제거 — 위(295번째 줄)의 올바른 함수 사용]
    }

    // ========================================
    // Download
    // ========================================

    async function handleDownload() {
        showLoading('PDF 생성 중...');

        try {
            // 모든 오버레이를 PDF에 적용
            const overlays = TextOverlay.getAllOverlays();
            console.log('적용할 오버레이 수:', overlays.length);

            for (const overlay of overlays) {
                console.log('오버레이 적용 중:', overlay);
                await PDFHandler.addTextOverlay(overlay.pageNum, overlay);
            }

            // PDF 내보내기
            console.log('PDF 내보내기 시작...');
            const blob = await PDFHandler.exportPDF();
            console.log('PDF 내보내기 완료, 크기:', blob.size);

            // 다운로드
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // 파일명 생성 (원본 파일명 + _modified)
            let fileName = 'modified_slides.pdf';
            if (AppState.get('originalFileName')) {
                const baseName = AppState.get('originalFileName').replace(/\.[^/.]+$/, ""); // 확장자 제거
                fileName = `${baseName}_modified.pdf`;
            }
            a.download = fileName;

            a.click();
            URL.revokeObjectURL(url);

            showToast('PDF 다운로드 완료', 'success');
        } catch (error) {
            console.error('다운로드 오류:', error);
            console.error('오류 스택:', error.stack);
            showToast('PDF 생성 실패: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    }

    // ========================================
    // UI Helpers
    // ========================================

    function showLoading(text = '로딩 중...') {
        elements.loadingText.textContent = text;
        elements.loadingOverlay.hidden = false;
    }

    function hideLoading() {
        elements.loadingOverlay.hidden = true;
    }

    function handleReset() {
        if (!confirm('현재 편집 내용은 저장되지 않습니다.\n정말 초기화하고 새 파일을 여시겠습니까?')) {
            return;
        }

        // 1. 오버레이 초기화
        TextOverlay.clearAll();
        // updateOverlayList 호출 필요하지만 여기서 접근 가능한지 확인 (내부 함수임)
        if (typeof updateOverlayList === 'function') {
            updateOverlayList();
        }

        // 2. 캔버스 초기화
        const ctx = elements.pdfCanvas.getContext('2d');
        ctx.clearRect(0, 0, elements.pdfCanvas.width, elements.pdfCanvas.height);
        const overlayCtx = elements.overlayCanvas.getContext('2d');
        overlayCtx.clearRect(0, 0, elements.overlayCanvas.width, elements.overlayCanvas.height);

        // 3. UI 상태 복귀
        elements.uploadArea.hidden = false;
        elements.canvasContainer.hidden = true;
        elements.canvasControls.hidden = true;
        elements.downloadBtn.disabled = true;
        elements.thumbnailContainer.innerHTML = '<div class="empty-state"><p>PDF를 업로드하면<br>썸네일이 표시됩니다</p></div>';
        setStep(1); // 스텝: 업로드로 복귀
        if (elements.ocrConfidence) elements.ocrConfidence.hidden = true;
        elements.pageCount.textContent = '0';

        // 4. State 초기화
        AppState.setState({ currentPage: 1 });
        AppState.setState({ totalPages: 0 });
        AppState.setState({ selectionRect: null });
        AppState.setState({ previewOverlay: null });
        AppState.setState({ originalFileName: null });
        AppState.setState({ isDraggingOverlay: false });
        AppState.setState({ isResizingOverlay: false });

        // 5. 파일 입력 초기화
        elements.fileInput.value = '';

        showToast('초기화되었습니다.', 'success');
    }

    function showToast(message, type = 'info') {
        // 타입별 아이콘 + 제목
        const typeMap = {
            success: { icon: '✅', title: '완료' },
            error: { icon: '❌', title: '오류' },
            warning: { icon: '⚠️', title: '주의' },
            info: { icon: 'ℹ️', title: '안내' }
        };
        const meta = typeMap[type] || typeMap.info;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${meta.icon}</span>
            <div class="toast-body">
                <div class="toast-title">${meta.title}</div>
                <div class="toast-msg"></div>
            </div>
        `;
        // XSS 방지: textContent로 메시지 삽입
        toast.querySelector('.toast-msg').textContent = message;

        elements.toastContainer.appendChild(toast);

        // 3.5초 후 자동 제거
        setTimeout(() => toast.remove(), 3500);
    }

    // ========================================
    // Public API
    // ========================================

    window.App = {
        init,
        removeOverlay,
        editOverlay
    };

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', init);

})();
