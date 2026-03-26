import type { AudioDevice, MediaStreamConstraints } from './types';

/**
 * Platform adapter interface.
 * Abstracts WebRTC and WebSocket differences between Web and React Native.
 */
export interface PlatformAdapter {
  /** Get user media (microphone) */
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;

  /** Enumerate available audio devices */
  enumerateDevices(): Promise<AudioDevice[]>;

  /** Play remote audio stream from a peer connection */
  attachRemoteStream(stream: MediaStream): void;

  /** Stop playing remote audio */
  detachRemoteStream(): void;

  /**
   * Set the audio output device.
   * - Web: uses HTMLAudioElement.setSinkId(deviceId)
   * - React Native: toggles between earpiece/speaker/bluetooth
   * @param deviceId - The device ID to route audio to, or 'speaker'/'earpiece' on RN
   */
  setOutputDevice?(deviceId: string): Promise<void>;

  /**
   * Play a tone/audio (ringtone or ringback).
   * @param type - 'ringtone' for incoming calls, 'ringback' for outgoing ringing
   * @param loop - Whether to loop the audio
   */
  playTone?(type: 'ringtone' | 'ringback', loop?: boolean): void;

  /** Stop any playing tone. */
  stopTone?(): void;

  /** Clean up resources */
  dispose(): void;
}
