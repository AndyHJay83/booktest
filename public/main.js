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
        this.pdfInput = document.getElementById('pdf-input');
        this.fileInputLabel = document.getElementById('file-input-label');
        this.viewerSection = document.getElementById('viewer-section');
        this.canvas = document.getElementById('pdf-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.pageInfo = document.getElementById('page-info');
        this.newFileBtn = document.getElementById('new-file-btn');
    }
    
    attachEventListeners() {
        // File input change
        this.pdfInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag and drop
        this.fileInputLabel.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.fileInputLabel.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.fileInputLabel.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Navigation buttons
        this.prevBtn.addEventListener('click', () => this.previousPage());
        this.nextBtn.addEventListener('click', () => this.nextPage());
        
        // New file button
        this.newFileBtn.addEventListener('click', () => this.resetViewer());
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
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
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
            this.loadPDF(files[0]);
        } else {
            this.showError('Please select a valid PDF file.');
        }
    }
    
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            this.loadPDF(file);
        } else {
            this.showError('Please select a valid PDF file.');
        }
    }
    
    async loadPDF(file) {
        try {
            this.showLoading();
            
            const arrayBuffer = await file.arrayBuffer();
            this.pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;
            this.totalPages = this.pdfDoc.numPages;
            this.currentPage = 1;
            
            this.updatePageInfo();
            this.updateNavigationButtons();
            this.renderPage();
            this.showViewer();
            
        } catch (error) {
            console.error('Error loading PDF:', error);
            this.showError('Failed to load PDF file. Please try again.');
        }
    }
    
    async renderPage() {
        if (!this.pdfDoc) return;
        
        try {
            const page = await this.pdfDoc.getPage(this.currentPage);
            const viewport = page.getViewport({ scale: this.scale });
            
            // Set canvas dimensions
            this.canvas.height = viewport.height;
            this.canvas.width = viewport.width;
            
            // Render PDF page into canvas context
            const renderContext = {
                canvasContext: this.ctx,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
            
        } catch (error) {
            console.error('Error rendering page:', error);
            this.showError('Failed to render page. Please try again.');
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
        this.viewerSection.innerHTML = `
            <div class="loading">
                <div style="font-size: 24px; margin-bottom: 16px;">⏳</div>
                <div>Loading PDF...</div>
            </div>
        `;
        this.showViewer();
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
