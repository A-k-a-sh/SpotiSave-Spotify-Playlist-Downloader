/**
 * Content Script - Injected into Spotify Web Player
 * Extracts playlist track information from the DOM
 */

// Extract playlist tracks from Spotify DOM
function extractSpotifyPlaylistTracks() {
  const rows = document.querySelectorAll('div[data-testid="tracklist-row"]');
  const tracks = [];
  
  console.log(`[Spotify Downloader] Found ${rows.length} track rows`);
  
  rows.forEach((row, index) => {
    const rowIndex = row.getAttribute('aria-rowindex') 
      ? parseInt(row.getAttribute('aria-rowindex'), 10) 
      : index + 1;
    
    // Title from internal-track-link
    let title = '—';
    const titleLink = row.querySelector('a[data-testid="internal-track-link"]');
    if (titleLink) {
      const textEl = titleLink.querySelector('div[data-encore-id="text"]');
      if (textEl) {
        title = textEl.textContent.trim();
      }
    }
    
    // Artists (multiple possible - joined by comma)
    let artists = '—';
    const artistElements = row.querySelectorAll('a[href^="/artist/"]');
    if (artistElements.length > 0) {
      artists = Array.from(artistElements)
        .map(el => el.textContent.trim())
        .filter(Boolean)
        .join(', ');
    }
    
    // Album
    let album = '—';
    const albumLink = row.querySelector('a[href^="/album/"]');
    if (albumLink) {
      album = albumLink.textContent.trim();
    }
    
    // Duration (mm:ss) - optional
    let duration = '—';
    const textSpans = row.querySelectorAll('span[data-encore-id="text"]');
    for (const span of textSpans) {
      const txt = span.textContent.trim();
      if (/^\d+:\d{2}$/.test(txt)) {
        duration = txt;
        break;
      }
    }
    
    // Only add if we have a title (skip empty/header rows)
    if (title !== '—' && title !== '') {
      tracks.push({
        index: rowIndex,
        title,
        artists,
        album,
        duration
      });
    }
  });
  
  // Sort by rowIndex to match Spotify order
  tracks.sort((a, b) => a.index - b.index);
  
  return tracks;
}

// Get playlist name from page
function getPlaylistName() {
  // Check if it's Liked Songs page
  if (window.location.href.includes('/collection/tracks')) {
    return 'Liked Songs';
  }
  
  // Primary selector - most common in current web player
  const h1 = document.querySelector('h1[data-testid="playlist-title"]');
  if (h1) return h1.textContent.trim();

  // Fallback 1 - very common alternative
  const titleEl = document.querySelector('h1[data-encore-id="text"]') ||
                  document.querySelector('span[data-encore-id="text"] h1') ||
                  document.querySelector('h1');
  
  if (titleEl) {
    const text = titleEl.textContent.trim();
    // Clean up common extra text like "Playlist • 89 songs"
    return text.split(' •')[0].trim() || text;
  }

  // Fallback 2 - look for the biggest heading in main content
  const main = document.querySelector('main') || document.body;
  const headings = main.querySelectorAll('h1, h2');
  for (const el of headings) {
    const t = el.textContent.trim();
    if (t && t.length > 3 && !t.includes('songs') && !t.includes('followers')) {
      return t;
    }
  }

  return 'Spotify Playlist';
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Spotify Downloader] Received message:', request.action);
  
  if (request.action === 'GET_SONGS') {
    try {
      const tracks = extractSpotifyPlaylistTracks();
      const playlistName = getPlaylistName();
      
      if (tracks.length === 0) {
        sendResponse({ 
          success: false, 
          error: 'No tracks found. Please scroll down to load all songs, then try again.',
          playlistName
        });
      } else {
        sendResponse({ 
          success: true, 
          tracks,
          playlistName,
          count: tracks.length,
          url: window.location.href
        });
      }
    } catch (err) {
      sendResponse({ 
        success: false, 
        error: `Error extracting tracks: ${err.message}`
      });
    }
  }
  
  return true; // Keep channel open for async response
});

console.log('[Spotify Downloader] Content script loaded');
