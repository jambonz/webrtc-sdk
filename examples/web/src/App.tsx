/**
 * Jambonz Web SDK — Example Application
 *
 * This file demonstrates how to use @jambonz/client-sdk-web.
 * All SDK logic lives in useJambonz.ts — open that file to see
 * how createJambonzClient, events, and call methods work.
 *
 * UI components are in ./components/ and are not SDK-specific.
 */

import React, { useState } from 'react';
import { CallState, ClientState } from '@jambonz/client-sdk-web';
import { useJambonz } from './useJambonz';
import { StatusDot } from './components/StatusDot';
import { ConnectionForm } from './components/ConnectionForm';
import { DialerView } from './components/DialerView';
import { ActiveCallView } from './components/ActiveCallView';
import { IncomingCallView } from './components/IncomingCallView';
import { LogPanel } from './components/LogPanel';

export const App: React.FC = () => {
  // ── SDK hook — all Jambonz interactions are here ─────────
  const jambonz = useJambonz();

  // ── Local form state (not SDK-related) ───────────────────
  const [server, setServer] = useState('wss://sip.jambonz.me:8443');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [target, setTarget] = useState('');

  // ── Derived state ────────────────────────────────────────
  const isConnected = jambonz.clientState === ClientState.Registered;
  const hasActiveCall =
    jambonz.callState !== null &&
    jambonz.callState !== CallState.Ended &&
    jambonz.callState !== CallState.Idle;

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">Jambonz</h1>
          <p className="text-sm text-slate-400">WebRTC Softphone</p>
        </div>

        {/* Main Card */}
        <div className="overflow-hidden rounded-2xl bg-slate-800/80 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
          {/* Status Bar */}
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
            <div className="flex items-center gap-2">
              <StatusDot state={jambonz.clientState} />
              <span className="text-sm font-medium capitalize text-slate-300">
                {jambonz.clientState}
              </span>
            </div>
            {isConnected && <span className="text-xs text-slate-500">{username}</span>}
          </div>

          {/* Step 1: Connect to the SBC */}
          {!isConnected && (
            <ConnectionForm
              server={server}
              username={username}
              password={password}
              clientState={jambonz.clientState}
              onServerChange={setServer}
              onUsernameChange={setUsername}
              onPasswordChange={setPassword}
              onConnect={() => jambonz.connect(server, username, password)}
            />
          )}

          {/* Step 2a: Incoming call — answer or decline */}
          {isConnected && !hasActiveCall && jambonz.incomingCaller && (
            <IncomingCallView
              caller={jambonz.incomingCaller}
              onAnswer={jambonz.answerIncoming}
              onDecline={jambonz.declineIncoming}
            />
          )}

          {/* Step 2b: Dial a number */}
          {isConnected && !hasActiveCall && !jambonz.incomingCaller && (
            <DialerView
              target={target}
              onTargetChange={setTarget}
              onCall={() => jambonz.makeCall(target)}
              onDisconnect={jambonz.disconnect}
            />
          )}

          {/* Step 3: In-call controls */}
          {hasActiveCall && (
            <ActiveCallView
              target={target}
              callState={jambonz.callState!}
              isMuted={jambonz.isMuted}
              isHeld={jambonz.isHeld}
              onToggleMute={jambonz.toggleMute}
              onToggleHold={jambonz.toggleHold}
              onHangup={jambonz.hangup}
              onSendDtmf={jambonz.sendDtmf}
            />
          )}

          {/* Logs */}
          <LogPanel logs={jambonz.logs} />
        </div>

        <p className="mt-4 text-center text-xs text-slate-600">
          Powered by <span className="text-slate-400">@jambonz/client-sdk-web</span>
        </p>
      </div>
    </div>
  );
};
