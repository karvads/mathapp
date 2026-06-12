// MathQuest Audio and Speech Engine

class AudioEngine {
  constructor() {
    this.isMuted = false;
    this.audioCtx = null;
    this.speechEnabled = true;
    this.currentUtterance = null;
    
    // Load mute preference if available
    try {
      const savedMute = localStorage.getItem('mathquest_muted');
      if (savedMute !== null) {
        this.isMuted = JSON.parse(savedMute);
      }
      const savedSpeech = localStorage.getItem('mathquest_speech_enabled');
      if (savedSpeech !== null) {
        this.speechEnabled = JSON.parse(savedSpeech);
      }
    } catch (e) {
      console.warn('Could not read audio configurations:', e);
    }
  }

  // Initialize AudioContext lazily on user interaction
  initAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('mathquest_muted', JSON.stringify(this.isMuted));
    } catch (e) {}
    
    if (this.isMuted) {
      this.stopSpeaking();
    }
    return this.isMuted;
  }

  toggleSpeech() {
    this.speechEnabled = !this.speechEnabled;
    try {
      localStorage.setItem('mathquest_speech_enabled', JSON.stringify(this.speechEnabled));
    } catch (e) {}
    
    if (!this.speechEnabled) {
      this.stopSpeaking();
    }
    return this.speechEnabled;
  }

  // Synthesize a woodblock click sound
  playClick() {
    if (this.isMuted) return;
    this.initAudio();

    const ctx = this.audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.11);
  }

  // Synthesize a gorgeous, upbeat success arpeggio
  playSuccess() {
    if (this.isMuted) return;
    this.initAudio();

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    
    // Quick sweet arpeggio: C5 -> E5 -> G5 -> C6
    const notes = [523.25, 659.25, 783.99, 1046.50];
    
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteTime = now + (idx * 0.08);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.12, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.4);
    });
  }

  // Synthesize a gentle, non-aggressive double-tone buzzer (C3 and C#3 played together for dissonance)
  playIncorrect() {
    if (this.isMuted) return;
    this.initAudio();

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    
    const freqs = [130.81, 138.59]; // Dissonant low pair
    
    freqs.forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    });
  }

  // Synthesize a magical level-unlocked harp sound
  playLevelUnlocked() {
    if (this.isMuted) return;
    this.initAudio();

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    
    // Pentatonic scale arpeggio rising rapidly
    const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];
    
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteTime = now + (idx * 0.05);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.1, noteTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.6);
    });
  }

  // Speaks text using SpeechSynthesis, splitting sentences to introduce child-friendly pauses
  speak(text) {
    if (this.isMuted || !this.speechEnabled) return;
    
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this browser.');
      return;
    }

    this.stopSpeaking();

    // Split text by sentence boundary (match . ! ? followed by space or end)
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return;

    let index = 0;

    const speakNext = () => {
      if (this.isMuted || !this.speechEnabled) return;
      if (index >= sentences.length) return;

      const sentenceText = sentences[index];
      const utterance = new SpeechSynthesisUtterance(sentenceText);
      
      // Tweak properties for child friendliness: slightly slower (0.72) and warmer pitch (1.15)
      utterance.rate = 0.72; 
      utterance.pitch = 1.15;

      // Attempt to pick a high quality local English voice
      const voices = window.speechSynthesis.getVoices();
      // Search for friendly sounding voices first
      const preferredKeywords = ['child', 'junior', 'siri', 'natural', 'samantha', 'google us english', 'zira', 'flo', 'sandy'];
      let selectedVoice = null;
      
      for (const keyword of preferredKeywords) {
        selectedVoice = voices.find(v => 
          v.lang.startsWith('en') && 
          v.name.toLowerCase().includes(keyword)
        );
        if (selectedVoice) break;
      }
      
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith('en'));
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onend = () => {
        index++;
        // Add a 800ms pause after each sentence so children have time to process
        this.speechTimeout = setTimeout(speakNext, 800);
      };

      utterance.onerror = () => {
        index++;
        this.speechTimeout = setTimeout(speakNext, 100);
      };

      this.currentUtterance = utterance;
      window._activeUtterance = utterance; // Prevent garbage collection bug in Chrome
      window.speechSynthesis.resume(); // Ensure speech synthesis is active
      window.speechSynthesis.speak(utterance);
    };

    // Invoke speakNext synchronously to preserve user-gesture context for first utterance
    speakNext();
  }

  stopSpeaking() {
    if (this.speechStartTimeout) {
      clearTimeout(this.speechStartTimeout);
      this.speechStartTimeout = null;
    }
    if (this.speechTimeout) {
      clearTimeout(this.speechTimeout);
      this.speechTimeout = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.resume(); // Force resume before cancel to prevent frozen state
      window.speechSynthesis.cancel();
    }
  }
}

export const audioEngine = new AudioEngine();

// Hook window speech voice loading
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    // Cache/Warm up voices
    window.speechSynthesis.getVoices();
  };
}
