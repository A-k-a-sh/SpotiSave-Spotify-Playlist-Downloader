# Chrome Extension

Spotify Playlist Downloader Chrome Extension (Manifest V3)

## Features

- ✅ Extract songs from Spotify playlist pages
- ✅ Select individual songs or all songs
- ✅ Download via backend server
- ✅ Real-time progress tracking
- ✅ Success/failure reporting
- ✅ Clean, modern UI

## Installation

### 1. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this `extension` folder
5. Extension icon will appear in toolbar

### 2. Start Backend Server

The extension requires the backend server to be running:

```bash
cd ../Backend
npm start
```

Server should be running on `http://localhost:3000`

## Usage

1. **Navigate to Spotify**: Open [open.spotify.com](https://open.spotify.com) and go to any playlist
2. **Scroll down**: Load all songs in the playlist (Spotify lazy-loads)
3. **Open extension**: Click the extension icon in Chrome toolbar
4. **Select songs**: Choose which songs to download (or select all)
5. **Download**: Click "Download Selected" button
6. **Wait**: Extension shows real-time progress
7. **Check results**: View success/failed downloads

## How It Works

```
Spotify Playlist Page
  ↓ Content Script scrapes DOM
Extension Popup
  ↓ User selects songs
  ↓ POST to backend
Node.js Backend
  ↓ Spawns Python for each song
Python + yt-dlp
  ↓ Searches YouTube & downloads
Downloads saved to Backend/downloads/
  ↑ Extension polls progress
Shows "3/10 downloaded"
```

## File Structure

```
extension/
├── manifest.json       # Extension configuration (Manifest V3)
├── popup.html          # Extension popup UI
├── popup.js            # Main UI logic
├── popup.css           # Styling
├── content.js          # DOM scraper (runs on Spotify pages)
├── background.js       # Service worker (minimal)
├── icons/              # Extension icons (16, 48, 128)
└── README.md           # This file
```

## Development

### Testing

1. Make changes to files
2. Go to `chrome://extensions/`
3. Click reload icon on the extension card
4. Test on a Spotify playlist page

### Debugging

- **Popup**: Right-click extension icon → "Inspect popup"
- **Content Script**: Open DevTools on Spotify page → Console tab
- **Background**: Go to `chrome://extensions/` → Click "service worker"

### Console Logs

All logs are prefixed:
- `[Popup]` - popup.js
- `[Spotify Downloader]` - content.js
- `[Spotify Downloader]` - background.js

## Permissions Explained

- `activeTab` - Access current Spotify tab
- `storage` - Save user preferences (future)
- `https://open.spotify.com/*` - Run content script on Spotify

## Troubleshooting

### "Backend not running" error
→ Start the backend: `cd Backend && npm start`

### No songs found / empty list
→ Scroll down the playlist to load all tracks, then click "Get Songs" again

### Extension not appearing
→ Check `chrome://extensions/` → Make sure it's enabled

### Downloads failing
→ Check Backend terminal for errors
→ Verify yt-dlp is installed: `pip3 install yt-dlp`

### "Not a Playlist Page" error
→ Navigate to `open.spotify.com/playlist/xxxxx` URL

## Adding Icons

Create icon images (16x16, 48x48, 128x128 PNG) and place in `icons/` folder. For now, extension works without icons (Chrome shows default).

To generate icons quickly:
```bash
mkdir icons
# Add your icon images here
```

## Future Improvements

- [ ] Persist download history in chrome.storage
- [ ] Queue multiple playlists
- [ ] Download to user-selected folder
- [ ] Format selection (mp3 conversion)
- [ ] Retry failed downloads
- [ ] Export song list to CSV

## Notes

- Extension only works on `open.spotify.com/playlist/*` URLs
- Downloads continue even if you close the popup
- Backend must be running locally (no remote server)
- No Spotify API needed - pure DOM scraping
- No authentication required
