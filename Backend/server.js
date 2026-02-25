const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors()); // Allow all origins (extension will have unique ID)
app.use(express.json());

// In-memory download queue
const downloadQueues = new Map(); // {queueId: {songs, completed, total, current, failed}}

// Generate unique queue ID
function generateQueueId() {
  return Math.random().toString(36).substring(2, 15);
}

// Ensure downloads folder exists
const DOWNLOADS_FOLDER = path.join(__dirname, 'downloads');
if (!fs.existsSync(DOWNLOADS_FOLDER)) {
  fs.mkdirSync(DOWNLOADS_FOLDER, { recursive: true });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Start download queue
app.post('/download', async (req, res) => {
  const { songs } = req.body;

  // Validate input
  if (!songs || !Array.isArray(songs) || songs.length === 0) {
    return res.status(400).json({ error: 'Invalid songs array' });
  }

  // Validate each song has title and artists
  for (const song of songs) {
    if (!song.title || !song.artists) {
      return res.status(400).json({ 
        error: 'Each song must have title and artists',
        invalid: song 
      });
    }
  }

  // Create queue
  const queueId = generateQueueId();
  const queue = {
    songs,
    completed: 0,
    total: songs.length,
    current: '',
    failed: [],
    success: []
  };

  downloadQueues.set(queueId, queue);

  // Start downloading in background (don't await)
  processQueue(queueId).catch(err => {
    console.error('Queue processing error:', err);
  });

  // Return immediately
  res.json({ 
    queueId, 
    total: songs.length,
    message: 'Download queue started' 
  });
});

// Get progress for a queue
app.get('/progress/:queueId', (req, res) => {
  const { queueId } = req.params;
  const queue = downloadQueues.get(queueId);

  if (!queue) {
    return res.status(404).json({ error: 'Queue not found' });
  }

  res.json({
    completed: queue.completed,
    total: queue.total,
    current: queue.current,
    failed: queue.failed,
    success: queue.success,
    isComplete: queue.completed === queue.total
  });
});

// List downloaded files
app.get('/files', (req, res) => {
  fs.readdir(DOWNLOADS_FOLDER, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read downloads folder' });
    }

    const fileList = files
      .filter(f => !f.startsWith('.')) // Exclude hidden files
      .map(f => ({
        name: f,
        path: path.join(DOWNLOADS_FOLDER, f),
        size: fs.statSync(path.join(DOWNLOADS_FOLDER, f)).size
      }));

    res.json({ files: fileList, count: fileList.length });
  });
});

// Process download queue sequentially
async function processQueue(queueId) {
  const queue = downloadQueues.get(queueId);
  if (!queue) return;

  for (const song of queue.songs) {
    queue.current = `Downloading: ${song.title} - ${song.artists}`;
    
    try {
      console.log(`[${queue.completed + 1}/${queue.total}] ${queue.current}`);
      
      const result = await downloadSong(song.title, song.artists);
      
      if (result.success) {
        queue.success.push({
          title: song.title,
          artists: song.artists,
          file: result.file
        });
        console.log(`✓ Success: ${result.file}`);
      } else {
        queue.failed.push({
          title: song.title,
          artists: song.artists,
          error: result.error
        });
        console.log(`✗ Failed: ${result.error}`);
      }
    } catch (error) {
      queue.failed.push({
        title: song.title,
        artists: song.artists,
        error: error.message
      });
      console.log(`✗ Error: ${error.message}`);
    }

    queue.completed++;
    queue.current = queue.completed === queue.total 
      ? 'All downloads complete' 
      : queue.current;

    // Small delay between downloads to avoid rate limiting
    if (queue.completed < queue.total) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\nQueue ${queueId} complete: ${queue.success.length} succeeded, ${queue.failed.length} failed`);
}

// Download single song using Python script
function downloadSong(title, artists) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, 'download_song.py');
    const python = spawn('python3', [pythonScript, title, artists]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python script failed: ${stderr}`));
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (err) {
        reject(new Error(`Failed to parse Python output: ${stdout}`));
      }
    });

    // Timeout after 60 seconds
    setTimeout(() => {
      python.kill();
      reject(new Error('Download timeout (60s)'));
    }, 60000);
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📁 Downloads folder: ${DOWNLOADS_FOLDER}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /health`);
  console.log(`  POST /download`);
  console.log(`  GET  /progress/:queueId`);
  console.log(`  GET  /files\n`);
});
