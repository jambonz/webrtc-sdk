import type { PlatformAdapter } from './platform';
import type { AudioDevice } from './types';

export class JambonzAudioManager {
  constructor(private readonly platform: PlatformAdapter) {}

  /** List available audio input and output devices */
  async enumerateDevices(): Promise<AudioDevice[]> {
    return this.platform.enumerateDevices();
  }

  /** List only audio input devices (microphones) */
  async getMicrophones(): Promise<AudioDevice[]> {
    const devices = await this.enumerateDevices();
    return devices.filter((d) => d.kind === 'audioinput');
  }

  /** List only audio output devices (speakers) */
  async getSpeakers(): Promise<AudioDevice[]> {
    const devices = await this.enumerateDevices();
    return devices.filter((d) => d.kind === 'audiooutput');
  }

  /**
   * Set the audio output device for call audio.
   * - Web: pass a deviceId from getSpeakers()
   * - React Native: pass 'speaker' or 'earpiece'
   * @returns false if the platform doesn't support output switching
   */
  async setOutputDevice(deviceId: string): Promise<boolean> {
    if (!this.platform.setOutputDevice) return false;
    await this.platform.setOutputDevice(deviceId);
    return true;
  }
}
