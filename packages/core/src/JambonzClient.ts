import * as JsSIP from 'jssip';
import type { UAConfiguration, IncomingRTCSessionEvent } from 'jssip/lib/UA';
import type { RTCSession } from 'jssip/lib/RTCSession';
import type { UnRegisteredEvent } from 'jssip/lib/UA';
import { EventEmitter } from 'events';
import type { ClientEventMap } from './events';
import type { PlatformAdapter } from './platform';
import { JambonzCall } from './JambonzCall';
import { ConnectionError, RegistrationError } from './errors';
import { CallState, ClientState, type JambonzCallOptions, type JambonzClientOptions } from './types';
import { DEFAULT_USER_AGENT } from './version';

type ClientEventName = keyof ClientEventMap;

export class JambonzClient {
  private ua: InstanceType<typeof JsSIP.UA> | null = null;
  private socket: InstanceType<typeof JsSIP.WebSocketInterface> | null = null;
  private emitter = new EventEmitter();
  private _state: ClientState = ClientState.Disconnected;
  private activeCalls: Map<string, JambonzCall> = new Map();
  private closeRequested = false;

  constructor(
    private readonly options: JambonzClientOptions,
    private readonly platform: PlatformAdapter,
  ) {}

  /** Current client state */
  get state(): ClientState {
    return this._state;
  }

  /** Whether the client is registered with the SBC */
  get isRegistered(): boolean {
    return this._state === ClientState.Registered;
  }

  /** All currently active calls (connected, ringing, or held) */
  get calls(): ReadonlyMap<string, JambonzCall> {
    return this.activeCalls;
  }

  /** Number of currently active calls */
  get callCount(): number {
    return this.activeCalls.size;
  }

  /**
   * Connect to the Jambonz SBC and register.
   * Creates the JsSIP User Agent and starts it.
   */
  async connect(): Promise<void> {
    if (this.ua) {
      throw new ConnectionError('Already connected. Call disconnect() first.');
    }

    this.closeRequested = false;
    this.setState(ClientState.Connecting);

    this.socket = new JsSIP.WebSocketInterface(this.options.server);

    // Extract hostname — use URL API with regex fallback for React Native/Hermes
    let hostname: string;
    try {
      hostname = new URL(this.options.server).hostname;
    } catch {
      hostname = '';
    }
    if (!hostname) {
      // Fallback: extract hostname from wss://host:port or wss://host
      const match = this.options.server.match(/^wss?:\/\/([^/:]+)/);
      hostname = match ? match[1] : '';
    }

    const config: UAConfiguration = {
      sockets: [this.socket],
      uri: `sip:${this.options.username}@${this.options.realm ?? hostname}`,
      password: this.options.password,
      display_name: this.options.displayName,
      register: this.options.autoRegister !== false,
      register_expires: this.options.registerExpires ?? 300,
      user_agent: this.options.userAgent ?? DEFAULT_USER_AGENT,
    };

    this.ua = new JsSIP.UA(config);
    this.bindUAEvents();

    // Wait for registration (or just connection if autoRegister is false)
    // before resolving, so callers know the client is ready.
    await new Promise<void>((resolve, reject) => {
      const onRegistered = () => {
        cleanup();
        resolve();
      };
      const onConnected = () => {
        if (this.options.autoRegister === false) {
          cleanup();
          resolve();
        }
      };
      const onFailed = (data: { cause?: string }) => {
        cleanup();
        reject(new RegistrationError(data.cause ? String(data.cause) : 'Registration failed'));
      };
      const onDisconnected = () => {
        if (this.closeRequested) {
          cleanup();
          reject(new ConnectionError('Disconnected before registration'));
        }
      };

      const cleanup = () => {
        this.ua?.removeListener('registered', onRegistered);
        this.ua?.removeListener('connected', onConnected);
        this.ua?.removeListener('registrationFailed', onFailed);
        this.ua?.removeListener('disconnected', onDisconnected);
      };

      this.ua!.on('registered', onRegistered);
      this.ua!.on('connected', onConnected);
      this.ua!.on('registrationFailed', onFailed);
      this.ua!.on('disconnected', onDisconnected);

      this.ua!.start();
    });
  }

  /**
   * Register with the Jambonz SBC.
   * Only needed if autoRegister was set to false.
   */
  register(): void {
    if (!this.ua) {
      throw new ConnectionError('Not connected. Call connect() first.');
    }
    this.ua.register();
  }

  /** Unregister from the Jambonz SBC. */
  unregister(): void {
    if (!this.ua) return;
    this.ua.unregister();
  }

  /** Disconnect from the Jambonz SBC and clean up. */
  disconnect(): void {
    this.closeRequested = true;

    // Hang up all active calls
    for (const call of this.activeCalls.values()) {
      call.hangup();
    }
    this.activeCalls.clear();

    if (this.ua) {
      // ua.stop() gracefully unregisters and closes the WebSocket.
      // It defers transport.disconnect() if there are pending transactions,
      // so we let the 'disconnected' event do the final cleanup.
      this.ua.stop();
    } else {
      this.cleanup();
    }

    this.setState(ClientState.Disconnected);
  }

  /**
   * Make an outbound call.
   * @param target - SIP URI or phone number to call
   * @param options - Optional call options (headers, media constraints)
   */
  call(target: string, options?: JambonzCallOptions): JambonzCall {
    if (!this.ua) {
      throw new ConnectionError('Not connected. Call connect() first.');
    }

    const mediaConstraints = options?.mediaConstraints ?? { audio: true, video: false };

    const extraHeaders: string[] = [];
    if (options?.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        extraHeaders.push(`${key}: ${value}`);
      }
    }
    if (options?.record) {
      extraHeaders.push('X-Record-Call: true');
    }

    const session = this.ua.call(target, {
      mediaConstraints,
      extraHeaders,
      pcConfig: options?.pcConfig ?? {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      },
      rtcOfferConstraints: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      },
    });

    // Reorder codecs in SDP if preferred codecs are specified
    if (options?.preferredCodecs?.length) {
      const preferred = options.preferredCodecs;
      session.on('sdp', (data: { originator: string; type: string; sdp: string }) => {
        if (data.originator === 'local') {
          data.sdp = this.reorderCodecsInSdp(data.sdp, preferred);
        }
      });
    }

    const call = new JambonzCall(session, this.platform);
    this.trackCall(call);

    // Auto-terminate if not answered within timeout
    if (options?.noAnswerTimeout && options.noAnswerTimeout > 0) {
      const timer = setTimeout(() => {
        if (call.state !== CallState.Connected && call.state !== CallState.Ended) {
          call.hangup();
        }
      }, options.noAnswerTimeout * 1000);

      // Clear timeout if call is answered or ends before timeout
      call.on('accepted', () => clearTimeout(timer));
      call.on('ended', () => clearTimeout(timer));
      call.on('failed', () => clearTimeout(timer));
    }

    return call;
  }

  /**
   * Send a SIP MESSAGE (text message).
   * @param target - SIP URI or phone number to send to
   * @param body - Message body text
   * @param contentType - MIME type (default: 'text/plain')
   */
  sendMessage(target: string, body: string, contentType = 'text/plain'): void {
    if (!this.ua) {
      throw new ConnectionError('Not connected. Call connect() first.');
    }
    this.ua.sendMessage(target, body, { contentType });
  }

  /**
   * Call another registered SIP user.
   * @param username - The SIP username to call
   * @param options - Optional call options
   */
  callUser(username: string, options?: JambonzCallOptions): JambonzCall {
    return this.call(username, options);
  }

  /**
   * Take a call from a queue.
   * Jambonz routes calls prefixed with `queue-` to the named queue.
   *
   * @param queueName - Name of the queue
   * @param options - Optional call options
   */
  callQueue(queueName: string, options?: JambonzCallOptions): JambonzCall {
    return this.call(`queue-${queueName}`, options);
  }

  /**
   * Join a conference room.
   * Jambonz routes calls prefixed with `conference-` to the named conference.
   *
   * @param conferenceName - Name of the conference room
   * @param options - Optional call options
   */
  callConference(conferenceName: string, options?: JambonzCallOptions): JambonzCall {
    return this.call(`conference-${conferenceName}`, options);
  }

  /**
   * Call a Jambonz application.
   * Routes the call to a specific application by its SID.
   * Sends `X-Application-Sid` header so the SBC routes to the correct app.
   *
   * @param applicationSid - The application_sid from Jambonz
   * @param options - Optional call options
   */
  callApplication(applicationSid: string, options?: JambonzCallOptions): JambonzCall {
    const headers = {
      ...options?.headers,
      'X-Application-Sid': applicationSid,
    };
    return this.call(`app-${applicationSid}`, { ...options, headers });
  }

  /** Subscribe to client events */
  on<E extends ClientEventName>(event: E, listener: ClientEventMap[E]): this {
    this.emitter.on(event, listener as (...args: unknown[]) => void);
    return this;
  }

  /** Unsubscribe from client events */
  off<E extends ClientEventName>(event: E, listener: ClientEventMap[E]): this {
    this.emitter.off(event, listener as (...args: unknown[]) => void);
    return this;
  }

  /** Subscribe to a client event once */
  once<E extends ClientEventName>(event: E, listener: ClientEventMap[E]): this {
    this.emitter.once(event, listener as (...args: unknown[]) => void);
    return this;
  }

  private cleanup(): void {
    this.ua = null;
    this.socket = null;
    this.platform.dispose();
  }

  private setState(state: ClientState): void {
    this._state = state;
    this.emitter.emit('stateChanged', state);
  }

  private bindUAEvents(): void {
    if (!this.ua) return;

    this.ua.on('connected', () => {
      this.setState(ClientState.Connected);
      this.emitter.emit('connected');
    });

    this.ua.on('disconnected', () => {
      if (this.closeRequested) {
        // User-initiated disconnect — WebSocket is now fully closed.
        // Clean up references that were deferred from disconnect().
        this.cleanup();
        this.emitter.emit('disconnected');
        return;
      }
      // Transient WebSocket disconnect — JsSIP will auto-reconnect.
      this.setState(ClientState.Reconnecting);
      this.emitter.emit('disconnected');
    });

    this.ua.on('registered', () => {
      this.setState(ClientState.Registered);
      this.emitter.emit('registered');
    });

    this.ua.on('unregistered', () => {
      this.setState(ClientState.Unregistered);
      this.emitter.emit('unregistered');
    });

    this.ua.on('registrationFailed', (data: UnRegisteredEvent) => {
      this.setState(ClientState.Error);
      const cause = data.cause ? String(data.cause) : 'Registration failed';
      this.emitter.emit('registrationFailed', new RegistrationError(cause));
    });

    this.ua.on('newRTCSession', (data: IncomingRTCSessionEvent) => {
      if (data.originator === 'remote') {
        const call = new JambonzCall(data.session as RTCSession, this.platform);
        this.trackCall(call);
        this.emitter.emit('incoming', call);
      }
    });

    // Handle incoming SIP MESSAGEs
    this.ua.on('newMessage', (data: any) => {
      if (data.originator === 'remote' && data.request) {
        const from = data.request.from?.uri?.toString() ?? '';
        const body = data.request.body ?? '';
        const contentType = data.request.getHeader('Content-Type') ?? 'text/plain';
        this.emitter.emit('message', { from, body, contentType });
      }
    });
  }

  /**
   * Reorder audio codecs in an SDP string to prefer the specified codecs.
   * Moves the preferred codec payload types to the front of the m=audio line.
   */
  private reorderCodecsInSdp(sdp: string, preferred: string[]): string {
    const lines = sdp.split('\r\n');
    const rtpMap = new Map<string, string>(); // payload type → codec name

    // First pass: build codec map from a=rtpmap lines
    for (const line of lines) {
      const match = line.match(/^a=rtpmap:(\d+)\s+([^/]+)/);
      if (match) {
        rtpMap.set(match[1], match[2].toLowerCase());
      }
    }

    // Reorder m=audio line
    return lines
      .map((line) => {
        if (!line.startsWith('m=audio')) return line;
        const parts = line.split(' ');
        // m=audio 9 UDP/TLS/RTP/SAVPF 111 0 8 ...
        if (parts.length < 4) return line;
        const header = parts.slice(0, 3);
        const payloads = parts.slice(3);

        const preferredLower = preferred.map((c) => c.toLowerCase());
        payloads.sort((a, b) => {
          const codecA = rtpMap.get(a)?.toLowerCase() ?? '';
          const codecB = rtpMap.get(b)?.toLowerCase() ?? '';
          const idxA = preferredLower.indexOf(codecA);
          const idxB = preferredLower.indexOf(codecB);
          const rankA = idxA >= 0 ? idxA : 999;
          const rankB = idxB >= 0 ? idxB : 999;
          return rankA - rankB;
        });

        return [...header, ...payloads].join(' ');
      })
      .join('\r\n');
  }

  private trackCall(call: JambonzCall): void {
    this.activeCalls.set(call.id, call);
    call.on('ended', () => this.activeCalls.delete(call.id));
    call.on('failed', () => this.activeCalls.delete(call.id));
  }
}
