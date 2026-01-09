// Audio utility for playing notification sounds
import { getSoundVolume } from "@/hooks/useSettings";

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

  // Play a success/alert chime sound
  async playAlertSound(): Promise<void> {
    // Prevent overlapping sounds
    if (this.isPlaying) return;
    this.isPlaying = true;

    try {
      const ctx = this.getAudioContext();
      
      // Resume audio context if suspended (browser autoplay policy)
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const now = ctx.currentTime;

      // Create a pleasant two-tone chime
      const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 (major chord)
      
      frequencies.forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(freq, now);

        // Stagger the notes slightly for arpeggio effect
        const startTime = now + index * 0.08;
        const duration = 0.3;

        const volume = getSoundVolume();
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      });

      // Add a second higher chime after a short pause
      setTimeout(() => {
        this.playSecondChime(ctx);
      }, 300);

      // Reset isPlaying after sound completes
      setTimeout(() => {
        this.isPlaying = false;
      }, 800);

    } catch (error) {
      console.error("Error playing alert sound:", error);
      this.isPlaying = false;
    }
  }

  private playSecondChime(ctx: AudioContext): void {
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
      console.error("Error playing second chime:", error);
    }
  }

  // Play a simple beep for testing
  async playTestSound(): Promise<void> {
    // Also unlock when testing
    this.unlock();
    
    try {
      const ctx = this.getAudioContext();
      
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(440, ctx.currentTime); // A4

      const volume = getSoundVolume();
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.2);
    } catch (error) {
      console.error("Error playing test sound:", error);
    }
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
