# Spotify Playlist Downloader - Inline Extension

A Chrome extension that injects download controls directly into Spotify playlist pages. Select songs inline and download them without leaving the page!

## Features

✅ **Inline Selection** - Checkboxes appear next to each track  
✅ **Select All/Deselect** - Bulk selection controls  
✅ **Live Progress** - See download progress right on the page  
✅ **No Popup** - Everything happens on the Spotify page  
✅ **Matches Spotify Theme** - Dark theme styling that blends in  

## How It Works

1. Open any Spotify playlist: `https://open.spotify.com/playlist/*`
2. Checkboxes appear next to each track
3. Select the songs you want to download
4. Click "Download (X)" button
5. Watch progress inline as songs download
6. Files saved to `Backend/downloads/`

## Installation

### 1. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension-inline` folder
5. Extension icon should appear in toolbar

### 2. Start Backend Server

The extension needs the backend running to download songs.

```bash
cd Backend
npm install
node server.js
```

Backend runs on `http://localhost:3000`

### 3. Install Python Dependencies

```bash
cd Backend
pip install -r requirements.txt
```

## Usage

1. **Navigate to a playlist** on Spotify Web Player
2. **Wait for checkboxes** to appear next to tracks
3. **Select songs** by clicking checkboxes
   - Use "Select All" to select everything
   - Use "Deselect All" to clear selection
4. **Click "Download (X)"** where X = number of selected songs
5. **Watch progress** - Progress bar and current song shown inline
6. **Files download** to `Backend/downloads/` folder

## UI Elements

### Control Panel
Appears above the tracklist with:
- **Select All** button - Check all tracks
- **Deselect All** button - Uncheck all tracks  
- **Download (X)** button - Start download (shows count)

### Progress Indicator
Shows while downloading:
- Progress bar (green Spotify-themed)
- Currently downloading song name
- Completed count (e.g., "3 / 10 completed")

### Checkboxes
- Appear at the start of each track row
- Green when checked (Spotify color)
- Hover effect for better UX

## Backend API Endpoints

Extension communicates with backend via:
- `POST /download` - Start download queue
- `GET /progress` - Poll download progress
- `GET /health` - Check if backend is running

## Troubleshooting

### Checkboxes don't appear
- Make sure you're on a playlist page (`/playlist/`)
- Wait a few seconds for Spotify to fully load
- Refresh the page

### Download button doesn't work
- Check backend is running: visit `http://localhost:3000/health`
- Check browser console for errors (F12)
- Ensure CORS is enabled in backend

### Songs download slowly
- Normal! YouTube search + download takes 5-30 seconds per song
- Backend processes one song at a time to avoid rate limiting
- Large playlists may take several minutes

### Styling looks off
- Spotify occasionally updates their DOM structure
- CSS may need adjustments if Spotify redesigns their interface

## Development

### File Structure
```
extension-inline/
├── manifest.json      # Chrome extension config
├── content.js         # Main logic (DOM injection, downloads)
├── styles.css         # Inline UI styling
├── background.js      # Service worker (minimal)
├── icons/             # Extension icons
└── README.md          # This file
```

### Key Functions

**content.js:**
- `extractTracks()` - Scrapes playlist data from DOM
- `injectCheckbox()` - Adds checkbox to each track
- `injectControlPanel()` - Creates control buttons
- `startDownload()` - Sends selected tracks to backend
- `pollProgress()` - Updates progress every 2 seconds

### Customization

**Change backend URL:**
Edit `BACKEND_URL` in `content.js`:
```javascript
const BACKEND_URL = 'http://localhost:3000';
```

**Modify colors:**
Edit `styles.css` - Look for `#1db954` (Spotify green)

**Adjust polling interval:**
In `pollProgress()` function, change:
```javascript
setTimeout(pollProgress, 2000); // 2 seconds
```

## Comparison to Popup Extension

| Feature | Inline | Popup |
|---------|--------|-------|
| Selection UI | On page | Separate popup |
| Context switching | None | Open popup |
| Large playlists | Easy scrolling | Limited space |
| Progress visibility | Always visible | Only when open |
| User Experience | Native feel | Extension feel |

## Known Limitations

- Only works on Spotify Web Player (not app)
- Requires backend server running
- One playlist at a time
- Checkboxes reset on page navigation

## Future Enhancements

- [ ] Bulk download all playlists
- [ ] Download history tracking
- [ ] Audio quality selection
- [ ] Playlist name detection for folders
- [ ] Offline mode indicator
- [ ] Settings panel for customization

## Tech Stack

- **Manifest V3** - Modern Chrome extension API
- **Vanilla JavaScript** - No framework dependencies
- **CSS3** - Custom styling with animations
- **Fetch API** - Backend communication
- **MutationObserver** - Dynamic content detection

## License

MIT License - Feel free to modify and distribute!

---

**Tip**: Keep the backend terminal open while using the extension to see download logs in real-time!
