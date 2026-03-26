import type {
  PlatformAdapter,
  AudioDevice,
  MediaStreamConstraints,
} from '@jambonz/client-sdk-core';

// Dynamically imported at runtime to avoid hard compile-time dependency.
let rnWebRTC: typeof import('react-native-webrtc') | null = null;

function getRNWebRTC() {
  if (!rnWebRTC) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    rnWebRTC = require('react-native-webrtc');
  }
  return rnWebRTC!;
}

// Module-level flag to ensure global patches are only applied once,
// even if multiple RNPlatformAdapter instances are created.
let globalsPatched = false;

/**
 * React Native platform adapter.
 * Uses react-native-webrtc for WebRTC APIs.
 */
export class RNPlatformAdapter implements PlatformAdapter {
  /**
   * Register WebRTC globals and apply necessary patches.
   * Safe to call multiple times — only runs once.
   */
  init(): void {
    if (globalsPatched) return;
    globalsPatched = true;

    const { registerGlobals } = getRNWebRTC();
    registerGlobals();
    this.patchIceGathering();
  }

  /**
   * react-native-webrtc embeds ICE candidates directly in the SDP but never
   * fires icecandidate or icegatheringstatechange events, and iceGatheringState
   * stays 'new'. Libraries like JsSIP wait for a null icecandidate event to
   * know gathering is complete.
   *
   * We patch RTCPeerConnection to:
   * 1. Track icecandidate listeners added via addEventListener
   * 2. After setLocalDescription resolves, fire a synthetic null icecandidate
   *    to signal that gathering is complete
   * 3. Clean up tracked listeners when the connection closes
   */
  private patchIceGathering(): void {
    const g = globalThis as any;
    const RTCPC = g.RTCPeerConnection;
    if (!RTCPC) return;

    const LISTENERS_KEY = '__iceListeners';

    // -- Patch addEventListener to track icecandidate listeners --
    const origAddEventListener = RTCPC.prototype.addEventListener;
    RTCPC.prototype.addEventListener = function (
      type: string,
      listener: any,
      ...rest: any[]
    ) {
      if (type === 'icecandidate') {
        if (!this[LISTENERS_KEY]) this[LISTENERS_KEY] = [];
        this[LISTENERS_KEY].push(listener);
      }
      return origAddEventListener.call(this, type, listener, ...rest);
    };

    // -- Patch removeEventListener to clean up tracked listeners --
    const origRemoveEventListener = RTCPC.prototype.removeEventListener;
    RTCPC.prototype.removeEventListener = function (
      type: string,
      listener: any,
      ...rest: any[]
    ) {
      if (type === 'icecandidate' && Array.isArray(this[LISTENERS_KEY])) {
        this[LISTENERS_KEY] = this[LISTENERS_KEY].filter(
          (l: any) => l !== listener,
        );
      }
      return origRemoveEventListener.call(this, type, listener, ...rest);
    };

    // -- Patch setLocalDescription to fire synthetic null icecandidate --
    const origSetLocalDesc = RTCPC.prototype.setLocalDescription;
    RTCPC.prototype.setLocalDescription = function (desc: any) {
      return origSetLocalDesc.call(this, desc).then((result: any) => {
        const pc = this;
        setTimeout(() => {
          const event = { candidate: null };
          // Fire on property-based handler
          if (typeof pc.onicecandidate === 'function') {
            pc.onicecandidate(event);
          }
          // Fire on addEventListener-based listeners
          const listeners = pc[LISTENERS_KEY];
          if (Array.isArray(listeners)) {
            for (const listener of listeners) {
              try {
                listener(event);
              } catch {
                // Ignore errors from individual listeners
              }
            }
          }
        }, 500);
        return result;
      });
    };

    // -- Patch close to clean up tracked listeners --
    const origClose = RTCPC.prototype.close;
    RTCPC.prototype.close = function () {
      delete this[LISTENERS_KEY];
      return origClose.call(this);
    };
  }

  async getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
    const { mediaDevices } = getRNWebRTC();
    const stream = await mediaDevices.getUserMedia(constraints);
    return stream as unknown as MediaStream;
  }

  async enumerateDevices(): Promise<AudioDevice[]> {
    const { mediaDevices } = getRNWebRTC();
    const devices = await mediaDevices.enumerateDevices();
    return (devices as Array<{ deviceId: string; label: string; kind: string }>)
      .filter((d) => d.kind === 'audioinput' || d.kind === 'audiooutput')
      .map((d) => ({
        deviceId: d.deviceId,
        label: d.label || d.kind,
        kind: d.kind as 'audioinput' | 'audiooutput',
      }));
  }

  async setOutputDevice(deviceId: string): Promise<void> {
    // react-native-webrtc doesn't expose setSinkId.
    // Use InCallManager or native AudioManager for speaker/earpiece toggle.
    // For now, we use the WebRTC audioSession if available.
    try {
      const webrtc = getRNWebRTC() as any;
      if (typeof webrtc.audioSession?.setCategory === 'function') {
        if (deviceId === 'speaker') {
          await webrtc.audioSession.setCategory('PlayAndRecord', 'DefaultToSpeaker');
        } else {
          await webrtc.audioSession.setCategory('PlayAndRecord', 'None');
        }
      }
    } catch {
      // audioSession may not be available in all react-native-webrtc versions
    }
  }

  attachRemoteStream(_stream: MediaStream): void {
    // React Native audio playback is handled automatically by the native WebRTC layer.
  }

  detachRemoteStream(): void {
    // No-op — audio cleanup happens when the session ends.
  }

  dispose(): void {
    // No-op — native WebRTC resources are managed by the native layer.
  }
}
