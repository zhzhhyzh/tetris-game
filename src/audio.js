// Audio engine using Web Audio API for BGM and SFX
export class Audio {
  constructor() {
    this.actx = null;
    this.muted = false;
    this.bgmPlaying = false;
    this.tempo = 1.0;
    this.bgmSource = null;
    this.bgmBuffer = null;
    this.gainNode = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.actx = new (window.AudioContext || window.webkitAudioContext)();
    this.gainNode = this.actx.createGain();
    this.gainNode.connect(this.actx.destination);
    this.gainNode.gain.value = 0.4;
    this.initialized = true;
  }

  // Ensure audio context is running (browsers suspend it until user gesture)
  _ensureResumed() {
    if (!this.initialized) this.init();
    if (this.actx && this.actx.state === 'suspended') {
      this.actx.resume();
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.gainNode) {
      this.gainNode.gain.value = muted ? 0 : 0.4;
    }
  }

  setTempo(level) {
    this.tempo = 1 + (level - 1) * 0.05;
    if (this.bgmSource) {
      this.bgmSource.playbackRate.value = this.tempo;
    }
  }

  // Generate BGM procedurally (Korobeiniki-inspired melody)
  async startBGM() {
    this._ensureResumed();
    if (this.bgmPlaying) return;

    if (!this.bgmBuffer) {
      this.bgmBuffer = this._generateBGM();
    }

    this.bgmSource = this.actx.createBufferSource();
    this.bgmSource.buffer = this.bgmBuffer;
    this.bgmSource.loop = true;
    this.bgmSource.playbackRate.value = this.tempo;
    this.bgmSource.connect(this.gainNode);
    this.bgmSource.start();
    this.bgmPlaying = true;
  }

  stopBGM() {
    if (this.bgmSource) {
      try { this.bgmSource.stop(); } catch (e) {}
      this.bgmSource = null;
    }
    this.bgmPlaying = false;
  }

  _generateBGM() {
    const sr = this.actx.sampleRate;
    const bpm = 140;
    const beatLen = (60 / bpm) * sr;

    // Korobeiniki melody (simplified) - note frequencies
    const melody = [
      [659.25, 1], [493.88, 0.5], [523.25, 0.5], [587.33, 1], [523.25, 0.5], [493.88, 0.5],
      [440.00, 1], [440.00, 0.5], [523.25, 0.5], [659.25, 1], [587.33, 0.5], [523.25, 0.5],
      [493.88, 1], [493.88, 0.5], [523.25, 0.5], [587.33, 1], [659.25, 1],
      [523.25, 1], [440.00, 1], [440.00, 1], [0, 0.5],
      [587.33, 1], [698.46, 0.5], [880.00, 1], [783.99, 0.5], [698.46, 0.5],
      [659.25, 1.5], [523.25, 0.5], [659.25, 1], [587.33, 0.5], [523.25, 0.5],
      [493.88, 1], [493.88, 0.5], [523.25, 0.5], [587.33, 1], [659.25, 1],
      [523.25, 1], [440.00, 1], [440.00, 1], [0, 1],
    ];

    let totalBeats = 0;
    for (const [, dur] of melody) totalBeats += dur;
    const totalSamples = Math.ceil(totalBeats * beatLen);
    const buffer = this.actx.createBuffer(1, totalSamples, sr);
    const data = buffer.getChannelData(0);

    let pos = 0;
    for (const [freq, dur] of melody) {
      const len = Math.floor(dur * beatLen);
      for (let i = 0; i < len && pos < totalSamples; i++, pos++) {
        if (freq > 0) {
          const t = i / sr;
          const envelope = Math.min(1, (len - i) / (sr * 0.05)) * Math.min(1, i / (sr * 0.005));
          // Square-ish wave for retro feel
          const wave = Math.sin(2 * Math.PI * freq * t) > 0 ? 0.3 : -0.3;
          data[pos] = wave * envelope * 0.5;
        }
      }
    }

    return buffer;
  }

  // SFX generators
  playMove() {
    this._playTone(200, 0.05, 0.1, 'sine');
  }

  playRotate() {
    this._playTone(400, 0.06, 0.15, 'sine');
  }

  playDrop() {
    this._playNoise(0.08, 0.3);
    this._playTone(100, 0.1, 0.25, 'sine');
  }

  playLock() {
    // Satisfying merge/thud sound: low thump + mid chime
    this._playTone(90, 0.15, 0.35, 'sine');
    this._playNoise(0.08, 0.25);
    // Bright chime on top
    setTimeout(() => this._playTone(520, 0.1, 0.2, 'sine'), 30);
    setTimeout(() => this._playTone(680, 0.08, 0.15, 'sine'), 60);
  }

  playLineClear(combo = 0) {
    // Rising pitch with combo - louder and more dramatic
    const base = 500 + combo * 80;
    this._playTone(base, 0.2, 0.35, 'square');
    setTimeout(() => this._playTone(base * 1.25, 0.15, 0.3, 'square'), 80);
    setTimeout(() => this._playTone(base * 1.5, 0.1, 0.25, 'sine'), 160);
  }

  playTetris() {
    // Big 4-line clear fanfare!
    [0, 80, 160, 240].forEach((delay, i) => {
      setTimeout(() => this._playTone(600 + i * 150, 0.15, 0.35, 'square'), delay);
    });
    setTimeout(() => this._playTone(1200, 0.2, 0.3, 'sine'), 320);
  }

  playHold() {
    this._playTone(300, 0.04, 0.12, 'sine');
  }

  playLevelUp() {
    [0, 100, 200].forEach((delay, i) => {
      setTimeout(() => this._playTone(500 + i * 200, 0.1, 0.2, 'sine'), delay);
    });
  }

  playGameOver() {
    [0, 200, 400].forEach((delay, i) => {
      setTimeout(() => this._playTone(300 - i * 80, 0.2, 0.2, 'sawtooth'), delay);
    });
  }

  _playTone(freq, duration, vol = 0.2, type = 'sine') {
    this._ensureResumed();
    if (!this.initialized) return;
    const osc = this.actx.createOscillator();
    const gain = this.actx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = vol;
    gain.gain.exponentialRampToValueAtTime(0.001, this.actx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.gainNode);
    osc.start();
    osc.stop(this.actx.currentTime + duration + 0.01);
  }

  _playNoise(duration, vol = 0.1) {
    this._ensureResumed();
    if (!this.initialized) return;
    const bufSize = this.actx.sampleRate * duration;
    const buf = this.actx.createBuffer(1, bufSize, this.actx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * vol;
    const src = this.actx.createBufferSource();
    src.buffer = buf;
    const gain = this.actx.createGain();
    gain.gain.value = vol;
    gain.gain.exponentialRampToValueAtTime(0.001, this.actx.currentTime + duration);
    src.connect(gain);
    gain.connect(this.gainNode);
    src.start();
  }
}
