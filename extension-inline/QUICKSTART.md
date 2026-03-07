# Quick Start - Inline Extension

## Setup (3 steps)

### 1. Install Extension
```bash
# Open Chrome
# Go to: chrome://extensions/
# Enable "Developer mode"
# Click "Load unpacked"
# Select: extension-inline folder
```

### 2. Start Backend
```bash
cd Backend
npm install
node server.js
# Should see: "Server running on http://localhost:3000"
```

### 3. Use It!
1. Go to Spotify: https://open.spotify.com/playlist/[any-playlist-id]
2. See checkboxes appear next to songs
3. Select songs
4. Click "Download (X)"
5. Watch progress on the page!

## What You'll See

### On Spotify Page:
```
[Control Panel appears above tracklist]
┌────────────────────────────────────────────┐
│ [Select All] [Deselect All] [Download (5)] │
│                                            │
│ Progress: █████░░░░░ 50%                   │
│ Downloading: Heavy - Rosie Darling        │
│ 2 / 4 completed                           │
└────────────────────────────────────────────┘

[Tracklist with checkboxes]
☑ 1. Heavy - Rosie Darling
☑ 2. Song Title - Artist Name  
☐ 3. Another Song - Artist
...
```

## Testing Checklist

- [ ] Checkboxes appear on playlist page
- [ ] Select All works
- [ ] Individual checkbox selection
- [ ] Download button shows correct count
- [ ] Progress bar animates
- [ ] Current song name updates
- [ ] Files appear in `Backend/downloads/`
- [ ] Works after scrolling playlist
- [ ] Deselect All clears everything

## Common Issues

**No checkboxes?**
→ Refresh page, wait 2-3 seconds

**Download button disabled?**
→ Select at least one song

**"Backend not reachable" error?**
→ Start backend: `cd Backend && node server.js`

**CSS looks weird?**
→ Clear browser cache, reload extension

## File Locations

- **Extension Code**: `extension-inline/`
- **Downloaded Music**: `Backend/downloads/`
- **Server Logs**: Terminal where you ran `node server.js`

## Next Steps

After testing, you can:
1. Add more playlists
2. Customize backend download folder
3. Modify UI colors in `styles.css`
4. Add quality selection options

---

**Pro Tip**: Keep backend terminal visible to see download progress logs!
