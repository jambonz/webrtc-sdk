import type {
  PlatformAdapter,
  AudioDevice,
  MediaStreamConstraints,
} from '@jambonz/client-sdk-core';

/**
 * Web/Browser platform adapter.
 * Uses native browser WebRTC and Web Audio APIs.
 */
export class WebPlatformAdapter implements PlatformAdapter {
  private audioElement: HTMLAudioElement | null = null;
  private toneContext: AudioContext | null = null;
  private toneOscillator: OscillatorNode | null = null;
  private toneGain: GainNode | null = null;

  async getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia(constraints);
  }

  async enumerateDevices(): Promise<AudioDevice[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'audioinput' || d.kind === 'audiooutput')
      .map((d) => ({
        deviceId: d.deviceId,
        label: d.label || `${d.kind} (${d.deviceId.slice(0, 8)})`,
        kind: d.kind as 'audioinput' | 'audiooutput',
      }));
  }

  attachRemoteStream(stream: MediaStream): void {
    if (!this.audioElement) {
      this.audioElement = document.createElement('audio');
      this.audioElement.autoplay = true;
      // Hidden element, only used for audio playback
      this.audioElement.style.display = 'none';
      document.body.appendChild(this.audioElement);
    }
    this.audioElement.srcObject = stream;
  }

  detachRemoteStream(): void {
    if (this.audioElement) {
      this.audioElement.srcObject = null;
    }
  }

  async setOutputDevice(deviceId: string): Promise<void> {
    if (!this.audioElement) return;
    // setSinkId is available on most modern browsers
    const el = this.audioElement as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
    if (typeof el.setSinkId === 'function') {
      await el.setSinkId(deviceId);
    }
  }

  playTone(type: 'ringtone' | 'ringback', loop = true): void {
    this.stopTone();
    this.toneContext = new AudioContext();
    this.toneGain = this.toneContext.createGain();
    this.toneGain.gain.value = 0.15;
    this.toneGain.connect(this.toneContext.destination);

    // Ringback: 440Hz for 2s, silence 4s (US standard)
    // Ringtone: 440+480Hz for 2s, silence 4s
    const freq = type === 'ringtone' ? 480 : 440;
    this.toneOscillator = this.toneContext.createOscillator();
    this.toneOscillator.frequency.value = freq;
    this.toneOscillator.type = 'sine';
    this.toneOscillator.connect(this.toneGain);
    this.toneOscillator.start();

    if (loop) {
      // Pulse: on 2s, off 4s
      const pulse = () => {
        if (!this.toneGain) return;
        const now = this.toneContext!.currentTime;
        this.toneGain.gain.setValueAtTime(0.15, now);
        this.toneGain.gain.setValueAtTime(0, now + 2);
        this.toneGain.gain.setValueAtTime(0.15, now + 6);
      };
      pulse();
      // Re-schedule every 6s
      const interval = setInterval(() => {
        if (!this.toneContext) { clearInterval(interval); return; }
        pulse();
      }, 6000);
    }
  }

  stopTone(): void {
    if (this.toneOscillator) {
      try { this.toneOscillator.stop(); } catch { /* already stopped */ }
      this.toneOscillator = null;
    }
    if (this.toneContext) {
      this.toneContext.close();
      this.toneContext = null;
    }
    this.toneGain = null;
  }

  dispose(): void {
    this.stopTone();
    if (this.audioElement) {
      this.audioElement.srcObject = null;
      this.audioElement.remove();
      this.audioElement = null;
    }
  }
}
