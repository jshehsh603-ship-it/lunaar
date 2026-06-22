'use client';

class AudioSynthesizer {
  private ctx: AudioContext | null = null;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playClick() {}

  playMatch() {}

  playMessage() {}

  playSkip() {}
}

export const audioSynth = new AudioSynthesizer();
export default audioSynth;
