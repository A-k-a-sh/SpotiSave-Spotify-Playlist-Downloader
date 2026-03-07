
### 1. Core JavaScript function – the one that actually works right now

```javascript
function extractSpotifyPlaylistTracks() {
  const tracks = [];

  // Select all visible track rows
  const rows = document.querySelectorAll('div[data-testid="tracklist-row"]');

  console.log(`Found ${rows.length} track rows`);

  rows.forEach((row, index) => {
    // Use aria-rowindex if available, otherwise fallback to loop index
    const rowIndex = row.getAttribute('aria-rowindex') 
      ? parseInt(row.getAttribute('aria-rowindex'), 10) 
      : index + 1;

    // Title (this selector worked perfectly in your test)
    let title = '—';
    const titleLink = row.querySelector('a[data-testid="internal-track-link"]');
    if (titleLink) {
      const textEl = titleLink.querySelector('div[data-encore-id="text"]');
      if (textEl) {
        title = textEl.textContent.trim();
      }
    }

    // Artists (multiple possible – joined by comma)
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

    // Duration (mm:ss) – optional, often missing until hover/fully loaded
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

  // Sort by rowIndex so order matches Spotify
  tracks.sort((a, b) => a.index - b.index);

  return tracks;
}
```

### 2. How to call it in the extension (content script example)

```javascript
// content.js – injected into https://open.spotify.com/playlist/*

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPlaylistSongs") {
    try {
      const tracks = extractSpotifyPlaylistTracks();

      // Optional: check if we got reasonable number
      if (tracks.length < 5) {
        sendResponse({ 
          success: false, 
          message: "Too few tracks found – possibly not fully loaded or DOM changed",
          count: tracks.length 
        });
      } else {
        sendResponse({ 
          success: true, 
          tracks,
          count: tracks.length,
          playlistUrl: window.location.href
        });
      }
    } catch (err) {
      sendResponse({ 
        success: false, 
        error: err.message 
      });
    }
  }
  return true; // keep channel open for async response
});
```

### 3. Output format (what the extension will send to your backend)

The `tracks` array will look exactly like this (JSON):

```json
[
  {
    "index": 1,
    "title": "Heavy",
    "artists": "Rosie Darling",
    "album": "Coping",
    "duration": "—"
  },
  {
    "index": 2,
    "title": "Older",
    "artists": "Sasha Alex Sloan",
    "album": "Older",
    "duration": "—"
  },
  {
    "index": 3,
    "title": "Dancing With Your Ghost",
    "artists": "Sasha Alex Sloan",
    "album": "Dancing With Your Ghost",
    "duration": "—"
  },
  // ... up to 52 items
]
```

### 4. Quick usage tips for your project

- **When to call it**  
  User opens playlist page → opens extension popup → clicks "Get Songs" → popup sends message to content script → content script runs `extractSpotifyPlaylistTracks()` → sends back array.

- **What to do if it returns 0 or very few tracks**  
  → Tell user: "Please scroll down the playlist to load all songs, then try again."

- **Backend usage example (Node.js)**

```js
app.post('/download-songs', (req, res) => {
  const { tracks } = req.body; // array from extension

  tracks.forEach(track => {
    const query = `${track.title} ${track.artists} audio`;
    // run yt-dlp here
    console.log(`Downloading: ${query}`);
    // ... your child_process code
  });

  res.json({ status: "started", count: tracks.length });
});
```

