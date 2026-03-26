import { useState, useCallback, useRef } from 'react';
import {
  createJambonzClient,
  JambonzClient,
  JambonzCall,
  CallState,
  ClientState,
} from '@jambonz/client-sdk-web';

export interface UseJambonzReturn {
  // Connection
  clientState: ClientState;
  connect: (server: string, username: string, password: string) => Promise<void>;
  disconnect: () => void;

  // Call
  callState: CallState | null;
  isMuted: boolean;
  isHeld: boolean;
  makeCall: (target: string) => void;
  hangup: () => void;
  toggleMute: () => void;
  toggleHold: () => void;
  sendDtmf: (tone: string) => void;

  // Incoming call
  incomingCaller: string | null;
  answerIncoming: () => void;
  declineIncoming: () => void;

  // Logs
  logs: string[];
}

/**
 * React hook that wraps the Jambonz SDK.
 *
 * Manages client lifecycle, call state, and event logging.
 * All SDK interactions are encapsulated here so the UI layer
 * only deals with simple state and callbacks.
 */
export const useJambonz = (): UseJambonzReturn => {
  const clientRef = useRef<JambonzClient | null>(null);
  const callRef = useRef<JambonzCall | null>(null);

  const [clientState, setClientState] = useState<ClientState>(ClientState.Disconnected);
  const [callState, setCallState] = useState<CallState | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isHeld, setIsHeld] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [incomingCaller, setIncomingCaller] = useState<string | null>(null);
  const incomingCallRef = useRef<JambonzCall | null>(null);

  const log = useCallback((message: string) => {
    setLogs((prev) => [...prev.slice(-99), `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  const resetCallState = useCallback(() => {
    callRef.current = null;
    setCallState(null);
    setIsMuted(false);
    setIsHeld(false);
  }, []);

  // ── Call event wiring ──────────────────────────────────────

  const setupCallEvents = useCallback(
    (call: JambonzCall) => {
      callRef.current = call;

      call.on('stateChanged', (state) => {
        setCallState(state);
        log(`Call state: ${state}`);
      });

      call.on('accepted', () => log('Call accepted'));
      call.on('progress', () => log('Call ringing...'));

      call.on('ended', (cause) => {
        log(`Call ended: ${cause.reason} (${cause.code})`);
        resetCallState();
      });

      call.on('failed', (cause) => {
        log(`Call failed: ${cause.reason} (${cause.code})`);
        resetCallState();
      });

      call.on('hold', (held) => {
        setIsHeld(held);
        log(held ? 'Call on hold' : 'Call resumed');
      });

      call.on('mute', (muted) => {
        setIsMuted(muted);
        log(muted ? 'Muted' : 'Unmuted');
      });

      call.on('dtmf', (tone) => log(`DTMF received: ${tone}`));
    },
    [log, resetCallState],
  );

  // ── Connection ─────────────────────────────────────────────

  const connect = useCallback(
    async (server: string, username: string, password: string) => {
      try {
        // 1. Create the client
        const client = createJambonzClient({ server, username, password });
        clientRef.current = client;

        // 2. Listen to client events
        client.on('stateChanged', (state) => {
          setClientState(state);
          log(`Client state: ${state}`);
        });
        client.on('registered', () => log('Registered with SBC'));
        client.on('unregistered', () => log('Unregistered'));
        client.on('registrationFailed', (err) => log(`Registration failed: ${err.message}`));
        client.on('error', (err) => log(`Error: ${err.message}`));

        // 3. Handle incoming calls — store the call for the UI to answer/decline
        client.on('incoming', (call) => {
          log(`Incoming call from ${call.remoteIdentity}`);
          incomingCallRef.current = call;
          setIncomingCaller(call.remoteIdentity);

          // If the caller hangs up before we answer, clear the incoming state
          call.on('failed', () => {
            incomingCallRef.current = null;
            setIncomingCaller(null);
          });
        });

        // 4. Connect (triggers WebSocket + SIP registration)
        await client.connect();
        log('Connected');
      } catch (err) {
        log(`Connect failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [log],
  );

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    resetCallState();
    log('Disconnected');
  }, [log, resetCallState]);

  // ── Call actions ────────────────────────────────────────────

  const makeCall = useCallback(
    (target: string) => {
      if (!clientRef.current || !target) return;
      const call = clientRef.current.call(target);
      setupCallEvents(call);
      log(`Calling ${target}...`);
    },
    [setupCallEvents, log],
  );

  const hangup = useCallback(() => callRef.current?.hangup(), []);
  const toggleMute = useCallback(() => callRef.current?.toggleMute(), []);

  const toggleHold = useCallback(() => {
    if (callRef.current?.isHeld) callRef.current.unhold();
    else callRef.current?.hold();
  }, []);

  const sendDtmf = useCallback(
    (tone: string) => {
      callRef.current?.sendDTMF(tone);
      log(`Sent DTMF: ${tone}`);
    },
    [log],
  );

  // ── Incoming call actions ──────────────────────────────────

  const answerIncoming = useCallback(() => {
    const call = incomingCallRef.current;
    if (!call) return;
    setupCallEvents(call);
    call.answer();
    incomingCallRef.current = null;
    setIncomingCaller(null);
    log('Answered incoming call');
  }, [setupCallEvents, log]);

  const declineIncoming = useCallback(() => {
    const call = incomingCallRef.current;
    if (!call) return;
    call.hangup();
    incomingCallRef.current = null;
    setIncomingCaller(null);
    log('Declined incoming call');
  }, [log]);

  return {
    clientState,
    connect,
    disconnect,
    callState,
    isMuted,
    isHeld,
    makeCall,
    hangup,
    toggleMute,
    toggleHold,
    sendDtmf,
    incomingCaller,
    answerIncoming,
    declineIncoming,
    logs,
  };
};
