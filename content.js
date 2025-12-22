// Content script to display book overlay while pages load

let overlay = null;
let isPageLoading = false;
let continueVisible = false;

// Create the overlay element
function createOverlay() {
  if (overlay) return;
  
  overlay = document.createElement('div');
  overlay.id = 'book-reader-overlay';
  overlay.innerHTML = `
    <div class="book-reader-content">
      <div class="book-reader-header">
        <span class="book-reader-title">📖 Loading...</span>
        <span class="book-reader-progress"></span>
      </div>
      <div class="book-reader-text"></div>
      <div class="book-reader-continue" style="display: none;">
        <p class="continue-text">Page loaded. Press any key to continue.</p>
      </div>
    </div>
  `;
  
  document.documentElement.appendChild(overlay);
  
  // Listen for any keypress to continue
  document.addEventListener('keydown', handleKeypressContinue);
  
  // Listen for clicks anywhere on overlay when continue is visible
  overlay.addEventListener('click', (e) => {
    if (continueVisible) {
      hideOverlay();
    }
  });
}

function handleKeypressContinue(e) {
  if (continueVisible) {
    hideOverlay();
  }
}

// Show the overlay with current paragraph
async function showOverlay() {
  createOverlay();
  
  const result = await chrome.storage.local.get([
    'currentBook',
    'bookParagraphs',
    'currentParagraph',
    'totalParagraphs'
  ]);
  
  if (!result.currentBook || !result.bookParagraphs) {
    console.log('No book selected - overlay not shown');
    return; // No book selected
  }
  
  const paragraph = result.bookParagraphs[result.currentParagraph] || 'The end.';
  const progress = result.totalParagraphs > 0 
    ? Math.round((result.currentParagraph / result.totalParagraphs) * 100) 
    : 0;
  
  // Update overlay content
  overlay.querySelector('.book-reader-title').textContent = result.currentBook.title;
  overlay.querySelector('.book-reader-progress').textContent = `${progress}%`;
  overlay.querySelector('.book-reader-text').textContent = paragraph;
  
  // Show overlay
  overlay.style.display = 'flex';
  continueVisible = false;
  
  // Hide continue button initially
  overlay.querySelector('.book-reader-continue').style.display = 'none';
  
  console.log('Overlay shown for paragraph', result.currentParagraph + 1);
}

// Hide the overlay and advance to next paragraph
async function hideOverlay() {
  if (!overlay) return;
  
  overlay.style.display = 'none';
  continueVisible = false;
  
  // Advance to next paragraph
  const result = await chrome.storage.local.get([
    'bookParagraphs',
    'currentParagraph',
    'totalParagraphs'
  ]);
  
  if (result.bookParagraphs) {
    let nextParagraph = result.currentParagraph + 1;
    
    // Loop back to start if at end
    if (nextParagraph >= result.totalParagraphs) {
      nextParagraph = 0;
    }
    
    await chrome.storage.local.set({
      currentParagraph: nextParagraph
    });
    
    console.log('Advanced to paragraph', nextParagraph + 1);
  }
}

// Show continue message when page finishes loading
function showContinueMessage() {
  if (overlay && overlay.style.display === 'flex') {
    overlay.querySelector('.book-reader-continue').style.display = 'block';
    continueVisible = true;
    console.log('Continue message shown');
  }
}

// Main initialization - show overlay on page load
console.log('Book Reader content script loaded');

// Show overlay immediately if page is loading
if (document.readyState === 'loading') {
  console.log('Page is loading - showing overlay');
  showOverlay();
  
  // Show continue when page loads
  window.addEventListener('load', () => {
    console.log('Page loaded event fired');
    showContinueMessage();
  });
  
  // Fallback: also check DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');
    // Small delay to ensure page is settling
    setTimeout(() => {
      if (overlay && overlay.style.display === 'flex' && !continueVisible) {
        showContinueMessage();
      }
    }, 500);
  });
} else {
  console.log('Page already loaded on script injection');
}

// Listen for clicks on links to show overlay immediately
document.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (link && link.href && !link.href.startsWith('javascript:') && !link.target) {
    console.log('Link clicked - showing overlay immediately');
    showOverlay();
  }
}, true);

// Detect history-based navigation (for SPAs)
let lastUrl = location.href;
new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    console.log('URL changed - showing overlay');
    showOverlay();
    
    // Set timeout for continue message in case load event doesn't fire
    setTimeout(() => {
      showContinueMessage();
    }, 2000);
  }
}).observe(document, { subtree: true, childList: true });

// Override history methods for SPA support
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function() {
  originalPushState.apply(this, arguments);
  console.log('pushState called - showing overlay');
  setTimeout(() => {
    showOverlay();
    setTimeout(() => showContinueMessage(), 1500);
  }, 10);
};

history.replaceState = function() {
  originalReplaceState.apply(this, arguments);
};

window.addEventListener('popstate', () => {
  console.log('popstate event - showing overlay');
  setTimeout(() => {
    showOverlay();
    setTimeout(() => showContinueMessage(), 1500);
  }, 10);
});
