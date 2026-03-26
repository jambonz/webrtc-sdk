import React from 'react';
import { DtmfPad } from './DtmfPad';

interface DialerViewProps {
  target: string;
  onTargetChange: (value: string) => void;
  onCall: () => void;
  onDisconnect: () => void;
}

export const DialerView: React.FC<DialerViewProps> = ({
  target,
  onTargetChange,
  onCall,
  onDisconnect,
}) => (
  <div className="p-5">
    <div className="flex gap-2">
      <input
        placeholder="sip:user@domain or phone number"
        value={target}
        onChange={(e) => onTargetChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && target && onCall()}
        className="flex-1 rounded-lg border border-white/10 bg-slate-700/50 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
      />
      <button
        onClick={onCall}
        disabled={!target}
        className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Call
      </button>
    </div>

    <div className="mt-5">
      <DtmfPad onPress={(key) => onTargetChange(target + key)} />
    </div>

    <button
      onClick={onDisconnect}
      className="mt-4 w-full rounded-lg border border-white/10 py-2 text-sm text-slate-400 transition hover:bg-slate-700 hover:text-white"
    >
      Disconnect
    </button>
  </div>
);
