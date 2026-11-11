/**
 * CinePlay - Modern Cinema Player Engine
 * Handles multi-audio switching, custom subtitle rendering & sync,
 * smooth scrubbing, and full cinema keyboard navigation.
 */

class CinePlayer {
  constructor() {
    // DOM Elements
    this.container = document.getElementById('playerContainer');
    this.video = document.getElementById('videoElement');
    this.header = document.getElementById('playerHeader');
    this.controls = document.getElementById('controlsOverlay');
    this.initialPoster = document.getElementById('initialPosterOverlay');
    this.bigPlayBtn = document.getElementById('bigPlayBtn');
    
    // Header
    this.headerMovieTitle = document.getElementById('headerMovieTitle');
    this.headerMovieTags = document.getElementById('headerMovieTags');
    this.toast = document.getElementById('toastNotification');
    this.shortcutsBtn = document.getElementById('shortcutsBtn');
    this.shortcutsModal = document.getElementById('shortcutsModal');
    this.closeShortcutsBtn = document.getElementById('closeShortcutsBtn');
    this.resumeBanner = document.getElementById('resumeBanner');
    this.resumeTimeStr = document.getElementById('resumeTimeStr');
    this.btnResumeYes = document.getElementById('btnResumeYes');
    this.btnResumeNo = document.getElementById('btnResumeNo');

    // Controls
    this.playPauseBtn = document.getElementById('playPauseBtn');
    this.playIcon = document.getElementById('playIcon');
    this.pauseIcon = document.getElementById('pauseIcon');
    this.rewindBtn = document.getElementById('rewindBtn');
    this.forwardBtn = document.getElementById('forwardBtn');
    this.volumeBtn = document.getElementById('volumeBtn');
    this.volHighIcon = document.getElementById('volHighIcon');
    this.volMuteIcon = document.getElementById('volMuteIcon');
    this.volumeSlider = document.getElementById('volumeSlider');
    this.currentTimeDisplay = document.getElementById('currentTimeDisplay');
    this.totalDurationDisplay = document.getElementById('totalDurationDisplay');

    // Timeline
    this.timelineContainer = document.getElementById('timelineContainer');
    this.timelineTrack = document.getElementById('timelineTrack');
    this.timelineBuffer = document.getElementById('timelineBuffer');
    this.timelineProgress = document.getElementById('timelineProgress');
    this.timelineHandle = document.getElementById('timelineHandle');
    this.timelineHoverTime = document.getElementById('timelineHoverTime');

    // Audio Popover
    this.audioMenuBtn = document.getElementById('audioMenuBtn');
    this.audioPopover = document.getElementById('audioPopover');
    this.audioTracksList = document.getElementById('audioTracksList');
    this.activeAudioLabel = document.getElementById('activeAudioLabel');
    this.audioCountBadge = document.getElementById('audioCountBadge');

    // Subtitles Popover & Overlay
    this.subtitlesMenuBtn = document.getElementById('subtitlesMenuBtn');
    this.subtitlesPopover = document.getElementById('subtitlesPopover');
    this.subtitlesList = document.getElementById('subtitlesList');
    this.activeSubtitleLabel = document.getElementById('activeSubtitleLabel');
    this.subActiveDot = document.getElementById('subActiveDot');
    this.subtitleLayer = document.getElementById('subtitleLayer');
    this.subtitleText = document.getElementById('subtitleText');
    this.uploadSubBtn = document.getElementById('uploadSubBtn');
    this.subFileInput = document.getElementById('subFileInput');
    this.syncMinusBtn = document.getElementById('syncMinusBtn');
    this.syncPlusBtn = document.getElementById('syncPlusBtn');
    this.syncValDisplay = document.getElementById('syncValDisplay');
    this.sizeChips = document.querySelectorAll('.size-chip');

    // Speed & Screen
    this.speedMenuBtn = document.getElementById('speedMenuBtn');
    this.speedPopover = document.getElementById('speedPopover');
    this.speedLabel = document.getElementById('speedLabel');
    this.speedOpts = document.querySelectorAll('.speed-opt');
    this.pipBtn = document.getElementById('pipBtn');
    this.fullscreenBtn = document.getElementById('fullscreenBtn');
    this.fullscreenEnterIcon = document.getElementById('fullscreenEnterIcon');
    this.fullscreenExitIcon = document.getElementById('fullscreenExitIcon');

    // Feedback & Buffering
    this.bufferingSpinner = document.getElementById('bufferingSpinner');
    this.centerFeedback = document.getElementById('centerFeedback');
    this.feedbackIcon = document.getElementById('feedbackIcon');
    this.dragDropZone = document.getElementById('dragDropZone');

    // State
    this.movieInfo = null;
    this.currentFile = '';
    this.totalDuration = 0;
    this.currentOffset = 0.0;
    this.currentAudioIndex = 1;
    this.activeSubtitle = null; // null = off, or subtitle object
    this.subtitleCues = [];
    this.subtitleOffset = 0.0;
    this.playbackSpeed = 1.0;
    this.isScrubbing = false;
    this.controlsTimer = null;
    this.toastTimer = null;
    this.lastSavedTime = 0;

    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadMovieData();
  }

  // --- API & Initial Loading ---
  async loadMovieData() {
    try {
      this.showSpinner(true);
      const res = await fetch('/api/movie_info');
      if (!res.ok) throw new Error('Failed to load movie info');
      this.movieInfo = await res.json();
      this.currentFile = this.movieInfo.filename;
      this.totalDuration = this.movieInfo.duration || 0;

      // Update UI Header & Poster
      this.headerMovieTitle.textContent = this.movieInfo.title || this.currentFile;
      document.getElementById('posterTitle').textContent = this.movieInfo.title || this.currentFile;
      
      const resLabel = this.movieInfo.video?.height ? `${this.movieInfo.video.height}p` : '1080p';
      const audioCount = this.movieInfo.audio_tracks ? this.movieInfo.audio_tracks.length : 0;
      const metaStr = `${resLabel} • ${this.formatTime(this.totalDuration)} • ${audioCount} Audio Tracks`;
      this.headerMovieTags.textContent = metaStr;
      document.getElementById('posterMeta').textContent = metaStr;
      this.totalDurationDisplay.textContent = this.formatTime(this.totalDuration);

      // Populate Audio Tracks
      this.buildAudioMenu();

      // Populate Subtitle Tracks
      this.buildSubtitlesMenu();

      // Check Saved Resume Position
      const savedTime = parseFloat(localStorage.getItem(`cineplay_pos_${this.currentFile}`) || 0);
      if (savedTime > 30 && savedTime < this.totalDuration - 60) {
        this.resumeTimeStr.textContent = this.formatTime(savedTime);
        this.resumeBanner.style.display = 'block';
        this.btnResumeYes.onclick = () => {
          this.resumeBanner.style.display = 'none';
          this.startPlayback(savedTime);
        };
        this.btnResumeNo.onclick = () => {
          this.resumeBanner.style.display = 'none';
          this.startPlayback(0);
        };
      }

      this.showSpinner(false);
    } catch (err) {
      console.warn('Backend API not reachable (running in Web Mode / Vercel):', err);
      this.initWebPlayerMode();
      this.showSpinner(false);
    }
  }

  initWebPlayerMode() {
    this.headerMovieTitle.textContent = 'CinePlay Cinema Player';
    document.getElementById('posterTitle').textContent = 'CinePlay Cinema Player';
    document.getElementById('posterMeta').textContent = 'Select any video file or stream demo with full subtitle & playback controls';
    document.getElementById('posterBadge').textContent = 'WEB PLAYER READY';
    
    this.bigPlayBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor" style="width:22px;height:22px;"><path d="M8 5v14l11-7z"/></svg>
      <span>Play Demo Stream</span>
    `;
    this.bigPlayBtn.onclick = () => this.loadDemoVideo();

    const chooseBtn = document.getElementById('chooseFileBtn');
    const fileInput = document.getElementById('videoFileInput');
    if (chooseBtn && fileInput) {
      chooseBtn.onclick = () => fileInput.click();
      fileInput.onchange = (e) => {
        if (e.target.files.length > 0) {
          this.loadLocalVideoFile(e.target.files[0]);
        }
      };
    }

    // Default audio label in web mode
    this.activeAudioLabel.textContent = 'Audio Track';
    this.audioTracksList.innerHTML = '<div class="menu-item active"><span>Default Audio Track</span><span class="item-check">✓</span></div>';
  }

  loadLocalVideoFile(file) {
    this.currentFile = file.name;
    this.headerMovieTitle.textContent = file.name;
    this.initialPoster.classList.add('hidden');
    this.showSpinner(true);

    const fileUrl = URL.createObjectURL(file);
    this.video.src = fileUrl;
    this.video.onloadedmetadata = () => {
      this.totalDuration = this.video.duration;
      this.totalDurationDisplay.textContent = this.formatTime(this.totalDuration);
      this.showSpinner(false);
      this.video.play().then(() => this.updatePlayPauseUI(true));
      this.showToast(`Loaded: ${file.name}`);
    };
  }

  loadDemoVideo() {
    this.currentFile = 'Tears of Steel (Demo)';
    this.headerMovieTitle.textContent = 'Tears of Steel (Demo Stream)';
    this.initialPoster.classList.add('hidden');
    this.showSpinner(true);

    // Reliable Google public sample mp4
    this.video.src = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';
    this.video.onloadedmetadata = () => {
      this.totalDuration = this.video.duration;
      this.totalDurationDisplay.textContent = this.formatTime(this.totalDuration);
      this.showSpinner(false);
      this.video.play().then(() => this.updatePlayPauseUI(true));
      this.showToast('Playing Demo Stream');
    };
  }

  buildAudioMenu() {
    const tracks = this.movieInfo.audio_tracks || [];
    this.audioTracksList.innerHTML = '';
    this.audioCountBadge.textContent = `${tracks.length} Tracks`;

    if (tracks.length === 0) {
      this.audioTracksList.innerHTML = '<div class="menu-item" style="opacity:0.6">No audio tracks detected</div>';
      return;
    }

    // Default to first track or track marked default
    const def = tracks.find(t => t.is_default) || tracks[0];
    this.currentAudioIndex = def.index;
    this.activeAudioLabel.textContent = `${def.flag} ${def.language_name}`;

    tracks.forEach(t => {
      const item = document.createElement('div');
      item.className = `menu-item ${t.index === this.currentAudioIndex ? 'active' : ''}`;
      item.innerHTML = `
        <span>${t.flag} ${t.language_name} <small style="opacity:0.6;margin-left:4px;">(${t.channel_layout})</small></span>
        <span class="item-check">✓</span>
      `;
      item.addEventListener('click', () => {
        this.switchAudioTrack(t.index, `${t.flag} ${t.language_name}`);
        this.closeAllPopovers();
      });
      this.audioTracksList.appendChild(item);
    });
  }

  buildSubtitlesMenu() {
    const embedded = this.movieInfo.embedded_subtitles || [];
    const external = this.movieInfo.external_subtitles || [];
    this.subtitlesList.innerHTML = '';

    // "Off" option
    const offItem = document.createElement('div');
    offItem.className = `menu-item ${this.activeSubtitle === null ? 'active' : ''}`;
    offItem.innerHTML = `<span>Off (Subtitles Disabled)</span><span class="item-check">✓</span>`;
    offItem.addEventListener('click', () => {
      this.disableSubtitles();
      this.closeAllPopovers();
    });
    this.subtitlesList.appendChild(offItem);

    // Embedded Subtitles
    if (embedded.length > 0) {
      const header = document.createElement('div');
      header.className = 'popover-header';
      header.style.marginTop = '6px';
      header.textContent = 'Embedded Tracks';
      this.subtitlesList.appendChild(header);

      embedded.forEach(s => {
        const item = document.createElement('div');
        const isActive = this.activeSubtitle && this.activeSubtitle.type === 'embedded' && this.activeSubtitle.index === s.index;
        item.className = `menu-item ${isActive ? 'active' : ''}`;
        item.innerHTML = `<span>${s.display_name}</span><span class="item-check">✓</span>`;
        item.addEventListener('click', () => {
          this.setSubtitleTrack(s);
          this.closeAllPopovers();
        });
        this.subtitlesList.appendChild(item);
      });
    }

    // External Subtitles
    if (external.length > 0) {
      const header = document.createElement('div');
      header.className = 'popover-header';
      header.style.marginTop = '6px';
      header.textContent = 'External Files';
      this.subtitlesList.appendChild(header);

      external.forEach(s => {
        const item = document.createElement('div');
        const isActive = this.activeSubtitle && this.activeSubtitle.type === 'external' && this.activeSubtitle.filename === s.filename;
        item.className = `menu-item ${isActive ? 'active' : ''}`;
        item.innerHTML = `<span>${s.display_name}</span><span class="item-check">✓</span>`;
        item.addEventListener('click', () => {
          this.setSubtitleTrack(s);
          this.closeAllPopovers();
        });
        this.subtitlesList.appendChild(item);
      });
    }

    // Update active label
    if (this.activeSubtitle) {
      this.activeSubtitleLabel.textContent = this.activeSubtitle.language_name || 'Subtitles';
      this.subActiveDot.classList.add('active');
    } else {
      this.activeSubtitleLabel.textContent = 'Subtitles';
      this.subActiveDot.classList.remove('active');
    }
  }

  // --- Playback Management ---
  startPlayback(offset = 0) {
    this.initialPoster.classList.add('hidden');
    this.seekTo(offset);
  }

  getVideoStreamUrl(offset, audioIdx) {
    return `/api/stream?file=${encodeURIComponent(this.currentFile)}&audio=${audioIdx}&offset=${offset.toFixed(2)}&_t=${Date.now()}`;
  }

  seekTo(targetTime) {
    targetTime = Math.max(0, Math.min(this.totalDuration, targetTime));
    this.currentOffset = targetTime;
    this.showSpinner(true);

    const streamUrl = this.getVideoStreamUrl(this.currentOffset, this.currentAudioIndex);
    this.video.src = streamUrl;
    this.video.playbackRate = this.playbackSpeed;

    const playPromise = this.video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.updatePlayPauseUI(true);
          this.showSpinner(false);
        })
        .catch(err => {
          console.warn('Autoplay prevented or stream reset:', err);
          this.updatePlayPauseUI(false);
          this.showSpinner(false);
        });
    }
  }

  togglePlayPause() {
    if (this.video.paused) {
      this.video.play().then(() => this.updatePlayPauseUI(true));
      this.showFeedback('play');
    } else {
      this.video.pause();
      this.updatePlayPauseUI(false);
      this.showFeedback('pause');
    }
  }

  updatePlayPauseUI(isPlaying) {
    if (isPlaying) {
      this.playIcon.style.display = 'none';
      this.pauseIcon.style.display = 'block';
    } else {
      this.playIcon.style.display = 'block';
      this.pauseIcon.style.display = 'none';
    }
  }

  switchAudioTrack(audioIndex, label) {
    if (this.currentAudioIndex === audioIndex) return;
    const currentAbsTime = this.getCurrentAbsoluteTime();
    this.currentAudioIndex = audioIndex;
    this.activeAudioLabel.textContent = label;
    this.showToast(`Audio: ${label}`);
    this.buildAudioMenu(); // refresh checkmark
    this.seekTo(currentAbsTime);
  }

  cycleAudioTrack() {
    const tracks = this.movieInfo?.audio_tracks || [];
    if (tracks.length <= 1) return;
    const currIdx = tracks.findIndex(t => t.index === this.currentAudioIndex);
    const nextIdx = (currIdx + 1) % tracks.length;
    const next = tracks[nextIdx];
    this.switchAudioTrack(next.index, `${next.flag} ${next.language_name}`);
  }

  // --- Subtitle Engine ---
  async setSubtitleTrack(subObj) {
    this.activeSubtitle = subObj;
    this.buildSubtitlesMenu();
    this.showToast(`Subtitles: ${subObj.display_name}`);

    try {
      let vttUrl = '';
      if (subObj.type === 'embedded') {
        vttUrl = `/api/subtitle/embedded?file=${encodeURIComponent(this.currentFile)}&track=${subObj.index}`;
      } else {
        vttUrl = `/api/subtitle/external/${encodeURIComponent(subObj.filename)}`;
      }

      const res = await fetch(vttUrl);
      if (!res.ok) throw new Error('Failed to load subtitle content');
      const vttText = await res.text();
      this.subtitleCues = this.parseVTT(vttText);
    } catch (e) {
      console.error(e);
      this.showToast('Failed to load subtitles');
      this.disableSubtitles();
    }
  }

  disableSubtitles() {
    this.activeSubtitle = null;
    this.subtitleCues = [];
    this.subtitleText.textContent = '';
    this.buildSubtitlesMenu();
    this.showToast('Subtitles: Off');
  }

  toggleSubtitles() {
    if (this.activeSubtitle) {
      this.disableSubtitles();
    } else {
      const external = this.movieInfo?.external_subtitles || [];
      const embedded = this.movieInfo?.embedded_subtitles || [];
      const firstAvailable = external[0] || embedded[0];
      if (firstAvailable) {
        this.setSubtitleTrack(firstAvailable);
      } else {
        this.showToast('No subtitles available. Add a .srt file!');
      }
    }
  }

  parseVTT(vttText) {
    const cues = [];
    // Normalize lines
    const lines = vttText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    let i = 0;
    const timeRegex = /(?:(\d{2}):)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(?:(\d{2}):)?(\d{2}):(\d{2})[.,](\d{3})/;

    while (i < lines.length) {
      const line = lines[i].trim();
      const match = line.match(timeRegex);
      if (match) {
        const start = this.parseVTTTime(match[1], match[2], match[3], match[4]);
        const end = this.parseVTTTime(match[5], match[6], match[7], match[8]);
        i++;
        let cueText = [];
        while (i < lines.length && lines[i].trim() !== '') {
          cueText.push(lines[i]);
          i++;
        }
        cues.push({
          start,
          end,
          text: cueText.join('\n')
        });
      }
      i++;
    }
    return cues;
  }

  parseVTTTime(h, m, s, ms) {
    const hours = h ? parseInt(h, 10) : 0;
    const mins = parseInt(m, 10);
    const secs = parseInt(s, 10);
    const millis = parseInt(ms, 10);
    return hours * 3600 + mins * 60 + secs + millis / 1000;
  }

  updateSubtitleOverlay(currentTime) {
    if (!this.activeSubtitle || this.subtitleCues.length === 0) {
      this.subtitleText.textContent = '';
      return;
    }

    const adjustedTime = currentTime + this.subtitleOffset;
    const activeCue = this.subtitleCues.find(c => adjustedTime >= c.start && adjustedTime <= c.end);
    if (activeCue) {
      this.subtitleText.textContent = activeCue.text;
    } else {
      this.subtitleText.textContent = '';
    }
  }

  adjustSubtitleOffset(delta) {
    this.subtitleOffset = parseFloat((this.subtitleOffset + delta).toFixed(1));
    this.syncValDisplay.textContent = `${this.subtitleOffset >= 0 ? '+' : ''}${this.subtitleOffset.toFixed(1)}s`;
    this.showToast(`Subtitle sync: ${this.syncValDisplay.textContent}`);
  }

  setSubtitleSize(sizeKey) {
    const sizeMap = {
      small: '20px',
      medium: '26px',
      large: '34px',
      xl: '42px'
    };
    const val = sizeMap[sizeKey] || '26px';
    document.documentElement.style.setProperty('--sub-size-current', val);
    this.sizeChips.forEach(c => c.classList.toggle('active', c.dataset.size === sizeKey));
  }

  // --- Subtitle Upload & Drag-and-Drop ---
  async handleFileUpload(file) {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    try {
      this.showToast(`Uploading ${file.name}...`);
      const res = await fetch('/api/upload_subtitle', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      this.showToast(`Subtitles loaded: ${data.filename}`);
      // Refresh movie metadata to detect the new subtitle
      const infoRes = await fetch(`/api/movie_info?file=${encodeURIComponent(this.currentFile)}`);
      this.movieInfo = await infoRes.json();
      this.buildSubtitlesMenu();

      // Automatically activate uploaded subtitle
      const ext = this.movieInfo.external_subtitles.find(s => s.filename === data.filename);
      if (ext) {
        this.setSubtitleTrack(ext);
      }
    } catch (e) {
      console.error(e);
      this.showToast('Failed to upload subtitle');
    }
  }

  // --- Timeline & Progress ---
  getCurrentAbsoluteTime() {
    return this.currentOffset + (this.video.currentTime || 0);
  }

  onTimeUpdate() {
    if (this.isScrubbing) return;
    const absTime = this.getCurrentAbsoluteTime();
    this.currentTimeDisplay.textContent = this.formatTime(absTime);

    if (this.totalDuration > 0) {
      const progressPercent = Math.min(100, (absTime / this.totalDuration) * 100);
      this.timelineProgress.style.width = `${progressPercent}%`;
      this.timelineHandle.style.left = `${progressPercent}%`;
    }

    // Update Subtitles
    this.updateSubtitleOverlay(absTime);

    // Save playback position periodically
    if (Math.abs(absTime - this.lastSavedTime) > 4) {
      this.lastSavedTime = absTime;
      localStorage.setItem(`cineplay_pos_${this.currentFile}`, absTime);
    }
  }

  onVideoProgress() {
    if (!this.totalDuration || this.video.buffered.length === 0) return;
    const bufferedEnd = this.currentOffset + this.video.buffered.end(this.video.buffered.length - 1);
    const bufferedPercent = Math.min(100, (bufferedEnd / this.totalDuration) * 100);
    this.timelineBuffer.style.width = `${bufferedPercent}%`;
  }

  setupEventListeners() {
    // Big Play Button
    this.bigPlayBtn.addEventListener('click', () => this.startPlayback(0));

    // Video events
    this.video.addEventListener('timeupdate', () => this.onTimeUpdate());
    this.video.addEventListener('progress', () => this.onVideoProgress());
    this.video.addEventListener('waiting', () => this.showSpinner(true));
    this.video.addEventListener('canplay', () => this.showSpinner(false));
    this.video.addEventListener('playing', () => {
      this.showSpinner(false);
      this.updatePlayPauseUI(true);
    });
    this.video.addEventListener('pause', () => this.updatePlayPauseUI(false));
    this.video.addEventListener('click', () => this.togglePlayPause());

    // Play / Pause Button
    this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());

    // Rewind & Fast Forward (10s)
    this.rewindBtn.addEventListener('click', () => {
      this.seekTo(this.getCurrentAbsoluteTime() - 10);
      this.showFeedback('rewind');
    });
    this.forwardBtn.addEventListener('click', () => {
      this.seekTo(this.getCurrentAbsoluteTime() + 10);
      this.showFeedback('forward');
    });

    // Volume
    this.volumeSlider.addEventListener('input', (e) => {
      this.setVolume(parseFloat(e.target.value));
    });
    this.volumeBtn.addEventListener('click', () => {
      if (this.video.volume > 0) {
        this.video.muted = true;
        this.updateVolumeUI(0);
        this.showToast('Muted');
      } else {
        this.video.muted = false;
        this.setVolume(0.8);
        this.showToast('Unmuted (80%)');
      }
    });

    // Timeline Scrubbing & Hover
    this.timelineContainer.addEventListener('mousemove', (e) => {
      const rect = this.timelineTrack.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const hoverSecs = pos * this.totalDuration;
      this.timelineHoverTime.textContent = this.formatTime(hoverSecs);
      this.timelineHoverTime.style.left = `${pos * 100}%`;
    });

    const handleSeek = (e) => {
      const rect = this.timelineTrack.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const targetTime = pos * this.totalDuration;
      this.timelineProgress.style.width = `${pos * 100}%`;
      this.timelineHandle.style.left = `${pos * 100}%`;
      this.currentTimeDisplay.textContent = this.formatTime(targetTime);
      this.seekTo(targetTime);
    };

    this.timelineContainer.addEventListener('mousedown', (e) => {
      this.isScrubbing = true;
      handleSeek(e);
      const onMouseMove = (moveEvent) => {
        if (this.isScrubbing) handleSeek(moveEvent);
      };
      const onMouseUp = () => {
        this.isScrubbing = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    // Popovers
    this.audioMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePopover(this.audioPopover);
    });
    this.subtitlesMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePopover(this.subtitlesPopover);
    });
    this.speedMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePopover(this.speedPopover);
    });

    document.addEventListener('click', () => this.closeAllPopovers());

    // Speed options
    this.speedOpts.forEach(opt => {
      opt.addEventListener('click', () => {
        const speed = parseFloat(opt.dataset.speed);
        this.setSpeed(speed);
        this.closeAllPopovers();
      });
    });

    // Subtitle upload button
    this.uploadSubBtn.addEventListener('click', () => this.subFileInput.click());
    this.subFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleFileUpload(e.target.files[0]);
      }
    });

    // Subtitle Sync Buttons
    this.syncMinusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.adjustSubtitleOffset(-0.5);
    });
    this.syncPlusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.adjustSubtitleOffset(0.5);
    });

    // Subtitle Size Chips
    this.sizeChips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setSubtitleSize(chip.dataset.size);
      });
    });

    // PiP
    this.pipBtn.addEventListener('click', async () => {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (document.pictureInPictureEnabled) {
          await this.video.requestPictureInPicture();
        }
      } catch (e) {
        this.showToast('Picture-in-Picture not supported');
      }
    });

    // Fullscreen
    this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    this.video.addEventListener('dblclick', () => this.toggleFullscreen());
    document.addEventListener('fullscreenchange', () => this.onFullscreenChange());

    // Auto-hide controls
    this.container.addEventListener('mousemove', () => this.triggerControlsVisibility());
    this.container.addEventListener('mouseleave', () => {
      if (!this.video.paused) {
        this.container.classList.add('controls-hidden');
      }
    });

    // Drag and Drop Subtitles
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dragDropZone.classList.add('active');
    });
    this.dragDropZone.addEventListener('dragleave', () => {
      this.dragDropZone.classList.remove('active');
    });
    this.dragDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dragDropZone.classList.remove('active');
      if (e.dataTransfer.files.length > 0) {
        this.handleFileUpload(e.dataTransfer.files[0]);
      }
    });

    // Keyboard Shortcuts
    this.shortcutsBtn.addEventListener('click', () => {
      this.shortcutsModal.style.display = 'flex';
    });
    this.closeShortcutsBtn.addEventListener('click', () => {
      this.shortcutsModal.style.display = 'none';
    });
    this.shortcutsModal.addEventListener('click', (e) => {
      if (e.target === this.shortcutsModal) this.shortcutsModal.style.display = 'none';
    });

    window.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  handleKeyboard(e) {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    this.triggerControlsVisibility();

    switch (e.key) {
      case ' ':
      case 'k':
      case 'K':
        e.preventDefault();
        this.togglePlayPause();
        break;
      case 'ArrowLeft':
      case 'j':
      case 'J':
        e.preventDefault();
        this.seekTo(this.getCurrentAbsoluteTime() - 10);
        this.showFeedback('rewind');
        break;
      case 'ArrowRight':
      case 'l':
      case 'L':
        e.preventDefault();
        this.seekTo(this.getCurrentAbsoluteTime() + 10);
        this.showFeedback('forward');
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.setVolume(Math.min(1, this.video.volume + 0.05));
        this.showToast(`Volume: ${Math.round(this.video.volume * 100)}%`);
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.setVolume(Math.max(0, this.video.volume - 0.05));
        this.showToast(`Volume: ${Math.round(this.video.volume * 100)}%`);
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        this.video.muted = !this.video.muted;
        this.updateVolumeUI(this.video.muted ? 0 : this.video.volume);
        this.showToast(this.video.muted ? 'Muted' : 'Unmuted');
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        this.toggleFullscreen();
        break;
      case 'a':
      case 'A':
        e.preventDefault();
        this.cycleAudioTrack();
        break;
      case 'c':
      case 'C':
        e.preventDefault();
        this.toggleSubtitles();
        break;
      case '?':
        this.shortcutsModal.style.display = this.shortcutsModal.style.display === 'flex' ? 'none' : 'flex';
        break;
      default:
        // Number keys 0 - 9 for jump percentage
        if (e.key >= '0' && e.key <= '9') {
          const frac = parseInt(e.key, 10) / 10;
          this.seekTo(this.totalDuration * frac);
          this.showToast(`Jumped to ${frac * 100}%`);
        }
        break;
    }
  }

  setVolume(val) {
    val = Math.max(0, Math.min(1, val));
    this.video.volume = val;
    this.video.muted = (val === 0);
    this.updateVolumeUI(val);
  }

  updateVolumeUI(val) {
    this.volumeSlider.value = val;
    if (val === 0 || this.video.muted) {
      this.volHighIcon.style.display = 'none';
      this.volMuteIcon.style.display = 'block';
    } else {
      this.volHighIcon.style.display = 'block';
      this.volMuteIcon.style.display = 'none';
    }
  }

  setSpeed(speed) {
    this.playbackSpeed = speed;
    this.video.playbackRate = speed;
    this.speedLabel.textContent = `${speed}x`;
    this.speedOpts.forEach(o => o.classList.toggle('active', parseFloat(o.dataset.speed) === speed));
    this.showToast(`Speed: ${speed}x`);
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.container.requestFullscreen().catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  onFullscreenChange() {
    const isFull = !!document.fullscreenElement;
    this.fullscreenEnterIcon.style.display = isFull ? 'none' : 'block';
    this.fullscreenExitIcon.style.display = isFull ? 'block' : 'none';
  }

  triggerControlsVisibility() {
    this.container.classList.remove('controls-hidden');
    clearTimeout(this.controlsTimer);
    if (!this.video.paused) {
      this.controlsTimer = setTimeout(() => {
        const anyPopoverOpen = document.querySelector('.menu-popover.open');
        if (!anyPopoverOpen) {
          this.container.classList.add('controls-hidden');
        }
      }, 2500);
    }
  }

  togglePopover(popover) {
    const isOpen = popover.classList.contains('open');
    this.closeAllPopovers();
    if (!isOpen) popover.classList.add('open');
  }

  closeAllPopovers() {
    document.querySelectorAll('.menu-popover').forEach(p => p.classList.remove('open'));
  }

  showFeedback(type) {
    this.centerFeedback.classList.remove('show');
    void this.centerFeedback.offsetWidth; // trigger reflow
    if (type === 'play') {
      this.feedbackIcon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
    } else if (type === 'pause') {
      this.feedbackIcon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    } else if (type === 'rewind') {
      this.feedbackIcon.innerHTML = '<span style="font-size:24px;font-weight:700;">-10s</span>';
    } else if (type === 'forward') {
      this.feedbackIcon.innerHTML = '<span style="font-size:24px;font-weight:700;">+10s</span>';
    }
    this.centerFeedback.classList.add('show');
    setTimeout(() => this.centerFeedback.classList.remove('show'), 400);
  }

  showToast(msg) {
    this.toast.textContent = msg;
    this.toast.classList.add('active');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.classList.remove('active'), 2500);
  }

  showSpinner(show) {
    this.bufferingSpinner.classList.toggle('active', show);
  }

  formatTime(totalSeconds) {
    if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00:00';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
}

// Instantiate player on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.cinePlayer = new CinePlayer();
});
