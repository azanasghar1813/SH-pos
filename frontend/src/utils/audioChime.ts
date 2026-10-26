/**
 * Synthesizes crystal-clear kitchen and token notification sounds
 * using the Web Audio API. 100% offline, zero-asset dependency.
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  /**
   * Two-tone pleasant notification chime for new orders arriving from POS
   * Frequencies: C5 (523.25Hz) -> G5 (783.99Hz)
   */
  playNewOrderChime() {
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const now = ctx.currentTime

      // First tone (C5)
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(523.25, now)
      gain1.gain.setValueAtTime(0.3, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5)

      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.5)

      // Second tone (G5)
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(783.99, now + 0.18)
      gain2.gain.setValueAtTime(0.35, now + 0.18)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8)

      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now + 0.18)
      osc2.stop(now + 0.8)
    } catch (e) {
      console.warn('Audio chime could not play:', e)
    }
  }

  /**
   * Triple celebratory bell for order marked READY for pickup
   * Frequencies: E5 (659.25Hz) -> G#5 (830.61Hz) -> B5 (987.77Hz)
   */
  playOrderReadyChime() {
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const now = ctx.currentTime
      const notes = [659.25, 830.61, 987.77]

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        const startTime = now + idx * 0.15

        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, startTime)
        gain.gain.setValueAtTime(0.35, startTime)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.7)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(startTime)
        osc.stop(startTime + 0.7)
      })
    } catch (e) {
      console.warn('Audio chime could not play:', e)
    }
  }

  /**
   * Double warning beep for orders exceeding rush duration (>10 min)
   */
  playUrgentBeep() {
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const now = ctx.currentTime
      ;[0, 0.22].forEach(offset => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(440, now + offset)
        gain.gain.setValueAtTime(0.15, now + offset)
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + offset)
        osc.stop(now + offset + 0.18)
      })
    } catch (e) {
      console.warn('Audio chime could not play:', e)
    }
  }
}

export const audioChime = new SoundSynthesizer()
