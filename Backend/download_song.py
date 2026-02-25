#!/usr/bin/env python3
"""
YouTube audio downloader using yt-dlp
Called by Node.js via child_process.spawn()

Usage: python3 download_song.py "Song Title" "Artist Name"
Output: JSON to stdout with {success: bool, file: string, error: string}
"""

import sys
import json
import os
import yt_dlp


class SilentLogger:
    """Suppress yt-dlp verbose output"""
    def debug(self, msg):
        pass
    
    def warning(self, msg):
        pass
    
    def error(self, msg):
        # Only print errors to stderr (won't interfere with JSON stdout)
        print(msg, file=sys.stderr)


def download_song(title, artists, output_folder='./downloads'):
    """
    Search YouTube and download best audio quality
    
    Args:
        title: Song title
        artists: Artist name(s)
        output_folder: Where to save the file
    
    Returns:
        dict: {success: bool, file: str, error: str}
    """
    # Ensure output folder exists
    os.makedirs(output_folder, exist_ok=True)
    
    # Construct search query - ytsearch1 returns only best match
    query = f'ytsearch1:{title} {artists} audio'
    
    # yt-dlp options
    ydl_opts = {
        'format': 'bestaudio/best',  # Best audio quality (m4a/opus, no FFmpeg needed)
        'outtmpl': f'{output_folder}/%(title)s.%(ext)s',  # Output filename template
        'quiet': True,  # Suppress progress output
        'no_warnings': True,  # Suppress warnings
        'logger': SilentLogger(),  # Custom logger to suppress debug/warning
        'extract_flat': False,  # We need full info, not just metadata
        'socket_timeout': 30,  # Network timeout
        'retries': 3,  # Retry on failure
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # First, get info without downloading to get the actual filename
            info = ydl.extract_info(query, download=False)
            
            if not info:
                return {
                    'success': False,
                    'error': 'No results found on YouTube'
                }
            
            # Get the actual filename (handles sanitization, duplicates, etc.)
            filename = ydl.prepare_filename(info)
            basename = os.path.basename(filename)
            
            # Now download
            ydl.download([query])
            
            return {
                'success': True,
                'file': basename,
                'error': None
            }
            
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'file': None
        }


def main():
    """Main entry point - called from Node.js"""
    if len(sys.argv) < 3:
        print(json.dumps({
            'success': False,
            'error': 'Usage: python3 download_song.py "title" "artists"'
        }), flush=True)
        sys.exit(1)
    
    title = sys.argv[1]
    artists = sys.argv[2]
    
    # Download and get result
    result = download_song(title, artists)
    
    # Output JSON to stdout (flush=True ensures immediate output)
    print(json.dumps(result), flush=True)
    
    # Exit with appropriate code
    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()
