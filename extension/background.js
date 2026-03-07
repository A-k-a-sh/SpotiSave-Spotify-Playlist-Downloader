/**
 * Background Service Worker
 * Minimal implementation for Manifest V3
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Spotify Downloader] Extension installed');
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('[Spotify Downloader] Extension clicked on tab:', tab.id);
});

// Optional: Handle messages from popup/content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Spotify Downloader] Background received message:', request);
  
  // Future: Add background tasks here if needed
  
  return true;
});
