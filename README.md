# Spotify Playlist Downloader

A Chrome extension and Node.js backend system for downloading Spotify playlist tracks as audio files. Extracts track information from the Spotify Web Player, searches YouTube via yt-dlp, and downloads audio to organized folders.

## Architecture

### Technology Stack

- **Frontend**: Chrome Extension (Manifest V3)
  - Vanilla JavaScript (no frameworks)
  - DOM scraping with content scripts
  - Chrome Storage API for state management
  
- **Backend**: Node.js + Express
  - RESTful API endpoints
  - Child process management for Python workers
  - Archiver for ZIP file generation
  
- **Download Worker**: Python 3 + yt-dlp
  - YouTube search and audio extraction
  - Multi-result fallback mechanism
  - Audio-only format enforcement

### Data Flow

```
Spotify Web Player
    ↓ (DOM scraping via content script)
Chrome Extension (content.js)
    ↓ (extracts track metadata)
Extension Popup (popup.js)
    ↓ (user selection + HTTP POST)
Node.js Backend (server.js)
    ↓ (spawns child process per song)
Python Worker (download_song.py)
    ↓ (yt-dlp search + download)
Local File System (Backend/downloads/)
```

## Features

### Core Functionality

- Extract track metadata from Spotify playlists (title, artist, album, duration)
- Manual song selection with "Select All" support
- Incremental loading for large playlists (handles Spotify's virtual scrolling)
- Automatic recommendation filtering (last 10 tracks excluded)
- YouTube search with 3-result fallback for reliability
- Playlist-specific folder organization
- Automatic ZIP file generation with clean naming

### User Experience

- Soft dark theme UI for comfortable viewing
- Sticky controls bar for easy access while scrolling
- Real-time progress tracking with detailed status
- Error recovery with retry and page refresh options
- Deduplication to prevent duplicate downloads
- Works with both regular playlists and "Liked Songs"

## Installation

### Prerequisites

- Node.js 14+ and npm
- Python 3.7+
- Chrome browser
- Git

### Backend Setup

```bash
# Navigate to Backend directory
cd Backend

# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt

# Start the server
node server.js
```

The backend will run on `http://localhost:3000`.

### Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right corner)
3. Click "Load unpacked"
4. Select the `extension` directory from this repository
5. The extension icon should appear in your Chrome toolbar

## Usage

### Important: Manual Scrolling Requirement

Due to Spotify's virtual scrolling implementation, the DOM only keeps approximately 40-70 songs loaded at any given time. To ensure all playlist tracks are captured:

1. Navigate to your desired Spotify playlist
2. **Scroll through the entire playlist manually** to load all tracks into the DOM
3. Once you've reached the bottom, you can begin the extraction process

**Note**: This limitation exists because Spotify uses DOM virtualization for performance. Programmatic scrolling does not trigger Spotify's lazy-loading mechanism.

### Download Process

1. Open a Spotify playlist in your browser
2. Manually scroll through the playlist to load all tracks
3. Click the extension icon in Chrome toolbar
4. The popup will display extracted songs (automatically filtered to exclude recommendations)
5. Click "Add More Songs" if you scroll to new parts of the playlist
6. Select individual songs or use "Select All"
7. Click "Download Selected" to begin the download process
8. Monitor progress in the popup (downloads continue even if popup is closed)

### File Organization

Downloads are organized by playlist name:

```
Backend/downloads/
├── My_Playlist_Name/
│   ├── Song1.m4a
│   ├── Song2.m4a
│   └── Song3.m4a
├── My_Playlist_Name.zip
├── Liked_Songs/
│   └── [songs...]
└── Liked_Songs.zip
```

## Technical Details

### Playlist Name Extraction

The extension uses `document.title` for playlist name extraction, which is more reliable than DOM selectors. The title is parsed to extract the actual playlist name from formats like:

- `"Playlist Name - playlist by Owner | Spotify"` → `"Playlist Name"`
- `"Spotify – Liked Songs"` → `"Liked Songs"`

This approach is resilient to Spotify UI changes but may require updates if Spotify modifies their title format.

### DOM Scraping Reference

The current DOM scraping implementation is documented in `spotify_dom_scrapper.md`. This file contains the working selectors and extraction patterns as of the implementation date.

**Important**: Spotify frequently updates their web player UI, which may break DOM selectors. If extraction fails:

1. Check `spotify_dom_scrapper.md` for current selector patterns
2. Inspect Spotify's DOM structure for changes
3. Update selectors in `extension/content.js` accordingly

Key selectors currently in use:
- Track rows: `div[data-testid="tracklist-row"]`
- Title: `a[data-testid="internal-track-link"]`
- Artists: `a[href^="/artist/"]`
- Album: `a[href^="/album/"]`

### Download Strategy

The Python worker implements a 3-result fallback mechanism:

1. Search YouTube for top 3 matches using query: `ytsearch3:{title} {artists} audio`
2. Attempt download from first result
3. If first result fails (no audio stream, restricted, etc.), try second result
4. If second fails, try third result
5. If all fail, mark as failed and continue to next song

This approach significantly improves success rate over single-result downloads.

### Audio Format

Downloads use the format string: `bestaudio[ext=m4a]/bestaudio`

- Prefers M4A audio containers (widely compatible)
- Falls back to best available audio format
- Explicitly excludes video formats to prevent large file sizes
- No FFmpeg conversion required for audio-only downloads

## API Endpoints

### Backend Routes

#### `GET /health`
Health check endpoint.

**Response**: `{ status: 'ok', message: 'Backend is running' }`

#### `POST /download`
Initiates download queue.

**Request Body**:
```json
{
  "songs": [
    { "title": "Song Name", "artists": "Artist Name" }
  ],
  "playlistName": "My Playlist"
}
```

**Response**:
```json
{
  "queueId": "abc123",
  "total": 10,
  "message": "Download queue started"
}
```

#### `GET /progress/:queueId`
Retrieves download progress.

**Response**:
```json
{
  "completed": 5,
  "total": 10,
  "current": "Downloading: Song Name - Artist",
  "failed": [],
  "success": [],
  "isComplete": false,
  "zipFile": null
}
```

#### `GET /files`
Lists all downloaded files.

## Known Limitations

1. **Virtual Scrolling**: Manual scrolling required to load all playlist tracks
2. **Programmatic Scroll Fails**: Automated scrolling does not trigger Spotify's lazy loader
3. **DOM Selector Fragility**: Spotify UI updates may break selectors
4. **YouTube Search Accuracy**: Downloaded song may not match exact Spotify version
5. **Rate Limiting**: Sequential downloads with 2-second delay to avoid YouTube throttling
6. **Spotify Web Player Only**: Does not work with Spotify desktop app

## Project Structure

```
.
├── Backend/
│   ├── server.js              # Express API server
│   ├── download_song.py       # yt-dlp wrapper script
│   ├── package.json           # Node dependencies
│   ├── requirements.txt       # Python dependencies
│   └── downloads/             # Output directory (gitignored)
├── extension/
│   ├── manifest.json          # Chrome extension config
│   ├── popup.html             # Extension popup UI
│   ├── popup.js               # Popup logic and API calls
│   ├── popup.css              # Soft dark theme styles
│   ├── content.js             # DOM scraping script
│   ├── background.js          # Service worker
│   └── icons/                 # Extension icons
├── extension-inline/          # Alternative inline UI implementation
├── spotify_dom_scrapper.md    # DOM selector reference (current)
└── README.md                  # This file
```

## Development

### Modifying DOM Selectors

If Spotify updates their UI and extraction fails:

1. Open Spotify Web Player in Chrome
2. Open DevTools (F12) and inspect playlist track elements
3. Update selectors in `extension/content.js` function `extractSpotifyPlaylistTracks()`
4. Document new selectors in `spotify_dom_scrapper.md`
5. Test extraction with `extractSpotifyPlaylistTracks()` in console

### Testing

Test extraction without downloading:

```javascript
// In Spotify page console
extractSpotifyPlaylistTracks()
```

Verify backend is running:

```bash
curl http://localhost:3000/health
```

### Debugging

Enable verbose logging in popup.js by checking browser console:
- Right-click extension popup → "Inspect"
- Console logs prefixed with `[Popup]` or `[Spotify Downloader]`

Backend logs appear in the terminal where `node server.js` is running.

## Performance

- **Extraction Speed**: Instant (DOM already loaded)
- **Download Speed**: 5-30 seconds per song (network-dependent)
- **YouTube Search**: 1-3 seconds per song
- **Typical Playlist**: ~2-5 minutes for 10 songs
- **Memory Usage**: Minimal (songs downloaded sequentially)

## Security Considerations

- Extension only works on `open.spotify.com` domain
- Backend validates all input before processing
- No authentication required (uses public YouTube content)
- yt-dlp handles filename sanitization automatically
- Downloads stored locally, never uploaded

## License

This project is for educational purposes. Users are responsible for ensuring their usage complies with Spotify's Terms of Service and applicable copyright laws.

## Troubleshooting

### "Backend not reachable" error
- Ensure Node.js server is running: `cd Backend && node server.js`
- Check server is listening on port 3000
- Verify no firewall blocking localhost connections

### No songs extracted
- Manually scroll through entire playlist first
- Refresh Spotify page and try again
- Check DevTools console for JavaScript errors
- Verify you're on a playlist page URL: `open.spotify.com/playlist/*`

### Songs downloading wrong versions
- YouTube search may return covers or live versions
- yt-dlp selects first available audio stream
- Consider more specific search terms in future updates

### Extraction returns "Spotify Playlist" as name
- Check if `document.title` is accessible
- Verify page has fully loaded before extraction
- May require page refresh

## Future Enhancements

- Spotify Web API integration (OAuth) for 100% reliable metadata
- Custom download quality selection
- Progress persistence across popup sessions
- Batch playlist processing
- Audio format conversion options
- Integration with local music libraries
