# Loading Page Reader - Chrome Extension

A Chrome extension that displays excerpts from books while web pages are loading. Read through entire books one paragraph at a time as you browse the web!

## Features

- 📚 **Search Books**: Search for books using the Open Library API
- 📖 **Read While Loading**: Display book content while pages load
- 📊 **Track Progress**: See how far you've read through your current book
- ⌨️ **Easy Navigation**: Press any key or click to continue after page loads
- 🎨 **Beautiful UI**: Elegant gradient design with smooth animations

## Installation

### Step 1: Add Extension Icons

Before loading the extension, you need to add icon files. Create three PNG images in the `icons/` folder:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

You can create simple book icons or use any icon you like. Here are some quick options:
1. Use an online icon generator
2. Create simple colored squares with a book emoji
3. Use a free icon from sites like flaticon.com

### Step 2: Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `LoadingPageExtension` folder
5. The extension should now appear in your extensions list

## How to Use

### 1. Select a Book

1. Click the extension icon in your Chrome toolbar
2. Type a book title in the search box
3. Click "Search" or press Enter
4. Click on a book from the search results to select it

### 2. Read While Browsing

1. Navigate to any website
2. While the page loads, you'll see a book overlay with the current paragraph
3. When the page finishes loading, a "Continue" button appears
4. Click the button or press any key to dismiss the overlay
5. The next page load will show the next paragraph

### 3. Track Your Progress

- Open the extension popup to see:
  - Current book title and author
  - Progress bar showing percentage complete
  - Current paragraph number

## How It Works

- **Open Library API**: Searches and retrieves book information
- **Content Script**: Monitors page loading and displays overlays
- **Chrome Storage**: Saves your reading progress
- **Service Worker**: Manages extension state in the background

## Current Limitations

The extension currently uses sample text for demonstration. To add full book text:
1. Integrate with Project Gutenberg API for public domain books
2. Or allow users to paste their own text content

## Files Structure

```
LoadingPageExtension/
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup interface
├── popup.css             # Popup styling
├── popup.js              # Popup logic and book search
├── content.js            # Page overlay injection
├── content.css           # Overlay styling
├── background.js         # Background service worker
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md            # This file
```

## Customization

### Change Colors

Edit the gradient colors in `popup.css` and `content.css`:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Adjust Text Size

In `content.css`, modify:
```css
.book-reader-text {
  font-size: 20px;
  line-height: 1.8;
}
```

### Change Overlay Timing

In `content.js`, adjust the timeout in `initLoadingMonitor()`:
```javascript
setTimeout(() => {
  showContinueButton();
}, 2000); // milliseconds
```

## Future Enhancements

- [ ] Integration with Project Gutenberg for full book texts
- [ ] Bookmarking and favorites
- [ ] Multiple reading positions (different books on different domains)
- [ ] Font customization
- [ ] Dark/light theme toggle
- [ ] Export reading statistics
- [ ] Share progress with friends

## Troubleshooting

**Extension not loading?**
- Make sure all files are in the correct location
- Check that icon files exist in the `icons/` folder
- Reload the extension in `chrome://extensions/`

**Overlay not appearing?**
- Check that you have a book selected
- Try refreshing the current page
- Open the console (F12) and look for errors

**Search not working?**
- Check your internet connection
- The Open Library API might be temporarily unavailable
- Try a different search term

## License

This is a personal project. Feel free to modify and use as you like!

## Credits

- Book data provided by [Open Library API](https://openlibrary.org/)
- Built with Chrome Extension Manifest V3

---

Enjoy reading while you browse! 📚✨
