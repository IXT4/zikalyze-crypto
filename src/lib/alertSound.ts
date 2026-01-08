// Audio utility for playing notification sounds

class AlertSoundPlayer {
  private audioContext: AudioContext | null = null;
  private isPlaying = false;

  private getAudioContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === "closed") {
      // Use webkitAudioContext for Safari compatibility
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }
    return this.audioContext;
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

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
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

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  }

  // Play a simple beep for testing
  async playTestSound(): Promise<void> {
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

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
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
