// Original Raw Synthesizer for Perfect High-Performance Piano Sound

export class PianoSynth {
  private audioCtx: AudioContext | null = null;
  // Frequencies for C4 Major Scale
  private fallbackFrequencies = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25];

  public async init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  public playNote(index: number) {
    if (!this.audioCtx) return;
    
    // Resume context if needed
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const freq = this.fallbackFrequencies[index % this.fallbackFrequencies.length];
    
    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    
    // Original crisp triangle wave
    osc.type = 'triangle'; 
    osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
    
    // Perfect quick attack / smooth decay env
    gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.4, this.audioCtx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 1.0);
    
    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    
    osc.start();
    osc.stop(this.audioCtx.currentTime + 1.0);
  }
}

export const synth = new PianoSynth();
