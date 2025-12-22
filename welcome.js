// Handle suggestion button clicks
document.querySelectorAll('.suggestion-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const title = btn.getAttribute('data-title');
    searchAndSelectFirst(title);
  });
});

// Search button
document.getElementById('searchBtn').addEventListener('click', () => {
  const query = document.getElementById('searchInput').value.trim();
  if (query) {
    searchBooks(query);
  }
});

// Enter key in search
document.getElementById('searchInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const query = e.target.value.trim();
    if (query) {
      searchBooks(query);
    }
  }
});

// Search and automatically select the first result
async function searchAndSelectFirst(query) {
  const loadingMsg = document.getElementById('loadingMessage');
  loadingMsg.style.display = 'block';
  
  try {
    const response = await fetch(`https://gutendex.com/books?search=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      // Find first book with text
      for (const book of data.results) {
        const title = book.title || 'Unknown Title';
        const author = book.authors && book.authors.length > 0 
          ? book.authors[0].name 
          : 'Unknown Author';
        const bookId = book.id;
        const textUrl = book.formats['text/plain; charset=utf-8'] || 
                       book.formats['text/plain; charset=us-ascii'] ||
                       book.formats['text/plain'];
        
        if (textUrl) {
          await selectBook(title, author, bookId, textUrl);
          return;
        }
      }
      
      loadingMsg.style.display = 'none';
      alert('Could not find text for this book. Please try another.');
    } else {
      loadingMsg.style.display = 'none';
      alert('Book not found. Please try another search.');
    }
  } catch (error) {
    loadingMsg.style.display = 'none';
    alert('Error searching for book. Please try again.');
    console.error('Search error:', error);
  }
}

// Search for books (manual search)
async function searchBooks(query) {
  const resultsDiv = document.getElementById('searchResults');
  resultsDiv.innerHTML = '<div class="loading">Searching...</div>';
  
  try {
    const response = await fetch(`https://gutendex.com/books?search=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      resultsDiv.innerHTML = '';
      
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
        
        const bookKey = `${title.toLowerCase()}|||${author.toLowerCase()}`;
        
        if (textUrl && !seenBooks.has(bookKey)) {
          seenBooks.add(bookKey);
          
          const bookDiv = document.createElement('div');
          bookDiv.className = 'book-item';
          
          bookDiv.innerHTML = `
            <div class="book-item-title">${title}</div>
            <div class="book-item-author">${author}</div>
          `;
          
          bookDiv.addEventListener('click', () => {
            document.getElementById('loadingMessage').style.display = 'block';
            selectBook(title, author, bookId, textUrl);
          });
          resultsDiv.appendChild(bookDiv);
        }
      });
      
      if (resultsDiv.children.length === 0) {
        resultsDiv.innerHTML = '<div class="error">No books with text found.</div>';
      }
    } else {
      resultsDiv.innerHTML = '<div class="error">No books found.</div>';
    }
  } catch (error) {
    resultsDiv.innerHTML = '<div class="error">Error searching books</div>';
    console.error('Search error:', error);
  }
}

// Select and load a book
async function selectBook(title, author, bookId, textUrl) {
  try {
    // Fetch the book text
    const response = await fetch(textUrl);
    const bookText = await response.text();
    
    // Clean and parse
    const cleanedText = cleanBookText(bookText);
    const paragraphs = createReadableChunks(cleanedText);
    
    if (paragraphs.length === 0) {
      alert('Could not parse book text. Please try another book.');
      document.getElementById('loadingMessage').style.display = 'none';
      return;
    }
    
    // Save to storage
    await chrome.storage.local.set({
      currentBook: { title, author, bookId, textUrl },
      bookParagraphs: paragraphs,
      currentParagraph: 0,
      totalParagraphs: paragraphs.length
    });
    
    // Close this tab
    window.close();
    
  } catch (error) {
    document.getElementById('loadingMessage').style.display = 'none';
    alert('Could not load book. Please try another.');
    console.error('Book loading error:', error);
  }
}

// Clean book text (remove Gutenberg headers/footers)
function cleanBookText(text) {
  text = text.replace(/^\uFEFF/, '');
  
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
  
  text = text.trim();
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  
  return text;
}

// Create readable chunks (~50 words)
function createReadableChunks(text) {
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
    
    if (currentWordCount > 0 && currentWordCount + sentenceWordCount > targetWords * 1.3) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence + ' ';
      currentWordCount = sentenceWordCount;
    } else {
      currentChunk += sentence + ' ';
      currentWordCount += sentenceWordCount;
      
      if (currentWordCount >= targetWords) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = '';
        currentWordCount = 0;
      }
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(chunk => chunk.split(/\s+/).length >= 5);
}
