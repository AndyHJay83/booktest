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
        this.customTolerance = null;
        this.lastDetectedRows = [];
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
            console.log(`\n=== PROCESSING PAGE ${pageNum} ===`);
            
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale });
            
            // Get text content from the page
            const textContent = await page.getTextContent();
            console.log(`Found ${textContent.items.length} text items on page ${pageNum}`);
            
            // Log first few text items for debugging
            console.log('First 10 text items with Y positions:');
            textContent.items.slice(0, 10).forEach((item, i) => {
                const y = viewport.convertToViewportPoint(item.transform[5], item.transform[4])[1];
                console.log(`  Item ${i}: "${item.str}" at Y=${y.toFixed(1)}`);
            });
            
            // Group text items by rows (similar Y coordinates)
            const rows = this.groupTextItemsByRows(textContent.items, viewport);
            console.log(`Grouped into ${rows.length} rows`);
            
            // Process each row
            rows.forEach((row, rowIndex) => {
                console.log(`\n--- Processing Row ${rowIndex + 1} ---`);
                this.processRow(row, pageNum, rowIndex + 1, viewport); // Start row numbering at 1
            });
            
            console.log(`\n=== COMPLETED PAGE ${pageNum} ===\n`);
            
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
        console.log(`Processing ${textItems.length} text items for row grouping`);
        
        // Convert all items to viewport coordinates and sort by Y (top to bottom)
        const itemsWithCoords = textItems.map(item => {
            const x = viewport.convertToViewportPoint(item.transform[4], item.transform[5])[0];
            const y = viewport.convertToViewportPoint(item.transform[5], item.transform[4])[1];
            return { ...item, x, y };
        });
        
        // Sort by Y coordinate (top to bottom in viewport coordinates)
        itemsWithCoords.sort((a, b) => a.y - b.y);
        
        // Log Y positions of first 20 items
        console.log('Y positions of first 20 items:');
        itemsWithCoords.slice(0, 20).forEach((item, i) => {
            console.log(`  Item ${i}: Y=${item.y.toFixed(1)} "${item.str}"`);
        });
        
        // Calculate text height statistics
        const heights = itemsWithCoords.map(item => item.height).filter(h => h > 0);
        const avgHeight = heights.length > 0 ? heights.reduce((a, b) => a + b, 0) / heights.length : 12;
        const minHeight = Math.min(...heights);
        const maxHeight = Math.max(...heights);
        
        console.log(`Text height stats: min=${minHeight.toFixed(1)}, avg=${avgHeight.toFixed(1)}, max=${maxHeight.toFixed(1)}`);
        
        // Use custom tolerance if set, otherwise use conservative default
        const tolerance = this.customTolerance !== null ? this.customTolerance : Math.max(1, avgHeight * 0.1);
        
        console.log(`Using conservative tolerance of ${tolerance.toFixed(2)} pixels`);
        
        // Group items into rows using a more strict clustering algorithm
        const rows = [];
        
        for (const item of itemsWithCoords) {
            let assignedToRow = false;
            
            // Try to find an existing row where this item belongs
            for (const row of rows) {
                const rowY = row[0].y;
                const distance = Math.abs(item.y - rowY);
                
                // If the item is close enough to this row, add it
                if (distance <= tolerance) {
                    row.push(item);
                    assignedToRow = true;
                    break;
                }
            }
            
            // If no suitable row found, create a new one
            if (!assignedToRow) {
                rows.push([item]);
            }
        }
        
        // Sort items within each row by X coordinate (left to right)
        rows.forEach((row, rowIndex) => {
            row.sort((a, b) => a.x - b.x);
            
            // Log row details
            const rowText = row.map(item => item.str).join(' ');
            const rowY = row[0].y;
            console.log(`Row ${rowIndex + 1}: ${row.length} items, Y=${rowY.toFixed(1)}, Text: "${rowText.substring(0, 50)}${rowText.length > 50 ? '...' : ''}"`);
        });
        
        console.log(`Created ${rows.length} rows from ${textItems.length} text items`);
        
        // Store the detected rows for overlay
        this.lastDetectedRows = rows;
        
        // Additional validation: check for rows with too many items
        const problematicRows = rows.filter(row => row.length > 20);
        if (problematicRows.length > 0) {
            console.warn(`Found ${problematicRows.length} rows with more than 20 items. This suggests the tolerance might be too large.`);
            problematicRows.forEach((row, i) => {
                console.warn(`  Problematic row ${i + 1}: ${row.length} items`);
            });
        }
        
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
        const rowWords = []; // Collect all words in this row first
        
        // First pass: collect all words from all text items in this row
        row.forEach(item => {
            // Tokenize the text into words
            const words = this.tokenizeText(item.str);
            
            words.forEach(word => {
                if (word.trim()) {
                    // Calculate bounding box in canvas coordinates
                    const bbox = this.calculateBoundingBox(item, word, viewport);
                    
                    rowWords.push({
                        word: word.trim(),
                        bbox: bbox,
                        originalItem: item
                    });
                }
            });
        });
        
        console.log(`Row ${rowIndex}: Found ${rowWords.length} words: [${rowWords.map(w => w.word).join(', ')}]`);
        
        // Second pass: process words with correct sequential indexing
        rowWords.forEach((wordData, index) => {
            const wordIndexInRow = index + 1; // Index within the row (1-based)
            
            // Add to sentence buffer
            this.sentenceBuffer.push(wordData.word);
            
            // Check if sentence is complete
            const isSentenceEnd = this.isSentenceEnd(wordData.word);
            
            const wordObj = {
                word: wordData.word,
                page: pageNum,
                row: rowIndex,
                index: wordIndexInRow, // This is the position within the row
                bbox: wordData.bbox,
                sentence: this.sentenceBuffer.join(' ')
            };
            
            this.words.push(wordObj);
            
            // Log each word for debugging
            console.log(`  Word ${wordIndexInRow}: "${wordData.word}" -> Page ${pageNum}, Row ${rowIndex}, Index ${wordIndexInRow}`);
            
            // Reset sentence buffer if sentence is complete
            if (isSentenceEnd) {
                this.sentenceBuffer = [];
            }
        });
        
        console.log(`Row ${rowIndex}: Added ${rowWords.length} words with indices 1-${rowWords.length}`);
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
    
    /**
     * Set custom tolerance for row grouping
     * @param {number} tolerance - Tolerance in pixels
     */
    setCustomTolerance(tolerance) {
        this.customTolerance = tolerance;
        console.log('Custom tolerance set to:', tolerance);
    }
    
    /**
     * Get the last detected rows for overlay display
     * @returns {Array} Array of detected rows
     */
    getLastDetectedRows() {
        return this.lastDetectedRows;
    }
}

// Export for use in main.js
window.PDFIndexer = PDFIndexer;
