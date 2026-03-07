// Spotify Playlist Downloader - Inline Content Script
// Injects checkboxes and download controls directly into Spotify playlist pages

const BACKEND_URL = 'http://localhost:3000';
let selectedSongs = new Set();
let isDownloading = false;
let downloadProgress = { completed: 0, total: 0, current: '' };

// Wait for Spotify playlist to load
function waitForPlaylist() {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const tracklist = document.querySelector('div[data-testid="playlist-tracklist"]');
      if (tracklist) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 500);
  });
}

// Extract tracks from Spotify DOM
function extractTracks() {
  const rows = document.querySelectorAll('div[data-testid="tracklist-row"]');
  const tracks = [];
  
  rows.forEach((row, index) => {
    const rowIndex = row.getAttribute('aria-rowindex') || index + 1;
    
    // Title from internal-track-link
    const titleLink = row.querySelector('a[data-testid="internal-track-link"]');
    const title = titleLink?.querySelector('div[data-encore-id="text"]')?.textContent.trim();
    
    // Artists (multiple possible)
    const artistElements = row.querySelectorAll('a[href^="/artist/"]');
    const artists = Array.from(artistElements).map(el => el.textContent.trim()).join(', ');
    
    // Album
    const albumLink = row.querySelector('a[href^="/album/"]');
    const album = albumLink?.textContent.trim();
    
    // Duration
    const textSpans = row.querySelectorAll('span[data-encore-id="text"]');
    let duration = '—';
    for (const span of textSpans) {
      if (/^\d+:\d{2}$/.test(span.textContent)) {
        duration = span.textContent.trim();
        break;
      }
    }
    
    if (title) {
      tracks.push({ 
        index: rowIndex, 
        title, 
        artists, 
        album, 
        duration,
        rowElement: row 
      });
    }
  });
  
  return tracks;
}

// Inject checkbox into track row
function injectCheckbox(track) {
  // Check if checkbox already exists
  if (track.rowElement.querySelector('.spd-checkbox-container')) {
    return;
  }

  const checkboxContainer = document.createElement('div');
  checkboxContainer.className = 'spd-checkbox-container';
  checkboxContainer.innerHTML = `
    <input type="checkbox" 
           class="spd-checkbox" 
           data-track-index="${track.index}"
           id="spd-check-${track.index}">
    <label for="spd-check-${track.index}"></label>
  `;
  
  // Insert at the beginning of the row
  const firstChild = track.rowElement.firstElementChild;
  if (firstChild) {
    track.rowElement.insertBefore(checkboxContainer, firstChild);
  }
  
  // Add event listener
  const checkbox = checkboxContainer.querySelector('.spd-checkbox');
  checkbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      selectedSongs.add(track.index);
    } else {
      selectedSongs.delete(track.index);
    }
    updateDownloadButton();
  });
}

// Inject control panel (Select All, Download buttons)
function injectControlPanel() {
  // Check if panel already exists
  if (document.getElementById('spd-control-panel')) {
    return;
  }

  const panel = document.createElement('div');
  panel.id = 'spd-control-panel';
  panel.innerHTML = `
    <div class="spd-controls">
      <button id="spd-select-all" class="spd-btn spd-btn-secondary">
        Select All
      </button>
      <button id="spd-deselect-all" class="spd-btn spd-btn-secondary">
        Deselect All
      </button>
      <button id="spd-download-btn" class="spd-btn spd-btn-primary" disabled>
        Download (0)
      </button>
    </div>
    <div id="spd-progress" class="spd-progress" style="display: none;">
      <div class="spd-progress-bar">
        <div class="spd-progress-fill" style="width: 0%"></div>
      </div>
      <div class="spd-progress-text">Downloading: <span id="spd-current-song">—</span></div>
      <div class="spd-progress-count">
        <span id="spd-completed">0</span> / <span id="spd-total">0</span> completed
      </div>
    </div>
  `;
  
  // Insert above tracklist
  const tracklist = document.querySelector('div[data-testid="playlist-tracklist"]');
  if (tracklist && tracklist.parentElement) {
    tracklist.parentElement.insertBefore(panel, tracklist);
  }
  
  // Add event listeners
  document.getElementById('spd-select-all').addEventListener('click', selectAllTracks);
  document.getElementById('spd-deselect-all').addEventListener('click', deselectAllTracks);
  document.getElementById('spd-download-btn').addEventListener('click', startDownload);
}

// Select all tracks
function selectAllTracks() {
  const checkboxes = document.querySelectorAll('.spd-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = true;
    selectedSongs.add(parseInt(checkbox.dataset.trackIndex));
  });
  updateDownloadButton();
}

// Deselect all tracks
function deselectAllTracks() {
  const checkboxes = document.querySelectorAll('.spd-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  selectedSongs.clear();
  updateDownloadButton();
}

// Update download button text
function updateDownloadButton() {
  const btn = document.getElementById('spd-download-btn');
  if (btn) {
    btn.textContent = `Download (${selectedSongs.size})`;
    btn.disabled = selectedSongs.size === 0 || isDownloading;
  }
}

// Start download process
async function startDownload() {
  if (selectedSongs.size === 0 || isDownloading) return;
  
  // Get selected tracks data
  const tracks = extractTracks();
  const selectedTracks = tracks.filter(t => selectedSongs.has(t.index));
  
  const songsToDownload = selectedTracks.map(t => ({
    title: t.title,
    artists: t.artists
  }));
  
  isDownloading = true;
  updateDownloadButton();
  showProgressUI();
  
  try {
    // Send to backend
    const response = await fetch(`${BACKEND_URL}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songs: songsToDownload })
    });
    
    if (!response.ok) {
      throw new Error('Backend not reachable. Make sure the server is running on port 3000.');
    }
    
    const data = await response.json();
    console.log('Download started:', data);
    
    // Start polling progress
    pollProgress();
    
  } catch (error) {
    console.error('Download error:', error);
    alert(`Error: ${error.message}`);
    isDownloading = false;
    hideProgressUI();
    updateDownloadButton();
  }
}

// Show progress UI
function showProgressUI() {
  const progressDiv = document.getElementById('spd-progress');
  if (progressDiv) {
    progressDiv.style.display = 'block';
  }
  
  const controlsDiv = document.querySelector('.spd-controls');
  if (controlsDiv) {
    controlsDiv.style.opacity = '0.5';
    controlsDiv.style.pointerEvents = 'none';
  }
}

// Hide progress UI
function hideProgressUI() {
  const progressDiv = document.getElementById('spd-progress');
  if (progressDiv) {
    progressDiv.style.display = 'none';
  }
  
  const controlsDiv = document.querySelector('.spd-controls');
  if (controlsDiv) {
    controlsDiv.style.opacity = '1';
    controlsDiv.style.pointerEvents = 'auto';
  }
}

// Poll backend for progress
async function pollProgress() {
  if (!isDownloading) return;
  
  try {
    const response = await fetch(`${BACKEND_URL}/progress`);
    if (response.ok) {
      const progress = await response.json();
      updateProgressUI(progress);
      
      // Check if complete
      if (progress.completed >= progress.total && progress.total > 0) {
        setTimeout(() => {
          completeDownload();
        }, 1000);
      } else {
        // Continue polling
        setTimeout(pollProgress, 2000);
      }
    } else {
      setTimeout(pollProgress, 2000);
    }
  } catch (error) {
    console.error('Progress poll error:', error);
    setTimeout(pollProgress, 2000);
  }
}

// Update progress UI elements
function updateProgressUI(progress) {
  document.getElementById('spd-current-song').textContent = progress.current || '—';
  document.getElementById('spd-completed').textContent = progress.completed;
  document.getElementById('spd-total').textContent = progress.total;
  
  const percentage = progress.total > 0 ? (progress.completed / progress.total * 100) : 0;
  const progressFill = document.querySelector('.spd-progress-fill');
  if (progressFill) {
    progressFill.style.width = `${percentage}%`;
  }
}

// Complete download
function completeDownload() {
  isDownloading = false;
  hideProgressUI();
  
  // Deselect all after download
  deselectAllTracks();
  
  alert(`Download complete! ${downloadProgress.completed} songs downloaded.`);
  
  // Reset progress
  downloadProgress = { completed: 0, total: 0, current: '' };
  updateProgressUI(downloadProgress);
}

// Initialize extension
async function init() {
  console.log('Spotify Playlist Downloader - Inline extension loaded');
  
  // Wait for playlist to load
  await waitForPlaylist();
  
  // Extract and inject
  const tracks = extractTracks();
  console.log(`Found ${tracks.length} tracks`);
  
  // Inject control panel
  injectControlPanel();
  
  // Inject checkboxes
  tracks.forEach(track => injectCheckbox(track));
  
  // Monitor for new tracks (lazy loading/scroll)
  observeTracklistChanges();
}

// Observe tracklist for dynamically loaded tracks
function observeTracklistChanges() {
  const tracklist = document.querySelector('div[data-testid="playlist-tracklist"]');
  if (!tracklist) return;
  
  const observer = new MutationObserver((mutations) => {
    const tracks = extractTracks();
    tracks.forEach(track => injectCheckbox(track));
  });
  
  observer.observe(tracklist, {
    childList: true,
    subtree: true
  });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
