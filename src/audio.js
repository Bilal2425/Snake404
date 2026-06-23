/**
 * Snake 404 - Web Audio API Synthesized Sound Effects
 */
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.enabled = true;
  }

  /**
   * Initialize the AudioContext (must be called after user interaction)
   */
  init() {
    if (this.ctx) {
      this.resume();
      return;
    }
    
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.15, this.ctx.currentTime); // Master volume set to 15%
      this.masterGain.connect(this.ctx.destination);
      
      this.ctx.resume();
      console.log("[AUDIO] Audio Context initialized and active.");
    } catch (e) {
      console.warn("[AUDIO] Failed to initialize Web Audio API:", e);
      this.enabled = false;
    }
  }

  /**
   * Resume context if suspended by browser autoplay policy
   */
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Play a clean, positive synth beep (200 OK packet eaten)
   */
  play200() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    // Play a rising C5 to G5 note
    osc.frequency.setValueAtTime(523.25, t); // C5
    osc.frequency.exponentialRampToValueAtTime(783.99, t + 0.08); // G5

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12); // Short decay

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  /**
   * Play a glitchy, bitcrushed sweep (404 Not Found glitch activated)
   */
  play404() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    
    // We will chain a sawtooth oscillator and a lowpass filter to make it sound vintage/bitcrushed
    const osc = this.ctx.createOscillator();
    const oscMod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(100, t + 0.3); // Quick slide down

    // Frequency modulation for glitch effect
    oscMod.type = "square";
    oscMod.frequency.setValueAtTime(45, t); // LFO rate 45Hz
    modGain.gain.setValueAtTime(150, t); // Depth of modulation

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    oscMod.connect(modGain);
    modGain.connect(osc.frequency);
    
    osc.connect(gain);
    gain.connect(this.masterGain);

    oscMod.start(t);
    osc.start(t);
    
    oscMod.stop(t + 0.35);
    osc.stop(t + 0.35);
  }

  /**
   * Play a clean stereo teleport sweep (301 Redirect portal)
   */
  play301() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    osc.type = "triangle";
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.25); // Whoosh up

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    if (panner) {
      // Pan from left to right during teleport
      panner.pan.setValueAtTime(-0.8, t);
      panner.pan.linearRampToValueAtTime(0.8, t + 0.25);
      
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.masterGain);
    } else {
      osc.connect(gain);
      gain.connect(this.masterGain);
    }

    osc.start(t);
    osc.stop(t + 0.25);
  }

  /**
   * Play a harsh, static buzzer warning (403 Forbidden firewall hit)
   */
  play403() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, t); // Low grating pitch
    osc.frequency.linearRampToValueAtTime(80, t + 0.45);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.setValueAtTime(0.3, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.45);
  }

  /**
   * Play a dramatic server crash noise (500 Server Error BSOD)
   */
  play500() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(200, t);
    osc1.frequency.linearRampToValueAtTime(40, t + 0.6);

    osc2.type = "sawtooth";
    osc2.frequency.setValueAtTime(204, t); // Slight detune for chorus/beating
    osc2.frequency.linearRampToValueAtTime(44, t + 0.6);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.setValueAtTime(0.25, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    
    osc1.stop(t + 0.6);
    osc2.stop(t + 0.6);
  }

  /**
   * Play a slow, descending minor arpeggio (Game Over)
   */
  playGameOver() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const notes = [440.00, 349.23, 293.66, 220.00]; // A4 -> F4 -> D4 -> A3 (Sad descending minor)
    const noteDuration = 0.25;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t + idx * noteDuration);

      gain.gain.setValueAtTime(0, t + idx * noteDuration);
      gain.gain.linearRampToValueAtTime(0.15, t + idx * noteDuration + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * noteDuration + noteDuration * 1.5);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + idx * noteDuration);
      osc.stop(t + idx * noteDuration + noteDuration * 1.8);
    });
  }

  /**
   * Play gzip compression sound (descending high-to-low whoosh)
   */
  playGzip() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(880, t); // A5
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.15); // A3

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  /**
   * Play HTTPS shield pickup sound (chime arpeggio)
   */
  playHttps() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    
    // Play two notes in rapid succession: E5 then B5
    const freqs = [659.25, 987.77];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);

      gain.gain.setValueAtTime(0.15, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.25);
    });
  }

  /**
   * Play Cache-Control slow-mo activation sound (warping pitch modulator)
   */
  playCache() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.linearRampToValueAtTime(150, t + 0.4); // Deep pitch warp

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.4);
  }

  /**
   * Play shield breaking sound (harsh static click)
   */
  playShieldBreak() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.linearRampToValueAtTime(900, t + 0.12);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  /**
   * Play level deployment chime (upward major arpeggio E4 -> G4 -> C5 -> E5 -> G5 -> C6)
   */
  playDeploy() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const notes = [329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // E4, G4, C5, E5, G5, C6
    const duration = 0.08;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + idx * duration);

      gain.gain.setValueAtTime(0.12, t + idx * duration);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * duration + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + idx * duration);
      osc.stop(t + idx * duration + 0.3);
    });
  }

  /**
   * Play hacker script alert warning (urgent high-low siren)
   */
  playHackerAlert() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    
    // Play a repeating two-tone alert
    for (let i = 0; i < 3; i++) {
      const timeOffset = i * 0.25;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      // Oscillate between 987Hz (B5) and 659Hz (E5)
      const freq = i % 2 === 0 ? 987.77 : 659.25;
      osc.frequency.setValueAtTime(freq, t + timeOffset);

      gain.gain.setValueAtTime(0.18, t + timeOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + timeOffset + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + timeOffset);
      osc.stop(t + timeOffset + 0.22);
    }
  }

  /**
   * Play hacker script deauth/explode sound (low detuned crunch)
   */
  playHackerDeauth() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(300, t);
    osc1.frequency.linearRampToValueAtTime(60, t + 0.5);

    osc2.type = "square";
    osc2.frequency.setValueAtTime(147, t);
    osc2.frequency.linearRampToValueAtTime(40, t + 0.5);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);

    osc1.stop(t + 0.5);
    osc2.stop(t + 0.5);
  }

  /**
   * Play hacker script laser sweep sound (quick noise sweep)
   */
  playLaserSweep() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(1500, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.18);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  /**
   * Play a UI button click sound (slightly longer and clearer)
   */
  playClick() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(1000, t + 0.06);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  /**
   * Play a system boot startup chime
   */
  playBoot() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const notes = [440.00, 880.00];
    const duration = 0.08;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + idx * duration);

      gain.gain.setValueAtTime(0.15, t + idx * duration);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * duration + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + idx * duration);
      osc.stop(t + idx * duration + 0.15);
    });
  }
}

export const audio = new AudioEngine();
