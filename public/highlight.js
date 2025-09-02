// Highlighting functionality for search results
// Renders dots overlay on PDF canvas to show search matches

class PDFHighlighter {
    constructor() {
        this.overlay = null;
        this.currentPage = 1;
        this.searchResults = [];
        this.scale = 1.5;
    }

    /**
     * Initialize the highlighting overlay
     * @param {HTMLElement} canvasContainer - Container element for the PDF canvas
     * @param {number} scale - Scale factor for coordinate conversion
     */
    initialize(canvasContainer, scale = 1.5) {
        this.scale = scale;
        
        // Create overlay div
        this.overlay = document.createElement('div');
        this.overlay.className = 'search-overlay';
        this.overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: none;
            z-index: 10;
        `;
        
        // Insert overlay after the canvas
        const canvas = canvasContainer.querySelector('#pdf-canvas');
        if (canvas) {
            canvasContainer.style.position = 'relative';
            canvasContainer.appendChild(this.overlay);
            console.log('Search overlay initialized');
        } else {
            console.error('PDF canvas not found for overlay');
        }
    }

    /**
     * Update search results and current page
     * @param {Array} searchResults - Array of search result objects
     * @param {number} currentPage - Current page number
     */
    updateSearchResults(searchResults, currentPage) {
        this.searchResults = searchResults;
        this.currentPage = currentPage;
        this.renderHighlights();
    }

    /**
     * Render highlight dots for the current page
     */
    renderHighlights() {
        if (!this.overlay) {
            console.warn('Overlay not initialized');
            return;
        }

        // Clear existing highlights
        this.overlay.innerHTML = '';

        // Get results for current page
        const pageResults = this.searchResults.filter(result => result.page === this.currentPage);
        
        if (pageResults.length === 0) {
            return;
        }

        console.log(`Rendering ${pageResults.length} highlights for page ${this.currentPage}`);

        // Create highlight dots
        pageResults.forEach((result, index) => {
            this.createHighlightDot(result, index);
        });
    }

    /**
     * Create a highlight dot for a search result
     * @param {Object} result - Search result object
     * @param {number} index - Index of the result
     */
    createHighlightDot(result, index) {
        const dot = document.createElement('div');
        dot.className = 'search-dot';
        dot.dataset.sentence = result.sentence;
        dot.dataset.word = result.word;
        dot.dataset.page = result.page;
        dot.dataset.row = result.row;
        dot.dataset.index = result.index;
        
        // Calculate position from bounding box
        const bbox = result.bbox;
        const centerX = (bbox[0] + bbox[2]) / 2;
        const centerY = (bbox[1] + bbox[3]) / 2;
        
        // Apply scale factor
        const scaledX = centerX;
        const scaledY = centerY;
        
        dot.style.cssText = `
            position: absolute;
            left: ${scaledX}px;
            top: ${scaledY}px;
            width: 8px;
            height: 8px;
            background-color: #ef4444;
            border: 2px solid #ffffff;
            border-radius: 50%;
            pointer-events: auto;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            transform: translate(-50%, -50%);
            transition: all 0.2s ease;
        `;
        
        // Add hover effects
        dot.addEventListener('mouseenter', () => {
            dot.style.transform = 'translate(-50%, -50%) scale(1.5)';
            dot.style.backgroundColor = '#dc2626';
            this.showTooltip(dot, result);
        });
        
        dot.addEventListener('mouseleave', () => {
            dot.style.transform = 'translate(-50%, -50%) scale(1)';
            dot.style.backgroundColor = '#ef4444';
            this.hideTooltip();
        });
        
        // Add click handler
        dot.addEventListener('click', () => {
            this.onDotClick(result);
        });
        
        this.overlay.appendChild(dot);
    }

    /**
     * Show tooltip for a highlight dot
     * @param {HTMLElement} dot - The dot element
     * @param {Object} result - Search result object
     */
    showTooltip(dot, result) {
        // Remove existing tooltip
        this.hideTooltip();
        
        const tooltip = document.createElement('div');
        tooltip.className = 'search-tooltip';
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            max-width: 300px;
            z-index: 1000;
            pointer-events: none;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        `;
        
        tooltip.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 4px;">
                "${result.word}" (Page ${result.page}, Row ${result.row}, Index ${result.index})
            </div>
            <div style="font-size: 11px; opacity: 0.9;">
                ${result.sentence}
            </div>
        `;
        
        // Position tooltip
        const rect = dot.getBoundingClientRect();
        const overlayRect = this.overlay.getBoundingClientRect();
        
        tooltip.style.left = `${rect.left - overlayRect.left}px`;
        tooltip.style.top = `${rect.top - overlayRect.top - 10}px`;
        tooltip.style.transform = 'translate(-50%, -100%)';
        
        this.overlay.appendChild(tooltip);
        this.currentTooltip = tooltip;
    }

    /**
     * Hide the current tooltip
     */
    hideTooltip() {
        if (this.currentTooltip) {
            this.currentTooltip.remove();
            this.currentTooltip = null;
        }
    }

    /**
     * Handle click on a highlight dot
     * @param {Object} result - Search result object
     */
    onDotClick(result) {
        console.log('Dot clicked:', result);
        
        // Emit custom event for main.js to handle
        const event = new CustomEvent('searchDotClick', {
            detail: result
        });
        document.dispatchEvent(event);
    }

    /**
     * Update scale factor for coordinate conversion
     * @param {number} scale - New scale factor
     */
    updateScale(scale) {
        this.scale = scale;
        this.renderHighlights();
    }

    /**
     * Clear all highlights
     */
    clearHighlights() {
        if (this.overlay) {
            this.overlay.innerHTML = '';
        }
        this.searchResults = [];
    }

    /**
     * Show/hide the overlay
     * @param {boolean} visible - Whether to show the overlay
     */
    setVisible(visible) {
        if (this.overlay) {
            this.overlay.style.display = visible ? 'block' : 'none';
        }
    }

    /**
     * Get highlight statistics for current page
     * @returns {Object} Statistics object
     */
    getStats() {
        const pageResults = this.searchResults.filter(result => result.page === this.currentPage);
        return {
            totalResults: this.searchResults.length,
            currentPageResults: pageResults.length,
            currentPage: this.currentPage
        };
    }
}

// Export for use in main.js
window.PDFHighlighter = PDFHighlighter;
