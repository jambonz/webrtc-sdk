import {
  JambonzClient,
  type JambonzClientOptions,
  useJambonzClient as useJambonzClientCore,
} from '@jambonz/client-sdk-core';
import { RNPlatformAdapter } from './RNPlatformAdapter';

/**
 * Create a JambonzClient configured for React Native.
 *
 * Registers WebRTC globals on first call and applies necessary
 * patches for react-native-webrtc compatibility.
 */
export function createJambonzClient(options: JambonzClientOptions): JambonzClient {
  const platform = new RNPlatformAdapter();
  platform.init();
  return new JambonzClient(options, platform);
}

/**
 * React hook to manage a React Native JambonzClient connection.
 *
 * @example
 * ```tsx
 * import { useJambonzClient, useCall } from '@jambonz/client-sdk-react-native';
 *
 * function Phone() {
 *   const client = useJambonzClient({ server, username, password });
 *   const call = useCall(client.client);
 *   // ...
 * }
 * ```
 */
export function useJambonzClient(options: JambonzClientOptions) {
  return useJambonzClientCore(options, createJambonzClient);
}

export { RNPlatformAdapter } from './RNPlatformAdapter';

// Re-export everything from core for convenience
export {
  JambonzClient,
  JambonzCall,
  JambonzAudioManager,
  useCall,
  JambonzError,
  RegistrationError,
  CallError,
  ConnectionError,
  CallState,
  CallDirection,
  ClientState,
  VERSION,
  DEFAULT_USER_AGENT,
} from '@jambonz/client-sdk-core';

export type {
  JambonzClientOptions,
  JambonzCallOptions,
  MediaStreamConstraints,
  AudioConstraints,
  AudioDevice,
  CallEndCause,
  PlatformAdapter,
  ClientEventMap,
  CallEventMap,
  UseJambonzClientReturn,
  UseCallReturn,
} from '@jambonz/client-sdk-core';
