import React, { useRef, useEffect, useState } from 'react';
import { ChevronDownIcon } from './Icons';

export const LogPanel: React.FC<{ logs: string[] }> = ({ logs }) => {
  const endRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, open]);

  return (
    <div className="border-t border-white/5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-xs text-slate-500 transition hover:text-slate-300"
      >
        <span>Console Logs ({logs.length})</span>
        <ChevronDownIcon open={open} />
      </button>

      {open && (
        <div className="max-h-52 overflow-y-auto border-t border-white/5 bg-slate-900/60 px-4 py-3 font-mono text-xs leading-relaxed text-slate-500">
          {logs.length === 0 && <p className="text-slate-600">No logs yet.</p>}
          {logs.map((l, i) => (
            <div key={i} className="text-slate-400">
              {l}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
};
