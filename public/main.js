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
        this.rowOverlay = null;
        this.currentTolerance = 1.0;
        this.detectedRows = [];
        
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
        
        // Row control elements
        this.rowControls = document.getElementById('row-controls');
        this.toleranceSlider = document.getElementById('tolerance-slider');
        this.toleranceValue = document.getElementById('tolerance-value');
        this.showRowsBtn = document.getElementById('show-rows-btn');
        this.hideRowsBtn = document.getElementById('hide-rows-btn');
        this.reindexBtn = document.getElementById('reindex-btn');
        this.manualRowsBtn = document.getElementById('manual-rows-btn');
        
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
        
        // Row control event listeners
        if (this.toleranceSlider) {
            this.toleranceSlider.addEventListener('input', (e) => this.updateTolerance(e.target.value));
            console.log('Tolerance slider event listener attached');
        }
        
        if (this.showRowsBtn) {
            this.showRowsBtn.addEventListener('click', () => this.showRowOverlay());
            console.log('Show rows button event listener attached');
        }
        
        if (this.hideRowsBtn) {
            this.hideRowsBtn.addEventListener('click', () => this.hideRowOverlay());
            console.log('Hide rows button event listener attached');
        }
        
        if (this.reindexBtn) {
            this.reindexBtn.addEventListener('click', () => this.reindexWithNewTolerance());
            console.log('Re-index button event listener attached');
        }
        
        if (this.manualRowsBtn) {
            this.manualRowsBtn.addEventListener('click', () => this.openManualRowEditor());
            console.log('Manual rows button event listener attached');
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
            
            // Additional debugging for page count issue
            console.log('PDF document details:');
            console.log('  - numPages:', this.pdfDoc.numPages);
            console.log('  - fingerprint:', this.pdfDoc.fingerprints);
            console.log('  - loadingTask:', this.pdfDoc.loadingTask);
            
            // Try to get the first page to verify it exists
            try {
                const firstPage = await this.pdfDoc.getPage(1);
                console.log('  - First page loaded successfully, viewport:', firstPage.getViewport({ scale: 1 }));
            } catch (error) {
                console.error('  - Error loading first page:', error);
            }
            
            this.totalPages = this.pdfDoc.numPages;
            this.currentPage = 1;
            
            // Show the viewer content and render the first page
            this.showViewerContent();
            await this.renderPage();
            
            // Hide row controls initially (they'll show after indexing)
            if (this.rowControls) {
                this.rowControls.style.display = 'none';
            }
            
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
        
        // Show row controls after successful indexing
        if (this.rowControls) {
            this.rowControls.style.display = 'block';
        }
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
        this.rowOverlay = null;
        this.currentTolerance = 1.0;
        this.detectedRows = [];
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
                    
                    <div class="row-controls" id="row-controls" style="display: none;">
                        <h4>Row Detection Controls</h4>
                        <div class="control-group">
                            <label for="tolerance-slider">Row Grouping Tolerance: <span id="tolerance-value">1.0</span>px</label>
                            <input type="range" id="tolerance-slider" min="0.5" max="5.0" step="0.1" value="1.0">
                        </div>
                        <div class="control-group">
                            <button class="btn btn-secondary" id="show-rows-btn">Show Row Overlay</button>
                            <button class="btn btn-secondary" id="hide-rows-btn">Hide Row Overlay</button>
                            <button class="btn btn-secondary" id="reindex-btn">Re-index with New Settings</button>
                        </div>
                        <div class="control-group">
                            <button class="btn btn-secondary" id="manual-rows-btn">Manual Row Editor</button>
                        </div>
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
    
    // Row control methods
    updateTolerance(value) {
        this.currentTolerance = parseFloat(value);
        if (this.toleranceValue) {
            this.toleranceValue.textContent = value;
        }
        console.log('Tolerance updated to:', this.currentTolerance);
    }
    
    showRowOverlay() {
        if (!this.detectedRows || this.detectedRows.length === 0) {
            console.log('No rows detected yet. Please index the PDF first.');
            return;
        }
        
        this.createRowOverlay();
    }
    
    hideRowOverlay() {
        if (this.rowOverlay) {
            this.rowOverlay.remove();
            this.rowOverlay = null;
        }
    }
    
    createRowOverlay() {
        // Remove existing overlay
        this.hideRowOverlay();
        
        const canvasContainer = this.viewerSection.querySelector('.canvas-container');
        if (!canvasContainer) return;
        
        // Create overlay container
        this.rowOverlay = document.createElement('div');
        this.rowOverlay.className = 'row-overlay';
        this.rowOverlay.style.width = this.canvas.width + 'px';
        this.rowOverlay.style.height = this.canvas.height + 'px';
        
        // Add row lines and labels
        this.detectedRows.forEach((row, index) => {
            if (row.length > 0) {
                const firstItem = row[0];
                const y = firstItem.y;
                
                // Create row line
                const line = document.createElement('div');
                line.className = 'row-line';
                line.style.left = '0px';
                line.style.top = y + 'px';
                line.style.width = this.canvas.width + 'px';
                
                // Create row label
                const label = document.createElement('div');
                label.className = 'row-label';
                label.textContent = `Row ${index + 1}`;
                label.style.left = '10px';
                label.style.top = (y - 20) + 'px';
                
                this.rowOverlay.appendChild(line);
                this.rowOverlay.appendChild(label);
            }
        });
        
        canvasContainer.appendChild(this.rowOverlay);
        console.log(`Row overlay created with ${this.detectedRows.length} rows`);
    }
    
    async reindexWithNewTolerance() {
        if (!this.pdfDoc) {
            this.showError('No PDF loaded. Please upload a PDF file first.');
            return;
        }
        
        try {
            console.log('Re-indexing with tolerance:', this.currentTolerance);
            
            // Disable the re-index button during processing
            if (this.reindexBtn) {
                this.reindexBtn.disabled = true;
                this.reindexBtn.textContent = 'Re-indexing...';
            }
            
            // Initialize the indexer if not already done
            if (!this.indexer) {
                this.indexer = new window.PDFIndexer();
            }
            
            // Set the custom tolerance
            this.indexer.setCustomTolerance(this.currentTolerance);
            
            // Start re-indexing
            const words = await this.indexer.indexPDF(this.pdfDoc, this.scale);
            
            // Store the detected rows for overlay
            this.detectedRows = this.indexer.getLastDetectedRows();
            
            console.log(`Re-indexing completed! Extracted ${words.length} words.`);
            
            // Show success message
            this.showIndexingSuccess(words.length);
            
        } catch (error) {
            console.error('Error during re-indexing:', error);
            this.showError(`Re-indexing failed: ${error.message}`);
        } finally {
            // Re-enable the re-index button
            if (this.reindexBtn) {
                this.reindexBtn.disabled = false;
                this.reindexBtn.textContent = 'Re-index with New Settings';
            }
        }
    }
    
    openManualRowEditor() {
        if (!this.pdfDoc) {
            this.showError('No PDF loaded. Please upload a PDF file first.');
            return;
        }
        
        if (!this.detectedRows || this.detectedRows.length === 0) {
            alert('No rows detected yet. Please index the PDF first to see the current row boundaries.');
            return;
        }
        
        // Show current rows first, then allow manual editing
        this.showCurrentRowsForEditing();
    }
    
    showCurrentRowsForEditing() {
        // First show the current detected rows
        this.showRowOverlay();
        
        // Create a simple editing interface
        this.createRowEditingInterface();
    }
    
    createRowEditingInterface() {
        // Remove existing editing interface if any
        const existingInterface = document.getElementById('row-editing-interface');
        if (existingInterface) {
            existingInterface.remove();
        }
        
        // Create editing interface
        const interface = document.createElement('div');
        interface.id = 'row-editing-interface';
        interface.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border: 2px solid #2563eb;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            max-width: 300px;
        `;
        
        interface.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: #1e293b;">Row Editor</h3>
                <button id="close-editor" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #64748b;">&times;</button>
            </div>
            
            <div style="margin-bottom: 15px;">
                <p style="color: #64748b; font-size: 14px; margin: 0 0 10px 0;">
                    Current rows are highlighted in red. Click on the PDF to add new row boundaries.
                </p>
                
                <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                    <button id="add-boundary-btn" class="btn btn-primary" style="padding: 6px 12px; font-size: 12px;">Add Boundary</button>
                    <button id="clear-boundaries-btn" class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;">Clear All</button>
                </div>
                
                <div style="display: flex; gap: 8px;">
                    <button id="apply-changes-btn" class="btn btn-primary" style="padding: 8px 16px; font-size: 14px; background: #10b981;">Apply Changes</button>
                    <button id="cancel-editing-btn" class="btn btn-secondary" style="padding: 8px 16px; font-size: 14px;">Cancel</button>
                </div>
            </div>
            
            <div style="background: #f8fafc; padding: 10px; border-radius: 6px; max-height: 200px; overflow-y: auto;">
                <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">Current Boundaries:</div>
                <div id="boundaries-list" style="font-size: 12px; color: #475569;">
                    Loading...
                </div>
            </div>
        `;
        
        document.body.appendChild(interface);
        
        // Setup event listeners
        this.setupRowEditingEvents(interface);
        
        // Initialize manual row boundaries from current detected rows
        this.initializeManualBoundariesFromCurrentRows();
        
        // Update boundaries list
        this.updateBoundariesList();
    }
    
    setupRowEditingEvents(interface) {
        // Close editor
        const closeBtn = interface.querySelector('#close-editor');
        closeBtn.addEventListener('click', () => {
            this.exitRowEditingMode();
        });
        
        // Cancel editing
        const cancelBtn = interface.querySelector('#cancel-editing-btn');
        cancelBtn.addEventListener('click', () => {
            this.exitRowEditingMode();
        });
        
        // Add boundary
        const addBoundaryBtn = interface.querySelector('#add-boundary-btn');
        addBoundaryBtn.addEventListener('click', () => {
            this.enterAddBoundaryMode();
        });
        
        // Clear boundaries
        const clearBtn = interface.querySelector('#clear-boundaries-btn');
        clearBtn.addEventListener('click', () => {
            this.clearAllManualBoundaries();
        });
        
        // Apply changes
        const applyBtn = interface.querySelector('#apply-changes-btn');
        applyBtn.addEventListener('click', () => {
            this.applyManualRowChanges();
        });
    }
    
    initializeManualBoundariesFromCurrentRows() {
        // Extract Y positions from current detected rows
        this.manualRowBoundaries = [];
        if (this.detectedRows && this.detectedRows.length > 0) {
            // Get Y positions of each row (use the first item's Y position)
            this.manualRowBoundaries = this.detectedRows.map(row => {
                if (row.length > 0) {
                    return row[0].y;
                }
                return 0;
            }).filter(y => y > 0);
            
            console.log('Initialized manual boundaries from current rows:', this.manualRowBoundaries);
        }
    }
    
    enterAddBoundaryMode() {
        this.manualRowMode = true;
        this.canvas.style.cursor = 'crosshair';
        
        // Add click listener to canvas
        this.canvas.addEventListener('click', this.handleManualRowClick.bind(this));
        
        // Update button state
        const addBtn = document.querySelector('#add-boundary-btn');
        if (addBtn) {
            addBtn.textContent = 'Click on PDF';
            addBtn.style.background = '#10b981';
        }
        
        console.log('Add boundary mode activated. Click on the PDF to add row boundaries.');
    }
    
    exitRowEditingMode() {
        this.manualRowMode = false;
        this.canvas.style.cursor = 'default';
        
        // Remove click listener
        this.canvas.removeEventListener('click', this.handleManualRowClick.bind(this));
        
        // Remove editing interface
        const interface = document.getElementById('row-editing-interface');
        if (interface) {
            interface.remove();
        }
        
        // Remove manual row overlays
        const existingOverlay = document.querySelector('.manual-row-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        // Hide row overlay
        this.hideRowOverlay();
    }
    
    clearAllManualBoundaries() {
        this.manualRowBoundaries = [];
        this.updateBoundariesList();
        this.drawManualRowBoundaries();
        console.log('Cleared all manual row boundaries');
    }
    
    updateBoundariesList() {
        const listContainer = document.querySelector('#boundaries-list');
        if (!listContainer) return;
        
        if (this.manualRowBoundaries.length === 0) {
            listContainer.innerHTML = '<div style="color: #64748b; font-style: italic;">No boundaries set</div>';
            return;
        }
        
        const boundariesHTML = this.manualRowBoundaries.map((y, index) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid #e2e8f0;">
                <span>Row ${index + 1}: Y = ${y.toFixed(1)}px</span>
                <button onclick="window.pdfViewer.removeManualBoundary(${index})" style="background: #ef4444; color: white; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer; font-size: 10px;">Remove</button>
            </div>
        `).join('');
        
        listContainer.innerHTML = boundariesHTML;
    }
    
    removeManualBoundary(index) {
        this.manualRowBoundaries.splice(index, 1);
        this.updateBoundariesList();
        this.drawManualRowBoundaries();
        console.log(`Removed boundary at index ${index}`);
    }
    
    async applyManualRowChanges() {
        if (this.manualRowBoundaries.length === 0) {
            alert('No row boundaries set. Please add some boundaries first.');
            return;
        }
        
        try {
            console.log('Applying manual row changes:', this.manualRowBoundaries);
            
            // Initialize the indexer if not already done
            if (!this.indexer) {
                this.indexer = new window.PDFIndexer();
            }
            
            // Set manual row boundaries
            this.indexer.setManualRowBoundaries(this.manualRowBoundaries);
            
            // Re-index with manual boundaries
            const words = await this.indexer.indexPDF(this.pdfDoc, this.scale);
            
            // Store the detected rows for overlay
            this.detectedRows = this.indexer.getLastDetectedRows();
            
            console.log(`Manual row indexing completed! Extracted ${words.length} words.`);
            
            // Show success message
            this.showIndexingSuccess(words.length);
            
            // Exit editing mode
            this.exitRowEditingMode();
            
        } catch (error) {
            console.error('Error applying manual row changes:', error);
            this.showError(`Manual row indexing failed: ${error.message}`);
        }
    }
    
    createManualRowEditorModal() {
        // Remove existing modal if any
        const existingModal = document.getElementById('manual-row-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create modal overlay
        const modal = document.createElement('div');
        modal.id = 'manual-row-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 1000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 30px;
            max-width: 90%;
            max-height: 90%;
            overflow-y: auto;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        `;
        
        modalContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #1e293b;">Manual Row Editor</h2>
                <button id="close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b;">&times;</button>
            </div>
            
            <div style="margin-bottom: 20px;">
                <p style="color: #64748b; margin-bottom: 15px;">
                    Click on the PDF to add row boundaries. Each click will create a horizontal line that separates text into rows.
                </p>
                
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <button id="add-row-btn" class="btn btn-primary" style="padding: 8px 16px; font-size: 14px;">Add Row Boundary</button>
                    <button id="clear-rows-btn" class="btn btn-secondary" style="padding: 8px 16px; font-size: 14px;">Clear All Rows</button>
                    <button id="apply-manual-rows-btn" class="btn btn-primary" style="padding: 8px 16px; font-size: 14px;">Apply Manual Rows</button>
                </div>
                
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <strong>Instructions:</strong>
                    <ol style="margin: 10px 0; padding-left: 20px; color: #475569;">
                        <li>Click "Add Row Boundary" to enter row placement mode</li>
                        <li>Click anywhere on the PDF to place a horizontal row boundary</li>
                        <li>Repeat to add multiple row boundaries</li>
                        <li>Click "Apply Manual Rows" to re-index with your custom row boundaries</li>
                    </ol>
                </div>
            </div>
            
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; background: #f8fafc;">
                <h3 style="margin: 0 0 15px 0; color: #1e293b;">Current Row Boundaries</h3>
                <div id="row-boundaries-list" style="min-height: 100px;">
                    <p style="color: #64748b; font-style: italic;">No manual row boundaries set yet.</p>
                </div>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Add event listeners
        this.setupManualRowEditorEvents(modal);
        
        // Initialize manual row editing state
        this.manualRowMode = false;
        this.manualRowBoundaries = [];
    }
    
    setupManualRowEditorEvents(modal) {
        // Close modal
        const closeBtn = modal.querySelector('#close-modal');
        closeBtn.addEventListener('click', () => {
            modal.remove();
            this.exitManualRowMode();
        });
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                this.exitManualRowMode();
            }
        });
        
        // Add row boundary button
        const addRowBtn = modal.querySelector('#add-row-btn');
        addRowBtn.addEventListener('click', () => {
            this.enterManualRowMode();
        });
        
        // Clear rows button
        const clearRowsBtn = modal.querySelector('#clear-rows-btn');
        clearRowsBtn.addEventListener('click', () => {
            this.clearManualRowBoundaries();
        });
        
        // Apply manual rows button
        const applyRowsBtn = modal.querySelector('#apply-manual-rows-btn');
        applyRowsBtn.addEventListener('click', () => {
            this.applyManualRowBoundaries();
            modal.remove();
        });
    }
    
    enterManualRowMode() {
        this.manualRowMode = true;
        this.canvas.style.cursor = 'crosshair';
        
        // Add click listener to canvas
        this.canvas.addEventListener('click', this.handleManualRowClick.bind(this));
        
        // Update button state
        const addRowBtn = document.querySelector('#add-row-btn');
        if (addRowBtn) {
            addRowBtn.textContent = 'Click on PDF to Add Row';
            addRowBtn.style.background = '#10b981';
        }
        
        console.log('Manual row mode activated. Click on the PDF to add row boundaries.');
    }
    
    exitManualRowMode() {
        this.manualRowMode = false;
        this.canvas.style.cursor = 'default';
        
        // Remove click listener
        this.canvas.removeEventListener('click', this.handleManualRowClick.bind(this));
        
        // Update button state
        const addRowBtn = document.querySelector('#add-row-btn');
        if (addRowBtn) {
            addRowBtn.textContent = 'Add Row Boundary';
            addRowBtn.style.background = '';
        }
    }
    
    handleManualRowClick(event) {
        if (!this.manualRowMode) return;
        
        // Get click position relative to canvas
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Add row boundary
        this.manualRowBoundaries.push(y);
        this.manualRowBoundaries.sort((a, b) => a - b); // Sort by Y position
        
        // Update display
        this.updateBoundariesList();
        this.drawManualRowBoundaries();
        
        // Exit add boundary mode
        this.exitAddBoundaryMode();
        
        console.log(`Added row boundary at Y position: ${y.toFixed(1)}`);
    }
    
    exitAddBoundaryMode() {
        this.manualRowMode = false;
        this.canvas.style.cursor = 'default';
        
        // Remove click listener
        this.canvas.removeEventListener('click', this.handleManualRowClick.bind(this));
        
        // Update button state
        const addBtn = document.querySelector('#add-boundary-btn');
        if (addBtn) {
            addBtn.textContent = 'Add Boundary';
            addBtn.style.background = '';
        }
    }
    
    updateRowBoundariesList() {
        const listContainer = document.querySelector('#row-boundaries-list');
        if (!listContainer) return;
        
        if (this.manualRowBoundaries.length === 0) {
            listContainer.innerHTML = '<p style="color: #64748b; font-style: italic;">No manual row boundaries set yet.</p>';
            return;
        }
        
        const boundariesHTML = this.manualRowBoundaries.map((y, index) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: white; border-radius: 4px; margin-bottom: 5px; border: 1px solid #e2e8f0;">
                <span>Row ${index + 1}: Y = ${y.toFixed(1)}px</span>
                <button onclick="this.removeManualRowBoundary(${index})" style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">Remove</button>
            </div>
        `).join('');
        
        listContainer.innerHTML = boundariesHTML;
    }
    
    drawManualRowBoundaries() {
        // Remove existing manual row overlays
        const existingOverlay = document.querySelector('.manual-row-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        if (this.manualRowBoundaries.length === 0) return;
        
        // Create overlay for manual row boundaries
        const overlay = document.createElement('div');
        overlay.className = 'manual-row-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: ${this.canvas.width}px;
            height: ${this.canvas.height}px;
            pointer-events: none;
            z-index: 15;
        `;
        
        // Add boundary lines
        this.manualRowBoundaries.forEach((y, index) => {
            const line = document.createElement('div');
            line.style.cssText = `
                position: absolute;
                left: 0;
                top: ${y}px;
                width: 100%;
                height: 2px;
                background-color: #10b981;
                opacity: 0.8;
            `;
            
            const label = document.createElement('div');
            label.style.cssText = `
                position: absolute;
                left: 10px;
                top: ${y - 20}px;
                background-color: #10b981;
                color: white;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 12px;
                font-weight: bold;
            `;
            label.textContent = `Row ${index + 1}`;
            
            overlay.appendChild(line);
            overlay.appendChild(label);
        });
        
        // Add overlay to canvas container
        const canvasContainer = this.viewerSection.querySelector('.canvas-container');
        if (canvasContainer) {
            canvasContainer.appendChild(overlay);
        }
    }
    
    clearManualRowBoundaries() {
        this.manualRowBoundaries = [];
        this.updateRowBoundariesList();
        
        // Remove visual overlays
        const existingOverlay = document.querySelector('.manual-row-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        console.log('Cleared all manual row boundaries');
    }
    
    async applyManualRowBoundaries() {
        if (this.manualRowBoundaries.length === 0) {
            alert('No manual row boundaries set. Please add some row boundaries first.');
            return;
        }
        
        try {
            console.log('Applying manual row boundaries:', this.manualRowBoundaries);
            
            // Initialize the indexer if not already done
            if (!this.indexer) {
                this.indexer = new window.PDFIndexer();
            }
            
            // Set manual row boundaries
            this.indexer.setManualRowBoundaries(this.manualRowBoundaries);
            
            // Re-index with manual boundaries
            const words = await this.indexer.indexPDF(this.pdfDoc, this.scale);
            
            // Store the detected rows for overlay
            this.detectedRows = this.indexer.getLastDetectedRows();
            
            console.log(`Manual row indexing completed! Extracted ${words.length} words.`);
            
            // Show success message
            this.showIndexingSuccess(words.length);
            
            // Exit manual row mode
            this.exitManualRowMode();
            
        } catch (error) {
            console.error('Error applying manual row boundaries:', error);
            this.showError(`Manual row indexing failed: ${error.message}`);
        }
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
    window.pdfViewer = new PDFViewer();
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
