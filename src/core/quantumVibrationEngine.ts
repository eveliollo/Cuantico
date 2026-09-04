/**
 * Quantum Vibration & Resonance Engine
 * Sincroniza vibración háptica cuántica (Navigator Vibrate API)
 * y resonancia acústica pura armónica (Web Audio API)
 * basada en la frecuencia cuántica f = E / h y fluctuaciones de vacío.
 */

class QuantumVibrationEngine {
  private audioCtx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private subOscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isAudioEnabled: boolean = false;
  private isHapticsEnabled: boolean = true;
  private lastHapticTime: number = 0;

  constructor() {
    // Lazy audio context init on user gesture
  }

  private initAudio() {
    if (this.audioCtx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        
        // Master Gain
        this.gainNode = this.audioCtx.createGain();
        this.gainNode.gain.setValueAtTime(0.0001, this.audioCtx.currentTime);
        this.gainNode.connect(this.audioCtx.destination);

        // Armónico Fundamental (Bohr / Resonancia Cuántica)
        this.oscillator = this.audioCtx.createOscillator();
        this.oscillator.type = 'sine';
        this.oscillator.frequency.setValueAtTime(108.0, this.audioCtx.currentTime); // Hz base
        this.oscillator.connect(this.gainNode);
        this.oscillator.start();

        // Sub-armónico de Vacío (Zitterbewegung 4D)
        this.subOscillator = this.audioCtx.createOscillator();
        this.subOscillator.type = 'triangle';
        this.subOscillator.frequency.setValueAtTime(54.0, this.audioCtx.currentTime);
        this.subOscillator.connect(this.gainNode);
        this.subOscillator.start();
      }
    } catch {
      // AudioContext might be restricted until user interaction
    }
  }

  public setAudioEnabled(enabled: boolean) {
    this.isAudioEnabled = enabled;
    if (enabled) {
      this.initAudio();
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      if (this.gainNode && this.audioCtx) {
        this.gainNode.gain.setTargetAtTime(0.06, this.audioCtx.currentTime, 0.1);
      }
    } else {
      if (this.gainNode && this.audioCtx) {
        this.gainNode.gain.setTargetAtTime(0.00001, this.audioCtx.currentTime, 0.08);
      }
    }
  }

  public getAudioEnabled(): boolean {
    return this.isAudioEnabled;
  }

  public setHapticsEnabled(enabled: boolean) {
    this.isHapticsEnabled = enabled;
  }

  public getHapticsEnabled(): boolean {
    return this.isHapticsEnabled;
  }

  /**
   * Actualiza los parámetros armónicos de vibración sonora basados en la energía y fase del sistema físico
   */
  public updateQuantumResonance(energyEv: number, phase: number, entropy: number) {
    if (!this.isAudioEnabled || !this.audioCtx || !this.gainNode || !this.oscillator || !this.subOscillator) {
      return;
    }

    try {
      const now = this.audioCtx.currentTime;
      // Frecuencia modulada entre 80 Hz y 432 Hz según energía
      const targetFreq = 100 + Math.abs(energyEv) * 18 + Math.sin(phase) * 15;
      this.oscillator.frequency.setTargetAtTime(Math.max(40, Math.min(880, targetFreq)), now, 0.05);

      // Sub-armónico modulado por entropía de entrelazamiento
      const subFreq = (targetFreq * 0.5) + (entropy * 22);
      this.subOscillator.frequency.setTargetAtTime(Math.max(20, Math.min(440, subFreq)), now, 0.05);
    } catch {
      // Ignore audio parameter errors
    }
  }

  /**
   * Dispara una vibración háptica cuántica táctil (si el dispositivo móvil/controlador lo soporta)
   */
  public triggerQuantumHapticPulse(intensity: 'micro' | 'pulse' | 'collapse' = 'micro') {
    if (!this.isHapticsEnabled || typeof navigator === 'undefined' || !navigator.vibrate) {
      return;
    }

    const now = performance.now();
    // Throttle haptics so it feels like a physical vibration, not a noisy buzzer
    if (now - this.lastHapticTime < 120 && intensity === 'micro') {
      return;
    }
    this.lastHapticTime = now;

    try {
      if (intensity === 'micro') {
        navigator.vibrate(8);
      } else if (intensity === 'pulse') {
        navigator.vibrate([15, 20, 15]);
      } else if (intensity === 'collapse') {
        navigator.vibrate([30, 40, 50, 30, 20]);
      }
    } catch {
      // Ignore vibration permissions or unsupported contexts
    }
  }

  public dispose() {
    try {
      if (this.oscillator) {
        this.oscillator.stop();
        this.oscillator.disconnect();
      }
      if (this.subOscillator) {
        this.subOscillator.stop();
        this.subOscillator.disconnect();
      }
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        this.audioCtx.close();
      }
    } catch {
      // Silent cleanup
    }
  }
}

export const quantumVibrationEngine = new QuantumVibrationEngine();
