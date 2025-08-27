
// @ts-nocheck
// Using @ts-nocheck for brevity in this example to avoid extensive DOM type assertions.
// In a real project, use proper TypeScript types for DOM elements.
class ImageEditor {
    canvas;
    ctx;
    // --- ค่าคงที่สำหรับขนาดเป้าหมาย ---
    TARGET_WIDTH_LANDSCAPE = 1920;
    TARGET_HEIGHT_PORTRAIT = 1920;
    // DOM Elements
    loadImageInput;
    prevImageBtn;
    nextImageBtn;
    imageSelectElement; // New
    modeABtn;
    modeBBtn;
    undoBtn;
    saveImageBtn;
    copyImageBtn;
    pasteImageBtn;
    clearAllImagesBtn;
    resetZoomBtn;
    settingsBtn;
    statusBar;
    filenameDisplay;
    dimensionsDisplay;
    canvasDropArea;
    // Settings Modal Elements
    settingsModal;
    fontSizeInput;
    circleRadiusInput;
    fontColorInput;
    circleFillColorAInput;
    circleFillColorBInput;
    circleOutlineColorInput;
    fontFamilyInput;
    saveSettingsBtn;
    cancelSettingsBtn;
    // Confirm Modal Elements (New)
    confirmModal;
    confirmModalMessage;
    confirmModalConfirmBtn;
    confirmModalCancelBtn;
    onConfirmAction = null;
    // State
    loadedImages = [];
    currentImageIndex = -1;
    originalImage = null;
    history = [];
    counterA = 1;
    counterB = 1;
    drawingMode = null;
    zoomLevel = 1.0;
    panX = 0;
    panY = 0;
    isPanning = false; // For mouse and single touch pan
    lastPanX = 0; // For mouse and single touch pan
    lastPanY = 0; // For mouse and single touch pan
    minZoomLevel = 0.1;
    maxZoomLevel = 10.0;
    dragOccurred = false; // Flag to distinguish mouse drag from click
    settings = {
        fontFamily: "Arial",
        fontSize: 40,
        fontColor: "#000000",
        circleRadius: 30,
        circleFillColorA: "#FFFFFF",
        circleFillColorB: "#FF0000",
        circleOutlineColor: "#000000",
    };
    statusTimeout = null;
    MAX_FILENAME_DISPLAY_LENGTH = 30;
    // Touch specific state
    activeTouches = new Map();
    currentTouchAction = null;
    initialPinchState = null;
    markerPlacementDelay = 150; // milliseconds
    markerPlacementTimeoutId = null;
    pendingMarkerTouchData = null;
    initialSingleTouchDragAnchor = null;
    SINGLE_TOUCH_DRAG_THRESHOLD = 8; // pixels
    constructor() {
        this.canvas = document.getElementById('imageCanvas');
        this.ctx = this.canvas.getContext('2d');
        // Toolbar
        this.loadImageInput = document.getElementById('loadImageInput');
        this.prevImageBtn = document.getElementById('prevImageBtn');
        this.nextImageBtn = document.getElementById('nextImageBtn');
        this.imageSelectElement = document.getElementById('imageSelect'); // New
        this.modeABtn = document.getElementById('modeABtn');
        this.modeBBtn = document.getElementById('modeBBtn');
        this.undoBtn = document.getElementById('undoBtn');
        this.saveImageBtn = document.getElementById('saveImageBtn');
        this.copyImageBtn = document.getElementById('copyImageBtn');
        this.pasteImageBtn = document.getElementById('pasteImageBtn');
        this.clearAllImagesBtn = document.getElementById('clearAllImagesBtn');
        this.resetZoomBtn = document.getElementById('resetZoomBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.filenameDisplay = document.getElementById('filename-display');
        this.dimensionsDisplay = document.getElementById('dimensions-display');
        this.canvasDropArea = document.getElementById('canvasDropArea');
        // Status Bar
        this.statusBar = document.getElementById('statusBar');
        // Settings Modal
        this.settingsModal = document.getElementById('settingsModal');
        this.fontSizeInput = document.getElementById('fontSizeInput');
        this.circleRadiusInput = document.getElementById('circleRadiusInput');
        this.fontColorInput = document.getElementById('fontColorInput');
        this.circleFillColorAInput = document.getElementById('circleFillColorAInput');
        this.circleFillColorBInput = document.getElementById('circleFillColorBInput');
        this.circleOutlineColorInput = document.getElementById('circleOutlineColorInput');
        this.fontFamilyInput = document.getElementById('fontFamilyInput');
        this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
        this.cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
        // Confirm Modal Elements
        this.confirmModal = document.getElementById('confirmModal');
        this.confirmModalMessage = document.getElementById('confirmModalMessage');
        this.confirmModalConfirmBtn = document.getElementById('confirmModalConfirmBtn');
        this.confirmModalCancelBtn = document.getElementById('confirmModalCancelBtn');
        this.loadSettings();
        this.bindEvents();
        this.updateButtonStates();
        this.resizeCanvas();
        this.updateCursorStyle();
        this.updateImageDropdown(); // New: Initial population
    }
    bindEvents() {
        this.loadImageInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.prevImageBtn.addEventListener('click', () => this.navigateToImage(-1));
        this.nextImageBtn.addEventListener('click', () => this.navigateToImage(1));
        this.imageSelectElement.addEventListener('change', () => this.handleImageSelectChange()); // New
        this.modeABtn.addEventListener('click', () => this.setDrawingMode('A'));
        this.modeBBtn.addEventListener('click', () => this.setDrawingMode('B'));
        this.undoBtn.addEventListener('click', () => this.undoLastAction());
        this.saveImageBtn.addEventListener('click', () => this.saveImage());
        this.copyImageBtn.addEventListener('click', () => this.copyImageToClipboard());
        this.pasteImageBtn.addEventListener('click', () => this.handlePaste());
        this.clearAllImagesBtn.addEventListener('click', () => this.confirmAndClearAllImages());
        document.addEventListener('paste', (e) => this.handleNativePaste(e));
        this.resetZoomBtn.addEventListener('click', () => this.resetZoomAndPan());
        this.settingsBtn.addEventListener('click', () => this.openSettingsModal());
        // Canvas Mouse Events
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheelZoom(e), { passive: false });
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e)); // Pass event
        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp()); // Also call on mouseleave to reset panning state
        // Canvas Touch Events
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        this.canvas.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });
        // Drag and Drop
        this.canvasDropArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.canvasDropArea.addEventListener('drop', (e) => this.handleDrop(e));
        this.canvasDropArea.addEventListener('dragleave', () => { this.canvasDropArea.style.borderColor = 'var(--input-border)'; });
        // Settings Modal
        this.saveSettingsBtn.addEventListener('click', () => this.applyAndSaveSettings());
        this.cancelSettingsBtn.addEventListener('click', () => this.closeSettingsModal());
        // Confirm Modal
        this.confirmModalConfirmBtn.addEventListener('click', () => this.handleConfirmDialogAction());
        this.confirmModalCancelBtn.addEventListener('click', () => this.closeConfirmModal());
        window.addEventListener('resize', () => this.resizeCanvas());
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.settingsModal.style.display === 'flex') {
                    this.closeSettingsModal();
                    e.preventDefault();
                    return;
                }
                if (this.confirmModal && this.confirmModal.style.display === 'flex') {
                    this.closeConfirmModal();
                    e.preventDefault();
                    return;
                }
            }
            this.handleKeyboardShortcuts(e);
        });
    }
    handleKeyboardShortcuts(e) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) { // Updated to include HTMLSelectElement
            return;
        }
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'z':
                    e.preventDefault();
                    if (!this.undoBtn.disabled)
                        this.undoLastAction();
                    break;
                case 's':
                    e.preventDefault();
                    if (!this.saveImageBtn.disabled)
                        this.saveImage();
                    break;
                case 'c':
                    if (e.ctrlKey && !this.copyImageBtn.disabled) {
                        e.preventDefault();
                        this.copyImageToClipboard();
                    }
                    break;
                case 'r':
                    e.preventDefault();
                    if (!this.resetZoomBtn.disabled)
                        this.resetZoomAndPan();
                    break;
            }
        }
        if (this.currentImageIndex !== -1 && this.loadedImages.length > 1) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (!this.prevImageBtn.disabled)
                    this.navigateToImage(-1);
            }
            else if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (!this.nextImageBtn.disabled)
                    this.navigateToImage(1);
            }
        }
    }
    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        if (this.originalImage) {
            this.calculateMinZoom();
            if (this.zoomLevel < this.minZoomLevel) {
                this.zoomLevel = this.minZoomLevel;
            }
            this.redrawCanvas();
        }
        else {
            this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg').trim();
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        this.updateCursorStyle();
    }
    async _processAndAddFiles(files) {
        const loadImagePromises = files.map(file => {
            return new Promise((resolve) => {
                if (!file.type.startsWith('image/')) {
                    this.showStatus(`File ${file.name} is not a supported image type.`, true);
                    resolve(null);
                    return;
                }
                const reader = new FileReader();
                reader.onload = (e_reader) => {
                    const img = new Image();
                    img.onload = () => {
                        resolve({
                            file: file,
                            name: file.name,
                            image: img,
                            history: [],
                            counterA: 1,
                            counterB: 1,
                            mimeType: file.type // Store mimeType
                        });
                    };
                    img.onerror = () => {
                        this.showStatus(`Error loading image: ${file.name}`, true);
                        resolve(null);
                    };
                    img.src = e_reader.target?.result;
                };
                reader.onerror = () => {
                    this.showStatus(`Error reading file: ${file.name}`, true);
                    resolve(null);
                };
                reader.readAsDataURL(file);
            });
        });
        return (await Promise.all(loadImagePromises)).filter(entry => entry !== null);
    }
    async handleFileSelect(event) {
        const input = event.target;
        if (!input.files || input.files.length === 0)
            return;
        const filesToLoad = Array.from(input.files);
        input.value = '';
        if (filesToLoad.length === 0) {
            this.showStatus("No image files selected.", true);
            return;
        }
        const wasImageListEmpty = this.loadedImages.length === 0;
        const newEntries = await this._processAndAddFiles(filesToLoad);
        if (newEntries.length === 0) {
            if (filesToLoad.filter(f => f.type.startsWith('image/')).length > 0) {
                this.showStatus("Failed to load any of the selected images.", true);
            }
            return;
        }
        if (wasImageListEmpty) {
            this.loadedImages = newEntries;
            this.currentImageIndex = 0;
            this.switchToImage(this.currentImageIndex);
            if (newEntries.length === 1) {
                this.showStatus(`Image "${this.truncateFilename(newEntries[0].name)}" loaded.`, false);
            }
            else {
                this.showStatus(`${newEntries.length} images loaded. Displaying first.`, false);
            }
        }
        else {
            const firstNewImageOriginalIndex = this.loadedImages.length;
            this.loadedImages.push(...newEntries);
            this.currentImageIndex = firstNewImageOriginalIndex;
            this.switchToImage(this.currentImageIndex);
            if (newEntries.length === 1) {
                this.showStatus(`Added and displaying image "${this.truncateFilename(newEntries[0].name)}". Total: ${this.loadedImages.length}.`, false);
            }
            else {
                this.showStatus(`Added ${newEntries.length} images. Displaying "${this.truncateFilename(newEntries[0].name)}". Total: ${this.loadedImages.length}.`, false);
            }
        }
        this.updateButtonStates();
        // updateImageDropdown is called by switchToImage
    }
    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'copy';
        }
        this.canvasDropArea.style.borderColor = 'var(--button-mode-active-bg)';
    }
    async handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        this.canvasDropArea.style.borderColor = 'var(--input-border)';
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0)
            return;
        const imageFilesToLoad = Array.from(files);
        if (imageFilesToLoad.length === 0) {
            this.showStatus('No files dropped.', true);
            return;
        }
        const wasImageListEmpty = this.loadedImages.length === 0;
        const newEntries = await this._processAndAddFiles(imageFilesToLoad);
        if (newEntries.length === 0) {
            if (imageFilesToLoad.filter(f => f.type.startsWith('image/')).length > 0) {
                this.showStatus("Failed to load any of the dropped images.", true);
            }
            return;
        }
        if (wasImageListEmpty) {
            this.loadedImages = newEntries;
            this.currentImageIndex = 0;
            this.switchToImage(this.currentImageIndex);
            if (newEntries.length === 1) {
                this.showStatus(`Dropped image "${this.truncateFilename(newEntries[0].name)}" loaded.`, false);
            }
            else {
                this.showStatus(`${newEntries.length} images dropped and loaded. Displaying first.`, false);
            }
        }
        else {
            const firstNewImageOriginalIndex = this.loadedImages.length;
            this.loadedImages.push(...newEntries);
            this.currentImageIndex = firstNewImageOriginalIndex;
            this.switchToImage(this.currentImageIndex);
            if (newEntries.length === 1) {
                this.showStatus(`Added and displaying dropped image "${this.truncateFilename(newEntries[0].name)}". Total: ${this.loadedImages.length}.`, false);
            }
            else {
                this.showStatus(`Added ${newEntries.length} dropped images. Displaying "${this.truncateFilename(newEntries[0].name)}". Total: ${this.loadedImages.length}.`, false);
            }
        }
        this.updateButtonStates();
        // updateImageDropdown is called by switchToImage
    }
    async handleNativePaste(event) {
        if (!event.clipboardData)
            return;
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
            return;
        }
        const items = event.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                event.preventDefault();
                const file = items[i].getAsFile();
                if (file) {
                    this.loadImageFromFile(file, "[Pasted Image]");
                    return;
                }
            }
        }
    }
    async handlePaste() {
        try {
            if (!navigator.clipboard || !navigator.clipboard.read) {
                this.showStatus("Clipboard API not available for paste. Try Ctrl+V.", true);
                return;
            }
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
                for (const type of item.types) {
                    if (type.startsWith('image/')) {
                        const blob = await item.getType(type);
                        const file = new File([blob], "pasted_image.png", { type: blob.type });
                        this.loadImageFromFile(file, "[Pasted Image]");
                        return;
                    }
                }
            }
            this.showStatus("No image found in clipboard.", false);
        }
        catch (err) {
            console.error('Paste error:', err);
            if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
                this.showStatus(`Clipboard read permission denied. Try Ctrl+V.`, true);
            }
            else {
                this.showStatus(`Error pasting image. Try Ctrl+V. Error: ${err.message}`, true);
            }
        }
    }
    loadImageFromFile(file, displayName) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const newImageEntry = {
                    file: file,
                    name: displayName,
                    image: img,
                    history: [],
                    counterA: 1,
                    counterB: 1,
                    mimeType: file.type // Store mimeType from pasted/blob file
                };
                const wasImageListEmpty = this.loadedImages.length === 0;
                if (wasImageListEmpty) {
                    this.loadedImages = [newImageEntry];
                    this.currentImageIndex = 0;
                    this.switchToImage(this.currentImageIndex);
                    this.showStatus(`Pasted image "${this.truncateFilename(displayName)}" loaded.`, false);
                }
                else {
                    this.loadedImages.push(newImageEntry);
                    this.currentImageIndex = this.loadedImages.length - 1;
                    this.switchToImage(this.currentImageIndex);
                    this.showStatus(`Pasted and displaying image "${this.truncateFilename(displayName)}". Total: ${this.loadedImages.length}.`, false);
                }
                this.updateButtonStates();
                // updateImageDropdown is called by switchToImage
            };
            img.onerror = () => {
                this.showStatus(`Error loading image: ${displayName}`, true);
            };
            img.src = e.target?.result;
        };
        reader.readAsDataURL(file);
    }
    switchToImage(index) {
        if (index < 0 || index >= this.loadedImages.length) {
            this.clearCanvasAndState(); // This will also call updateImageDropdown
            if (this.loadedImages.length === 0) {
                this.currentImageIndex = -1;
            }
            return;
        }
        this.currentImageIndex = index;
        const current = this.loadedImages[this.currentImageIndex];
        this.originalImage = current.image;
        this.history = current.history;
        this.counterA = current.counterA;
        this.counterB = current.counterB;
        this.filenameDisplay.textContent = this.truncateFilename(current.name);
        this.filenameDisplay.title = current.name;
        this.dimensionsDisplay.textContent = `${this.originalImage.naturalWidth} x ${this.originalImage.naturalHeight} px`;
        this.resetZoomAndPan(false); // don't redraw yet
        this.panX = 0; // Reset pan for new image
        this.panY = 0;
        this.redrawCanvas();
        this.updateButtonStates();
        this.updateCursorStyle();
        this.updateImageDropdown(); // New: ensure dropdown reflects change
    }
    navigateToImage(direction) {
        if (this.loadedImages.length <= 1)
            return;
        if (this.currentImageIndex !== -1 && this.currentImageIndex < this.loadedImages.length && this.loadedImages[this.currentImageIndex]) {
            this.loadedImages[this.currentImageIndex].history = [...this.history];
            this.loadedImages[this.currentImageIndex].counterA = this.counterA;
            this.loadedImages[this.currentImageIndex].counterB = this.counterB;
        }
        let newIndex = this.currentImageIndex + direction;
        if (newIndex < 0)
            newIndex = this.loadedImages.length - 1;
        if (newIndex >= this.loadedImages.length)
            newIndex = 0;
        this.switchToImage(newIndex);
        this.showStatus(`Switched to image: ${this.truncateFilename(this.loadedImages[newIndex].name)}`, false, 1500);
        // updateImageDropdown is called by switchToImage
    }
    handleImageSelectChange() {
        const selectedIndex = parseInt(this.imageSelectElement.value, 10);
        if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= this.loadedImages.length || selectedIndex === this.currentImageIndex) {
            // If invalid index, or same as current, do nothing or ensure dropdown is synced if it got out of sync
            if (this.currentImageIndex !== -1)
                this.imageSelectElement.value = this.currentImageIndex.toString();
            return;
        }
        if (this.currentImageIndex !== -1 && this.currentImageIndex < this.loadedImages.length) {
            // Save state of the currently active image before switching
            this.loadedImages[this.currentImageIndex].history = [...this.history];
            this.loadedImages[this.currentImageIndex].counterA = this.counterA;
            this.loadedImages[this.currentImageIndex].counterB = this.counterB;
        }
        this.switchToImage(selectedIndex);
        this.showStatus(`Switched to image: ${this.truncateFilename(this.loadedImages[selectedIndex].name)}`, false, 1500);
        // updateImageDropdown is called by switchToImage
    }
    updateImageDropdown() {
        this.imageSelectElement.innerHTML = ''; // Clear existing options
        if (this.loadedImages.length === 0) {
            const defaultOption = document.createElement('option');
            defaultOption.textContent = "No images loaded";
            defaultOption.value = "-1";
            defaultOption.disabled = true;
            this.imageSelectElement.appendChild(defaultOption);
            this.imageSelectElement.disabled = true;
            return;
        }
        this.imageSelectElement.disabled = this.loadedImages.length <= 1;
        this.loadedImages.forEach((imgEntry, index) => {
            const option = document.createElement('option');
            option.value = index.toString();
            option.textContent = `${index + 1}. ${this.truncateFilename(imgEntry.name)}`;
            if (index === this.currentImageIndex) {
                option.selected = true;
            }
            this.imageSelectElement.appendChild(option);
        });
    }
    clearCanvasAndState() {
        this.originalImage = null;
        this.history = [];
        this.counterA = 1;
        this.counterB = 1;
        this.zoomLevel = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg').trim();
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.filenameDisplay.textContent = "No file loaded";
        this.dimensionsDisplay.textContent = "- x - px";
        this.setDrawingMode(null);
        this.updateButtonStates();
        this.updateImageDropdown(); // Ensure dropdown reflects empty state
    }
    confirmAndClearAllImages() {
        if (this.loadedImages.length === 0) {
            this.showStatus("No images to clear.", false);
            return;
        }
        this.openConfirmModal("Are you sure you want to clear all loaded images? This action cannot be undone.", () => this.performClearAllImages());
    }
    performClearAllImages() {
        this.loadedImages = [];
        this.currentImageIndex = -1;
        this.clearCanvasAndState(); // This will call updateButtonStates and updateImageDropdown
        this.showStatus("All images cleared.", false);
    }
    calculateMinZoom() {
        if (!this.originalImage || this.canvas.width <= 0 || this.canvas.height <= 0) {
            this.minZoomLevel = 0.1;
            return;
        }
        const hRatio = this.canvas.width / this.originalImage.naturalWidth;
        const vRatio = this.canvas.height / this.originalImage.naturalHeight;
        this.minZoomLevel = Math.min(hRatio, vRatio);
        if (this.originalImage.naturalWidth < this.canvas.width && this.originalImage.naturalHeight < this.canvas.height) {
            this.minZoomLevel = Math.min(this.minZoomLevel, 1.0);
        }
        if (this.minZoomLevel <= 0)
            this.minZoomLevel = 0.01;
        if (this.originalImage && this.zoomLevel < this.minZoomLevel) {
            this.zoomLevel = this.minZoomLevel;
        }
    }
    resetZoomAndPan(redraw = true) {
        if (!this.originalImage)
            return;
        this.calculateMinZoom();
        this.zoomLevel = this.minZoomLevel;
        this.panX = 0;
        this.panY = 0;
        if (redraw) {
            this.redrawCanvas();
            this.showStatus("Zoom and pan reset.", false, 1500);
        }
        this.updateButtonStates();
        this.updateCursorStyle();
    }
    setDrawingMode(mode) {
        if (this.drawingMode === mode && mode !== null) {
            this.drawingMode = null;
        }
        else {
            this.drawingMode = mode;
        }
        this.modeABtn.classList.toggle('active-mode', this.drawingMode === 'A');
        this.modeBBtn.classList.toggle('active-mode', this.drawingMode === 'B');
        this.updateCursorStyle();
        this.updateButtonStates();
    }
    getOriginalImageCoordinatesFromScreenPoint(screenX, screenY) {
        if (!this.originalImage)
            return null;
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = screenX - rect.left;
        const canvasY = screenY - rect.top;
        const imgDisplayWidth = this.originalImage.naturalWidth * this.zoomLevel;
        const imgDisplayHeight = this.originalImage.naturalHeight * this.zoomLevel;
        const imgCanvasX = (this.canvas.width - imgDisplayWidth) / 2 + this.panX;
        const imgCanvasY = (this.canvas.height - imgDisplayHeight) / 2 + this.panY;
        if (canvasX < imgCanvasX || canvasX > imgCanvasX + imgDisplayWidth ||
            canvasY < imgCanvasY || canvasY > imgCanvasY + imgDisplayHeight) {
            return null;
        }
        const xOnScaledImg = canvasX - imgCanvasX;
        const yOnScaledImg = canvasY - imgCanvasY;
        const originalX = Math.round(xOnScaledImg / this.zoomLevel);
        const originalY = Math.round(yOnScaledImg / this.zoomLevel);
        if (originalX < 0 || originalX > this.originalImage.naturalWidth ||
            originalY < 0 || originalY > this.originalImage.naturalHeight) {
            return null;
        }
        return { x: originalX, y: originalY };
    }
    handleCanvasClick(event) {
        // If a drag occurred with the mouse, don't treat this click as a marker placement.
        // This flag is set in mousemove if isPanning is true and reset on next mousedown.
        if (this.dragOccurred) {
            return;
        }
        if (!this.originalImage || !this.drawingMode)
            return;
        if (event.button !== 0)
            return; // Only left click for markers (isPanning is false here)
        const originalCoords = this.getOriginalImageCoordinatesFromScreenPoint(event.clientX, event.clientY);
        if (originalCoords) {
            this.addMarker(originalCoords.x, originalCoords.y);
        }
    }
    addMarker(originalX, originalY) {
        if (!this.originalImage || !this.drawingMode)
            return;
        const number = this.drawingMode === 'A' ? this.counterA++ : this.counterB++;
        const fillColor = this.drawingMode === 'A' ? this.settings.circleFillColorA : this.settings.circleFillColorB;
        const marker = {
            x: originalX,
            y: originalY,
            number: number,
            mode: this.drawingMode,
            font: `${this.settings.fontSize}px ${this.settings.fontFamily}`,
            fontSize: this.settings.fontSize,
            fontColor: this.settings.fontColor,
            circleRadius: this.settings.circleRadius,
            fillColor: fillColor,
            outlineColor: this.settings.circleOutlineColor,
        };
        this.history.push(marker);
        this.redrawCanvas();
        this.updateButtonStates();
    }
    undoLastAction() {
        if (this.history.length === 0)
            return;
        const lastAction = this.history.pop();
        if (lastAction) {
            if (lastAction.mode === 'A' && this.counterA > 1) {
                this.counterA--;
            }
            else if (lastAction.mode === 'B' && this.counterB > 1) {
                this.counterB--;
            }
        }
        this.redrawCanvas();
        this.updateButtonStates();
        this.showStatus("Last action undone.", false, 1500);
    }
    redrawCanvas() {
        this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg').trim();
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        if (!this.originalImage) {
            return;
        }
        this.ctx.save();
        const imgDisplayWidth = this.originalImage.naturalWidth * this.zoomLevel;
        const imgDisplayHeight = this.originalImage.naturalHeight * this.zoomLevel;
        const drawX = (this.canvas.width - imgDisplayWidth) / 2 + this.panX;
        const drawY = (this.canvas.height - imgDisplayHeight) / 2 + this.panY;
        this.ctx.imageSmoothingEnabled = this.zoomLevel < 1;
        this.ctx.imageSmoothingQuality = this.zoomLevel < 1 ? "medium" : "high";
        this.ctx.drawImage(this.originalImage, drawX, drawY, imgDisplayWidth, imgDisplayHeight);
        this.history.forEach(marker => {
            const markerCanvasX = drawX + (marker.x * this.zoomLevel);
            const markerCanvasY = drawY + (marker.y * this.zoomLevel);
            const radius = marker.circleRadius * this.zoomLevel;
            const fontSize = marker.fontSize * this.zoomLevel;
            this.ctx.beginPath();
            this.ctx.arc(markerCanvasX, markerCanvasY, Math.max(1, radius), 0, Math.PI * 2);
            this.ctx.fillStyle = marker.fillColor;
            this.ctx.fill();
            this.ctx.strokeStyle = marker.outlineColor;
            this.ctx.lineWidth = Math.max(0.5, (marker.circleRadius * 0.05) * this.zoomLevel);
            this.ctx.stroke();
            this.ctx.fillStyle = marker.fontColor;
            this.ctx.font = `${Math.max(1, fontSize)}px ${marker.font.split(' ').pop() || this.settings.fontFamily}`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(marker.number.toString(), markerCanvasX, markerCanvasY);
        });
        this.ctx.restore();
    }
    handleWheelZoom(event) {
        if (!this.originalImage)
            return;
        event.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const zoomFactor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
        this.applyZoom(zoomFactor, mouseX, mouseY);
    }
    applyZoom(zoomFactor, centerX, centerY) {
        if (!this.originalImage)
            return;
        const oldZoomLevel = this.zoomLevel;
        let newZoomLevelProposed = oldZoomLevel * zoomFactor;
        this.calculateMinZoom();
        const newZoomLevel = Math.max(this.minZoomLevel, Math.min(this.maxZoomLevel, newZoomLevelProposed));
        if (newZoomLevel === oldZoomLevel)
            return;
        const imgPointX = (centerX - ((this.canvas.width - this.originalImage.naturalWidth * oldZoomLevel) / 2 + this.panX)) / oldZoomLevel;
        const imgPointY = (centerY - ((this.canvas.height - this.originalImage.naturalHeight * oldZoomLevel) / 2 + this.panY)) / oldZoomLevel;
        this.zoomLevel = newZoomLevel;
        this.panX = centerX - imgPointX * this.zoomLevel - (this.canvas.width - this.originalImage.naturalWidth * this.zoomLevel) / 2;
        this.panY = centerY - imgPointY * this.zoomLevel - (this.canvas.height - this.originalImage.naturalHeight * this.zoomLevel) / 2;
        this.redrawCanvas();
    }
    handleMouseDown(event) {
        if (event.pointerType !== undefined && event.pointerType !== 'mouse')
            return;
        this.dragOccurred = false; // Reset drag flag for new mouse interaction
        if (!this.originalImage)
            return;
        // Clear any touch-related intentions
        this.currentTouchAction = null;
        if (this.markerPlacementTimeoutId) {
            clearTimeout(this.markerPlacementTimeoutId);
            this.markerPlacementTimeoutId = null;
        }
        this.pendingMarkerTouchData = null;
        this.initialSingleTouchDragAnchor = null;
        if (event.button === 1) { // Middle mouse button always pans
            this.isPanning = true;
            this.lastPanX = event.clientX;
            this.lastPanY = event.clientY;
            this.canvas.style.cursor = 'grabbing';
            event.preventDefault();
        }
        else if (event.button === 0) { // Left mouse button always initiates pan if image loaded
            this.isPanning = true;
            this.lastPanX = event.clientX;
            this.lastPanY = event.clientY;
            this.canvas.style.cursor = 'grabbing'; // Pan starts, so cursor is grabbing
            event.preventDefault();
        }
        // If isPanning became true, updateCursorStyle will refine cursor if needed,
        // but direct setting provides immediate feedback.
    }
    handleMouseMove(event) {
        if (this.isPanning && (event.pointerType === undefined || event.pointerType === 'mouse') && this.originalImage) {
            this.dragOccurred = true; // Mouse moved while panning button was down
            const dx = event.clientX - this.lastPanX;
            const dy = event.clientY - this.lastPanY;
            this.panX += dx;
            this.panY += dy;
            this.lastPanX = event.clientX;
            this.lastPanY = event.clientY;
            this.redrawCanvas();
        }
    }
    handleMouseUp(event) {
        if (this.isPanning) {
            this.isPanning = false;
        }
        // dragOccurred flag persists until the next mousedown
        this.updateCursorStyle();
    }
    updateCursorStyle() {
        this.canvas.classList.toggle('panning', this.isPanning);
        if (this.isPanning) {
            this.canvas.style.cursor = 'grabbing';
            return;
        }
        if (!this.originalImage) {
            this.canvas.style.cursor = 'default';
        }
        else if (this.drawingMode) {
            this.canvas.style.cursor = 'copy'; // For placing markers
        }
        else {
            this.canvas.style.cursor = 'grab'; // Default for pannable image when not drawing
        }
    }
    // --- Touch Event Handlers ---
    handleTouchStart(event) {
        if (!this.originalImage)
            return;
        event.preventDefault();
        for (let i = 0; i < event.touches.length; i++) {
            const touch = event.touches[i];
            if (!this.activeTouches.has(touch.identifier)) {
                this.activeTouches.set(touch.identifier, { identifier: touch.identifier, clientX: touch.clientX, clientY: touch.clientY });
            }
        }
        if (this.markerPlacementTimeoutId) {
            clearTimeout(this.markerPlacementTimeoutId);
            this.markerPlacementTimeoutId = null;
        }
        if (this.activeTouches.size >= 2) {
            this.currentTouchAction = 'pinch';
            this.isPanning = false;
            this.pendingMarkerTouchData = null;
            this.initialSingleTouchDragAnchor = null;
            const t1 = Array.from(this.activeTouches.values())[0];
            const t2 = Array.from(this.activeTouches.values())[1];
            const dx = t1.clientX - t2.clientX;
            const dy = t1.clientY - t2.clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const canvasRect = this.canvas.getBoundingClientRect();
            const pinchCanvasMidX = ((t1.clientX + t2.clientX) / 2) - canvasRect.left;
            const pinchCanvasMidY = ((t1.clientY + t2.clientY) / 2) - canvasRect.top;
            const imgPointX = (pinchCanvasMidX - ((this.canvas.width - this.originalImage.naturalWidth * this.zoomLevel) / 2 + this.panX)) / this.zoomLevel;
            const imgPointY = (pinchCanvasMidY - ((this.canvas.height - this.originalImage.naturalHeight * this.zoomLevel) / 2 + this.panY)) / this.zoomLevel;
            this.initialPinchState = {
                distance: distance,
                centerX: pinchCanvasMidX,
                centerY: pinchCanvasMidY,
                panX: this.panX,
                panY: this.panY,
                zoomLevel: this.zoomLevel,
                imagePointX: imgPointX,
                imagePointY: imgPointY
            };
        }
        else if (this.activeTouches.size === 1) {
            const touch = Array.from(this.activeTouches.values())[0];
            this.isPanning = false;
            if (this.drawingMode) {
                this.currentTouchAction = 'potential-marker';
                this.pendingMarkerTouchData = { ...touch };
                this.initialSingleTouchDragAnchor = { x: touch.clientX, y: touch.clientY };
                this.markerPlacementTimeoutId = window.setTimeout(() => {
                    if (this.currentTouchAction === 'potential-marker' && this.pendingMarkerTouchData && this.originalImage && this.drawingMode) {
                        const originalCoords = this.getOriginalImageCoordinatesFromScreenPoint(this.pendingMarkerTouchData.clientX, this.pendingMarkerTouchData.clientY);
                        if (originalCoords)
                            this.addMarker(originalCoords.x, originalCoords.y);
                    }
                    this.pendingMarkerTouchData = null;
                    this.markerPlacementTimeoutId = null;
                    if (this.currentTouchAction === 'potential-marker')
                        this.currentTouchAction = null;
                    this.updateCursorStyle();
                }, this.markerPlacementDelay);
            }
            else {
                this.currentTouchAction = 'pan';
                this.isPanning = true;
                this.lastPanX = touch.clientX;
                this.lastPanY = touch.clientY;
                this.pendingMarkerTouchData = null;
                this.initialSingleTouchDragAnchor = null;
            }
        }
        this.updateCursorStyle();
    }
    handleTouchMove(event) {
        if (!this.originalImage || this.activeTouches.size === 0)
            return;
        event.preventDefault();
        for (let i = 0; i < event.touches.length; i++) {
            const touch = event.touches[i];
            if (this.activeTouches.has(touch.identifier)) {
                const existingTouch = this.activeTouches.get(touch.identifier);
                existingTouch.clientX = touch.clientX;
                existingTouch.clientY = touch.clientY;
            }
        }
        if (this.currentTouchAction === 'pinch' && this.activeTouches.size >= 2 && this.initialPinchState) {
            const touchesForPinch = Array.from(this.activeTouches.values()).slice(0, 2);
            if (touchesForPinch.length < 2)
                return;
            const t1 = touchesForPinch[0];
            const t2 = touchesForPinch[1];
            const dxDist = t1.clientX - t2.clientX;
            const dyDist = t1.clientY - t2.clientY;
            const newDistance = Math.sqrt(dxDist * dxDist + dyDist * dyDist);
            const zoomFactor = newDistance / this.initialPinchState.distance;
            const oldZoomLevelFromPinchStart = this.initialPinchState.zoomLevel;
            this.calculateMinZoom();
            let newZoomLevelProposed = oldZoomLevelFromPinchStart * zoomFactor;
            const newZoomLevel = Math.max(this.minZoomLevel, Math.min(this.maxZoomLevel, newZoomLevelProposed));
            this.zoomLevel = newZoomLevel;
            const canvasRect = this.canvas.getBoundingClientRect();
            const currentPinchCanvasMidX = ((t1.clientX + t2.clientX) / 2) - canvasRect.left;
            const currentPinchCanvasMidY = ((t1.clientY + t2.clientY) / 2) - canvasRect.top;
            this.panX = currentPinchCanvasMidX - this.initialPinchState.imagePointX * this.zoomLevel - (this.canvas.width - this.originalImage.naturalWidth * this.zoomLevel) / 2;
            this.panY = currentPinchCanvasMidY - this.initialPinchState.imagePointY * this.zoomLevel - (this.canvas.height - this.originalImage.naturalHeight * this.zoomLevel) / 2;
            this.redrawCanvas();
        }
        else if (this.activeTouches.size === 1) {
            const touch = Array.from(this.activeTouches.values())[0];
            if (this.currentTouchAction === 'potential-marker' && this.drawingMode && this.initialSingleTouchDragAnchor) {
                const dxMove = touch.clientX - this.initialSingleTouchDragAnchor.x;
                const dyMove = touch.clientY - this.initialSingleTouchDragAnchor.y;
                if (Math.sqrt(dxMove * dxMove + dyMove * dyMove) > this.SINGLE_TOUCH_DRAG_THRESHOLD) {
                    if (this.markerPlacementTimeoutId) {
                        clearTimeout(this.markerPlacementTimeoutId);
                        this.markerPlacementTimeoutId = null;
                    }
                    this.currentTouchAction = 'pan';
                    this.isPanning = true;
                    this.pendingMarkerTouchData = null;
                    this.initialSingleTouchDragAnchor = null;
                    this.lastPanX = touch.clientX;
                    this.lastPanY = touch.clientY;
                    this.updateCursorStyle();
                }
            }
            if (this.currentTouchAction === 'pan' && this.isPanning) {
                const dx = touch.clientX - this.lastPanX;
                const dy = touch.clientY - this.lastPanY;
                this.panX += dx;
                this.panY += dy;
                this.lastPanX = touch.clientX;
                this.lastPanY = touch.clientY;
                this.redrawCanvas();
            }
        }
    }
    handleTouchEnd(event) {
        if (!this.originalImage)
            return;
        let releasedPotentialMarkerIdentifier = null;
        if (this.currentTouchAction === 'potential-marker' && this.pendingMarkerTouchData) {
            for (const t of event.changedTouches) {
                if (t.identifier === this.pendingMarkerTouchData.identifier) {
                    releasedPotentialMarkerIdentifier = t.identifier;
                    break;
                }
            }
        }
        for (const t of event.changedTouches) {
            this.activeTouches.delete(t.identifier);
        }
        if (releasedPotentialMarkerIdentifier !== null) {
            if (this.markerPlacementTimeoutId) {
                clearTimeout(this.markerPlacementTimeoutId);
                this.markerPlacementTimeoutId = null;
            }
            if (this.pendingMarkerTouchData && this.pendingMarkerTouchData.identifier === releasedPotentialMarkerIdentifier && this.drawingMode) {
                const originalCoords = this.getOriginalImageCoordinatesFromScreenPoint(this.pendingMarkerTouchData.clientX, this.pendingMarkerTouchData.clientY);
                if (originalCoords)
                    this.addMarker(originalCoords.x, originalCoords.y);
            }
            this.pendingMarkerTouchData = null;
        }
        if (this.activeTouches.size === 0) {
            if (this.markerPlacementTimeoutId)
                clearTimeout(this.markerPlacementTimeoutId);
            this.markerPlacementTimeoutId = null;
            this.pendingMarkerTouchData = null;
            this.currentTouchAction = null;
            this.isPanning = false;
            this.initialPinchState = null;
            this.initialSingleTouchDragAnchor = null;
        }
        else if (this.activeTouches.size === 1) {
            this.initialPinchState = null;
            this.isPanning = false;
            const touch = Array.from(this.activeTouches.values())[0];
            if (this.drawingMode) {
                this.currentTouchAction = 'potential-marker';
                this.pendingMarkerTouchData = { ...touch };
                this.initialSingleTouchDragAnchor = { x: touch.clientX, y: touch.clientY };
                if (this.markerPlacementTimeoutId)
                    clearTimeout(this.markerPlacementTimeoutId);
                this.markerPlacementTimeoutId = window.setTimeout(() => {
                    if (this.currentTouchAction === 'potential-marker' && this.pendingMarkerTouchData && this.originalImage && this.drawingMode) {
                        const originalCoords = this.getOriginalImageCoordinatesFromScreenPoint(this.pendingMarkerTouchData.clientX, this.pendingMarkerTouchData.clientY);
                        if (originalCoords)
                            this.addMarker(originalCoords.x, originalCoords.y);
                    }
                    this.pendingMarkerTouchData = null;
                    this.markerPlacementTimeoutId = null;
                    if (this.currentTouchAction === 'potential-marker')
                        this.currentTouchAction = null;
                    this.updateCursorStyle();
                }, this.markerPlacementDelay);
            }
            else {
                this.currentTouchAction = 'pan';
                this.isPanning = true;
                this.lastPanX = touch.clientX;
                this.lastPanY = touch.clientY;
                this.pendingMarkerTouchData = null;
                this.initialSingleTouchDragAnchor = null;
            }
        }
        else {
            this.currentTouchAction = 'pinch';
            this.isPanning = false;
            this.pendingMarkerTouchData = null;
            this.initialSingleTouchDragAnchor = null;
            if (this.markerPlacementTimeoutId)
                clearTimeout(this.markerPlacementTimeoutId);
            const t1 = Array.from(this.activeTouches.values())[0];
            const t2 = Array.from(this.activeTouches.values())[1];
            if (t1 && t2) {
                const dx = t1.clientX - t2.clientX;
                const dy = t1.clientY - t2.clientY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const canvasRect = this.canvas.getBoundingClientRect();
                const pinchCanvasMidX = ((t1.clientX + t2.clientX) / 2) - canvasRect.left;
                const pinchCanvasMidY = ((t1.clientY + t2.clientY) / 2) - canvasRect.top;
                const imgPointX = (pinchCanvasMidX - ((this.canvas.width - this.originalImage.naturalWidth * this.zoomLevel) / 2 + this.panX)) / this.zoomLevel;
                const imgPointY = (pinchCanvasMidY - ((this.canvas.height - this.originalImage.naturalHeight * this.zoomLevel) / 2 + this.panY)) / this.zoomLevel;
                this.initialPinchState = {
                    distance: distance, centerX: pinchCanvasMidX, centerY: pinchCanvasMidY,
                    panX: this.panX, panY: this.panY, zoomLevel: this.zoomLevel,
                    imagePointX: imgPointX, imagePointY: imgPointY
                };
            }
            else {
                this.initialPinchState = null;
                this.currentTouchAction = null;
            }
        }
        this.updateCursorStyle();
    }
    createFinalImageCanvas(targetWidthLandscape, targetHeightPortrait) {
        if (!this.originalImage) {
            const emptyCanvas = document.createElement('canvas');
            emptyCanvas.width = 1;
            emptyCanvas.height = 1;
            return emptyCanvas;
        }
        const originalWidth = this.originalImage.naturalWidth;
        const originalHeight = this.originalImage.naturalHeight;
        let targetWidth = originalWidth;
        let targetHeight = originalHeight;
        let scaleRatio = 1.0;
        // Calculate new dimensions based on orientation
        if (originalWidth > originalHeight) { // Landscape
            if (originalWidth > targetWidthLandscape) {
                scaleRatio = targetWidthLandscape / originalWidth;
                targetWidth = targetWidthLandscape;
                targetHeight = originalHeight * scaleRatio;
            }
        }
        else { // Portrait or Square
            if (originalHeight > targetHeightPortrait) {
                scaleRatio = targetHeightPortrait / originalHeight;
                targetHeight = targetHeightPortrait;
                targetWidth = originalWidth * scaleRatio;
            }
        }
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = targetWidth;
        tempCanvas.height = targetHeight;
        const currentImageEntry = this.loadedImages[this.currentImageIndex];
        const shouldUseOpaqueContext = currentImageEntry?.mimeType === 'image/jpeg';
        const tempCtx = tempCanvas.getContext('2d', { alpha: !shouldUseOpaqueContext });
        if (shouldUseOpaqueContext) {
            tempCtx.fillStyle = 'white';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        }
        tempCtx.drawImage(this.originalImage, 0, 0, targetWidth, targetHeight);
        // Draw scaled markers
        this.history.forEach(marker => {
            const markerX = marker.x * scaleRatio;
            const markerY = marker.y * scaleRatio;
            const circleRadius = marker.circleRadius * scaleRatio;
            const fontSize = marker.fontSize * scaleRatio;
            const lineWidth = Math.max(1, (marker.circleRadius * 0.05) * scaleRatio);
            const fontFamily = marker.font.split(' ').pop() || this.settings.fontFamily;
            tempCtx.beginPath();
            tempCtx.arc(markerX, markerY, circleRadius, 0, Math.PI * 2);
            tempCtx.fillStyle = marker.fillColor;
            tempCtx.fill();
            tempCtx.strokeStyle = marker.outlineColor;
            tempCtx.lineWidth = lineWidth;
            tempCtx.stroke();
            tempCtx.fillStyle = marker.fontColor;
            tempCtx.font = `${fontSize}px ${fontFamily}`;
            tempCtx.textAlign = 'center';
            tempCtx.textBaseline = 'middle';
            tempCtx.fillText(marker.number.toString(), markerX, markerY);
        });
        return tempCanvas;
    }
    saveImage() {
        if (!this.originalImage || this.currentImageIndex < 0 || !this.loadedImages[this.currentImageIndex]) {
            this.showStatus("No image to save.", true);
            return;
        }
        const tempCanvas = this.createFinalImageCanvas(this.TARGET_WIDTH_LANDSCAPE, this.TARGET_HEIGHT_PORTRAIT);
        const currentImageEntry = this.loadedImages[this.currentImageIndex];
        const originalMimeType = currentImageEntry.mimeType;
        let dataURL;
        let fileExtension;
        const jpegQuality = 0.92;
        if (originalMimeType === 'image/jpeg') {
            dataURL = tempCanvas.toDataURL('image/jpeg', jpegQuality);
            fileExtension = '.jpg';
            this.showStatus(`Image saved as JPEG (resized).`, false);
        }
        else {
            dataURL = tempCanvas.toDataURL('image/png');
            fileExtension = '.png';
            this.showStatus("Image saved as PNG (resized).", false);
        }
        const link = document.createElement('a');
        const currentName = currentImageEntry.name || 'image';
        const filenameBase = currentName.substring(0, currentName.lastIndexOf('.')) || currentName;
        link.download = `${filenameBase}_numbered${fileExtension}`;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    async copyImageToClipboard() {
        if (!this.originalImage || this.currentImageIndex < 0 || !this.loadedImages[this.currentImageIndex]) {
            this.showStatus("No image to copy.", true);
            return;
        }
        if (!navigator.clipboard || !navigator.clipboard.write) {
            this.showStatus("Clipboard API for writing images not supported by your browser.", true, 5000);
            return;
        }
        const tempCanvas = this.createFinalImageCanvas(this.TARGET_WIDTH_LANDSCAPE, this.TARGET_HEIGHT_PORTRAIT);
        try {
            const blob = await new Promise(resolve => tempCanvas.toBlob(resolve, 'image/png'));
            if (!blob) {
                this.showStatus("Failed to create image blob for copying.", true);
                return;
            }
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            this.showStatus("Image copied as PNG (resized).", false);
        }
        catch (err) {
            console.error('Copy to clipboard failed:', err);
            this.showStatus(`Failed to copy image: ${err.message}`, true, 5000);
        }
    }
    updateButtonStates() {
        const hasImage = !!this.originalImage;
        const hasHistory = this.history.length > 0;
        this.undoBtn.disabled = !hasHistory;
        this.saveImageBtn.disabled = !hasImage;
        this.copyImageBtn.disabled = !hasImage;
        this.resetZoomBtn.disabled = !hasImage;
        this.settingsBtn.disabled = false;
        this.modeABtn.disabled = !hasImage;
        this.modeBBtn.disabled = !hasImage;
        this.clearAllImagesBtn.disabled = this.loadedImages.length === 0;
        if (!hasImage && this.drawingMode) {
            this.setDrawingMode(null);
        }
        const multipleImagesLoaded = this.loadedImages.length > 1;
        this.prevImageBtn.disabled = !multipleImagesLoaded;
        this.nextImageBtn.disabled = !multipleImagesLoaded;
        this.imageSelectElement.disabled = this.loadedImages.length === 0; // Disable if no images, or if only one enable but not much use
    }
    showStatus(message, isError = false, duration = 3000) {
        if (this.statusTimeout) {
            clearTimeout(this.statusTimeout);
        }
        this.statusBar.textContent = message;
        this.statusBar.className = 'status-bar';
        if (isError) {
            this.statusBar.classList.add('error');
        }
        else if (message.includes("success") || message.includes("loaded") || message.includes("saved") || message.includes("undone") || message.includes("reset") || message.includes("applied") || message.includes("added") || message.includes("displaying") || message.includes("copied") || message.includes("cleared") || message.includes("JPEG") || message.includes("PNG")) {
            this.statusBar.classList.add('success');
        }
        else {
            this.statusBar.classList.add('info');
        }
        if (duration > 0) {
            this.statusTimeout = window.setTimeout(() => {
                this.statusBar.textContent = 'Ready';
                this.statusBar.className = 'status-bar info';
            }, duration);
        }
    }
    truncateFilename(name) {
        if (name.length > this.MAX_FILENAME_DISPLAY_LENGTH) {
            return name.substring(0, this.MAX_FILENAME_DISPLAY_LENGTH - 3) + "...";
        }
        return name;
    }
    // --- Settings Modal Logic ---
    openSettingsModal() {
        this.fontSizeInput.value = this.settings.fontSize.toString();
        this.circleRadiusInput.value = this.settings.circleRadius.toString();
        this.fontColorInput.value = this.settings.fontColor;
        this.circleFillColorAInput.value = this.settings.circleFillColorA;
        this.circleFillColorBInput.value = this.settings.circleFillColorB;
        this.circleOutlineColorInput.value = this.settings.circleOutlineColor;
        this.fontFamilyInput.value = this.settings.fontFamily;
        this.settingsModal.style.display = 'flex';
        this.settingsModal.setAttribute('aria-hidden', 'false');
        this.fontSizeInput.focus();
    }
    closeSettingsModal() {
        this.settingsModal.style.display = 'none';
        this.settingsModal.setAttribute('aria-hidden', 'true');
    }
    applyAndSaveSettings() {
        const newFontSize = parseInt(this.fontSizeInput.value);
        const newRadius = parseInt(this.circleRadiusInput.value);
        if (isNaN(newFontSize) || newFontSize <= 0 || isNaN(newRadius) || newRadius <= 0) {
            this.showStatus("Font size and radius must be positive numbers.", true);
            this.fontSizeInput.value = this.settings.fontSize.toString();
            this.circleRadiusInput.value = this.settings.circleRadius.toString();
            return;
        }
        this.settings.fontSize = newFontSize;
        this.settings.circleRadius = newRadius;
        this.settings.fontColor = this.fontColorInput.value;
        this.settings.circleFillColorA = this.circleFillColorAInput.value;
        this.settings.circleFillColorB = this.circleFillColorBInput.value;
        this.settings.circleOutlineColor = this.circleOutlineColorInput.value;
        this.settings.fontFamily = this.fontFamilyInput.value || "Arial";
        if (this.originalImage && this.history.length > 0) {
            this.history.forEach(marker => {
                marker.fontSize = this.settings.fontSize;
                marker.font = `${this.settings.fontSize}px ${this.settings.fontFamily}`;
                marker.fontColor = this.settings.fontColor;
                marker.circleRadius = this.settings.circleRadius;
                marker.outlineColor = this.settings.circleOutlineColor;
                marker.fillColor = marker.mode === 'A' ? this.settings.circleFillColorA : this.settings.circleFillColorB;
            });
            this.redrawCanvas();
            this.showStatus("Settings applied and image updated.", false);
        }
        else {
            this.showStatus("Settings saved.", false);
        }
        localStorage.setItem('imageEditorSettings', JSON.stringify(this.settings));
        this.closeSettingsModal();
    }
    loadSettings() {
        const savedSettings = localStorage.getItem('imageEditorSettings');
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                if (parsed && typeof parsed === 'object') {
                    this.settings = { ...this.settings, ...parsed };
                }
            }
            catch (e) {
                console.error("Failed to parse saved settings:", e);
                localStorage.removeItem('imageEditorSettings');
            }
        }
        this.fontSizeInput.value = this.settings.fontSize.toString();
        this.circleRadiusInput.value = this.settings.circleRadius.toString();
        this.fontColorInput.value = this.settings.fontColor;
        this.circleFillColorAInput.value = this.settings.circleFillColorA;
        this.circleFillColorBInput.value = this.settings.circleFillColorB;
        this.circleOutlineColorInput.value = this.settings.circleOutlineColor;
        this.fontFamilyInput.value = this.settings.fontFamily;
    }
    // --- Custom Confirm Modal Logic ---
    openConfirmModal(message, onConfirm) {
        this.onConfirmAction = onConfirm;
        this.confirmModalMessage.textContent = message;
        this.confirmModal.style.display = 'flex';
        this.confirmModal.setAttribute('aria-hidden', 'false');
        this.confirmModalConfirmBtn.focus();
    }
    closeConfirmModal() {
        this.confirmModal.style.display = 'none';
        this.confirmModal.setAttribute('aria-hidden', 'true');
        this.onConfirmAction = null;
    }
    handleConfirmDialogAction() {
        if (this.onConfirmAction) {
            this.onConfirmAction();
        }
        this.closeConfirmModal();
    }
}
new ImageEditor();
