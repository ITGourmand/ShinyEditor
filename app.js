// Classe pour gérer le zoom et le pan sur un canvas
class CanvasInteractor {
    constructor(container, canvas, onUpdate) {
        this.container = container;
        this.canvas = canvas;
        this.onUpdate = onUpdate;

        this.state = {
            scale: 1,
            panning: false,
            pointX: 0,
            pointY: 0,
            startX: 0,
            startY: 0,
            cssWidth: 0,
            cssHeight: 0
        };

        this.initDOM();
        this.setupEvents();
    }

    initDOM() {

        this.canvas.style.transformOrigin = "0 0";
        this.canvas.style.transform = `translate(0px, 0px) scale(1)`;
    }

    fitToContainer() {
        if (!this.canvas.width || !this.canvas.height) return;
        
        const containerRect = this.container.getBoundingClientRect();
        const ratio = this.canvas.width / this.canvas.height;
        
        let newWidth, newHeight;
        
        if (containerRect.width / containerRect.height > ratio) {
            newHeight = containerRect.height;
            newWidth = newHeight * ratio;
        } else {
            newWidth = containerRect.width;
            newHeight = newWidth / ratio;
        }

        this.state.cssWidth = newWidth;
        this.state.cssHeight = newHeight;
        this.state.scale = 1;

        this.state.pointX = (containerRect.width - newWidth) / 2;
        this.state.pointY = (containerRect.height - newHeight) / 2;
        
        this.canvas.style.width = `${newWidth}px`;
        this.canvas.style.height = `${newHeight}px`;
        
        this.updateTransform();
    }

    updateTransform() {

        this.canvas.style.transform = `translate(${this.state.pointX}px, ${this.state.pointY}px) scale(${this.state.scale})`;
        if (this.onUpdate) this.onUpdate(this.getTransformState());
    }

    getTransformState() {
        return { ...this.state };
    }

    syncFrom(otherState) {
        this.state.scale = otherState.scale;
        this.state.pointX = otherState.pointX;
        this.state.pointY = otherState.pointY;
        this.updateTransform();
    }

    setupEvents() {

        let initialPinchDistance = null;
        let initialScale = null;

        this.container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {

                e.preventDefault();
                initialPinchDistance = Math.hypot(
                    e.touches.clientX - e.touches.clientX,
                    e.touches.clientY - e.touches.clientY
                );
                initialScale = this.state.scale;
            } else if (e.touches.length === 1 && !app.state.isPipetteActive) {

                this.state.panning = true;
                this.state.startX = e.touches.clientX - this.state.pointX;
                this.state.startY = e.touches.clientY - this.state.pointY;
            }
        }, { passive: false });

        this.container.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && initialPinchDistance) {

                e.preventDefault();
                const currentDistance = Math.hypot(
                    e.touches.clientX - e.touches.clientX,
                    e.touches.clientY - e.touches.clientY
                );

                const centerX = (e.touches.clientX + e.touches.clientX) / 2;
                const centerY = (e.touches.clientY + e.touches.clientY) / 2;
                
                const xs = (centerX - this.state.pointX) / this.state.scale;
                const ys = (centerY - this.state.pointY) / this.state.scale;

                let newScale = initialScale * (currentDistance / initialPinchDistance);
                newScale = Math.max(0.1, Math.min(newScale, 50)); 

                this.state.pointX = centerX - xs * newScale;
                this.state.pointY = centerY - ys * newScale;
                this.state.scale = newScale;

                this.updateTransform();
            } else if (this.state.panning && e.touches.length === 1) {

                e.preventDefault();
                this.state.pointX = e.touches.clientX - this.state.startX;
                this.state.pointY = e.touches.clientY - this.state.startY;
                this.updateTransform();
            }
        }, { passive: false });

        this.container.addEventListener('touchend', (e) => {
            initialPinchDistance = null;
            this.state.panning = false;
        });

        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const xs = (e.clientX - this.state.pointX) / this.state.scale;
            const ys = (e.clientY - this.state.pointY) / this.state.scale;

            const delta = -e.deltaY;

            const factor = delta > 0 ? 1.1 : 0.9;
            
            let newScale = this.state.scale * factor;

            newScale = Math.max(0.1, Math.min(newScale, 50)); 

            this.state.pointX = e.clientX - xs * newScale;
            this.state.pointY = e.clientY - ys * newScale;
            this.state.scale = newScale;

            this.updateTransform();
        }, { passive: false });

        const startPan = (e) => {

            const isMiddleClick = e.button === 1;
            const isSpacePan = e.button === 0 && window.isSpacePressed;

            if (isMiddleClick || isSpacePan) {
                e.preventDefault();
                this.state.panning = true;
                this.state.startX = e.clientX - this.state.pointX;
                this.state.startY = e.clientY - this.state.pointY;
                this.container.classList.add('grabbing');

                this.container.setPointerCapture(e.pointerId);
            }
        };

        const endPan = (e) => {
            if (this.state.panning) {
                this.state.panning = false;
                this.container.classList.remove('grabbing');
                this.container.releasePointerCapture(e.pointerId);
            }
        };

        const movePan = (e) => {
            if (!this.state.panning) return;
            e.preventDefault();
            this.state.pointX = e.clientX - this.state.startX;
            this.state.pointY = e.clientY - this.state.startY;
            this.updateTransform();
        };

        this.container.addEventListener('pointerdown', startPan);
        this.container.addEventListener('pointermove', movePan);
        this.container.addEventListener('pointerup', endPan);
        this.container.addEventListener('pointercancel', endPan);

        this.container.addEventListener('contextmenu', (e) => {
            if (e.button === 1) e.preventDefault();
        });
    }
}

const app = {
    module: null,
    sourceImages: [],
    currentIndex: 0,
    originalImageData: null,
    rules: [],
    state: { isPipetteActive: false, updateTimeout: null, showOnlyModified: false },

    interactors: { original: null, result: null },

    ui: {
        workspace: document.getElementById('workspace'),
        uploadInput: document.getElementById('imageUpload'),
        refUploadInput: document.getElementById('refUpload'),
        dropZone: document.getElementById('dropZone'),
        rulesContainer: document.getElementById('rulesContainer'),

        filterRulesBtn: document.getElementById('filterRulesBtn'),
        addRuleBtn: document.getElementById('addRuleBtn'),

        navControls: document.getElementById('navControls'),
        imageCounter: document.getElementById('imageCounter'),
        prevBtn: document.getElementById('prevBtn'),
        nextBtn: document.getElementById('nextBtn'),
        
        originalCanvas: document.getElementById('originalCanvas'),
        originalContainer: document.getElementById('originalContainer'),
        resultCanvas: document.getElementById('resultCanvas'),
        resultContainer: document.getElementById('resultContainer'),
        refCanvas: document.getElementById('refCanvas'),
        
        origCtx: document.getElementById('originalCanvas').getContext('2d', { willReadFrequently: true }),
        resCtx: document.getElementById('resultCanvas').getContext('2d', { willReadFrequently: true }),
        refCtx: document.getElementById('refCanvas').getContext('2d', { willReadFrequently: true }),
        
        refPlaceholder: document.getElementById('refPlaceholder'),
        timer: document.getElementById('timer'),
        pipetteBtn: document.getElementById('pipetteBtn'),
        downloadPngBtn: document.getElementById('downloadPngBtn'),
        downloadVideoBtn: document.getElementById('downloadVideoBtn'),
        zoomHint: document.getElementById('zoomHint')
    },

    async init() {
        this.initRules();
        this.setupEventListeners();
        this.initInteractors();
        await this.initWasm();
        this.renderRules();
    },

    async initWasm() {
        try { 
            this.module = await createGdModule(); 
            this.ui.timer.textContent = "Wasm Ready";
        } catch (e) { 
            console.error("Wasm Fail", e); 
            this.ui.timer.textContent = "Wasm error";
        }
    },

    initRules(){
        const default_colors = ["#FFFFFF", "#bebebe", "#505050", "#323232"];
        this.rules = default_colors.map(color => ({ 
            from: color, 
            to: color, 
            isDefault: true
        }));
    },

    initInteractors() {

        const sync = (otherInteractor, newState) => {

            if (otherInteractor.isSyncing) return; 
            otherInteractor.isSyncing = true;
            otherInteractor.syncFrom(newState);
            otherInteractor.isSyncing = false;
        };

        this.interactors.original = new CanvasInteractor(
            this.ui.originalContainer, 
            this.ui.originalCanvas,
            (state) => sync(this.interactors.result, state)
        );
        
        this.interactors.result = new CanvasInteractor(
            this.ui.resultContainer, 
            this.ui.resultCanvas,
            (state) => sync(this.interactors.original, state)
        );
    },

    setupEventListeners() {

        this.ui.prevBtn.onclick = () => this.navigate(-1);
        this.ui.nextBtn.onclick = () => this.navigate(1);

        window.addEventListener('keydown', (e) => {
            if (document.activeElement.tagName === 'INPUT') return;
            
            if (e.key === 'ArrowLeft') this.navigate(-1);
            if (e.key === 'ArrowRight') this.navigate(1);
        });

        this.ui.dropZone.onclick = () => this.ui.uploadInput.click();
        this.ui.uploadInput.onchange = (e) => this.handleFile(e.target.files, 'source');
        this.ui.refUploadInput.onchange = (e) => this.handleFile(e.target.files[0], 'ref');

        this.ui.pipetteBtn.onclick = () => this.togglePipette();

        this.ui.originalContainer.onclick = (e) => this.handlePipetteClick(e);

        this.ui.addRuleBtn.onclick = () => {
            this.rules.push({ from: '#000000', to: '#ffffff' });
            this.renderRules();
            this.triggerAutoUpdate();
        };

        this.ui.rulesContainer.oninput = (e) => {
            if(e.target.type === 'color') {
                const roundedHex = this.roundColor(e.target.value);
                e.target.value = roundedHex;
                this.rules[e.target.dataset.index][e.target.dataset.type] = roundedHex;
                this.triggerAutoUpdate();
                this.refreshRuleWarnings();
            }
        };

        this.ui.filterRulesBtn.onclick = () => {
            this.state.showOnlyModified = !this.state.showOnlyModified;
            this.ui.filterRulesBtn.classList.toggle('filter-active', this.state.showOnlyModified);
            this.renderRules();
            this.applyRemap();
        };

        this.ui.rulesContainer.onclick = (e) => {
            const btn = e.target.closest('button');
            if(btn) {
                const index = btn.dataset.index;
                const rule = this.rules[index];
                if (rule.isDefault) {
                    const confirmDelete = confirm("Warning: This rule is set by default. Deleting it may make the results unstable. Do you want to continue?");
                    if (!confirmDelete) return;
                }
        
                this.rules.splice(index, 1);
                this.renderRules();
                this.triggerAutoUpdate();
            }
        };

        this.ui.downloadPngBtn.onclick = () => {
            const link = document.createElement('a');
            link.download = `remap-${Date.now()}.png`;
            link.href = this.ui.resultCanvas.toDataURL();
            link.click();
        };

        this.ui.downloadVideoBtn.onclick = () => this.exportVideo();

        window.isSpacePressed = false;
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
                window.isSpacePressed = true;
                this.ui.workspace.classList.add('panning');

                if(!this.state.isPipetteActive) e.preventDefault(); 
            }
        });
        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                window.isSpacePressed = false;
                this.ui.workspace.classList.remove('panning');
            }
        });

        window.addEventListener('resize', () => {
            if(this.originalImageData) {
                this.interactors.original.fitToContainer();
                this.interactors.result.fitToContainer();
            }
        });
    },

    handleFile(files, type) {
        if (!files || (files instanceof FileList && files.length === 0)) return;
    
        if (type === 'ref') {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => this.loadRef(img);
                img.src = e.target.result;
            };
            reader.readAsDataURL(files);
            return;
        }

        const fileList = Array.from(files);
        this.sourceImages = [];
        this.currentIndex = 0;
    
        let loadedCount = 0;
        fileList.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    this.sourceImages[index] = { img, name: file.name };
                    loadedCount++;
                    if (loadedCount === fileList.length) {
                        this.ui.navControls.classList.remove('hidden');
                        this.displaySourceImage(0);
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    },

    displaySourceImage(index) {
        if (!this.sourceImages[index]) return;
        this.currentIndex = index;
        const imgData = this.sourceImages[index];
    
        this.loadSource(imgData.img);
        this.ui.imageCounter.textContent = `${this.currentIndex + 1} / ${this.sourceImages.length}`;
    },

    navigate(direction) {
        if (this.sourceImages.length <= 1) return;
        
        this.currentIndex += direction;
        if (this.currentIndex < 0) this.currentIndex = this.sourceImages.length - 1;
        if (this.currentIndex >= this.sourceImages.length) this.currentIndex = 0;
        
        this.displaySourceImage(this.currentIndex);
    },

    loadSource(img) {
        const { width, height } = img;

        this.ui.originalCanvas.width = this.ui.resultCanvas.width = width;
        this.ui.originalCanvas.height = this.ui.resultCanvas.height = height;

        this.ui.origCtx.drawImage(img, 0, 0);
        this.originalImageData = this.ui.origCtx.getImageData(0, 0, width, height);

        this.ui.resCtx.putImageData(this.originalImageData, 0, 0);

        this.ui.pipetteBtn.disabled = this.ui.downloadPngBtn.disabled = this.ui.downloadVideoBtn.disabled = false;

        this.interactors.original.fitToContainer();
        this.interactors.result.fitToContainer();

        this.ui.zoomHint.style.opacity = 1;
        setTimeout(() => this.ui.zoomHint.style.opacity = 0, 4000);

        this.triggerAutoUpdate();
    },

    loadRef(img) {
        this.ui.refCanvas.width = img.width;
        this.ui.refCanvas.height = img.height;
        this.ui.refCtx.drawImage(img, 0, 0);
        this.ui.refCanvas.classList.remove('hidden');
        this.ui.refPlaceholder.classList.add('hidden');
    },

    async exportVideo() {
        if (!this.module || this.sourceImages.length === 0) return;
        if (typeof WebMMuxer === 'undefined') {
            alert("Erreur : La librairie webm-muxer n'est pas chargée dans le HTML.");
            return;
        }
    
        const btn = this.ui.downloadVideoBtn;
        const originalBtnContent = btn.innerHTML;
        btn.disabled = true;
        btn.style.opacity = "0.5";
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
        
        const t0 = performance.now();
        this.ui.timer.textContent = "Exportation ultra-rapide (WebCodecs)...";

        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = 1152;
        exportCanvas.height = 576;
        const exportCtx = exportCanvas.getContext('2d'); 
        exportCtx.imageSmoothingEnabled = false;
    
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        let activeRules = this.state.showOnlyModified ? this.rules.filter(r => r.from !== r.to) : this.rules;
        const cppRules = activeRules.map(r => [this.hexToRgb(r.from), this.hexToRgb(r.to)]);
        const filter = this.module.CreatePaletteRemap(cppRules);

        const framerate = 30;
        const durationPerImageSec = 1;
        const framesPerImage = framerate * durationPerImageSec;

        let muxer = new WebMMuxer.Muxer({
            target: new WebMMuxer.ArrayBufferTarget(),
            video: {
                codec: 'V_VP9',
                width: exportCanvas.width,
                height: exportCanvas.height,
                frameRate: framerate
            }
        });

        let videoEncoder = new VideoEncoder({
            output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
            error: e => console.error("VideoEncoder error:", e)
        });

        videoEncoder.configure({
            codec: 'vp09.00.10.08',
            width: exportCanvas.width,
            height: exportCanvas.height,
            bitrate: 12_000_000
        });
    
        let frameIndex = 0;

        for (let i = 0; i < this.sourceImages.length; i++) {
            const img = this.sourceImages[i].img;
    
            if (tempCanvas.width !== img.width || tempCanvas.height !== img.height) {
                tempCanvas.width = img.width;
                tempCanvas.height = img.height;
            }

            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(img, 0, 0);
            
            const imgData = tempCtx.getImageData(0, 0, img.width, img.height);
            let cppImage = new this.module.Image(img.width, img.height, new this.module.Pixel(0,0,0,0));
            cppImage.setData(imgData.data);
            cppImage.applyFilter(filter);
            
            const out = cppImage.getPixelView();
            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.putImageData(new ImageData(new Uint8ClampedArray(out), img.width, img.height), 0, 0);
            cppImage.delete();

            exportCtx.clearRect(0, 0, 1152, 576);
            exportCtx.fillStyle = '#212121';
            exportCtx.fillRect(0, 0, 1152, 576);
            exportCtx.fillStyle = '#C8C8C8';
            exportCtx.fillRect(0, 0, 576, 576);
            exportCtx.fillRect(576, 0, 576, 576);
            exportCtx.drawImage(img, 0, 0, 576, 576);
            exportCtx.drawImage(tempCanvas, 576, 0, 576, 576);

            for (let f = 0; f < framesPerImage; f++) {

                let timestamp = (frameIndex * 1_000_000) / framerate; 
                let frame = new VideoFrame(exportCanvas, { timestamp });

                const isKeyFrame = (f === 0);
                videoEncoder.encode(frame, { keyFrame: isKeyFrame });
                
                frame.close();
                frameIndex++;
            }
        }

        filter.delete();
        
        await videoEncoder.flush();
        videoEncoder.close();
        muxer.finalize();

        const blob = new Blob([muxer.target.buffer], { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `shiny-export-${Date.now()}.webm`;
        link.click();
        URL.revokeObjectURL(url);
    
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.innerHTML = originalBtnContent;
        this.ui.timer.textContent = `Export completed in ${((performance.now() - t0)/1000).toFixed(2)}s`;
    },

    async togglePipette() {

        if (!window.EyeDropper) {

            this.oldTogglePipette(); 
            return;
        }
    
        const eyeDropper = new EyeDropper();
        try {
            const result = await eyeDropper.open();
            const roundedHex = this.roundColor(result.sRGBHex);
            this.rules.push({ from: roundedHex, to: roundedHex });
            this.renderRules();
            this.triggerAutoUpdate();
        } catch (e) {

        }
    },

    oldtogglePipette() {
        this.state.isPipetteActive = !this.state.isPipetteActive;
        this.ui.pipetteBtn.classList.toggle('pipette-active', this.state.isPipetteActive);
        this.ui.originalContainer.classList.toggle('picking-mode', this.state.isPipetteActive);
    },

    handlePipetteClick(e) {

        if (!this.state.isPipetteActive || !this.originalImageData || window.isSpacePressed) return;
        
        const interactor = this.interactors.original;
        const s = interactor.state;


        const rect = this.ui.originalContainer.getBoundingClientRect();
        const mouseXContainer = e.clientX - rect.left;
        const mouseYContainer = e.clientY - rect.top;


        const xRelTransform = (mouseXContainer - s.pointX) / s.scale;
        const yRelTransform = (mouseYContainer - s.pointY) / s.scale;

        const xPixel = Math.floor(xRelTransform * (this.ui.originalCanvas.width / s.cssWidth));
        const yPixel = Math.floor(yRelTransform * (this.ui.originalCanvas.height / s.cssHeight));

        if (xPixel < 0 || xPixel >= this.ui.originalCanvas.width || 
            yPixel < 0 || yPixel >= this.ui.originalCanvas.height) return;

        const p = this.ui.origCtx.getImageData(xPixel, yPixel, 1, 1).data;

        const hex = "#" + ((1 << 24) + (p[0] << 16) + (p[1] << 8) + p[2]).toString(16).slice(1);
        const roundedHex = this.roundColor(hex);

        this.rules.push({ from: roundedHex, to: roundedHex });
        this.renderRules();

        this.togglePipette();

        this.triggerAutoUpdate(); 
    },

    roundColor(hex) {
        const roundedValues = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250, 255];

        let r = parseInt(hex.slice(1, 3), 16);
        let g = parseInt(hex.slice(3, 5), 16);
        let b = parseInt(hex.slice(5, 7), 16);

        const findClosest = (val) => roundedValues.reduce((prev, curr) => 
            Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev
        );

        r = findClosest(r);
        g = findClosest(g);
        b = findClosest(b);

        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    },

    renderRules() {
        const fromCounts = this.rules.reduce((acc, r) => {
            acc[r.from] = (acc[r.from] || 0) + 1;
            return acc;
        }, {});
    
        this.ui.rulesContainer.innerHTML = this.rules.map((r, i) => {
            const isIdentity = r.from === r.to;
            const isDuplicate = fromCounts[r.from] > 1;

            if (this.state.showOnlyModified && isIdentity) {
                return '';
            }

            let warningClass = "";
            if (isDuplicate) warningClass = "rule-warning-duplicate";
            else if (isIdentity) warningClass = "rule-warning-identity";
    
            return `
                <div class="flex items-center gap-3 p-2 bg-slate-700/40 rounded-lg border border-white/5 hover:border-white/10 transition-colors ${warningClass}">
                    <input type="color" value="${r.from}" data-type="from" data-index="${i}" 
                        title="${isDuplicate ? 'Conflict: This source color is used multiple times' : 'Color Source'}" ${r.isDefault ? 'disabled' : ''}>
                    <i class="fa-solid fa-arrow-right text-xs opacity-20 ${isIdentity ? 'text-amber-500 opacity-100' : ''}"></i>
                    <input type="color" value="${r.to}" data-type="to" data-index="${i}" 
                        title="${isIdentity ? 'Warning: Source and Result are identical' : 'New Color'}" ${r.isDefault ? 'disabled' : ''}>
                    <button data-index="${i}" class="ml-auto w-8 h-8 flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition" title="Delete">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                </div>
            `;
        }).join('');
    },

    refreshRuleWarnings() {

        const fromCounts = this.rules.reduce((acc, r) => {
            acc[r.from] = (acc[r.from] || 0) + 1;
            return acc;
        }, {});

        const ruleElements = this.ui.rulesContainer.querySelectorAll('.flex.items-center.gap-3');
        
        this.rules.forEach((r, i) => {
            const el = ruleElements[i];
            if (!el) return;
    
            const isIdentity = r.from === r.to;
            const isDuplicate = fromCounts[r.from] > 1;

            el.classList.toggle('rule-warning-duplicate', isDuplicate);
            el.classList.toggle('rule-warning-identity', !isDuplicate && isIdentity);

            const arrow = el.querySelector('.fa-arrow-right');
            if (arrow) {
                arrow.classList.toggle('text-amber-500', isIdentity);
                arrow.classList.toggle('opacity-100', isIdentity);
            }
        });
    },

    triggerAutoUpdate() {

        clearTimeout(this.state.updateTimeout);
        this.state.updateTimeout = setTimeout(() => this.applyRemap(), 20);
    },

    applyRemap() {

        if (!this.module || !this.originalImageData || this.rules.length === 0) return;
        
        const t0 = performance.now();
        const { width, height, data } = this.originalImageData;
        

        let activeRules = this.rules;
        if (this.state.showOnlyModified) {
            activeRules = this.rules.filter(r => r.from !== r.to);
        }

        if (activeRules.length === 0 && this.state.showOnlyModified) {
            this.ui.resCtx.putImageData(this.originalImageData, 0, 0);
            this.ui.timer.textContent = `Maj: 0ms (No Changes)`;
            return;
        }

        const cppRules = activeRules.map(r => [this.hexToRgb(r.from), this.hexToRgb(r.to)]);

        let cppImage = new this.module.Image(width, height, new this.module.Pixel(0,0,0,0));
        cppImage.setData(data);

        let filter = this.module.CreatePaletteRemap(cppRules);
        cppImage.applyFilter(filter);

        const out = cppImage.getPixelView();

        this.ui.resCtx.putImageData(new ImageData(new Uint8ClampedArray(out), width, height), 0, 0);

        filter.delete();
        cppImage.delete();
        
        this.ui.timer.textContent = `Maj: ${(performance.now() - t0).toFixed(1)}ms`;
    },

    hexToRgb(hex) {
        let b = parseInt(hex.slice(1), 16);
        return [(b >> 16) & 255, (b >> 8) & 255, b & 255];
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());