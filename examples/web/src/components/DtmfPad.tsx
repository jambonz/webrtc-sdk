import React from 'react';

const DTMF_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
];

export const DtmfPad: React.FC<{ onPress: (key: string) => void }> = ({ onPress }) => (
  <div className="grid grid-cols-3 gap-2">
    {DTMF_KEYS.flat().map((key) => (
      <button
        key={key}
        onClick={() => onPress(key)}
        className="rounded-lg bg-slate-700/60 py-3 text-lg font-medium text-white transition hover:bg-slate-600 active:scale-95"
      >
        {key}
      </button>
    ))}
  </div>
);
