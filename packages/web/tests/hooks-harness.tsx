/**
 * Hooks test harness — renders a minimal React component that uses
 * useJambonzClient and useCall, exposing state to window for Playwright.
 */
import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { useJambonzClient, useCall } from '@jambonz/client-sdk-web';

const HooksTestApp: React.FC = () => {
  const [options, setOptions] = useState({
    server: '',
    username: '',
    password: '',
  });

  const clientHook = useJambonzClient(options);
  const callHook = useCall(clientHook.client);
  const actionsRef = useRef({ clientHook, callHook });
  actionsRef.current = { clientHook, callHook };

  // Expose state to window for Playwright
  useEffect(() => {
    (window as any).__hookState = {
      clientState: clientHook.state,
      isRegistered: clientHook.isRegistered,
      isConnecting: clientHook.isConnecting,
      error: clientHook.error,
      callState: callHook.state,
      isMuted: callHook.isMuted,
      isHeld: callHook.isHeld,
      isActive: callHook.isActive,
      incomingCaller: callHook.incomingCaller,
    };
  });

  // Expose actions to window for Playwright
  useEffect(() => {
    (window as any).__hookActions = {
      setCredentials: (server: string, username: string, password: string) => {
        setOptions({ server, username, password });
      },
      connect: async () => {
        // Wait a tick for React to re-render with new options
        await new Promise((r) => setTimeout(r, 50));
        return actionsRef.current.clientHook.connect();
      },
      disconnect: () => actionsRef.current.clientHook.disconnect(),
      makeCall: (target: string) => actionsRef.current.callHook.makeCall(target),
      hangup: () => actionsRef.current.callHook.hangup(),
      toggleMute: () => actionsRef.current.callHook.toggleMute(),
      toggleHold: () => actionsRef.current.callHook.toggleHold(),
      sendDtmf: (tone: string) => actionsRef.current.callHook.sendDtmf(tone),
      answerIncoming: () => actionsRef.current.callHook.answerIncoming(),
      declineIncoming: () => actionsRef.current.callHook.declineIncoming(),
    };
  }, []);

  return null;
};

ReactDOM.createRoot(document.getElementById('root')!).render(<HooksTestApp />);
document.getElementById('status')!.textContent = 'hooks-ready';
