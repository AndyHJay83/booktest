// PDF.js configuration
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

class PDFViewer {
    constructor() {
        this.pdfDoc = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.scale = 1.5;
        
        this.initializeElements();
        this.attachEventListeners();
    }
    
    initializeElements() {
        console.log('Initializing elements...');
        
        this.pdfInput = document.getElementById('pdf-input');
        console.log('PDF input element:', this.pdfInput);
        
        this.fileInputLabel = document.getElementById('file-input-label');
        console.log('File input label element:', this.fileInputLabel);
        
        this.viewerSection = document.getElementById('viewer-section');
        console.log('Viewer section element:', this.viewerSection);
        
        this.canvas = document.getElementById('pdf-canvas');
        console.log('Canvas element:', this.canvas);
        
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            console.log('Canvas context:', this.ctx);
        }
        
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.pageInfo = document.getElementById('page-info');
        this.newFileBtn = document.getElementById('new-file-btn');
        
        console.log('Navigation elements:', {
            prevBtn: this.prevBtn,
            nextBtn: this.nextBtn,
            pageInfo: this.pageInfo,
            newFileBtn: this.newFileBtn
        });
    }
    
    attachEventListeners() {
        console.log('Attaching event listeners...');
        
        // File input change
        if (this.pdfInput) {
            this.pdfInput.addEventListener('change', (e) => this.handleFileSelect(e));
            console.log('File input event listener attached');
        } else {
            console.error('PDF input element not found');
        }
        
        // Drag and drop
        if (this.fileInputLabel) {
            this.fileInputLabel.addEventListener('dragover', (e) => this.handleDragOver(e));
            this.fileInputLabel.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            this.fileInputLabel.addEventListener('drop', (e) => this.handleDrop(e));
            console.log('Drag and drop event listeners attached');
        } else {
            console.error('File input label element not found');
        }
        
        // Navigation buttons (only if they exist)
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.previousPage());
            console.log('Previous button event listener attached');
        }
        
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.nextPage());
            console.log('Next button event listener attached');
        }
        
        // New file button (only if it exists)
        if (this.newFileBtn) {
            this.newFileBtn.addEventListener('click', () => this.resetViewer());
            console.log('New file button event listener attached');
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        console.log('Keyboard event listener attached');
    }
    
    handleDragOver(e) {
        e.preventDefault();
        this.fileInputLabel.classList.add('dragover');
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        this.fileInputLabel.classList.remove('dragover');
    }
    
    handleDrop(e) {
        e.preventDefault();
        this.fileInputLabel.classList.remove('dragover');
        
        console.log('File dropped');
        const files = e.dataTransfer.files;
        console.log('Dropped files:', files);
        
        if (files.length > 0) {
            const file = files[0];
            console.log('Dropped file:', file.name, 'Type:', file.type, 'Size:', file.size);
            
            if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                console.log('Valid PDF file dropped, loading...');
                this.loadPDF(file);
            } else {
                console.log('Invalid file type dropped:', file.type);
                this.showError(`Please drop a valid PDF file. Dropped file type: ${file.type}`);
            }
        } else {
            console.log('No files dropped');
            this.showError('No files dropped. Please drop a PDF file.');
        }
    }
    
    handleFileSelect(e) {
        console.log('File input changed');
        console.log('Files:', e.target.files);
        
        const file = e.target.files[0];
        if (file) {
            console.log('Selected file:', file.name, 'Type:', file.type, 'Size:', file.size);
            
            // Check if it's a PDF file
            if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                console.log('Valid PDF file detected, loading...');
                this.loadPDF(file);
            } else {
                console.log('Invalid file type:', file.type);
                this.showError(`Please select a valid PDF file. Selected file type: ${file.type}`);
            }
        } else {
            console.log('No file selected');
            this.showError('No file selected. Please choose a PDF file.');
        }
    }
    
    async loadPDF(file) {
        try {
            this.showLoading();
            
            console.log('Loading PDF file:', file.name);
            const arrayBuffer = await file.arrayBuffer();
            console.log('ArrayBuffer created, size:', arrayBuffer.byteLength);
            
            this.pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;
            console.log('PDF document loaded, pages:', this.pdfDoc.numPages);
            
            this.totalPages = this.pdfDoc.numPages;
            this.currentPage = 1;
            
            // Show the viewer content and render the first page
            this.showViewerContent();
            await this.renderPage();
            
        } catch (error) {
            console.error('Error loading PDF:', error);
            this.showError(`Failed to load PDF file: ${error.message}`);
        }
    }
    
    async renderPage() {
        if (!this.pdfDoc) {
            console.error('No PDF document loaded');
            return;
        }
        
        try {
            console.log('Rendering page:', this.currentPage);
            const page = await this.pdfDoc.getPage(this.currentPage);
            const viewport = page.getViewport({ scale: this.scale });
            
            console.log('Page viewport:', viewport.width, 'x', viewport.height);
            
            // Set canvas dimensions
            this.canvas.height = viewport.height;
            this.canvas.width = viewport.width;
            
            // Render PDF page into canvas context
            const renderContext = {
                canvasContext: this.ctx,
                viewport: viewport
            };
            
            console.log('Starting page render...');
            await page.render(renderContext).promise;
            console.log('Page render completed');
            
        } catch (error) {
            console.error('Error rendering page:', error);
            this.showError(`Failed to render page: ${error.message}`);
        }
    }
    
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePageInfo();
            this.updateNavigationButtons();
            this.renderPage();
        }
    }
    
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePageInfo();
            this.updateNavigationButtons();
            this.renderPage();
        }
    }
    
    updatePageInfo() {
        this.pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
    }
    
    updateNavigationButtons() {
        this.prevBtn.disabled = this.currentPage <= 1;
        this.nextBtn.disabled = this.currentPage >= this.totalPages;
    }
    
    handleKeyboard(e) {
        if (!this.viewerSection.classList.contains('active')) return;
        
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.previousPage();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.nextPage();
                break;
            case 'Home':
                e.preventDefault();
                this.currentPage = 1;
                this.updatePageInfo();
                this.updateNavigationButtons();
                this.renderPage();
                break;
            case 'End':
                e.preventDefault();
                this.currentPage = this.totalPages;
                this.updatePageInfo();
                this.updateNavigationButtons();
                this.renderPage();
                break;
        }
    }
    
    resetViewer() {
        this.pdfDoc = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.pdfInput.value = '';
        this.hideViewer();
    }
    
    showViewer() {
        this.viewerSection.classList.add('active');
    }
    
    hideViewer() {
        this.viewerSection.classList.remove('active');
    }
    
    showLoading() {
        // Show loading state without destroying the viewer structure
        this.viewerSection.innerHTML = `
            <div class="loading">
                <div style="font-size: 24px; margin-bottom: 16px;">⏳</div>
                <div>Loading PDF...</div>
            </div>
        `;
        this.showViewer();
    }
    
    showViewerContent() {
        // Restore the viewer content after loading
        this.viewerSection.innerHTML = `
            <div class="controls">
                <button class="btn btn-secondary" id="prev-btn" disabled>← Previous</button>
                <div class="page-info" id="page-info">Page 1 of 1</div>
                <button class="btn btn-secondary" id="next-btn" disabled>Next →</button>
            </div>
            
            <div class="canvas-container">
                <canvas id="pdf-canvas"></canvas>
            </div>
            
            <div class="controls">
                <button class="btn btn-primary" id="new-file-btn">Upload New File</button>
            </div>
        `;
        
        // Re-initialize elements after DOM update
        this.initializeElements();
        this.attachEventListeners();
    }
    
    showError(message) {
        this.viewerSection.innerHTML = `
            <div class="error">
                <strong>Error:</strong> ${message}
            </div>
            <div class="controls">
                <button class="btn btn-primary" onclick="location.reload()">Try Again</button>
            </div>
        `;
        this.showViewer();
    }
}

// Initialize the PDF viewer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if PDF.js is loaded
    if (typeof pdfjsLib === 'undefined') {
        console.error('PDF.js library not loaded');
        document.body.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <h1>Error</h1>
                <p>PDF.js library failed to load. Please refresh the page.</p>
                <button onclick="location.reload()">Refresh Page</button>
            </div>
        `;
        return;
    }
    
    console.log('PDF.js version:', pdfjsLib.version);
    console.log('Initializing PDF viewer...');
    new PDFViewer();
});

// Handle PWA install prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Show install button or notification
    console.log('PWA install prompt available');
});

// Handle PWA install
window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    deferredPrompt = null;
});

// Show install prompt function (can be called from UI)
function showInstallPrompt() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            deferredPrompt = null;
        });
    }
}
