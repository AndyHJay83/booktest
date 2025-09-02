// PDF.js configuration
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

class PDFViewer {
    constructor() {
        this.pdfDoc = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.scale = 1.5;
        this.indexer = null;
        this.searcher = null;
        this.highlighter = null;
        this.currentSearchResults = [];
        
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
        this.indexPdfBtn = document.getElementById('index-pdf-btn');
        
        // Search elements
        this.searchInput = document.getElementById('search-input');
        this.searchBtn = document.getElementById('search-btn');
        this.clearSearchBtn = document.getElementById('clear-search-btn');
        this.searchStatus = document.getElementById('search-status');
        this.resultsList = document.getElementById('results-list');
        this.toggleResultsBtn = document.getElementById('toggle-results-btn');
        
        console.log('Navigation elements:', {
            prevBtn: this.prevBtn,
            nextBtn: this.nextBtn,
            pageInfo: this.pageInfo,
            newFileBtn: this.newFileBtn,
            indexPdfBtn: this.indexPdfBtn,
            searchInput: this.searchInput,
            searchBtn: this.searchBtn,
            clearSearchBtn: this.clearSearchBtn
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
        
        // Index PDF button (only if it exists)
        if (this.indexPdfBtn) {
            this.indexPdfBtn.addEventListener('click', () => this.indexPDF());
            console.log('Index PDF button event listener attached');
        }
        
        // Search event listeners
        if (this.searchBtn) {
            this.searchBtn.addEventListener('click', () => this.performSearch());
            console.log('Search button event listener attached');
        }
        
        if (this.clearSearchBtn) {
            this.clearSearchBtn.addEventListener('click', () => this.clearSearch());
            console.log('Clear search button event listener attached');
        }
        
        if (this.searchInput) {
            this.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
            console.log('Search input event listener attached');
        }
        
        if (this.toggleResultsBtn) {
            this.toggleResultsBtn.addEventListener('click', () => this.toggleResultsPanel());
            console.log('Toggle results button event listener attached');
        }
        
        // Custom event listener for search dot clicks
        document.addEventListener('searchDotClick', (e) => this.onSearchDotClick(e.detail));
        
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
            console.log('PDF document info:', await this.pdfDoc.getMetadata());
            
            this.totalPages = this.pdfDoc.numPages;
            this.currentPage = 1;
            
            // Show the viewer content and render the first page
            this.showViewerContent();
            await this.renderPage();
            
            // Initialize search and highlighting
            this.initializeSearchAndHighlight();
            
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
    
    async indexPDF() {
        if (!this.pdfDoc) {
            this.showError('No PDF loaded. Please upload a PDF file first.');
            return;
        }

        try {
            console.log('Starting PDF indexing...');
            
            // Disable the index button during processing
            if (this.indexPdfBtn) {
                this.indexPdfBtn.disabled = true;
                this.indexPdfBtn.textContent = 'Indexing...';
            }

            // Initialize the indexer if not already done
            if (!this.indexer) {
                this.indexer = new window.PDFIndexer();
            }

            // Start indexing
            const words = await this.indexer.indexPDF(this.pdfDoc, this.scale);
            
            console.log(`Indexing completed! Extracted ${words.length} words.`);
            
            // Show success message
            this.showIndexingSuccess(words.length);
            
        } catch (error) {
            console.error('Error during indexing:', error);
            this.showError(`Indexing failed: ${error.message}`);
        } finally {
            // Re-enable the index button
            if (this.indexPdfBtn) {
                this.indexPdfBtn.disabled = false;
                this.indexPdfBtn.textContent = 'Index PDF';
            }
        }
    }

    showIndexingSuccess(wordCount) {
        // Show success message temporarily
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.style.cssText = `
            background: #d1fae5;
            border: 1px solid #10b981;
            color: #065f46;
            padding: 16px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
        `;
        successDiv.innerHTML = `
            <strong>✅ Indexing Complete!</strong><br>
            Successfully indexed ${wordCount} words from ${this.totalPages} pages.<br>
            <small>Check the browser console to see the first 10 indexed words.</small>
        `;
        
        // Insert after the canvas container
        const canvasContainer = this.viewerSection.querySelector('.canvas-container');
        canvasContainer.parentNode.insertBefore(successDiv, canvasContainer.nextSibling);
        
        // Remove the success message after 5 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 5000);
    }

    initializeSearchAndHighlight() {
        try {
            // Initialize search functionality
            if (window.PDFSearch) {
                this.searcher = new window.PDFSearch();
                console.log('Search functionality initialized');
            }
            
            // Initialize highlighting functionality
            if (window.PDFHighlighter) {
                const canvasContainer = this.viewerSection.querySelector('.canvas-container');
                this.highlighter = new window.PDFHighlighter();
                this.highlighter.initialize(canvasContainer, this.scale);
                console.log('Highlighting functionality initialized');
            }
            
        } catch (error) {
            console.error('Error initializing search and highlighting:', error);
        }
    }

    async performSearch() {
        if (!this.searcher) {
            this.updateSearchStatus('Search not available. Please index the PDF first.', 'error');
            return;
        }

        const searchTerm = this.searchInput.value.trim();
        if (!searchTerm) {
            this.updateSearchStatus('Please enter a search term.', 'warning');
            return;
        }

        try {
            this.updateSearchStatus('Searching...', 'info');
            
            // Initialize search index if not already done
            if (!this.searcher.isIndexBuilt) {
                const initialized = await this.searcher.initialize();
                if (!initialized) {
                    this.updateSearchStatus('No indexed words found. Please index the PDF first.', 'error');
                    return;
                }
            }
            
            // Perform search
            const results = this.searcher.search(searchTerm);
            this.currentSearchResults = results;
            
            if (results.length === 0) {
                this.updateSearchStatus(`No matches found for "${searchTerm}"`, 'warning');
                this.displaySearchResults([]);
                this.clearHighlights();
            } else {
                this.updateSearchStatus(`Found ${results.length} matches for "${searchTerm}"`, 'success');
                this.displaySearchResults(results);
                this.updateHighlights();
            }
            
        } catch (error) {
            console.error('Error during search:', error);
            this.updateSearchStatus('Search failed. Please try again.', 'error');
        }
    }

    clearSearch() {
        this.searchInput.value = '';
        this.currentSearchResults = [];
        this.updateSearchStatus('', '');
        this.displaySearchResults([]);
        this.clearHighlights();
    }

    displaySearchResults(results) {
        if (!this.resultsList) return;

        if (results.length === 0) {
            this.resultsList.innerHTML = '<div class="no-results">No search performed yet</div>';
            return;
        }

        const resultsHTML = results.map((result, index) => `
            <div class="result-item" data-page="${result.page}" data-row="${result.row}" data-index="${result.index}">
                <div class="result-word">"${result.word}"</div>
                <div class="result-location">Page ${result.page}, Row ${result.row}, Index ${result.index}</div>
                <div class="result-sentence">${result.sentence}</div>
            </div>
        `).join('');

        this.resultsList.innerHTML = resultsHTML;

        // Add click handlers to result items
        this.resultsList.querySelectorAll('.result-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = parseInt(item.dataset.page);
                const row = parseInt(item.dataset.row);
                const index = parseInt(item.dataset.index);
                this.jumpToResult(page, row, index);
            });
        });
    }

    jumpToResult(page, row, index) {
        console.log(`Jumping to page ${page}, row ${row}, index ${index}`);
        
        // Navigate to the page
        if (page !== this.currentPage) {
            this.currentPage = page;
            this.updatePageInfo();
            this.updateNavigationButtons();
            this.renderPage();
        }
        
        // Update highlights for the new page
        this.updateHighlights();
        
        // Scroll to the result in the results list
        const resultItem = this.resultsList.querySelector(`[data-page="${page}"][data-row="${row}"][data-index="${index}"]`);
        if (resultItem) {
            resultItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            resultItem.style.backgroundColor = '#eff6ff';
            setTimeout(() => {
                resultItem.style.backgroundColor = '';
            }, 2000);
        }
    }

    updateHighlights() {
        if (this.highlighter) {
            this.highlighter.updateSearchResults(this.currentSearchResults, this.currentPage);
        }
    }

    clearHighlights() {
        if (this.highlighter) {
            this.highlighter.clearHighlights();
        }
    }

    onSearchDotClick(result) {
        console.log('Search dot clicked:', result);
        this.jumpToResult(result.page, result.row, result.index);
    }

    toggleResultsPanel() {
        const resultsPanel = document.getElementById('search-results');
        const toggleBtn = this.toggleResultsBtn;
        
        if (resultsPanel.style.display === 'none') {
            resultsPanel.style.display = 'flex';
            toggleBtn.textContent = 'Hide';
        } else {
            resultsPanel.style.display = 'none';
            toggleBtn.textContent = 'Show';
        }
    }

    updateSearchStatus(message, type = '') {
        if (!this.searchStatus) return;
        
        this.searchStatus.textContent = message;
        this.searchStatus.className = `search-status ${type}`;
        
        // Clear status after 5 seconds for success/info messages
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                this.searchStatus.textContent = '';
                this.searchStatus.className = 'search-status';
            }, 5000);
        }
    }

    resetViewer() {
        this.pdfDoc = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.indexer = null;
        this.searcher = null;
        this.highlighter = null;
        this.currentSearchResults = [];
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
            <div class="search-section">
                <div class="search-bar">
                    <input type="text" id="search-input" placeholder="Search for words..." />
                    <button class="btn btn-primary" id="search-btn">Search</button>
                    <button class="btn btn-secondary" id="clear-search-btn">Clear</button>
                </div>
                <div class="search-status" id="search-status"></div>
            </div>
            
            <div class="main-content">
                <div class="pdf-viewer">
                    <div class="controls">
                        <button class="btn btn-secondary" id="prev-btn" disabled>← Previous</button>
                        <div class="page-info" id="page-info">Page 1 of 1</div>
                        <button class="btn btn-secondary" id="next-btn" disabled>Next →</button>
                    </div>
                    
                    <div class="canvas-container">
                        <canvas id="pdf-canvas"></canvas>
                    </div>
                    
                    <div class="controls">
                        <button class="btn btn-primary" id="index-pdf-btn">Index PDF</button>
                        <button class="btn btn-primary" id="new-file-btn">Upload New File</button>
                    </div>
                </div>
                
                <div class="search-results" id="search-results">
                    <div class="results-header">
                        <h3>Search Results</h3>
                        <button class="btn btn-secondary" id="toggle-results-btn">Hide</button>
                    </div>
                    <div class="results-list" id="results-list">
                        <div class="no-results">No search performed yet</div>
                    </div>
                </div>
            </div>
        `;
        
        // Re-initialize elements after DOM update
        this.initializeElements();
        this.attachEventListeners();
        
        // Re-initialize search and highlighting
        this.initializeSearchAndHighlight();
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
