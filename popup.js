// Load and display current book info
async function loadCurrentBook() {
  const result = await chrome.storage.local.get(['currentBook', 'currentParagraph', 'totalParagraphs']);
  const bookInfo = document.getElementById('bookInfo');
  
  if (result.currentBook) {
    const progress = result.totalParagraphs > 0 
      ? Math.round((result.currentParagraph / result.totalParagraphs) * 100) 
      : 0;
    
    bookInfo.innerHTML = `
      <div class="book-title">${result.currentBook.title}</div>
      <div class="book-author">by ${result.currentBook.author}</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progress}%">${progress}%</div>
      </div>
      <p style="margin-top: 10px; font-size: 12px; color: #666;">
        Paragraph ${result.currentParagraph + 1} of ${result.totalParagraphs}
      </p>
    `;
  } else {
    bookInfo.innerHTML = '<p class="no-book">No book selected</p>';
  }
  
  // Load previous books
  loadPreviousBooks();
}

// Load and display previous books
async function loadPreviousBooks() {
  const result = await chrome.storage.local.get(['previousBooks', 'currentBook']);
  const previousBooksSection = document.getElementById('previousBooks');
  const previousBooksList = document.getElementById('previousBooksList');
  
  if (result.previousBooks && result.previousBooks.length > 0) {
    previousBooksSection.style.display = 'block';
    previousBooksList.innerHTML = '';
    
    result.previousBooks.forEach((book, index) => {
      // Don't show current book in previous books
      if (result.currentBook && book.bookId === result.currentBook.bookId) {
        return;
      }
      
      const bookDiv = document.createElement('div');
      bookDiv.className = 'previous-book-item';
      
      const progress = book.totalParagraphs > 0 
        ? Math.round((book.currentParagraph / book.totalParagraphs) * 100) 
        : 0;
      
      bookDiv.innerHTML = `
        <div class="previous-book-title">${book.title}</div>
        <div class="previous-book-progress">${progress}% complete</div>
      `;
      
      bookDiv.addEventListener('click', () => resumeBook(index));
      previousBooksList.appendChild(bookDiv);
    });
    
    // If no books shown, hide section
    if (previousBooksList.children.length === 0) {
      previousBooksSection.style.display = 'none';
    }
  } else {
    previousBooksSection.style.display = 'none';
  }
}

// Search for books using Gutendex API (Project Gutenberg)
async function searchBooks(query) {
  const resultsDiv = document.getElementById('searchResults');
  resultsDiv.innerHTML = '<div class="loading">Searching...</div>';
  
  try {
    const response = await fetch(`https://gutendex.com/books?search=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      resultsDiv.innerHTML = '';
      
      // Track seen books to avoid duplicates
      const seenBooks = new Set();
      
      data.results.forEach(book => {
        const title = book.title || 'Unknown Title';
        const author = book.authors && book.authors.length > 0 
          ? book.authors[0].name 
          : 'Unknown Author';
        const bookId = book.id;
        const textUrl = book.formats['text/plain; charset=utf-8'] || 
                       book.formats['text/plain; charset=us-ascii'] ||
                       book.formats['text/plain'];
        
        // Create unique key for book (title + author)
        const bookKey = `${title.toLowerCase()}|||${author.toLowerCase()}`;
        
        // Only show books that have plain text available and aren't duplicates
        if (textUrl && !seenBooks.has(bookKey)) {
          seenBooks.add(bookKey);
          
          const bookDiv = document.createElement('div');
          bookDiv.className = 'book-item';
          
          bookDiv.innerHTML = `
            <div class="book-item-title">${title}</div>
            <div class="book-item-author">${author}</div>
          `;
          
          bookDiv.addEventListener('click', () => selectBook(title, author, bookId, textUrl));
          resultsDiv.appendChild(bookDiv);
        }
      });
      
      if (resultsDiv.children.length === 0) {
        resultsDiv.innerHTML = '<div class="error">No books with text found. Try: "Pride and Prejudice", "Frankenstein", or "Alice in Wonderland"</div>';
      }
    } else {
      resultsDiv.innerHTML = '<div class="error">No books found. Try: "Pride and Prejudice", "Frankenstein", or "Alice in Wonderland"</div>';
    }
  } catch (error) {
    resultsDiv.innerHTML = '<div class="error">Error searching books</div>';
    console.error('Search error:', error);
  }
}

// Select a book and fetch its content
async function selectBook(title, author, bookId, textUrl) {
  const resultsDiv = document.getElementById('searchResults');
  resultsDiv.innerHTML = '<div class="loading">Loading book content... This may take a moment for large books.</div>';
  
  try {
    // Save current book to previous books before switching
    const currentData = await chrome.storage.local.get(['currentBook', 'bookParagraphs', 'currentParagraph', 'totalParagraphs', 'previousBooks']);
    
    if (currentData.currentBook && currentData.bookParagraphs) {
      let previousBooks = currentData.previousBooks || [];
      
      // Remove this book from previous books if it exists
      previousBooks = previousBooks.filter(book => book.bookId !== currentData.currentBook.bookId);
      
      // Add current book to previous books
      previousBooks.unshift({
        title: currentData.currentBook.title,
        author: currentData.currentBook.author,
        bookId: currentData.currentBook.bookId,
        bookParagraphs: currentData.bookParagraphs,
        currentParagraph: currentData.currentParagraph,
        totalParagraphs: currentData.totalParagraphs,
        textUrl: currentData.currentBook.textUrl
      });
      
      // Keep only last 5 books
      previousBooks = previousBooks.slice(0, 5);
      
      await chrome.storage.local.set({ previousBooks });
    }
    
    // Fetch the actual book text from Project Gutenberg
    const response = await fetch(textUrl);
    const bookText = await response.text();
    
    // Clean and parse the text
    const cleanedText = cleanBookText(bookText);
    
    // Split into sentences first, then group into ~50 word chunks
    const paragraphs = createReadableChunks(cleanedText);
    
    if (paragraphs.length === 0) {
      resultsDiv.innerHTML = '<div class="error">Could not parse book text. Please try another book.</div>';
      return;
    }
    
    // Save book data
    await chrome.storage.local.set({
      currentBook: { title, author, bookId, textUrl },
      bookParagraphs: paragraphs,
      currentParagraph: 0,
      totalParagraphs: paragraphs.length
    });
    
    resultsDiv.innerHTML = `<div class="loading" style="color: #27ae60;">✓ Book loaded! ${paragraphs.length} paragraphs ready.</div>`;
    
    // Reload current book display
    setTimeout(() => {
      loadCurrentBook();
      resultsDiv.innerHTML = '';
    }, 1500);
    
  } catch (error) {
    resultsDiv.innerHTML = '<div class="error">Could not load book content. Try another book.</div>';
    console.error('Book selection error:', error);
  }
}

// Resume a previous book
async function resumeBook(index) {
  const result = await chrome.storage.local.get(['previousBooks', 'currentBook', 'bookParagraphs', 'currentParagraph', 'totalParagraphs']);
  const bookToResume = result.previousBooks[index];
  
  if (!bookToResume) return;
  
  // Save current book to previous books
  if (result.currentBook && result.bookParagraphs) {
    let previousBooks = result.previousBooks || [];
    
    // Remove the book we're resuming
    previousBooks = previousBooks.filter((_, i) => i !== index);
    
    // Add current book
    previousBooks.unshift({
      title: result.currentBook.title,
      author: result.currentBook.author,
      bookId: result.currentBook.bookId,
      bookParagraphs: result.bookParagraphs,
      currentParagraph: result.currentParagraph,
      totalParagraphs: result.totalParagraphs,
      textUrl: result.currentBook.textUrl
    });
    
    // Keep only last 5 books
    previousBooks = previousBooks.slice(0, 5);
    
    // Set the resumed book as current
    await chrome.storage.local.set({
      currentBook: {
        title: bookToResume.title,
        author: bookToResume.author,
        bookId: bookToResume.bookId,
        textUrl: bookToResume.textUrl
      },
      bookParagraphs: bookToResume.bookParagraphs,
      currentParagraph: bookToResume.currentParagraph,
      totalParagraphs: bookToResume.totalParagraphs,
      previousBooks
    });
  }
  
  // Refresh display
  loadCurrentBook();
}

// Clean the book text (remove Project Gutenberg header/footer)
function cleanBookText(text) {
  // Remove UTF-8 BOM if present
  text = text.replace(/^\uFEFF/, '');
  
  // Try to remove Project Gutenberg header (usually ends with "***")
  const startMarkers = [
    /\*\*\* START OF (THIS|THE) PROJECT GUTENBERG EBOOK .* \*\*\*/i,
    /\*\*\*START OF THE PROJECT GUTENBERG EBOOK .* \*\*\*/i,
  ];
  
  for (const marker of startMarkers) {
    const match = text.match(marker);
    if (match) {
      text = text.substring(match.index + match[0].length);
      break;
    }
  }
  
  // Try to remove Project Gutenberg footer
  const endMarkers = [
    /\*\*\* END OF (THIS|THE) PROJECT GUTENBERG EBOOK .* \*\*\*/i,
    /\*\*\*END OF THE PROJECT GUTENBERG EBOOK .* \*\*\*/i,
    /End of (the )?Project Gutenberg/i,
  ];
  
  for (const marker of endMarkers) {
    const match = text.match(marker);
    if (match) {
      text = text.substring(0, match.index);
      break;
    }
  }
  
  // Clean up extra whitespace and normalize line breaks
  text = text.trim();
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  
  return text;
}

// Create readable chunks of ~50 words, ending at sentence boundaries
function createReadableChunks(text) {
  // Split into sentences (basic sentence detection)
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const chunks = [];
  let currentChunk = '';
  let currentWordCount = 0;
  const targetWords = 50;
  
  for (let sentence of sentences) {
    sentence = sentence.trim();
    if (!sentence) continue;
    
    const words = sentence.split(/\s+/);
    const sentenceWordCount = words.length;
    
    // If adding this sentence would exceed ~50 words significantly, save current chunk
    if (currentWordCount > 0 && currentWordCount + sentenceWordCount > targetWords * 1.3) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence + ' ';
      currentWordCount = sentenceWordCount;
    } else {
      // Add sentence to current chunk
      currentChunk += sentence + ' ';
      currentWordCount += sentenceWordCount;
      
      // If we've reached ~50 words, save the chunk
      if (currentWordCount >= targetWords) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = '';
        currentWordCount = 0;
      }
    }
  }
  
  // Add any remaining text
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  // Filter out very short chunks
  return chunks.filter(chunk => chunk.split(/\s+/).length >= 5);
}

// Event listeners
document.getElementById('searchBtn').addEventListener('click', () => {
  const query = document.getElementById('searchInput').value.trim();
  if (query) {
    searchBooks(query);
  }
});

document.getElementById('searchInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const query = e.target.value.trim();
    if (query) {
      searchBooks(query);
    }
  }
});

// Load current book on popup open
loadCurrentBook();
