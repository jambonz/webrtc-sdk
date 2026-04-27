import {
  JambonzClient,
  type JambonzClientOptions,
  useJambonzClient as useJambonzClientCore,
} from '@jambonz/client-sdk-core';
import { WebPlatformAdapter } from './WebPlatformAdapter';

/**
 * Create a JambonzClient configured for the web browser.
 *
 * @example
 * ```ts
 * import { createJambonzClient } from '@jambonz/client-sdk-web';
 *
 * const client = createJambonzClient({
 *   server: 'wss://sbc.jambonz.org:8443',
 *   username: 'user1',
 *   password: 'pass123',
 * });
 *
 * await client.connect();
 * const call = client.call('+84123456789');
 * ```
 */
export function createJambonzClient(options: JambonzClientOptions): JambonzClient {
  const platform = new WebPlatformAdapter();
  const client = new JambonzClient(options, platform);

  if (options.hangupOnUnload !== false && typeof window !== 'undefined') {
    // Best-effort: send BYE for any active calls before the page tears down.
    // The WebSocket send buffer is flushed synchronously, so the BYE has a
    // good chance of reaching the SBC even though the page is unloading.
    const onUnload = () => {
      for (const call of client.calls.values()) {
        call.hangup();
      }
    };
    window.addEventListener('pagehide', onUnload);
    window.addEventListener('beforeunload', onUnload);
  }

  return client;
}

/**
 * React hook to manage a web JambonzClient connection.
 *
 * @example
 * ```tsx
 * import { useJambonzClient, useCall } from '@jambonz/client-sdk-web';
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

export { WebPlatformAdapter } from './WebPlatformAdapter';

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
