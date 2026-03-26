import React from 'react';
import { ClientState } from '@jambonz/client-sdk-web';

export const StatusDot: React.FC<{ state: ClientState }> = ({ state }) => {
  const color =
    state === ClientState.Registered
      ? 'bg-emerald-400'
      : state === ClientState.Connecting || state === ClientState.Connected
        ? 'bg-amber-400 animate-pulse'
        : state === ClientState.Error
          ? 'bg-red-400'
          : 'bg-gray-400';

  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />;
};
