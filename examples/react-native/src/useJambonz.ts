/**
 * useJambonz — React hook wrapping the Jambonz SDK for React Native.
 *
 * This file contains ALL SDK interactions. Open this file to understand
 * how to use @jambonz/client-sdk-react-native.
 *
 * The UI layer (App.tsx + components/) only consumes the state and
 * callbacks returned by this hook.
 */

import { useState, useCallback, useRef } from 'react';
import {
  createJambonzClient,
  JambonzClient,
  JambonzCall,
  CallState,
  ClientState,
} from '@jambonz/client-sdk-react-native';

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
}

export const useJambonz = (): UseJambonzReturn => {
  const clientRef = useRef<JambonzClient | null>(null);
  const callRef = useRef<JambonzCall | null>(null);
  const incomingCallRef = useRef<JambonzCall | null>(null);

  const [clientState, setClientState] = useState<ClientState>(ClientState.Disconnected);
  const [callState, setCallState] = useState<CallState | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isHeld, setIsHeld] = useState(false);
  const [incomingCaller, setIncomingCaller] = useState<string | null>(null);

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

      call.on('stateChanged', (state) => setCallState(state));
      call.on('ended', () => resetCallState());
      call.on('failed', () => resetCallState());
      call.on('hold', (held) => setIsHeld(held));
      call.on('mute', (muted) => setIsMuted(muted));
    },
    [resetCallState],
  );

  // ── Connection ─────────────────────────────────────────────

  const connect = useCallback(
    async (server: string, username: string, password: string) => {
      try {
        // 1. Create the client
        const client = createJambonzClient({ server, username, password });
        clientRef.current = client;

        // 2. Listen to client events
        client.on('stateChanged', (state) => setClientState(state));

        // 3. Handle incoming calls — store for the UI to answer/decline
        client.on('incoming', (call) => {
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
      } catch (err) {
        console.log(
          `[Jambonz] Connect failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
    [],
  );

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    resetCallState();
  }, [resetCallState]);

  // ── Call actions ────────────────────────────────────────────

  const makeCall = useCallback(
    (target: string) => {
      if (!clientRef.current || !target) return;
      const call = clientRef.current.call(target);
      setupCallEvents(call);
    },
    [setupCallEvents],
  );

  const hangup = useCallback(() => callRef.current?.hangup(), []);
  const toggleMute = useCallback(() => callRef.current?.toggleMute(), []);

  const toggleHold = useCallback(() => {
    if (callRef.current?.isHeld) callRef.current.unhold();
    else callRef.current?.hold();
  }, []);

  const sendDtmf = useCallback((tone: string) => {
    callRef.current?.sendDTMF(tone);
  }, []);

  // ── Incoming call actions ──────────────────────────────────

  const answerIncoming = useCallback(() => {
    const call = incomingCallRef.current;
    if (!call) return;
    setupCallEvents(call);
    call.answer();
    incomingCallRef.current = null;
    setIncomingCaller(null);
  }, [setupCallEvents]);

  const declineIncoming = useCallback(() => {
    const call = incomingCallRef.current;
    if (!call) return;
    call.hangup();
    incomingCallRef.current = null;
    setIncomingCaller(null);
  }, []);

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
  };
};
