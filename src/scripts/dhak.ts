// The real thing: a Durga Puja dhak recording (with kanshor), looped seamlessly.
// "Durga Puja Dhak Sound" by MythologyChallengerYT, Pixabay Content License
// (https://pixabay.com/sound-effects/musical-durga-puja-dhak-sound-9330/) — trimmed to a
// 40-second loop and level-matched. No attribution required; credited in the footer anyway.
// The file is fetched only on the first tap, so it costs nothing for anyone who doesn't play it.

const SRC = '/audio/dhak.mp3';
const FADE = 0.35; // seconds

export class DhakPlayer {
  private ctx: AudioContext | null = null;
  private buffer: Promise<AudioBuffer> | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;

  get playing() {
    return this.source !== null;
  }

  /** Download and decode ahead of time so the first tap starts the dhak instantly. */
  preload(): Promise<unknown> {
    return this.load().catch(() => {});
  }

  /** Quietly hold while the page is hidden (another app/tab), carry on when it's back. */
  setHidden(hidden: boolean) {
    if (!this.ctx || !this.source) return;
    void (hidden ? this.ctx.suspend() : this.ctx.resume());
  }

  private load(): Promise<AudioBuffer> {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx ??= new Ctx(); // allowed before a tap; it just starts out suspended
    this.buffer ??= fetch(SRC)
      .then((r) => r.arrayBuffer())
      .then((data) => this.ctx!.decodeAudioData(data));
    return this.buffer;
  }

  /** Start or stop. Resolves to whether it's now playing. */
  async toggle(): Promise<boolean> {
    if (this.source) {
      this.stop();
      return false;
    }
    await this.start();
    return true;
  }

  private async start() {
    // iPhones mute web audio on the silent switch unless we say this is media playback
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'playback';

    const loading = this.load();
    await this.ctx!.resume(); // must happen inside the tap, before any other await
    const buffer = await loading;
    if (!this.ctx) return;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + FADE);
    gain.connect(this.ctx.destination);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true; // sample-accurate loop, no gap between rounds
    source.connect(gain);
    source.start();
    this.source = source;
    this.gain = gain;
  }

  private stop() {
    if (!this.ctx || !this.source || !this.gain) return;
    const t = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(t);
    this.gain.gain.setValueAtTime(this.gain.gain.value, t);
    this.gain.gain.linearRampToValueAtTime(0, t + FADE);
    this.source.stop(t + FADE + 0.02);
    this.source = null;
    this.gain = null;
  }
}
