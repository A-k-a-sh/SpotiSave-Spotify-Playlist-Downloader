# Backend Server

Node.js + Express server that manages download queue and spawns Python/yt-dlp processes.

## Setup

### 1. Install Node.js dependencies
```bash
npm install
```

### 2. Install Python dependencies
```bash
pip3 install -r requirements.txt
```

### 3. Verify yt-dlp installation
```bash
python3 -c "import yt_dlp; print('yt-dlp installed:', yt_dlp.version.__version__)"
```

## Running the Server

```bash
npm start
```

Or with auto-restart on file changes:
```bash
npm run dev
```

Server will start on `http://localhost:3000`

## API Endpoints

### Health Check
```bash
GET /health
```

### Start Download Queue
```bash
POST /download
Content-Type: application/json

{
  "songs": [
    {"title": "Shape of You", "artists": "Ed Sheeran", "duration": "3:53"},
    {"title": "Blinding Lights", "artists": "The Weeknd", "duration": "3:20"}
  ]
}

Response:
{
  "queueId": "abc123",
  "total": 2,
  "message": "Download queue started"
}
```

### Get Progress
```bash
GET /progress/:queueId

Response:
{
  "completed": 1,
  "total": 2,
  "current": "Downloading: Blinding Lights - The Weeknd",
  "failed": [],
  "success": [
    {"title": "Shape of You", "artists": "Ed Sheeran", "file": "Ed Sheeran - Shape of You.m4a"}
  ],
  "isComplete": false
}
```

### List Downloaded Files
```bash
GET /files

Response:
{
  "files": [
    {"name": "Ed Sheeran - Shape of You.m4a", "path": "/path/downloads/...", "size": 3145728}
  ],
  "count": 1
}
```

## Testing

Test the server with sample data:

```bash
# Health check
curl http://localhost:3000/health

# Start download
curl -X POST http://localhost:3000/download \
  -H "Content-Type: application/json" \
  -d '{"songs":[{"title":"Heavy","artists":"Rosie Darling"}]}'

# Check progress (replace with actual queueId)
curl http://localhost:3000/progress/abc123

# List files
curl http://localhost:3000/files
```

## How It Works

1. Extension sends song array to `POST /download`
2. Server creates queue and spawns Python process for each song
3. Python script searches YouTube with yt-dlp and downloads best audio
4. Extension polls `GET /progress/:queueId` every 2 seconds
5. Downloaded files saved to `./downloads/` folder

## Troubleshooting

### "python3: command not found"
Install Python 3: `brew install python3` (macOS)

### "No module named 'yt_dlp'"
Run: `pip3 install yt-dlp`

### Downloads failing
- Check internet connection
- Try updating yt-dlp: `pip3 install --upgrade yt-dlp`
- Check YouTube availability in your region

### Port 3000 already in use
Change PORT in server.js or kill existing process:
```bash
lsof -ti:3000 | xargs kill
```
