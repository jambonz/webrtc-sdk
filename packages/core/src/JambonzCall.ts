import type { RTCSession, EndEvent, HoldEvent, IncomingDTMFEvent, OutgoingDTMFEvent } from 'jssip/lib/RTCSession';
import { EventEmitter } from 'events';
import type { CallEventMap } from './events';
import type { PlatformAdapter } from './platform';
import { CallDirection, CallState, type CallEndCause } from './types';
import { CallQualityMonitor, type CallQualityStats } from './CallQualityMonitor';

type CallEventName = keyof CallEventMap;

export class JambonzCall {
  private emitter = new EventEmitter();
  private _state: CallState = CallState.Idle;
  private _muted = false;
  private _held = false;
  private startTime: number | null = null;
  private qualityMonitor: CallQualityMonitor | null = null;

  constructor(
    private readonly session: RTCSession,
    private readonly platform: PlatformAdapter,
  ) {
    this.bindSessionEvents();
  }

  /** Unique call ID */
  get id(): string {
    return this.session.id;
  }

  /** Current call state */
  get state(): CallState {
    return this._state;
  }

  /** Call direction (inbound or outbound) */
  get direction(): CallDirection {
    return this.session.direction === 'incoming' ? CallDirection.Inbound : CallDirection.Outbound;
  }

  /** Whether the microphone is muted */
  get isMuted(): boolean {
    return this._muted;
  }

  /** Whether the call is on hold */
  get isHeld(): boolean {
    return this._held;
  }

  /** Call duration in seconds (0 if not connected) */
  get duration(): number {
    if (!this.startTime) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /** Remote identity (caller/callee SIP URI or display name) */
  get remoteIdentity(): string {
    const remote = this.session.remote_identity;
    return remote.display_name || remote.uri.toString();
  }

  /** Answer an incoming call */
  answer(): void {
    this.session.answer({
      mediaConstraints: { audio: true, video: false },
      rtcOfferConstraints: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      },
    });
  }

  /** Hang up the call */
  hangup(): void {
    try {
      this.session.terminate();
    } catch {
      // Session may already be terminated
    }
  }

  /** Place the call on hold */
  hold(): void {
    if (this._held) return;
    this.session.hold();
  }

  /** Resume a held call */
  unhold(): void {
    if (!this._held) return;
    this.session.unhold();
  }

  /** Mute the microphone */
  mute(): void {
    if (this._muted) return;
    this.session.mute({ audio: true });
    this._muted = true;
    this.emitter.emit('mute', true);
  }

  /** Unmute the microphone */
  unmute(): void {
    if (!this._muted) return;
    this.session.unmute({ audio: true });
    this._muted = false;
    this.emitter.emit('mute', false);
  }

  /** Toggle mute state */
  toggleMute(): void {
    if (this._muted) {
      this.unmute();
    } else {
      this.mute();
    }
  }

  /**
   * Send a DTMF tone.
   * @param tone - DTMF digit (0-9, A-D, #, *)
   */
  sendDTMF(tone: string): void {
    this.session.sendDTMF(tone);
  }

  /**
   * Blind transfer — transfer this call to another target.
   * The current call is replaced by a new call between the remote party
   * and the transfer target. This call ends after a successful transfer.
   *
   * @param target - SIP URI or phone number to transfer to
   * @param options - Optional SIP headers for the REFER request
   */
  transfer(target: string, options?: { headers?: Record<string, string> }): void {
    const extraHeaders = this.buildHeaders(options?.headers);
    // JsSIP's refer() returns a ReferSubscriber but types say void — cast through any
    const referSubscriber = (this.session as any).refer(target, { extraHeaders });
    this.bindReferEvents(referSubscriber);
  }

  /**
   * Attended transfer — transfer this call to another active call.
   * Both calls must be connected. The remote parties of both calls are
   * connected to each other, and both original calls end.
   *
   * @param otherCall - The other active JambonzCall to transfer to
   * @param options - Optional SIP headers for the REFER request
   */
  attendedTransfer(otherCall: JambonzCall, options?: { headers?: Record<string, string> }): void {
    const extraHeaders = this.buildHeaders(options?.headers);
    // JsSIP's refer() accepts RTCSession for attended transfers but types only allow string | URI
    const referSubscriber = (this.session as any).refer(otherCall.session, { extraHeaders });
    this.bindReferEvents(referSubscriber);
  }

  /**
   * Get a one-time snapshot of call quality metrics.
   * Returns null if the call has no active peer connection.
   */
  async getStats(): Promise<CallQualityStats | null> {
    const connection = this.session.connection as RTCPeerConnection | undefined;
    if (!connection) return null;
    const monitor = new CallQualityMonitor();
    return monitor.collect(connection);
  }

  /**
   * Start periodic call quality monitoring.
   * Emits 'qualityStats' event at the specified interval.
   * @param intervalMs - Polling interval in milliseconds (default: 2000)
   */
  startQualityMonitoring(intervalMs = 2000): void {
    this.stopQualityMonitoring();
    const connection = this.session.connection as RTCPeerConnection | undefined;
    if (!connection) return;

    this.qualityMonitor = new CallQualityMonitor();
    this.qualityMonitor.onStats((stats) => {
      this.emitter.emit('qualityStats', stats);
    });
    this.qualityMonitor.start(connection, intervalMs);
  }

  /** Stop periodic call quality monitoring. */
  stopQualityMonitoring(): void {
    if (this.qualityMonitor) {
      this.qualityMonitor.stop();
      this.qualityMonitor = null;
    }
  }

  private buildHeaders(headers?: Record<string, string>): string[] {
    if (!headers) return [];
    return Object.entries(headers).map(([key, value]) => `${key}: ${value}`);
  }

  private bindReferEvents(referSubscriber: any): void {
    referSubscriber.on('requestSucceeded', () => {
      this.emitter.emit('transferred');
    });
    referSubscriber.on('requestFailed', () => {
      this.emitter.emit('transferFailed', new Error('Transfer failed'));
    });
  }

  /** Subscribe to call events */
  on<E extends CallEventName>(event: E, listener: CallEventMap[E]): this {
    this.emitter.on(event, listener as (...args: unknown[]) => void);
    return this;
  }

  /** Unsubscribe from call events */
  off<E extends CallEventName>(event: E, listener: CallEventMap[E]): this {
    this.emitter.off(event, listener as (...args: unknown[]) => void);
    return this;
  }

  /** Subscribe to a call event once */
  once<E extends CallEventName>(event: E, listener: CallEventMap[E]): this {
    this.emitter.once(event, listener as (...args: unknown[]) => void);
    return this;
  }

  private setState(state: CallState): void {
    this._state = state;
    this.emitter.emit('stateChanged', state);
  }

  private bindSessionEvents(): void {
    this.session.on('progress', () => {
      this.setState(CallState.Ringing);
      // Play ringback tone for outgoing calls
      if (this.direction === CallDirection.Outbound) {
        this.platform.playTone?.('ringback', true);
      }
      this.emitter.emit('progress');
    });

    this.session.on('accepted', () => {
      // Stop any ringing/ringback
      this.platform.stopTone?.();
      this.setState(CallState.Connected);
      this.startTime = Date.now();
      this.emitter.emit('accepted');
    });

    this.session.on('confirmed', () => {
      // Attach remote audio stream
      const connection = this.session.connection as RTCPeerConnection | undefined;
      if (connection) {
        const receivers = connection.getReceivers();
        if (receivers.length) {
          const remoteStream = new MediaStream();
          for (const receiver of receivers) {
            if (receiver.track) {
              remoteStream.addTrack(receiver.track);
            }
          }
          this.platform.attachRemoteStream(remoteStream);
        }
      }
    });

    this.session.on('ended', (data: EndEvent) => {
      const cause: CallEndCause = {
        code: 0,
        reason: data.cause,
      };
      this.handleEnd();
      this.emitter.emit('ended', cause);
    });

    this.session.on('failed', (data: EndEvent) => {
      const cause: CallEndCause = {
        code: 0,
        reason: data.cause,
      };
      this.handleEnd();
      this.emitter.emit('failed', cause);
    });

    this.session.on('hold', (_data: HoldEvent) => {
      this._held = true;
      this.setState(CallState.Held);
      this.emitter.emit('hold', true);
    });

    this.session.on('unhold', (_data: HoldEvent) => {
      this._held = false;
      this.setState(CallState.Connected);
      this.emitter.emit('hold', false);
    });

    this.session.on('newDTMF', (data: IncomingDTMFEvent | OutgoingDTMFEvent) => {
      if ('dtmf' in data) {
        this.emitter.emit('dtmf', data.dtmf.tone);
      }
    });
  }

  private handleEnd(): void {
    this.stopQualityMonitoring();
    this.platform.stopTone?.();
    this.setState(CallState.Ended);
    this.platform.detachRemoteStream();
    this.startTime = null;
  }
}
