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
    
    # Construct search query - ytsearch3 returns top 3 results for fallback
    query = f'ytsearch3:{title} {artists} audio'
    
    # Track the downloaded filename
    downloaded_file = None
    
    def progress_hook(d):
        nonlocal downloaded_file
        if d['status'] == 'finished':
            downloaded_file = d['filename']
    
    # yt-dlp options for search (don't download yet)
    search_opts = {
        'quiet': True,
        'no_warnings': True,
        'logger': SilentLogger(),
        'extract_flat': 'in_playlist',  # Don't download, just get info
        'socket_timeout': 30,
    }
    
    # yt-dlp options for actual download
    download_opts = {
        'format': 'bestaudio[ext=m4a]/bestaudio',  # Audio only, no video
        'outtmpl': f'{output_folder}/%(title)s.%(ext)s',
        'quiet': True,
        'no_warnings': True,
        'logger': SilentLogger(),
        'socket_timeout': 30,
        'retries': 3,
        'progress_hooks': [progress_hook],
    }
    
    try:
        # First, search for top 3 results without downloading
        with yt_dlp.YoutubeDL(search_opts) as ydl:
            search_info = ydl.extract_info(query, download=False)
            
            if not search_info or 'entries' not in search_info:
                return {
                    'success': False,
                    'error': 'No results found on YouTube'
                }
            
            entries = [e for e in search_info['entries'] if e]  # Filter out None
            
            if not entries:
                return {
                    'success': False,
                    'error': 'No valid results found on YouTube'
                }
        
        # Try downloading from each result until one succeeds
        last_error = None
        
        for idx, entry in enumerate(entries[:3], 1):  # Try top 3 results
            try:
                video_url = entry.get('url') or entry.get('webpage_url') or entry.get('id')
                
                if not video_url:
                    continue
                
                # If we only have ID, construct URL
                if not video_url.startswith('http'):
                    video_url = f'https://www.youtube.com/watch?v={video_url}'
                
                # Reset downloaded_file for this attempt
                downloaded_file = None
                
                # Try to download from this result
                with yt_dlp.YoutubeDL(download_opts) as ydl:
                    ydl.download([video_url])
                    
                    # Check if file was downloaded
                    if downloaded_file and os.path.exists(downloaded_file):
                        basename = os.path.basename(downloaded_file)
                        print(f"Success on result #{idx}", file=sys.stderr)
                        return {
                            'success': True,
                            'file': basename,
                            'error': None
                        }
            
            except yt_dlp.utils.DownloadError as e:
                last_error = str(e)
                print(f"Result #{idx} failed: {last_error[:50]}", file=sys.stderr)
                continue  # Try next result
            
            except Exception as e:
                last_error = str(e)
                print(f"Result #{idx} error: {last_error[:50]}", file=sys.stderr)
                continue
        
        # All attempts failed
        return {
            'success': False,
            'error': f'All 3 results failed. Last error: {last_error[:100] if last_error else "No audio available"}'
        }
            
    except yt_dlp.utils.DownloadError as e:
        # Specific yt-dlp download errors (403, format not available, etc.)
        error_msg = str(e)
        if '403' in error_msg:
            return {
                'success': False,
                'error': 'YouTube blocked (403) - Video may be restricted',
                'file': None
            }
        elif 'format' in error_msg.lower():
            return {
                'success': False,
                'error': 'Audio format not available for this video',
                'file': None
            }
        else:
            return {
                'success': False,
                'error': f'Download failed: {error_msg[:100]}',
                'file': None
            }
    
    except Exception as e:
        # Catch-all for other errors
        return {
            'success': False,
            'error': f'Unexpected error: {str(e)[:100]}',
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
