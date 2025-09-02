// Search functionality using Lunr.js
// Handles building search index and querying words from IndexedDB

class PDFSearch {
    constructor() {
        this.index = null;
        this.words = [];
        this.isIndexBuilt = false;
    }

    /**
     * Initialize the search index by loading words from IndexedDB
     * @returns {Promise<boolean>} True if index was built successfully
     */
    async initialize() {
        try {
            console.log('Initializing search index...');
            
            // Load all words from IndexedDB
            await this.loadWordsFromDB();
            
            if (this.words.length === 0) {
                console.log('No words found in database. Index PDF first.');
                return false;
            }
            
            // Build Lunr search index
            this.buildSearchIndex();
            
            console.log(`Search index built with ${this.words.length} words`);
            return true;
            
        } catch (error) {
            console.error('Error initializing search:', error);
            return false;
        }
    }

    /**
     * Load all words from IndexedDB
     */
    async loadWordsFromDB() {
        try {
            // Import Dexie dynamically
            const { Dexie } = await import('https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/modern/dexie.mjs');
            
            const db = new Dexie('BookReaderDB');
            db.version(1).stores({
                words: '++id, word, page, row, index, bbox, sentence'
            });
            
            this.words = await db.words.toArray();
            console.log(`Loaded ${this.words.length} words from IndexedDB`);
            
        } catch (error) {
            console.error('Error loading words from database:', error);
            this.words = [];
        }
    }

    /**
     * Build Lunr search index from loaded words
     */
    buildSearchIndex() {
        try {
            // Import Lunr dynamically
            const lunr = window.lunr;
            
            if (!lunr) {
                throw new Error('Lunr.js not loaded');
            }
            
            // Create search index
            this.index = lunr(function () {
                // Define searchable fields
                this.field('word', { boost: 10 });
                this.field('sentence', { boost: 5 });
                this.field('page');
                this.field('row');
                this.field('index');
                
                // Add documents to index
                this.words.forEach((word, idx) => {
                    this.add({
                        id: idx,
                        word: word.word,
                        sentence: word.sentence,
                        page: word.page,
                        row: word.row,
                        index: word.index
                    });
                });
            });
            
            this.isIndexBuilt = true;
            console.log('Lunr search index built successfully');
            
        } catch (error) {
            console.error('Error building search index:', error);
            this.isIndexBuilt = false;
        }
    }

    /**
     * Search for a term in the indexed words
     * @param {string} searchTerm - Term to search for
     * @returns {Array} Array of matching word objects with search metadata
     */
    search(searchTerm) {
        if (!this.isIndexBuilt || !this.index) {
            console.warn('Search index not built yet');
            return [];
        }

        if (!searchTerm || searchTerm.trim().length === 0) {
            return [];
        }

        try {
            console.log(`Searching for: "${searchTerm}"`);
            
            // Perform search using Lunr
            const results = this.index.search(searchTerm);
            console.log(`Found ${results.length} search results`);
            
            // Map results back to full word objects
            const searchResults = results.map(result => {
                const wordIndex = result.ref;
                const wordObj = this.words[wordIndex];
                
                return {
                    ...wordObj,
                    score: result.score,
                    matchData: result.matchData
                };
            });
            
            // Sort by page, then row, then index for consistent ordering
            searchResults.sort((a, b) => {
                if (a.page !== b.page) return a.page - b.page;
                if (a.row !== b.row) return a.row - b.row;
                return a.index - b.index;
            });
            
            console.log('Search results:', searchResults.slice(0, 5)); // Log first 5 results
            return searchResults;
            
        } catch (error) {
            console.error('Error during search:', error);
            return [];
        }
    }

    /**
     * Get words for a specific page
     * @param {number} pageNum - Page number
     * @returns {Array} Array of word objects for the page
     */
    getWordsForPage(pageNum) {
        return this.words.filter(word => word.page === pageNum);
    }

    /**
     * Get search statistics
     * @returns {Object} Search statistics
     */
    getStats() {
        return {
            totalWords: this.words.length,
            isIndexBuilt: this.isIndexBuilt,
            uniqueWords: new Set(this.words.map(w => w.word.toLowerCase())).size,
            pages: [...new Set(this.words.map(w => w.page))].sort((a, b) => a - b)
        };
    }

    /**
     * Refresh the search index (reload from database)
     * @returns {Promise<boolean>} True if refresh was successful
     */
    async refresh() {
        console.log('Refreshing search index...');
        this.isIndexBuilt = false;
        this.index = null;
        return await this.initialize();
    }
}

// Export for use in main.js
window.PDFSearch = PDFSearch;
