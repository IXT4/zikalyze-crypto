// Audio utility for playing notification sounds
import { getSoundVolume, getSoundType, SoundType } from "@/hooks/useSettings";

class AlertSoundPlayer {
  private audioContext: AudioContext | null = null;
  private isPlaying = false;
  private unlocked = false;

  private getAudioContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === "closed") {
      // Use webkitAudioContext for Safari compatibility
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }
    return this.audioContext;
  }

  // Unlock audio context on first user interaction
  unlock(): void {
    if (this.unlocked) return;
    
    try {
      const ctx = this.getAudioContext();
      
      // Create and play a silent buffer to unlock
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      
      // Resume if suspended
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      
      this.unlocked = true;
      console.log("Audio context unlocked");
    } catch (error) {
      console.error("Error unlocking audio context:", error);
    }
  }

  // Play alert sound based on selected type
  async playAlertSound(overrideType?: SoundType): Promise<void> {
    // Prevent overlapping sounds
    if (this.isPlaying) return;
    this.isPlaying = true;

    const soundType = overrideType || getSoundType();

    try {
      switch (soundType) {
        case "beep":
          await this.playBeepSound();
          break;
        case "bell":
          await this.playBellSound();
          break;
        case "chime":
        default:
          await this.playChimeSound();
          break;
      }
    } catch (error) {
      console.error("Error playing alert sound:", error);
      this.isPlaying = false;
    }
  }

  // Chime sound - pleasant two-tone arpeggio
  private async playChimeSound(): Promise<void> {
    try {
      const ctx = this.getAudioContext();
      
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const now = ctx.currentTime;
      const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 (major chord)
      
      frequencies.forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(freq, now);

        const startTime = now + index * 0.08;
        const duration = 0.3;

        const volume = getSoundVolume();
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      });

      // Second higher chime
      setTimeout(() => {
        this.playChimeSecondPart(ctx);
      }, 300);

      setTimeout(() => {
        this.isPlaying = false;
      }, 800);
    } catch (error) {
      console.error("Error playing chime sound:", error);
      this.isPlaying = false;
    }
  }

  private playChimeSecondPart(ctx: AudioContext): void {
    try {
      const now = ctx.currentTime;
      const frequencies = [783.99, 987.77, 1174.66]; // G5, B5, D6

      frequencies.forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(freq, now);

        const startTime = now + index * 0.06;
        const duration = 0.4;

        const volume = getSoundVolume();
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume * 0.85, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      });
    } catch (error) {
      console.error("Error playing chime second part:", error);
    }
  }

  // Beep sound - simple alert beep
  private async playBeepSound(): Promise<void> {
    try {
      const ctx = this.getAudioContext();
      
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const now = ctx.currentTime;
      const volume = getSoundVolume();

      // First beep
      this.createBeepTone(ctx, 880, now, 0.15, volume);
      // Short pause, then second beep
      this.createBeepTone(ctx, 880, now + 0.2, 0.15, volume);
      // Third beep slightly higher
      this.createBeepTone(ctx, 1046.5, now + 0.4, 0.2, volume);

      setTimeout(() => {
        this.isPlaying = false;
      }, 700);
    } catch (error) {
      console.error("Error playing beep sound:", error);
      this.isPlaying = false;
    }
  }

  private createBeepTone(ctx: AudioContext, freq: number, startTime: number, duration: number, volume: number): void {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(freq, startTime);

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume * 0.6, startTime + 0.01);
    gainNode.gain.setValueAtTime(volume * 0.6, startTime + duration - 0.02);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }

  // Bell sound - resonant bell tone
  private async playBellSound(): Promise<void> {
    try {
      const ctx = this.getAudioContext();
      
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const now = ctx.currentTime;
      const volume = getSoundVolume();

      // Bell fundamental + harmonics
      const harmonics = [
        { freq: 440, amp: 1.0 },
        { freq: 880, amp: 0.6 },
        { freq: 1320, amp: 0.3 },
        { freq: 1760, amp: 0.15 },
      ];

      harmonics.forEach(({ freq, amp }) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(freq, now);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * amp, now + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

        oscillator.start(now);
        oscillator.stop(now + 1.0);
      });

      // Second bell hit
      setTimeout(() => {
        this.playBellHit(ctx, 523.25);
      }, 500);

      setTimeout(() => {
        this.isPlaying = false;
      }, 1600);
    } catch (error) {
      console.error("Error playing bell sound:", error);
      this.isPlaying = false;
    }
  }

  private playBellHit(ctx: AudioContext, baseFreq: number): void {
    try {
      const now = ctx.currentTime;
      const volume = getSoundVolume();

      const harmonics = [
        { freq: baseFreq, amp: 1.0 },
        { freq: baseFreq * 2, amp: 0.5 },
        { freq: baseFreq * 3, amp: 0.25 },
      ];

      harmonics.forEach(({ freq, amp }) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(freq, now);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * amp * 0.8, now + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        oscillator.start(now);
        oscillator.stop(now + 0.8);
      });
    } catch (error) {
      console.error("Error playing bell hit:", error);
    }
  }

  // Play a simple beep for testing
  async playTestSound(soundType?: SoundType): Promise<void> {
    // Also unlock when testing
    this.unlock();
    await this.playAlertSound(soundType);
  }
}

// Singleton instance
export const alertSound = new AlertSoundPlayer();

// Auto-unlock on first user interaction
if (typeof window !== "undefined") {
  const unlockAudio = () => {
    alertSound.unlock();
    // Remove listeners after first interaction
    document.removeEventListener("click", unlockAudio);
    document.removeEventListener("touchstart", unlockAudio);
    document.removeEventListener("keydown", unlockAudio);
  };
  
  document.addEventListener("click", unlockAudio, { once: true });
  document.addEventListener("touchstart", unlockAudio, { once: true });
  document.addEventListener("keydown", unlockAudio, { once: true });
}