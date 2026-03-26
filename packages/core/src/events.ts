import type { JambonzCall } from './JambonzCall';
import type { CallEndCause, CallState, ClientState } from './types';

export interface ClientEventMap {
  /** Fired when SIP registration succeeds */
  registered: () => void;
  /** Fired when SIP registration is removed */
  unregistered: () => void;
  /** Fired when registration fails */
  registrationFailed: (error: Error) => void;
  /** Fired when an incoming call is received */
  incoming: (call: JambonzCall) => void;
  /** Fired when the client state changes */
  stateChanged: (state: ClientState) => void;
  /** Fired when the WebSocket connection is established */
  connected: () => void;
  /** Fired when the WebSocket connection is lost */
  disconnected: () => void;
  /** Fired when a SIP MESSAGE is received */
  message: (message: { from: string; body: string; contentType: string }) => void;
  /** Fired on error */
  error: (error: Error) => void;
}

export interface CallEventMap {
  /** Fired when the call is accepted/answered */
  accepted: () => void;
  /** Fired when the call is ringing (183/180 response) */
  progress: () => void;
  /** Fired when the call ends (normal or error) */
  ended: (cause: CallEndCause) => void;
  /** Fired when the call fails to connect */
  failed: (cause: CallEndCause) => void;
  /** Fired when call state changes */
  stateChanged: (state: CallState) => void;
  /** Fired when hold state changes */
  hold: (held: boolean) => void;
  /** Fired when mute state changes */
  mute: (muted: boolean) => void;
  /** Fired when a DTMF tone is received */
  dtmf: (tone: string) => void;
  /** Fired when a call transfer (REFER) succeeds */
  transferred: () => void;
  /** Fired when a call transfer (REFER) fails */
  transferFailed: (error: Error) => void;
  /** Fired periodically with call quality metrics (if monitoring is enabled) */
  qualityStats: (stats: import('./CallQualityMonitor').CallQualityStats) => void;
}
