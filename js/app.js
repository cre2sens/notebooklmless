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
        applyBtn: document.getElementById('applyBtn'),

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
        toastContainer: document.getElementById('toastContainer')
    };

    // Application State
    const state = {
        currentPage: 1,
        totalPages: 0,
        isSelecting: false,
        selectionStart: null,
        selectionRect: null,
        currentOverlayId: null,
        // 미리보기 오버레이 드래그 상태
        previewOverlay: null,
        isDraggingOverlay: false,
        dragStart: null,
        // 리사이즈 상태
        isResizingOverlay: false,
        resizeHandle: null,
        // 리치 텍스트 상태
        textAlign: 'left',
        isBold: false,
        isItalic: false,
        isUnderline: false,
        bgOpacity: 100
    };

    // ========================================
    // Initialization
    // ========================================

    function init() {
        bindEvents();
        console.log('NotebookLM 슬라이드 닥터 초기화 완료');
    }

    function bindEvents() {
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
        elements.textInput.addEventListener('input', updateLivePreview);
        elements.bgOpacity.addEventListener('input', handleOpacityChange);

        // 정렬 및 스타일 버튼
        elements.btnBold.addEventListener('click', () => toggleStyle('bold'));
        elements.btnItalic.addEventListener('click', () => toggleStyle('italic'));
        elements.btnUnderline.addEventListener('click', () => toggleStyle('underline'));
        elements.btnAlignLeft.addEventListener('click', () => setAlignment('left'));
        elements.btnAlignCenter.addEventListener('click', () => setAlignment('center'));
        elements.btnAlignRight.addEventListener('click', () => setAlignment('right'));

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
        elements.downloadBtn.addEventListener('click', handleDownload);
        elements.clearAllBtn.addEventListener('click', handleClearAll);
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
            state.originalFileName = file.name; // 원본 파일명 저장

            const result = await PDFHandler.loadPDF(file);
            state.totalPages = result.numPages;
            state.currentPage = 1;

            elements.pageCount.textContent = state.totalPages;

            // UI 전환
            elements.uploadArea.hidden = true;
            elements.canvasContainer.hidden = false;
            elements.canvasControls.hidden = false;
            elements.downloadBtn.disabled = false;

            // 썸네일 생성
            await renderThumbnails();

            // 첫 페이지 렌더링 (화면에 맞춤으로 시작)
            // await renderCurrentPage(); -> handleFitToScreen이 내부적으로 renderCurrentPage 호출
            await handleFitToScreen();

            showToast('PDF 로딩 완료', 'success');
        } catch (error) {
            console.error('PDF 로딩 실패:', error);
            showToast(`PDF 로딩 실패: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    }

    // ========================================
    // Rendering
    // ========================================

    async function renderThumbnails() {
        elements.thumbnailContainer.innerHTML = '';

        for (let i = 1; i <= state.totalPages; i++) {
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

            // 썸네일 렌더링
            await PDFHandler.renderThumbnail(i, canvas);

            // 클릭 이벤트
            item.addEventListener('click', () => goToPage(i));
        }
    }

    async function renderCurrentPage() {
        await PDFHandler.renderPage(state.currentPage, elements.pdfCanvas);

        // 오버레이 캔버스 크기 동기화
        elements.overlayCanvas.width = elements.pdfCanvas.width;
        elements.overlayCanvas.height = elements.pdfCanvas.height;

        // 오버레이 캔버스 위치 동기화
        elements.overlayCanvas.style.left = elements.pdfCanvas.offsetLeft + 'px';
        elements.overlayCanvas.style.top = elements.pdfCanvas.offsetTop + 'px';

        // 기존 오버레이 렌더링
        TextOverlay.renderPageOverlays(
            elements.overlayCanvas,
            state.currentPage,
            PDFHandler.getScale()
        );

        // 줌 레벨 표시
        updateZoomDisplay();
    }

    async function goToPage(pageNum) {
        if (pageNum < 1 || pageNum > state.totalPages) return;

        state.currentPage = pageNum;

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
        // state.currentPage를 명시적으로 전달하여 렌더링 전이라도 페이지 정보 획득
        const page = await PDFHandler.getPageObject(state.currentPage);
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
        const canvasRect = elements.pdfCanvas.getBoundingClientRect();
        const offset = getCanvasOffset();

        state.isSelecting = true;
        state.selectionStart = {
            x: e.clientX - canvasRect.left,
            y: e.clientY - canvasRect.top
        };

        elements.selectionBox.hidden = false;
        elements.selectionBox.style.left = (offset.left + state.selectionStart.x) + 'px';
        elements.selectionBox.style.top = (offset.top + state.selectionStart.y) + 'px';
        elements.selectionBox.style.width = '0';
        elements.selectionBox.style.height = '0';
    }

    function handleSelectionMove(e) {
        if (!state.isSelecting) return;

        const canvasRect = elements.pdfCanvas.getBoundingClientRect();
        const offset = getCanvasOffset();

        const currentX = e.clientX - canvasRect.left;
        const currentY = e.clientY - canvasRect.top;

        const x = Math.min(state.selectionStart.x, currentX);
        const y = Math.min(state.selectionStart.y, currentY);
        const width = Math.abs(currentX - state.selectionStart.x);
        const height = Math.abs(currentY - state.selectionStart.y);

        elements.selectionBox.style.left = (offset.left + x) + 'px';
        elements.selectionBox.style.top = (offset.top + y) + 'px';
        elements.selectionBox.style.width = width + 'px';
        elements.selectionBox.style.height = height + 'px';

        state.selectionRect = { x, y, width, height };
    }

    async function handleSelectionEnd(e) {
        if (!state.isSelecting) return;
        state.isSelecting = false;

        // 최소 크기 확인
        if (!state.selectionRect ||
            state.selectionRect.width < 10 ||
            state.selectionRect.height < 10) {
            clearSelection();
            return;
        }

        // 에디터 패널 표시
        elements.editorContent.hidden = true;
        elements.editorForm.hidden = false;

        // 배경색 및 텍스트 색상 자동 추출
        const scale = PDFHandler.getScale();
        const backgroundColor = TextOverlay.extractBackgroundColor(
            elements.pdfCanvas,
            state.selectionRect,
            scale
        );
        const textColor = TextOverlay.extractTextColor(
            elements.pdfCanvas,
            state.selectionRect,
            backgroundColor
        );

        // 추출된 색상을 입력 필드에 적용
        elements.fontColor.value = textColor;

        // OCR 수행 (이후 글자 수를 고려하여 폰트 크기가 지능적으로 설정됨)
        await performOCR();
    }

    function clearSelection() {
        elements.selectionBox.hidden = true;
        state.selectionRect = null;

        elements.editorContent.hidden = false;
        const emptyState = elements.editorContent.querySelector('.empty-state');
        if (emptyState) emptyState.hidden = false;

        elements.editorForm.hidden = true;

        // 미리보기 상태 초기화
        state.previewOverlay = null;
        state.isDraggingOverlay = false;
        state.dragStart = null;

        // 리사이즈 상태 초기화
        state.isResizingOverlay = false;
        state.resizeHandle = null;

        // 리치 텍스트 상태 초기화
        state.textAlign = 'left';
        state.isBold = false;
        state.isItalic = false;
        state.isUnderline = false;
        state.bgOpacity = 100;
        updateToolbarUI();

        // overlayCanvas 드래그 비활성화
        elements.overlayCanvas.style.pointerEvents = 'none';
        elements.overlayCanvas.style.cursor = 'default';

        // 캔버스 클리어 및 재렌더링
        renderPreviewOverlay();
    }

    function toggleStyle(style) {
        if (style === 'bold') state.isBold = !state.isBold;
        if (style === 'italic') state.isItalic = !state.isItalic;
        if (style === 'underline') state.isUnderline = !state.isUnderline;
        updateToolbarUI();
        updateLivePreview();
    }

    function setAlignment(align) {
        state.textAlign = align;
        updateToolbarUI();
        updateLivePreview();
    }

    function handleOpacityChange(e) {
        state.bgOpacity = parseInt(e.target.value);
        elements.bgOpacityValue.textContent = state.bgOpacity + '%';
        updateLivePreview();
    }

    function updateToolbarUI() {
        elements.btnBold.classList.toggle('active', state.isBold);
        elements.btnItalic.classList.toggle('active', state.isItalic);
        elements.btnUnderline.classList.toggle('active', state.isUnderline);
        elements.btnAlignLeft.classList.toggle('active', state.textAlign === 'left');
        elements.btnAlignCenter.classList.toggle('active', state.textAlign === 'center');
        elements.btnAlignRight.classList.toggle('active', state.textAlign === 'right');
        elements.bgOpacity.value = state.bgOpacity;
        elements.bgOpacityValue.textContent = state.bgOpacity + '%';
    }

    // ========================================
    // OCR
    // ========================================

    async function performOCR() {
        if (!state.selectionRect) return;

        elements.ocrResult.innerHTML = '<span class="placeholder">인식 중... (처음 실행 시 언어 데이터 다운로드)</span>';

        try {
            console.log('OCR 시작, 영역:', state.selectionRect);
            const result = await OCRHandler.recognizeCanvasArea(
                elements.pdfCanvas,
                state.selectionRect
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
                const confidence = result.confidence ? result.confidence.toFixed(1) : '0';
                const level = OCRHandler.getConfidenceLevel(result.confidence || 0);
                elements.ocrResult.innerHTML = `
          <div>${result.text}</div>
          <small style="color: var(--text-muted)">신뢰도: ${confidence}% (${level})</small>
        `;
                elements.textInput.value = result.text;

                // 폰트 크기 지능형 추천 (글자 수 고려)
                const text = result.text;
                const charCount = text.length;
                const scale = PDFHandler.getScale();
                const rect = state.selectionRect;
                const pdfWidth = rect.width / scale;
                const pdfHeight = rect.height / scale;

                // 텍스트 너비 대비 폰트 크기 비율 (평균 0.65)
                const charRatio = 0.65;

                // 단일 행 기준 제안 크기
                const sizeByWidth = (pdfWidth * 0.95) / (charCount * charRatio);
                const sizeByHeight = pdfHeight * 0.8;

                let suggestedSize;
                // 글자 수가 너무 많아 단일 행으로 크기가 너무 작아지는 경우 (높이 대비 40% 미만)
                if (sizeByWidth < sizeByHeight * 0.4 && charCount > 10) {
                    // 2~3행 배치를 고려하여 높이 비중 조절
                    const sizeByMultiLine = Math.min(pdfHeight * 0.4, (pdfWidth * 0.95) / (Math.ceil(charCount / 2.5) * charRatio));
                    suggestedSize = Math.max(sizeByWidth, sizeByMultiLine);
                } else {
                    suggestedSize = Math.min(sizeByWidth, sizeByHeight);
                }

                // 범위 제한 (12px ~ 120px) 및 반올림
                const finalFontSize = Math.max(12, Math.min(120, Math.round(suggestedSize)));
                elements.fontSize.value = finalFontSize;
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
                state.currentPage,
                state.selectionRect,
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
                    // 정확히 일치하는 옵션이 없으면 같은 패밀리에서 가장 가까운 굵기 선택
                    const familyOption = options.find(opt => opt.value.startsWith(fontInfo.fontFamily));
                    if (familyOption) {
                        elements.fontSelect.value = familyOption.value;
                    }
                }

                // 폰트 크기 설정 (PDF에서 추출된 값 우선, 없으면 기존 계산 유지)
                if (fontInfo.fontSize && fontInfo.fontSize > 0) {
                    const suggestedSize = Math.max(12, Math.min(120, Math.round(fontInfo.fontSize)));
                    elements.fontSize.value = suggestedSize;
                }

                // Bold 버튼 상태 설정
                if (fontInfo.isBold) {
                    elements.btnBold.classList.add('active');
                    state.richTextStyles.bold = true;
                } else {
                    elements.btnBold.classList.remove('active');
                    state.richTextStyles.bold = false;
                }

                // Italic 버튼 상태 설정
                if (fontInfo.isItalic) {
                    elements.btnItalic.classList.add('active');
                    state.richTextStyles.italic = true;
                } else {
                    elements.btnItalic.classList.remove('active');
                    state.richTextStyles.italic = false;
                }

                console.log('PDF 폰트 자동 적용:', fontValue, 'Bold:', fontInfo.isBold, 'Italic:', fontInfo.isItalic);
            } else {
                // PDF에서 폰트 정보를 추출하지 못한 경우 기존 로직 사용
                const currentText = elements.textInput.value;
                if (currentText && currentText.trim()) {
                    const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(currentText);
                    elements.fontSelect.value = hasKorean ? "Pretendard|400" : "Noto Sans KR|400";
                }
            }

            // 폰트 변경 반영
            handleFontChange();
        } catch (fontError) {
            console.warn('폰트 정보 추출 실패, 기본값 사용:', fontError);
            // 폴백: 기존 로직
            const currentText = elements.textInput.value;
            if (currentText && currentText.trim()) {
                const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(currentText);
                elements.fontSelect.value = hasKorean ? "Pretendard|400" : "Noto Sans KR|400";
            }
            handleFontChange();
        }
    }

    // ========================================
    // Font Handling
    // ========================================

    function handleFontChange() {
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

        // 선택 즉시 미리보기 반영
        if (state.previewOverlay) {
            state.previewOverlay.fontFamily = family; // 실제 폰트 패밀리
            state.previewOverlay.fontWeight = weight; // 폰트 굵기
            state.previewOverlay.font = family;       // 호환성 유지

            updateLivePreview();
        }
    }

    // ========================================
    // Overlay Actions
    // ========================================

    function handlePreview() {
        if (!state.selectionRect) return;

        const scale = PDFHandler.getScale();

        // PDF 캔버스에서 배경색 추출
        const backgroundColor = TextOverlay.extractBackgroundColor(
            elements.pdfCanvas,
            state.selectionRect,
            scale
        );

        const value = elements.fontSelect.value;
        const [family, weight] = value.includes('|') ? value.split('|') : [value, '400'];

        const overlay = {
            x: state.selectionRect.x / scale,
            y: state.selectionRect.y / scale,
            width: state.selectionRect.width / scale,
            height: state.selectionRect.height / scale,
            text: elements.textInput.value,
            font: family,          // 호환성
            fontFamily: family,    // 신규
            fontWeight: weight,    // 신규
            size: parseInt(elements.fontSize.value),
            color: elements.fontColor.value,
            backgroundColor: backgroundColor,
            textAlign: state.textAlign,
            isBold: state.isBold,
            isItalic: state.isItalic,
            isUnderline: state.isUnderline,
            bgOpacity: state.bgOpacity
        };

        // 미리보기 상태 저장 (드래그 가능하도록)
        state.previewOverlay = overlay;

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
        TextOverlay.renderPageOverlays(elements.overlayCanvas, state.currentPage, scale);

        // 미리보기 렌더링
        if (state.previewOverlay) {
            TextOverlay.renderPreview(elements.overlayCanvas, state.previewOverlay, scale);
        }
    }

    function updateLivePreview() {
        // 미리보기 오버레이가 있을 때만 실시간 업데이트
        if (!state.previewOverlay) return;

        // 현재 입력 값으로 오버레이 업데이트
        state.previewOverlay.text = elements.textInput.value;

        const value = elements.fontSelect.value;
        const [family, weight] = value.includes('|') ? value.split('|') : [value, '400'];

        state.previewOverlay.font = family;
        state.previewOverlay.fontFamily = family;
        state.previewOverlay.fontWeight = weight;

        state.previewOverlay.size = parseInt(elements.fontSize.value) || 24;
        state.previewOverlay.color = elements.fontColor.value;
        state.previewOverlay.textAlign = state.textAlign;
        state.previewOverlay.isBold = state.isBold;
        state.previewOverlay.isItalic = state.isItalic;
        state.previewOverlay.isUnderline = state.isUnderline;
        state.previewOverlay.bgOpacity = state.bgOpacity;

        renderPreviewOverlay();
    }

    // ========================================
    // Overlay Dragging
    // ========================================

    function handleOverlayDragStart(e) {
        if (!state.previewOverlay) return;

        const scale = PDFHandler.getScale();
        const canvasRect = elements.overlayCanvas.getBoundingClientRect();
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;

        // 리사이즈 핸들 체크
        const handle = TextOverlay.getResizeHandle(state.previewOverlay, mouseX, mouseY, scale);

        if (handle) {
            // 리사이즈 모드
            state.isResizingOverlay = true;
            state.resizeHandle = handle;
            state.dragStart = {
                x: mouseX,
                y: mouseY,
                overlayX: state.previewOverlay.x,
                overlayY: state.previewOverlay.y,
                overlayWidth: state.previewOverlay.width,
                overlayHeight: state.previewOverlay.height
            };
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // 오버레이 영역 내부인지 확인 (드래그 모드)
        const ox = state.previewOverlay.x * scale;
        const oy = state.previewOverlay.y * scale;
        const ow = state.previewOverlay.width * scale;
        const oh = state.previewOverlay.height * scale;

        if (mouseX >= ox && mouseX <= ox + ow &&
            mouseY >= oy && mouseY <= oy + oh) {
            state.isDraggingOverlay = true;
            state.dragStart = {
                x: mouseX,
                y: mouseY,
                overlayX: state.previewOverlay.x,
                overlayY: state.previewOverlay.y
            };
            e.preventDefault();
            e.stopPropagation();
        }
    }

    function handleOverlayDragMove(e) {
        const scale = PDFHandler.getScale();
        const canvasRect = elements.overlayCanvas.getBoundingClientRect();
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;

        // 리사이즈 중
        if (state.isResizingOverlay && state.previewOverlay) {
            const deltaX = (mouseX - state.dragStart.x) / scale;
            const deltaY = (mouseY - state.dragStart.y) / scale;

            // 핸들에 따라 크기/위치 조정
            const handle = state.resizeHandle;
            let newX = state.dragStart.overlayX;
            let newY = state.dragStart.overlayY;
            let newW = state.dragStart.overlayWidth;
            let newH = state.dragStart.overlayHeight;

            // 수평 리사이즈
            if (handle.includes('w')) {
                newX = state.dragStart.overlayX + deltaX;
                newW = state.dragStart.overlayWidth - deltaX;
            } else if (handle.includes('e')) {
                newW = state.dragStart.overlayWidth + deltaX;
            }

            // 수직 리사이즈
            if (handle.includes('n')) {
                newY = state.dragStart.overlayY + deltaY;
                newH = state.dragStart.overlayHeight - deltaY;
            } else if (handle.includes('s')) {
                newH = state.dragStart.overlayHeight + deltaY;
            }

            // 최소 크기 제한
            const minSize = 20;
            if (newW >= minSize && newH >= minSize) {
                state.previewOverlay.x = newX;
                state.previewOverlay.y = newY;
                state.previewOverlay.width = newW;
                state.previewOverlay.height = newH;

                // selectionRect도 업데이트
                state.selectionRect.x = newX * scale;
                state.selectionRect.y = newY * scale;
                state.selectionRect.width = newW * scale;
                state.selectionRect.height = newH * scale;
            }

            renderPreviewOverlay();
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // 드래그 중
        if (state.isDraggingOverlay && state.previewOverlay) {
            // 이동량 계산
            const deltaX = (mouseX - state.dragStart.x) / scale;
            const deltaY = (mouseY - state.dragStart.y) / scale;

            // 새 위치 계산
            state.previewOverlay.x = state.dragStart.overlayX + deltaX;
            state.previewOverlay.y = state.dragStart.overlayY + deltaY;

            // selectionRect도 업데이트 (apply에서 사용)
            state.selectionRect.x = state.previewOverlay.x * scale;
            state.selectionRect.y = state.previewOverlay.y * scale;

            // 재렌더링
            renderPreviewOverlay();

            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // 커서 변경 (호버 시)
        if (state.previewOverlay) {
            const handle = TextOverlay.getResizeHandle(state.previewOverlay, mouseX, mouseY, scale);
            if (handle) {
                elements.overlayCanvas.style.cursor = TextOverlay.getResizeCursor(handle);
            } else {
                // 오버레이 영역 내부인지 확인
                const ox = state.previewOverlay.x * scale;
                const oy = state.previewOverlay.y * scale;
                const ow = state.previewOverlay.width * scale;
                const oh = state.previewOverlay.height * scale;

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
        if (state.isDraggingOverlay || state.isResizingOverlay) {
            state.isDraggingOverlay = false;
            state.isResizingOverlay = false;
            state.resizeHandle = null;
            state.dragStart = null;
        }
    }

    function handleCanvasWheel(e) {
        // 편집 상태(미리보기 오버레이가 있을 때)에서만 작동
        if (!state.previewOverlay) return;

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
        if (!state.selectionRect && !state.previewOverlay) {
            showToast('워터마크 영역을 먼저 드래그하여 선택해 주세요.', 'info');
            return;
        }

        if (!confirm(`모든 페이지(${state.totalPages}장)의 해당 위치를 배경색으로 덮어씁니다. 진행하시겠습니까?`)) {
            return;
        }

        showLoading('모든 페이지 적용 중...');

        try {
            const scale = PDFHandler.getScale();
            const rect = state.previewOverlay ? {
                x: state.previewOverlay.x * scale,
                y: state.previewOverlay.y * scale,
                width: state.previewOverlay.width * scale,
                height: state.previewOverlay.height * scale
            } : state.selectionRect;

            const baseOptions = {
                text: '', // 워터마크 제거이므로 텍스트 비움
                font: 'Pretendard',
                size: 1,
                color: '#000000',
                bgOpacity: 100
            };

            // 모든 페이지 순회
            for (let p = 1; p <= state.totalPages; p++) {
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
                if (p % 5 === 0 || p === state.totalPages) {
                    showLoading(`처리 중... (${p}/${state.totalPages})`);
                }
            }

            // UI 업데이트
            updateOverlayList();

            // 현재 페이지 재렌더링
            const ctx = elements.overlayCanvas.getContext('2d');
            ctx.clearRect(0, 0, elements.overlayCanvas.width, elements.overlayCanvas.height);
            TextOverlay.renderPageOverlays(elements.overlayCanvas, state.currentPage, scale);

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
        if (!state.selectionRect && !state.previewOverlay) return;

        try {
            const scale = PDFHandler.getScale();

            let overlayData;

            // 미리보기 오버레이가 있으면 그 데이터 사용 (드래그로 이동된 위치 반영)
            if (state.previewOverlay) {
                overlayData = {
                    rect: {
                        x: state.previewOverlay.x,
                        y: state.previewOverlay.y,
                        width: state.previewOverlay.width,
                        height: state.previewOverlay.height
                    },
                    options: {
                        text: elements.textInput.value,
                        font: state.previewOverlay.fontFamily || state.previewOverlay.font,
                        fontFamily: state.previewOverlay.fontFamily || state.previewOverlay.font,
                        fontWeight: state.previewOverlay.fontWeight || '400',
                        size: parseInt(elements.fontSize.value),
                        color: elements.fontColor.value,
                        backgroundColor: state.previewOverlay.backgroundColor,
                        textAlign: state.textAlign,
                        isBold: state.isBold,
                        isItalic: state.isItalic,
                        bgOpacity: state.bgOpacity
                    }
                };
            } else {
                // 미리보기 없이 바로 적용하는 경우
                const backgroundColor = TextOverlay.extractBackgroundColor(
                    elements.pdfCanvas,
                    state.selectionRect,
                    scale
                );
                overlayData = {
                    rect: {
                        x: state.selectionRect.x / scale,
                        y: state.selectionRect.y / scale,
                        width: state.selectionRect.width / scale,
                        height: state.selectionRect.height / scale
                    },
                    options: {
                        text: elements.textInput.value,
                        font: elements.fontSelect.value.split('|')[0], // 호환성
                        fontFamily: elements.fontSelect.value.split('|')[0],
                        fontWeight: elements.fontSelect.value.split('|')[1] || '400',
                        size: parseInt(elements.fontSize.value),
                        color: elements.fontColor.value,
                        backgroundColor: backgroundColor,
                        textAlign: state.textAlign,
                        isBold: state.isBold,
                        isItalic: state.isItalic,
                        bgOpacity: state.bgOpacity
                    }
                };
            }

            const overlay = TextOverlay.create(state.currentPage, overlayData.rect, overlayData.options);

            // 오버레이 목록 업데이트
            updateOverlayList();

            // 캔버스 재렌더링
            const ctx = elements.overlayCanvas.getContext('2d');
            ctx.clearRect(0, 0, elements.overlayCanvas.width, elements.overlayCanvas.height);
            TextOverlay.renderPageOverlays(elements.overlayCanvas, state.currentPage, scale);

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
        elements.overlayItems.innerHTML = overlays.map(o => `
      <li data-id="${o.id}">
        <span class="overlay-text" onclick="App.editOverlay(${o.id})" title="클릭하여 수정">${o.text || '(빈 텍스트)'}</span>
        <span class="overlay-delete" onclick="App.removeOverlay(${o.id})">✕</span>
      </li>
    `).join('');
    }

    function removeOverlay(id) {
        TextOverlay.remove(id);
        updateOverlayList();

        // 캔버스 재렌더링
        const ctx = elements.overlayCanvas.getContext('2d');
        ctx.clearRect(0, 0, elements.overlayCanvas.width, elements.overlayCanvas.height);
        TextOverlay.renderPageOverlays(elements.overlayCanvas, state.currentPage, PDFHandler.getScale());
    }

    function editOverlay(id) {
        const overlay = TextOverlay.get(id);
        if (!overlay) return;

        // 1. 기존 오버레이 삭제 (수정 모드 진입)
        removeOverlay(id);

        // 2. 선택 영역 및 페이지 복원
        // 만약 다른 페이지라면 페이지 이동 필요
        if (state.currentPage !== overlay.pageNum) {
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
        state.selectionRect = {
            x: overlay.x * scale,
            y: overlay.y * scale,
            width: overlay.width * scale,
            height: overlay.height * scale
        };

        // UI에 선택 박스 표시
        elements.selectionBox.style.left = state.selectionRect.x + 'px';
        elements.selectionBox.style.top = state.selectionRect.y + 'px';
        elements.selectionBox.style.width = state.selectionRect.width + 'px';
        elements.selectionBox.style.height = state.selectionRect.height + 'px';
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
        state.textAlign = overlay.textAlign || 'left';
        state.isBold = !!overlay.isBold;
        state.isItalic = !!overlay.isItalic;
        state.isUnderline = !!overlay.isUnderline;
        state.bgOpacity = overlay.bgOpacity !== undefined ? overlay.bgOpacity : 100;
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

    function handleZoom(delta) {
        const newScale = PDFHandler.setScale(PDFHandler.getScale() + delta);
        updateZoomDisplay();
        renderCurrentPage();
    }

    function updateZoomDisplay() {
        const scale = PDFHandler.getScale();
        elements.zoomLevel.textContent = Math.round(scale * 100 / 1.5) + '%';
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
            if (state.originalFileName) {
                const baseName = state.originalFileName.replace(/\.[^/.]+$/, ""); // 확장자 제거
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
        elements.thumbnailContainer.innerHTML = '<div class="empty-state"><p>PDF를 업로드하세요</p></div>';
        elements.pageCount.textContent = '0';

        // 4. State 초기화
        state.currentPage = 1;
        state.totalPages = 0;
        state.selectionRect = null;
        state.previewOverlay = null;
        state.originalFileName = null;
        state.isDraggingOverlay = false;
        state.isResizingOverlay = false;

        // 5. 파일 입력 초기화
        elements.fileInput.value = '';

        showToast('초기화되었습니다.', 'success');
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
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
