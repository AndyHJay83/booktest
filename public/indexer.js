// Word Indexer for PDF Text Extraction
// Uses PDF.js to extract text and bounding boxes, stores in IndexedDB via Dexie

// Initialize IndexedDB database
let db;
async function initializeDB() {
    const { Dexie } = await import('https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/modern/dexie.mjs');
    db = new Dexie('BookReaderDB');
    db.version(1).stores({
        words: '++id, word, page, row, index, bbox, sentence'
    });
    return db;
}

class PDFIndexer {
    constructor() {
        this.words = [];
        this.currentSentence = '';
        this.sentenceBuffer = [];
    }

    /**
     * Extract and index all words from a PDF document
     * @param {Object} pdfDoc - PDF.js document object
     * @param {number} scale - Scale factor for coordinate conversion
     * @returns {Promise<Array>} Array of word objects
     */
    async indexPDF(pdfDoc, scale = 1.5) {
        console.log('Starting PDF indexing...');
        this.words = [];
        
        const totalPages = pdfDoc.numPages;
        console.log(`Processing ${totalPages} pages...`);

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            console.log(`Processing page ${pageNum}/${totalPages}...`);
            await this.processPage(pdfDoc, pageNum, scale);
        }

        console.log(`Indexing complete. Extracted ${this.words.length} words.`);
        
        // Store in IndexedDB
        await this.storeWords();
        
        return this.words;
    }

    /**
     * Process a single page and extract words
     * @param {Object} pdfDoc - PDF.js document object
     * @param {number} pageNum - Page number (1-based)
     * @param {number} scale - Scale factor
     */
    async processPage(pdfDoc, pageNum, scale) {
        try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale });
            
            // Get text content from the page
            const textContent = await page.getTextContent();
            console.log(`Page ${pageNum}: Found ${textContent.items.length} text items`);
            
            // Group text items by rows (similar Y coordinates)
            const rows = this.groupTextItemsByRows(textContent.items, viewport);
            console.log(`Page ${pageNum}: Grouped into ${rows.length} rows`);
            
            // Process each row
            rows.forEach((row, rowIndex) => {
                this.processRow(row, pageNum, rowIndex + 1, viewport); // Start row numbering at 1
            });
            
        } catch (error) {
            console.error(`Error processing page ${pageNum}:`, error);
        }
    }

    /**
     * Group text items by rows based on Y coordinate similarity
     * @param {Array} textItems - Array of text items from PDF.js
     * @param {Object} viewport - PDF.js viewport object
     * @returns {Array} Array of rows, each containing text items
     */
    groupTextItemsByRows(textItems, viewport) {
        const rows = [];
        const tolerance = 5; // pixels tolerance for grouping by Y coordinate
        
        // Sort text items by Y coordinate (top to bottom)
        const sortedItems = textItems.sort((a, b) => {
            const aY = viewport.convertToViewportPoint(a.transform[5], a.transform[4])[1];
            const bY = viewport.convertToViewportPoint(b.transform[5], b.transform[4])[1];
            return bY - aY; // Higher Y values first (PDF coordinates are bottom-up)
        });
        
        sortedItems.forEach(item => {
            const itemY = viewport.convertToViewportPoint(item.transform[5], item.transform[4])[1];
            
            // Find existing row with similar Y coordinate
            let foundRow = false;
            for (let i = 0; i < rows.length; i++) {
                const rowY = rows[i][0].y;
                if (Math.abs(itemY - rowY) <= tolerance) {
                    rows[i].push({ ...item, y: itemY });
                    foundRow = true;
                    break;
                }
            }
            
            // Create new row if no matching row found
            if (!foundRow) {
                rows.push([{ ...item, y: itemY }]);
            }
        });
        
        // Sort items within each row by X coordinate (left to right)
        rows.forEach(row => {
            row.sort((a, b) => {
                const aX = viewport.convertToViewportPoint(a.transform[4], a.transform[5])[0];
                const bX = viewport.convertToViewportPoint(b.transform[4], b.transform[5])[0];
                return aX - bX;
            });
        });
        
        return rows;
    }

    /**
     * Process a row of text items and extract words
     * @param {Array} row - Array of text items in a row
     * @param {number} pageNum - Page number
     * @param {number} rowIndex - Row index within the page
     * @param {Object} viewport - PDF.js viewport object
     */
    processRow(row, pageNum, rowIndex, viewport) {
        let wordIndex = 1; // Start word index at 1
        
        row.forEach(item => {
            // Tokenize the text into words
            const words = this.tokenizeText(item.str);
            
            words.forEach(word => {
                if (word.trim()) {
                    // Calculate bounding box in canvas coordinates
                    const bbox = this.calculateBoundingBox(item, word, viewport);
                    
                    // Add to sentence buffer
                    this.sentenceBuffer.push(word);
                    
                    // Check if sentence is complete
                    const isSentenceEnd = this.isSentenceEnd(word);
                    
                    const wordObj = {
                        word: word.trim(),
                        page: pageNum,
                        row: rowIndex,
                        index: wordIndex,
                        bbox: bbox,
                        sentence: this.sentenceBuffer.join(' ')
                    };
                    
                    this.words.push(wordObj);
                    wordIndex++;
                    
                    // Reset sentence buffer if sentence is complete
                    if (isSentenceEnd) {
                        this.sentenceBuffer = [];
                    }
                }
            });
        });
    }

    /**
     * Tokenize text into words, handling punctuation
     * @param {string} text - Text to tokenize
     * @returns {Array} Array of words
     */
    tokenizeText(text) {
        // Split by whitespace and common punctuation, but keep punctuation attached
        return text.split(/\s+/).filter(word => word.length > 0);
    }

    /**
     * Check if a word ends a sentence
     * @param {string} word - Word to check
     * @returns {boolean} True if word ends a sentence
     */
    isSentenceEnd(word) {
        return /[.!?]$/.test(word);
    }

    /**
     * Calculate bounding box for a word in canvas coordinates
     * @param {Object} textItem - PDF.js text item
     * @param {string} word - The word to calculate bbox for
     * @param {Object} viewport - PDF.js viewport object
     * @returns {Array} Bounding box [x0, y0, x1, y1]
     */
    calculateBoundingBox(textItem, word, viewport) {
        // Get the position of the text item
        const x = viewport.convertToViewportPoint(textItem.transform[4], textItem.transform[5])[0];
        const y = viewport.convertToViewportPoint(textItem.transform[5], textItem.transform[4])[1];
        
        // Estimate word position within the text item
        const fullText = textItem.str;
        const wordIndex = fullText.indexOf(word);
        const wordRatio = wordIndex / fullText.length;
        
        // Estimate word width based on character width
        const charWidth = textItem.width / fullText.length;
        const wordWidth = word.length * charWidth;
        const wordX = x + (wordIndex * charWidth);
        
        // Calculate bounding box
        const x0 = wordX;
        const y0 = y - textItem.height;
        const x1 = wordX + wordWidth;
        const y1 = y;
        
        return [x0, y0, x1, y1];
    }

    /**
     * Store extracted words in IndexedDB
     */
    async storeWords() {
        try {
            console.log(`Storing ${this.words.length} words in IndexedDB...`);
            
            // Initialize database if not already done
            if (!db) {
                await initializeDB();
            }
            
            // Clear existing words for this document
            await db.words.clear();
            
            // Store all words
            await db.words.bulkAdd(this.words);
            
            console.log('Words stored successfully in IndexedDB');
            
            // Log first 10 words for verification
            const firstWords = await db.words.limit(10).toArray();
            console.log('First 10 stored words:', firstWords);
            
        } catch (error) {
            console.error('Error storing words:', error);
        }
    }

    /**
     * Search for words in the indexed data
     * @param {string} searchTerm - Term to search for
     * @returns {Promise<Array>} Array of matching word objects
     */
    async searchWords(searchTerm) {
        try {
            if (!db) {
                await initializeDB();
            }
            
            const results = await db.words
                .where('word')
                .startsWithIgnoreCase(searchTerm)
                .toArray();
            
            console.log(`Found ${results.length} words matching "${searchTerm}"`);
            return results;
            
        } catch (error) {
            console.error('Error searching words:', error);
            return [];
        }
    }

    /**
     * Get word count statistics
     * @returns {Promise<Object>} Statistics object
     */
    async getStats() {
        try {
            if (!db) {
                await initializeDB();
            }
            
            const totalWords = await db.words.count();
            const uniqueWords = await db.words.orderBy('word').uniqueKeys();
            
            return {
                totalWords: totalWords,
                uniqueWords: uniqueWords.length,
                pages: await db.words.orderBy('page').uniqueKeys()
            };
            
        } catch (error) {
            console.error('Error getting stats:', error);
            return { totalWords: 0, uniqueWords: 0, pages: [] };
        }
    }
}

// Export for use in main.js
window.PDFIndexer = PDFIndexer;
