// Background service worker for the extension

// Initialize storage on install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First time install - open welcome page
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html')
    });
  }
  
  // Initialize storage if not exists
  chrome.storage.local.get(['currentBook'], (result) => {
    if (!result.currentBook) {
      chrome.storage.local.set({
        currentBook: null,
        bookParagraphs: [],
        currentParagraph: 0,
        totalParagraphs: 0,
        previousBooks: []
      });
    }
  });
  
  console.log('Loading Page Reader extension installed');
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getBookData') {
    chrome.storage.local.get([
      'currentBook',
      'bookParagraphs',
      'currentParagraph',
      'totalParagraphs'
    ], (result) => {
      sendResponse(result);
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'updateProgress') {
    chrome.storage.local.get(['currentParagraph', 'totalParagraphs'], (result) => {
      const nextParagraph = Math.min(
        result.currentParagraph + 1,
        result.totalParagraphs - 1
      );
      
      chrome.storage.local.set({ currentParagraph: nextParagraph }, () => {
        sendResponse({ success: true, currentParagraph: nextParagraph });
      });
    });
    return true;
  }
});

// Monitor tab updates to trigger overlay on navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    // Page is loading - content script will handle overlay
    console.log('Page loading:', tab.url);
  }
});

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension startup');
});
