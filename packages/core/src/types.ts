export interface JambonzClientOptions {
  /** WebSocket URL of the Jambonz SBC (e.g., wss://sbc.jambonz.org:8443) */
  server: string;
  /** SIP username for authentication */
  username: string;
  /** SIP password for authentication */
  password: string;
  /** Display name shown to the callee */
  displayName?: string;
  /** SIP realm/domain (defaults to server hostname) */
  realm?: string;
  /** Custom SIP headers to include in REGISTER */
  registerHeaders?: Record<string, string>;
  /** Auto-register on connect (default: true) */
  autoRegister?: boolean;
  /** Registration expiry in seconds (default: 300) */
  registerExpires?: number;
  /** SIP User-Agent header (default: "jambonz-webrtc-{version}") */
  userAgent?: string;
}

export interface JambonzCallOptions {
  /** Custom SIP headers to include in INVITE */
  headers?: Record<string, string>;
  /** MediaStream constraints for getUserMedia */
  mediaConstraints?: MediaStreamConstraints;
  /** RTCPeerConnection configuration (e.g. iceServers). Default: Google STUN server */
  pcConfig?: { iceServers?: Array<{ urls: string | string[]; username?: string; credential?: string }> };
  /**
   * Timeout in seconds to wait for the call to be answered.
   * If the remote party doesn't answer within this time, the call is automatically
   * terminated with a 'failed' event (reason: 'No Answer').
   * @default undefined (no timeout — wait indefinitely)
   */
  noAnswerTimeout?: number;
  /**
   * Preferred audio codecs in order of preference.
   * The SDP offer will be rewritten to prioritize these codecs.
   * Example: ['opus', 'PCMU', 'PCMA']
   * @default undefined (use browser/WebRTC default order)
   */
  preferredCodecs?: string[];
  /**
   * Enable server-side call recording.
   * Sends an X-Record-Call SIP header with the call INVITE.
   * The Jambonz server must be configured to honor this header.
   * @default false
   */
  record?: boolean;
}

export interface MediaStreamConstraints {
  audio?: boolean | AudioConstraints;
  video?: boolean;
}

export interface AudioConstraints {
  deviceId?: string;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

export enum CallState {
  Idle = 'idle',
  Ringing = 'ringing',
  Connecting = 'connecting',
  Connected = 'connected',
  Held = 'held',
  Ended = 'ended',
}

export enum CallDirection {
  Inbound = 'inbound',
  Outbound = 'outbound',
}

export enum ClientState {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Registered = 'registered',
  Reconnecting = 'reconnecting',
  Unregistered = 'unregistered',
  Error = 'error',
}

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

export interface CallEndCause {
  code: number;
  reason: string;
}
