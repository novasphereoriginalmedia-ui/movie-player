#!/usr/bin/env python3
"""
CinePlay - Movie Player Server
A high-performance local streaming player supporting multi-audio tracks,
subtitles (embedded & external SRT/VTT), instant seeking, and modern cinema UI.
"""

import os
import re
import json
import subprocess
import mimetypes
from flask import Flask, render_template, request, Response, jsonify, send_file
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SUBTITLES_DIR = os.path.join(BASE_DIR, 'subtitles')
POSTERS_DIR = os.path.join(BASE_DIR, '.cache_posters')

os.makedirs(SUBTITLES_DIR, exist_ok=True)
os.makedirs(POSTERS_DIR, exist_ok=True)

app = Flask(__name__)
CORS(app)

# Common video extensions
VIDEO_EXTS = {'.mkv', '.mp4', '.m4v', '.webm', '.avi', '.mov', '.ts'}

# Language code to friendly name & flag mapping
LANGUAGE_MAP = {
    'hin': {'name': 'Hindi', 'flag': '🇮🇳'},
    'tam': {'name': 'Tamil', 'flag': '🇮🇳'},
    'tel': {'name': 'Telugu', 'flag': '🇮🇳'},
    'mal': {'name': 'Malayalam', 'flag': '🇮🇳'},
    'kan': {'name': 'Kannada', 'flag': '🇮🇳'},
    'eng': {'name': 'English', 'flag': '🇬🇧'},
    'spa': {'name': 'Spanish', 'flag': '🇪🇸'},
    'fra': {'name': 'French', 'flag': '🇫🇷'},
    'deu': {'name': 'German', 'flag': '🇩🇪'},
    'ita': {'name': 'Italian', 'flag': '🇮🇹'},
    'jpn': {'name': 'Japanese', 'flag': '🇯🇵'},
    'kor': {'name': 'Korean', 'flag': '🇰🇷'},
    'chi': {'name': 'Chinese', 'flag': '🇨🇳'},
    'zho': {'name': 'Chinese', 'flag': '🇨🇳'},
    'ben': {'name': 'Bengali', 'flag': '🇮🇳'},
    'mar': {'name': 'Marathi', 'flag': '🇮🇳'},
    'pan': {'name': 'Punjabi', 'flag': '🇮🇳'},
    'guj': {'name': 'Gujarati', 'flag': '🇮🇳'},
    'und': {'name': 'Original Track', 'flag': '🌐'},
}

def format_title(filename):
    """Generate a clean display title from a media filename."""
    name, _ = os.path.splitext(filename)
    # Match title and year e.g., Ramayana.2026
    m = re.match(r'^([A-Za-z0-9._\- ]+?)[._\- ](19\d\d|20\d\d)', name)
    if m:
        title_part = m.group(1).replace('.', ' ').replace('_', ' ').strip()
        year_part = m.group(2)
        return f"{title_part} ({year_part})"
    # Fallback to replacing dots and underscores
    clean = re.sub(r'(\.1080p|\.720p|\.2160p|\.HDTC|\.WEBRip|\.BluRay|\.x264|\.x265|\.DD.*).*', '', name, flags=re.IGNORECASE)
    return clean.replace('.', ' ').replace('_', ' ').strip()

def probe_file(filepath):
    """Run ffprobe to inspect video, audio, and subtitle streams."""
    cmd = [
        'ffprobe', '-v', 'error',
        '-show_format',
        '-show_streams',
        '-of', 'json',
        filepath
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return json.loads(res.stdout)
    except Exception as e:
        print(f"Error probing {filepath}: {e}")
        return {}

def srt_to_vtt(srt_content):
    """Convert SRT subtitle content to standard WebVTT."""
    content = srt_content.replace('\r\n', '\n').replace('\r', '\n')
    # Replace comma in timestamps: 00:01:23,456 -> 00:01:23.456
    content = re.sub(r'(\d{2}:\d{2}:\d{2}),(\d{3})', r'\1.\2', content)
    content = content.lstrip('\ufeff \n\t')
    return "WEBVTT\n\n" + content

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/movies')
def list_movies():
    """List all available movie files in the workspace with basic metadata."""
    movies = []
    files = sorted(os.listdir(BASE_DIR))
    for f in files:
        ext = os.path.splitext(f)[1].lower()
        if ext in VIDEO_EXTS:
            path = os.path.join(BASE_DIR, f)
            size_gb = round(os.path.getsize(path) / (1024 ** 3), 2)
            movies.append({
                'filename': f,
                'title': format_title(f),
                'size_gb': size_gb
            })
    return jsonify({'movies': movies})

@app.route('/api/movie_info')
def movie_info():
    """Get detailed stream metadata for a selected movie."""
    filename = request.args.get('file', '')
    if not filename:
        files = [f for f in sorted(os.listdir(BASE_DIR)) if os.path.splitext(f)[1].lower() in VIDEO_EXTS]
        if not files:
            return jsonify({'error': 'No video files found'}), 404
        filename = files[0]

    filepath = os.path.join(BASE_DIR, filename)
    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404

    info = probe_file(filepath)
    format_info = info.get('format', {})
    duration = float(format_info.get('duration', 0))
    streams = info.get('streams', [])

    # Video stream
    video_streams = [s for s in streams if s.get('codec_type') == 'video' and s.get('codec_name') != 'png']
    video_meta = {}
    if video_streams:
        v = video_streams[0]
        video_meta = {
            'width': v.get('width'),
            'height': v.get('height'),
            'codec': v.get('codec_name'),
            'fps': v.get('r_frame_rate')
        }

    # Audio streams
    audio_tracks = []
    for s in streams:
        if s.get('codec_type') == 'audio':
            idx = s.get('index')
            tags = s.get('tags', {})
            lang_code = tags.get('language', 'und').lower()
            lang_info = LANGUAGE_MAP.get(lang_code, {'name': lang_code.upper(), 'flag': '🎵'})
            title = tags.get('title', '')
            channels = s.get('channels', 2)
            channel_layout = s.get('channel_layout', 'stereo')
            
            display_name = f"{lang_info['flag']} {lang_info['name']}"
            if title and title != 'HDHub4u.Ag' and title != lang_info['name']:
                display_name += f" ({title})"
            
            audio_tracks.append({
                'index': idx,
                'language_code': lang_code,
                'language_name': lang_info['name'],
                'display_name': display_name,
                'flag': lang_info['flag'],
                'codec': s.get('codec_name'),
                'channels': channels,
                'channel_layout': channel_layout,
                'is_default': s.get('disposition', {}).get('default', 0) == 1
            })

    # Embedded subtitle streams
    embedded_subtitles = []
    for s in streams:
        if s.get('codec_type') == 'subtitle':
            idx = s.get('index')
            tags = s.get('tags', {})
            lang_code = tags.get('language', 'und').lower()
            lang_info = LANGUAGE_MAP.get(lang_code, {'name': lang_code.upper(), 'flag': '💬'})
            title = tags.get('title', '')
            display_name = f"{lang_info['flag']} {lang_info['name']}"
            if title:
                display_name += f" ({title})"
            embedded_subtitles.append({
                'type': 'embedded',
                'index': idx,
                'language_code': lang_code,
                'language_name': lang_info['name'],
                'display_name': display_name,
                'flag': lang_info['flag']
            })

    # External subtitle files (.srt, .vtt) in root and subtitles/ dir
    external_subtitles = []
    scan_dirs = [BASE_DIR, SUBTITLES_DIR]
    seen_files = set()
    for sdir in scan_dirs:
        if not os.path.exists(sdir):
            continue
        for sf in sorted(os.listdir(sdir)):
            sext = os.path.splitext(sf)[1].lower()
            if sext in {'.srt', '.vtt'} and sf not in seen_files:
                seen_files.add(sf)
                # Guess language from name e.g. Ramayana.English.srt
                lang_code = 'und'
                lower_name = sf.lower()
                for code, details in LANGUAGE_MAP.items():
                    if code in lower_name or details['name'].lower() in lower_name:
                        lang_code = code
                        break
                lang_info = LANGUAGE_MAP.get(lang_code, {'name': 'External Subtitle', 'flag': '📄'})
                external_subtitles.append({
                    'type': 'external',
                    'filename': sf,
                    'dir': 'subtitles' if sdir == SUBTITLES_DIR else '',
                    'language_code': lang_code,
                    'language_name': lang_info['name'],
                    'display_name': f"{lang_info['flag']} {lang_info['name']} ({sf})"
                })

    return jsonify({
        'filename': filename,
        'title': format_title(filename),
        'duration': duration,
        'video': video_meta,
        'audio_tracks': audio_tracks,
        'embedded_subtitles': embedded_subtitles,
        'external_subtitles': external_subtitles
    })

@app.route('/api/poster')
def get_poster():
    """Extract or return cached video poster frame."""
    filename = request.args.get('file', '')
    if not filename:
        return 'No file specified', 400
    filepath = os.path.join(BASE_DIR, filename)
    if not os.path.exists(filepath):
        return 'File not found', 404

    poster_file = os.path.join(POSTERS_DIR, f"{filename}.jpg")
    if not os.path.exists(poster_file):
        # Extract frame at 2 minutes
        cmd = [
            'ffmpeg', '-ss', '120',
            '-i', filepath,
            '-vframes', '1',
            '-q:v', '2',
            '-y', poster_file
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    if os.path.exists(poster_file):
        return send_file(poster_file, mimetype='image/jpeg')
    return '', 204

@app.route('/api/stream')
def stream_video():
    """
    Stream fragmented MP4 with specified audio track and timestamp offset.
    - Video: directly copied (-c:v copy) -> 0% CPU overhead, 100% original quality
    - Audio: dynamically transcoded to AAC stereo (-c:a aac -b:a 192k) -> rapid 60x encoding speed
    - Container: fragmented MP4 (movflags frag_keyframe+empty_moov+default_base_moof)
    """
    filename = request.args.get('file', '')
    try:
        audio_idx = int(request.args.get('audio', 1))
    except (ValueError, TypeError):
        audio_idx = 1

    try:
        offset = max(0.0, float(request.args.get('offset', 0.0)))
    except (ValueError, TypeError):
        offset = 0.0

    filepath = os.path.join(BASE_DIR, filename)
    if not os.path.exists(filepath):
        return 'File not found', 404

    cmd = [
        'ffmpeg',
        '-ss', str(offset),
        '-i', filepath,
        '-map', '0:0',                 # Primary video track (1080p H.264)
        '-map', f'0:{audio_idx}',      # Selected audio track
        '-c:v', 'copy',                # Passthrough video
        '-c:a', 'aac',                 # Convert audio to high-quality AAC
        '-b:a', '192k',
        '-ac', '2',                    # Downmix to stereo
        '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
        '-avoid_negative_ts', 'make_zero',
        '-f', 'mp4',
        'pipe:1'
    ]

    def generate():
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            bufsize=256 * 1024
        )
        try:
            while True:
                chunk = proc.stdout.read(64 * 1024)
                if not chunk:
                    break
                yield chunk
        except (GeneratorExit, Exception):
            pass
        finally:
            try:
                proc.kill()
                proc.stdout.close()
                proc.wait()
            except Exception:
                pass

    resp = Response(generate(), mimetype='video/mp4')
    resp.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    resp.headers['Pragma'] = 'no-cache'
    resp.headers['Expires'] = '0'
    return resp

@app.route('/api/subtitle/embedded')
def stream_embedded_subtitle():
    """Extract embedded subtitle track and stream as WebVTT on the fly."""
    filename = request.args.get('file', '')
    track_idx = request.args.get('track', '0')
    filepath = os.path.join(BASE_DIR, filename)
    if not os.path.exists(filepath):
        return 'File not found', 404

    cmd = [
        'ffmpeg',
        '-i', filepath,
        '-map', f'0:{track_idx}',
        '-f', 'webvtt',
        'pipe:1'
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return Response(res.stdout, mimetype='text/vtt; charset=utf-8')
    except Exception as e:
        return f"Error extracting subtitle: {e}", 500

@app.route('/api/subtitle/external/<filename>')
def get_external_subtitle(filename):
    """Serve external subtitle file converted to WebVTT."""
    # Look in subtitles/ and root
    sub_path = os.path.join(SUBTITLES_DIR, filename)
    if not os.path.exists(sub_path):
        sub_path = os.path.join(BASE_DIR, filename)
    if not os.path.exists(sub_path):
        return 'Subtitle not found', 404

    with open(sub_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    if filename.lower().endswith('.srt'):
        content = srt_to_vtt(content)
    elif not content.startswith('WEBVTT'):
        content = "WEBVTT\n\n" + content

    return Response(content, mimetype='text/vtt; charset=utf-8')

@app.route('/api/upload_subtitle', methods=['POST'])
def upload_subtitle():
    """Upload an external .srt or .vtt subtitle file."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in request'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in {'.srt', '.vtt'}:
        return jsonify({'error': 'Only .srt and .vtt files are supported'}), 400

    save_path = os.path.join(SUBTITLES_DIR, file.filename)
    file.save(save_path)
    return jsonify({
        'success': True,
        'filename': file.filename,
        'message': f"Subtitle {file.filename} saved successfully!"
    })

if __name__ == '__main__':
    port = 5055
    print(f"🎬 CinePlay Server starting on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
