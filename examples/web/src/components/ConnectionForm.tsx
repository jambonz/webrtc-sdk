import React from 'react';
import { ClientState } from '@jambonz/client-sdk-web';

interface ConnectionFormProps {
  server: string;
  username: string;
  password: string;
  clientState: ClientState;
  onServerChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConnect: () => void;
}

const inputClass =
  'w-full rounded-lg border border-white/10 bg-slate-700/50 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500';

export const ConnectionForm: React.FC<ConnectionFormProps> = ({
  server,
  username,
  password,
  clientState,
  onServerChange,
  onUsernameChange,
  onPasswordChange,
  onConnect,
}) => (
  <div className="space-y-3 p-5">
    <input
      type="url"
      placeholder="Server (wss://...)"
      value={server}
      onChange={(e) => onServerChange(e.target.value)}
      className={inputClass}
    />
    <input
      placeholder="Username"
      value={username}
      onChange={(e) => onUsernameChange(e.target.value)}
      className={inputClass}
    />
    <input
      placeholder="Password"
      type="password"
      value={password}
      onChange={(e) => onPasswordChange(e.target.value)}
      className={inputClass}
    />
    <button
      onClick={onConnect}
      disabled={!server || !username || !password || clientState === ClientState.Connecting}
      className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {clientState === ClientState.Connecting ? 'Connecting...' : 'Connect'}
    </button>
  </div>
);
