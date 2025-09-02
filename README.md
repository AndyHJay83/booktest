# Book Reader PWA

A Progressive Web App for viewing and indexing books from PDF files.

## Features

- 📱 **Progressive Web App** - Installable on mobile and desktop
- 📄 **PDF Viewer** - View PDF files with page navigation
- ⌨️ **Keyboard Navigation** - Use arrow keys to navigate pages
- 🎨 **Modern UI** - Clean, responsive design
- 📱 **Mobile Friendly** - Works great on all devices
- 🔄 **Offline Support** - Service worker caches resources

## Getting Started

### Prerequisites

- Node.js 14+ 
- npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open your browser to `http://localhost:3000`

### Available Scripts

- `npm start` - Start development server on port 3000
- `npm run dev` - Start development server with no caching
- `npm run build` - Build the project (static files)
- `npm run serve` - Start production server on port 8080

## Usage

1. **Upload a PDF**: Click the upload area or drag & drop a PDF file
2. **Navigate**: Use the Previous/Next buttons or arrow keys
3. **Install PWA**: Look for the install prompt in your browser

## Keyboard Shortcuts

- `←` / `→` - Previous/Next page
- `Home` - Go to first page
- `End` - Go to last page

## PWA Installation

The app can be installed as a Progressive Web App:

- **Chrome/Edge**: Look for the install button in the address bar
- **Safari**: Use "Add to Home Screen" from the share menu
- **Mobile**: Use "Add to Home Screen" from the browser menu

## Project Structure

```
booktest/
├── public/
│   ├── index.html          # Main HTML file
│   ├── manifest.webmanifest # PWA manifest
│   ├── service-worker.js   # Service worker for caching
│   └── icons/              # PWA icons
├── src/
│   └── main.js            # Main JavaScript file
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## Technology Stack

- **Vanilla JavaScript** - No frameworks
- **PDF.js** - PDF rendering library
- **Service Worker** - Offline functionality
- **Web App Manifest** - PWA capabilities
- **http-server** - Development server

## Future Enhancements

- Word indexing and search
- Text highlighting
- Bookmark functionality
- Reading progress tracking
- Multiple PDF support
- Text extraction and search

## License

MIT
