import React, { useEffect, useState } from 'react';
import { CallState } from '@jambonz/client-sdk-web';
import { DtmfPad } from './DtmfPad';
import { MicIcon, PhoneIcon, PlayIcon, PauseIcon } from './Icons';

interface ActiveCallViewProps {
  target: string;
  callState: CallState;
  isMuted: boolean;
  isHeld: boolean;
  onToggleMute: () => void;
  onToggleHold: () => void;
  onHangup: () => void;
  onSendDtmf: (tone: string) => void;
}

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

export const ActiveCallView: React.FC<ActiveCallViewProps> = ({
  target,
  callState,
  isMuted,
  isHeld,
  onToggleMute,
  onToggleHold,
  onHangup,
  onSendDtmf,
}) => {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (callState !== CallState.Connected) {
      setDuration(0);
      return;
    }
    const interval = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [callState]);

  return (
    <div className="p-5">
      {/* Call info */}
      <div className="mb-6 text-center">
        <p className="text-lg font-semibold text-white">{target || 'Incoming Call'}</p>
        <p className="mt-1 text-sm text-slate-400 capitalize">
          {callState === CallState.Connected
            ? formatDuration(duration)
            : callState === CallState.Ringing
              ? 'Ringing...'
              : callState}
        </p>
        {isHeld && (
          <span className="mt-2 inline-block rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-medium text-amber-400">
            On Hold
          </span>
        )}
      </div>

      {/* In-call DTMF */}
      <div className="mb-4">
        <DtmfPad onPress={onSendDtmf} />
      </div>

      {/* Call Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onToggleMute}
          className={`flex h-14 w-14 items-center justify-center rounded-full transition ${
            isMuted
              ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/40'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          <MicIcon muted={isMuted} />
        </button>

        <button
          onClick={onHangup}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/30 transition hover:bg-red-500 active:scale-95"
          title="Hang Up"
        >
          <PhoneIcon />
        </button>

        <button
          onClick={onToggleHold}
          className={`flex h-14 w-14 items-center justify-center rounded-full transition ${
            isHeld
              ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
          title={isHeld ? 'Resume' : 'Hold'}
        >
          {isHeld ? <PlayIcon /> : <PauseIcon />}
        </button>
      </div>
    </div>
  );
};
