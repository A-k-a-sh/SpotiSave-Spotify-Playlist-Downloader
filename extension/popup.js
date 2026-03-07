/**
 * Popup Script - Main extension UI logic
 * Handles song selection, backend communication, and progress tracking
 */

const BACKEND_URL = 'http://localhost:3000';
const POLL_INTERVAL = 2000; // Poll every 2 seconds

let allSongs = [];
let selectedSongs = [];
let currentQueueId = null;
let pollTimer = null;
let isLikedSongsPage = false;
let isFirstLoad = true;

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  console.log('[Popup] Initializing...');
  
  // Check if we're on a Spotify playlist or liked songs page
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  const isPlaylistPage = tab.url && tab.url.includes('open.spotify.com/playlist/');
  isLikedSongsPage = tab.url && tab.url.includes('open.spotify.com/collection/tracks');
  
  if (!isPlaylistPage && !isLikedSongsPage) {
    showError(
      'Not a Playlist Page',
      'Please navigate to a Spotify playlist or Liked Songs page and try again.'
    );
    return;
  }
  
  // Check backend status
  checkBackend();
  
  // Setup event listeners
  setupEventListeners();
  
  // Auto-load songs
  setTimeout(() => getSongs(), 500);
}

function setupEventListeners() {
  document.getElementById('get-songs-btn').addEventListener('click', getSongs);
  document.getElementById('select-all').addEventListener('click', toggleSelectAll);
  document.getElementById('download-btn').addEventListener('click', startDownload);
  document.getElementById('retry-btn').addEventListener('click', init);
  document.getElementById('refresh-btn').addEventListener('click', refreshSpotifyPage);
  document.getElementById('back-btn').addEventListener('click', showSongList);
  document.getElementById('view-results-btn').addEventListener('click', showResults);
  document.getElementById('open-folder-btn').addEventListener('click', openDownloadsFolder);
}

// Check if backend is running
async function checkBackend() {
  const statusBar = document.getElementById('backend-status');
  const statusText = document.getElementById('status-text');
  const statusDot = statusBar.querySelector('.status-dot');
  
  statusBar.classList.remove('hidden');
  statusText.textContent = 'Checking backend...';
  
  try {
    const response = await fetch(`${BACKEND_URL}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    
    if (response.ok) {
      statusDot.className = 'status-dot success';
      statusText.textContent = 'Backend connected';
      setTimeout(() => statusBar.classList.add('hidden'), 2000);
      return true;
    }
  } catch (err) {
    statusDot.className = 'status-dot error';
    statusText.textContent = 'Backend not running - Start server first!';
    return false;
  }
}

// Get songs from content script
async function getSongs() {
  showLoading();
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_SONGS' });
    
    if (response.success) {
      let scrapedTracks = response.tracks;
      
      // Drop last 10 songs (recommendations) for regular playlists
      // Keep all for Liked Songs (no recommendations there)
      if (!isLikedSongsPage && scrapedTracks.length > 10) {
        scrapedTracks = scrapedTracks.slice(0, -10);
        console.log(`[Popup] Dropped last 10 recommended songs. Kept ${scrapedTracks.length} playlist songs.`);
      }
      
      // Deduplicate: only add songs not already in allSongs
      const existingKeys = new Set(allSongs.map(s => `${s.title}|||${s.artists}`));
      const newSongs = scrapedTracks.filter(track => {
        const key = `${track.title}|||${track.artists}`;
        return !existingKeys.has(key);
      });
      
      // Merge new songs with existing
      const previousCount = allSongs.length;
      allSongs = [...allSongs, ...newSongs];
      
      console.log(`[Popup] Added ${newSongs.length} new songs. Total: ${allSongs.length}`);
      
      // Update display
      displaySongs(allSongs);
      document.getElementById('playlist-name').textContent = response.playlistName || 'Playlist';
      document.getElementById('song-count').textContent = `${allSongs.length} songs`;
      
      // Update button text after first successful load
      if (isFirstLoad) {
        document.getElementById('get-songs-btn').textContent = 'Add More Songs';
        isFirstLoad = false;
      }
      
      showMain();
    } else {
      showError('Failed to Extract Songs', response.error || 'Unknown error');
    }
  } catch (err) {
    showError(
      'Connection Error', 
      'Could not connect to Spotify page. Please refresh the page and try again.\n\n' +
      'If you just reloaded the extension, you MUST refresh the Spotify page first.'
    );
    console.error('[Popup] Connection error:', err);
  }
}

// Display songs in list
function displaySongs(songs) {
  const listContainer = document.getElementById('song-list');
  listContainer.innerHTML = '';
  
  if (songs.length === 0) {
    listContainer.innerHTML = '<p class="empty-state">No songs found. Try scrolling down the playlist.</p>';
    return;
  }
  
  songs.forEach((song, index) => {
    const songItem = document.createElement('div');
    songItem.className = 'song-item';
    songItem.innerHTML = `
      <label class="song-checkbox">
        <input type="checkbox" data-index="${index}" class="song-select">
        <div class="song-info">
          <div class="song-title">${escapeHtml(song.title)}</div>
          <div class="song-meta">
            ${escapeHtml(song.artists)}
            ${song.duration !== '—' ? `<span class="duration">${song.duration}</span>` : ''}
          </div>
        </div>
      </label>
    `;
    
    listContainer.appendChild(songItem);
  });
  
  // Add change listeners
  document.querySelectorAll('.song-select').forEach(checkbox => {
    checkbox.addEventListener('change', updateSelectedCount);
  });
}

// Toggle select all
function toggleSelectAll() {
  const selectAll = document.getElementById('select-all');
  const checkboxes = document.querySelectorAll('.song-select');
  
  checkboxes.forEach(cb => {
    cb.checked = selectAll.checked;
  });
  
  updateSelectedCount();
}

// Update selected count
function updateSelectedCount() {
  const checkboxes = document.querySelectorAll('.song-select:checked');
  const count = checkboxes.length;
  
  document.getElementById('selected-count').textContent = count;
  
  const downloadBtn = document.getElementById('download-btn');
  if (count > 0) {
    downloadBtn.classList.remove('hidden');
    downloadBtn.disabled = false;
  } else {
    downloadBtn.disabled = true;
  }
  
  // Update select all checkbox state
  const selectAll = document.getElementById('select-all');
  const allCheckboxes = document.querySelectorAll('.song-select');
  selectAll.checked = count === allCheckboxes.length && count > 0;
}

// Start download
async function startDownload() {
  const checkboxes = document.querySelectorAll('.song-select:checked');
  selectedSongs = Array.from(checkboxes).map(cb => {
    const index = parseInt(cb.dataset.index);
    return allSongs[index];
  });
  
  if (selectedSongs.length === 0) {
    alert('Please select at least one song');
    return;
  }
  
  // Check backend again
  const backendOk = await checkBackend();
  if (!backendOk) {
    showError('Backend Not Running', 'Please start the backend server (npm start in Backend folder)');
    return;
  }
  
  // Send to backend
  try {
    const response = await fetch(`${BACKEND_URL}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        songs: selectedSongs,
        playlistName: document.getElementById('playlist-name').textContent || 'Spotify Playlist'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    currentQueueId = data.queueId;
    
    // Show progress view and start polling
    showProgress();
    startPolling();
    
  } catch (err) {
    showError('Download Failed', `Could not start download: ${err.message}`);
  }
}

// Poll for progress
async function startPolling() {
  if (!currentQueueId) return;
  
  pollTimer = setInterval(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/progress/${currentQueueId}`);
      const data = await response.json();
      
      updateProgress(data);
      
      if (data.isComplete) {
        stopPolling();
        document.getElementById('view-results-btn').classList.remove('hidden');
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, POLL_INTERVAL);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// Update progress display
function updateProgress(data) {
  const { completed, total, current, success, failed, zipFile } = data;
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  
  document.getElementById('progress-text').textContent = `${completed} / ${total}`;
  document.getElementById('progress-fill').style.width = `${percentage}%`;
  document.getElementById('current-song').textContent = current || 'Starting...';
  document.getElementById('success-count').textContent = success.length;
  document.getElementById('failed-count').textContent = failed.length;
  
  // Show zip info if available
  if (zipFile) {
    document.getElementById('current-song').textContent = `✓ ${current}`;
    document.getElementById('current-song').style.color = '#1db954';
    document.getElementById('current-song').style.fontWeight = '600';
  }
}

// Show results
async function showResults() {
  if (!currentQueueId) return;
  
  try {
    // Fetch the final results
    const response = await fetch(`${BACKEND_URL}/progress/${currentQueueId}`);
    const data = await response.json();
    
    document.getElementById('final-success').textContent = data.success.length;
    document.getElementById('final-failed').textContent = data.failed.length;
    
    // Show zip file info if available
    if (data.zipFile) {
      const resultsContainer = document.getElementById('results-container');
      const zipInfo = document.createElement('div');
      zipInfo.className = 'zip-info';
      zipInfo.innerHTML = `
        <div style="padding: 12px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; margin: 16px 0; text-align: center;">
          <strong>📦 ${data.zipFile}</strong>
          <p style="font-size: 12px; color: #155724; margin-top: 4px;">Saved in Backend/downloads/</p>
        </div>
      `;
      resultsContainer.insertBefore(zipInfo, document.querySelector('.results-actions'));
    }
    
    // Show failed list if any
    if (data.failed.length > 0) {
      const failedList = document.getElementById('failed-list');
      const failedItems = document.getElementById('failed-items');
      failedList.classList.remove('hidden');
      failedItems.innerHTML = data.failed.map(f => 
        `<li><strong>${escapeHtml(f.title)}</strong> - ${escapeHtml(f.artists)}<br><small>${escapeHtml(f.error)}</small></li>`
      ).join('');
    }
    
    hide('progress-container');
    show('results-container');
    
  } catch (err) {
    console.error('Error fetching results:', err);
  }
}

// Open downloads folder (informational)
function openDownloadsFolder() {
  alert('Downloads are saved in:\nBackend/downloads/\n\nPlease open this folder manually from your file system.');
}

// Refresh Spotify page
async function refreshSpotifyPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.reload(tab.id);
    window.close(); // Close popup after refreshing
  } catch (err) {
    console.error('[Popup] Failed to refresh page:', err);
    alert('Failed to refresh page. Please refresh manually.');
  }
}

// Show/hide views
function showLoading() {
  hide('main', 'error');
  show('loading');
}

function showMain() {
  hide('loading', 'error', 'progress-container', 'results-container');
  show('main', 'song-list-container');
}

function showProgress() {
  hide('song-list-container', 'results-container');
  show('progress-container');
}

function showSongList() {
  stopPolling();
  currentQueueId = null;
  hide('progress-container', 'results-container');
  show('song-list-container');
}

function showError(title, message) {
  hide('loading', 'main');
  show('error');
  document.getElementById('error-title').textContent = title;
  document.getElementById('error-message').textContent = message;
}

function show(...ids) {
  ids.forEach(id => document.getElementById(id)?.classList.remove('hidden'));
}

function hide(...ids) {
  ids.forEach(id => document.getElementById(id)?.classList.add('hidden'));
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
