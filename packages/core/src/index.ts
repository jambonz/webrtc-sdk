export { JambonzClient } from './JambonzClient';
export { JambonzCall } from './JambonzCall';
export { JambonzAudioManager } from './JambonzAudioManager';
export {
  useJambonzClient,
  useCall,
  type UseJambonzClientReturn,
  type UseCallReturn,
} from './hooks';

export { CallQualityMonitor, type CallQualityStats } from './CallQualityMonitor';
export { JambonzError, RegistrationError, CallError, ConnectionError } from './errors';
export { VERSION, DEFAULT_USER_AGENT } from './version';

export type { PlatformAdapter } from './platform';
export type { ClientEventMap, CallEventMap } from './events';

export {
  CallState,
  CallDirection,
  ClientState,
  type JambonzClientOptions,
  type JambonzCallOptions,
  type MediaStreamConstraints,
  type AudioConstraints,
  type AudioDevice,
  type CallEndCause,
} from './types';
