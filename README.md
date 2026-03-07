# Spotify Playlist Downloader

Chrome extension to download Spotify playlist tracks as audio files via YouTube search and yt-dlp.

![Status](https://img.shields.io/badge/status-beta-yellow)
![Chrome](https://img.shields.io/badge/chrome-extension-green)
![Node](https://img.shields.io/badge/node-%3E%3D16-brightgreen)
![Python](https://img.shields.io/badge/python-3.8%2B-blue)

## 🎵 Features

- ✅ Extract songs from any Spotify playlist (no API/premium needed)
- ✅ Select individual songs or download entire playlist
- ✅ Automatic YouTube search with yt-dlp
- ✅ Best audio quality download (m4a/opus)
- ✅ Real-time download progress tracking
- ✅ Success/failure reporting
- ✅ No FFmpeg required for audio downloads

## 📋 Prerequisites

- **Node.js** 16+ ([Download](https://nodejs.org/))
- **Python** 3.8+ ([Download](https://www.python.org/))
- **Chrome Browser** (or Chromium-based)
- **yt-dlp** Python package

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd "Spotify Playlist download"
```

### 2. Setup Backend

```bash
cd Backend
npm install
pip3 install -r requirements.txt
npm start
```

Backend will start on `http://localhost:3000`

### 3. Install Extension

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `extension/` folder
5. Extension icon appears in toolbar ✅

### 4. Use Extension

1. Go to [open.spotify.com](https://open.spotify.com)
2. Open any playlist
3. **Scroll down** to load all songs
4. Click extension icon
5. Select songs and click "Download"
6. Wait for downloads to complete
7. Files saved in `Backend/downloads/`

## 📁 Project Structure

```
.
├── Backend/                 # Node.js + Python backend
│   ├── server.js           # Express API server
│   ├── download_song.py    # yt-dlp wrapper
│   ├── package.json        # Node dependencies
│   ├── requirements.txt    # Python dependencies
│   └── downloads/          # Downloaded audio files (gitignored)
│
├── extension/              # Chrome extension
│   ├── manifest.json       # Manifest V3 config
│   ├── popup.html          # Extension UI
│   ├── popup.js            # Main logic
│   ├── popup.css           # Styles
│   ├── content.js          # Spotify DOM scraper
│   ├── background.js       # Service worker
│   └── icons/              # Extension icons
│
├── .github/
│   └── copilot-instructions.md  # AI agent guide
│
├── YT-DLP_IMPLEMENTATION_GUIDE.md  # yt-dlp patterns
└── spotify dom.md          # DOM scraping reference
```

## 🔧 How It Works

```
┌─────────────────────────────────┐
│  Spotify Web Player Playlist    │
└────────────┬────────────────────┘
             │ DOM scraping
             ↓
┌─────────────────────────────────┐
│  Chrome Extension (React UI)    │
│  - Extract song metadata        │
│  - User selects songs           │
└────────────┬────────────────────┘
             │ POST /download
             ↓
┌─────────────────────────────────┐
│  Node.js Backend (Express)      │
│  - Manages download queue       │
│  - Spawns Python processes      │
└────────────┬────────────────────┘
             │ child_process
             ↓
┌─────────────────────────────────┐
│  Python + yt-dlp                │
│  - Search YouTube               │
│  - Download best audio          │
└────────────┬────────────────────┘
             ↓
      Backend/downloads/
    (m4a/opus audio files)
```

## 🎯 API Endpoints

### Backend (http://localhost:3000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Check server status |
| `POST` | `/download` | Start download queue |
| `GET` | `/progress/:queueId` | Get download progress |
| `GET` | `/files` | List downloaded files |

### Example Usage

```bash
# Start download
curl -X POST http://localhost:3000/download \
  -H "Content-Type: application/json" \
  -d '{
    "songs": [
      {"title": "Shape of You", "artists": "Ed Sheeran"},
      {"title": "Blinding Lights", "artists": "The Weeknd"}
    ]
  }'

# Check progress
curl http://localhost:3000/progress/abc123
```

## 🛠️ Development

### Backend Development

```bash
cd Backend
npm run dev  # Auto-restart on changes (requires nodemon)
```

### Extension Development

1. Make changes to extension files
2. Go to `chrome://extensions/`
3. Click reload button on extension card
4. Test on Spotify playlist page

### Debugging

- **Backend logs**: Terminal where `npm start` is running
- **Extension popup**: Right-click icon → "Inspect popup"
- **Content script**: DevTools on Spotify page → Console
- **Background worker**: `chrome://extensions/` → "service worker"

## ⚠️ Troubleshooting

### Backend won't start
```bash
# Check Node.js version
node --version  # Should be 16+

# Reinstall dependencies
cd Backend
rm -rf node_modules package-lock.json
npm install
```

### Python script fails
```bash
# Verify Python and yt-dlp
python3 --version
python3 -c "import yt_dlp; print(yt_dlp.version.__version__)"

# Reinstall yt-dlp
pip3 install --upgrade yt-dlp
```

### Extension doesn't see songs
- Scroll down the entire playlist to load all tracks
- Refresh the Spotify page
- Click "Get Songs" button again

### Downloads fail with 403 error
- yt-dlp may need updating: `pip3 install --upgrade yt-dlp`
- Check internet connection
- Some videos may be geo-blocked

### "Backend not running" in extension
```bash
# Start backend
cd Backend
npm start

# Verify it's running
curl http://localhost:3000/health
```

## 📝 Technical Notes

- **No Spotify API**: Uses DOM scraping (no premium/auth needed)
- **No FFmpeg needed**: Audio-only downloads don't require merging
- **Sequential downloads**: One song at a time to avoid rate limits
- **YouTube search**: Auto-picks best match using `ytsearch1:query`
- **File naming**: yt-dlp auto-sanitizes filenames
- **State management**: Backend tracks queue; extension polls progress

## 🔐 Privacy & Legal

- All downloads are for personal use only
- Extension runs locally (no external servers)
- No data collection or tracking
- Respects YouTube's terms of service
- Not affiliated with Spotify or YouTube

## 🚧 Known Limitations

- Requires backend server running locally
- YouTube search may not always find exact match
- Spotify DOM structure may change (requires updates)
- No format conversion (downloads as m4a/opus)
- Downloads one song at a time

## 🔮 Future Features

- [ ] Parallel downloads (configurable)
- [ ] MP3 conversion option
- [ ] Custom download folder selection
- [ ] Download history tracking
- [ ] Retry failed downloads
- [ ] Album art embedding
- [ ] Playlist export to CSV

## 📚 Documentation

- [Backend README](Backend/README.md) - Server setup and API docs
- [Extension README](extension/README.md) - Extension installation guide
- [YT-DLP Guide](YT-DLP_IMPLEMENTATION_GUIDE.md) - Complete yt-dlp patterns
- [Copilot Instructions](.github/copilot-instructions.md) - AI agent guide

## 🤝 Contributing

This is a personal project, but suggestions are welcome! Open an issue for bugs or feature requests.

## 📄 License

MIT License - See LICENSE file for details

---

**Made with ❤️ for music lovers who want offline playlists**
