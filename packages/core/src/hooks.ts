/**
 * React hooks for the Jambonz WebRTC SDK.
 *
 * These hooks provide declarative React integration for managing
 * client connections and call state.
 *
 * @example
 * ```tsx
 * import { useJambonzClient, useCall } from '@jambonz/client-sdk-web';
 *
 * function Phone() {
 *   const client = useJambonzClient({ server, username, password });
 *   const { call, state, isMuted, isHeld, makeCall, hangup, toggleMute, toggleHold } = useCall(client);
 *
 *   return (
 *     <div>
 *       <p>Status: {client.state}</p>
 *       {call && <p>Call: {state}</p>}
 *       <button onClick={() => makeCall('+1234567890')}>Call</button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { JambonzClient } from './JambonzClient';
import type { JambonzCall } from './JambonzCall';
import { CallState, ClientState, type JambonzClientOptions, type JambonzCallOptions } from './types';

// ── useJambonzClient ────────────────────────────────────────

export interface UseJambonzClientReturn {
  /** The underlying JambonzClient instance (null before connect) */
  client: JambonzClient | null;
  /** Current client state */
  state: ClientState;
  /** Whether the client is registered with the SBC */
  isRegistered: boolean;
  /** Whether the client is connecting or reconnecting */
  isConnecting: boolean;
  /** Connect to the SBC. Resolves when registered. */
  connect: () => Promise<void>;
  /** Disconnect from the SBC. */
  disconnect: () => void;
  /** Last error message, if any */
  error: string | null;
}

/**
 * Hook to manage a JambonzClient connection.
 *
 * @param options - Client options (server, username, password, etc.)
 * @param createClient - Factory function to create the client (platform-specific).
 *   Consumers don't call this directly — use the platform-specific hook from
 *   `@jambonz/client-sdk-web` or `@jambonz/client-sdk-react-native`.
 */
export function useJambonzClient(
  options: JambonzClientOptions,
  createClient: (opts: JambonzClientOptions) => JambonzClient,
): UseJambonzClientReturn {
  const clientRef = useRef<JambonzClient | null>(null);
  const [state, setState] = useState<ClientState>(ClientState.Disconnected);
  const [error, setError] = useState<string | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
      clientRef.current = null;
    };
  }, []);

  const connect = useCallback(async () => {
    // Disconnect existing client if any
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }

    setError(null);

    try {
      const client = createClient(options);
      clientRef.current = client;

      client.on('stateChanged', (s) => setState(s));
      client.on('error', (err) => setError(err.message));
      client.on('registrationFailed', (err) => setError(err.message));

      await client.connect();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setState(ClientState.Error);
    }
  }, [options.server, options.username, options.password, createClient]);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    setState(ClientState.Disconnected);
    setError(null);
  }, []);

  return {
    client: clientRef.current,
    state,
    isRegistered: state === ClientState.Registered,
    isConnecting: state === ClientState.Connecting || state === ClientState.Reconnecting,
    connect,
    disconnect,
    error,
  };
}

// ── useCall ─────────────────────────────────────────────────

export interface UseCallReturn {
  /** The current active call (null if no call) */
  call: JambonzCall | null;
  /** Current call state */
  state: CallState | null;
  /** Whether the microphone is muted */
  isMuted: boolean;
  /** Whether the call is on hold */
  isHeld: boolean;
  /** Whether there is an active call (not ended/idle) */
  isActive: boolean;
  /** Incoming call info (null if no incoming call) */
  incomingCaller: string | null;
  /** Make an outbound call */
  makeCall: (target: string, options?: JambonzCallOptions) => void;
  /** Answer the incoming call */
  answerIncoming: () => void;
  /** Decline the incoming call */
  declineIncoming: () => void;
  /** Hang up the current call */
  hangup: () => void;
  /** Toggle mute */
  toggleMute: () => void;
  /** Toggle hold */
  toggleHold: () => void;
  /** Send a DTMF tone */
  sendDtmf: (tone: string) => void;
  /** Blind transfer to another target */
  transfer: (target: string) => void;
}

/**
 * Hook to manage call state for a connected JambonzClient.
 *
 * @param client - The JambonzClient instance (from useJambonzClient or createJambonzClient)
 */
export function useCall(client: JambonzClient | null): UseCallReturn {
  const callRef = useRef<JambonzCall | null>(null);
  const incomingRef = useRef<JambonzCall | null>(null);

  const [state, setState] = useState<CallState | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isHeld, setIsHeld] = useState(false);
  const [incomingCaller, setIncomingCaller] = useState<string | null>(null);

  const resetCallState = useCallback(() => {
    callRef.current = null;
    setState(null);
    setIsMuted(false);
    setIsHeld(false);
  }, []);

  const bindCallEvents = useCallback(
    (call: JambonzCall) => {
      callRef.current = call;
      call.on('stateChanged', (s) => setState(s));
      call.on('ended', () => resetCallState());
      call.on('failed', () => resetCallState());
      call.on('hold', (held) => setIsHeld(held));
      call.on('mute', (muted) => setIsMuted(muted));
    },
    [resetCallState],
  );

  // Listen for incoming calls
  useEffect(() => {
    if (!client) return;

    const onIncoming = (call: JambonzCall) => {
      incomingRef.current = call;
      setIncomingCaller(call.remoteIdentity);

      call.on('failed', () => {
        incomingRef.current = null;
        setIncomingCaller(null);
      });
    };

    client.on('incoming', onIncoming);
    return () => {
      client.off('incoming', onIncoming);
    };
  }, [client]);

  const makeCall = useCallback(
    (target: string, options?: JambonzCallOptions) => {
      if (!client) return;
      const call = client.call(target, options);
      bindCallEvents(call);
    },
    [client, bindCallEvents],
  );

  const answerIncoming = useCallback(() => {
    const call = incomingRef.current;
    if (!call) return;
    bindCallEvents(call);
    call.answer();
    incomingRef.current = null;
    setIncomingCaller(null);
  }, [bindCallEvents]);

  const declineIncoming = useCallback(() => {
    const call = incomingRef.current;
    if (!call) return;
    call.hangup();
    incomingRef.current = null;
    setIncomingCaller(null);
  }, []);

  const hangup = useCallback(() => callRef.current?.hangup(), []);
  const toggleMute = useCallback(() => callRef.current?.toggleMute(), []);
  const toggleHold = useCallback(() => {
    if (callRef.current?.isHeld) callRef.current.unhold();
    else callRef.current?.hold();
  }, []);
  const sendDtmf = useCallback((tone: string) => callRef.current?.sendDTMF(tone), []);
  const transfer = useCallback((target: string) => callRef.current?.transfer(target), []);

  const isActive = state !== null && state !== CallState.Ended && state !== CallState.Idle;

  return {
    call: callRef.current,
    state,
    isMuted,
    isHeld,
    isActive,
    incomingCaller,
    makeCall,
    answerIncoming,
    declineIncoming,
    hangup,
    toggleMute,
    toggleHold,
    sendDtmf,
    transfer,
  };
}
