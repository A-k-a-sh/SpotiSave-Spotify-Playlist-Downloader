// Spotify Playlist Downloader - Background Service Worker
// Handles cross-tab communication and backend health checks

console.log('Spotify Playlist Downloader (Inline) - Background service worker started');

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkBackend') {
    checkBackendHealth()
      .then(isHealthy => sendResponse({ healthy: isHealthy }))
      .catch(() => sendResponse({ healthy: false }));
    return true; // Keep channel open for async response
  }
});

// Check if backend is running
async function checkBackendHealth() {
  try {
    const response = await fetch('http://localhost:3000/health', {
      method: 'GET',
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    return response.ok;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
}

// Log installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed - Welcome!');
  } else if (details.reason === 'update') {
    console.log('Extension updated to version', chrome.runtime.getManifest().version);
  }
});
