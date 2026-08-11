import { useState } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import type { ConnectionState } from '../types/protocol';

interface Props {
  connectionState: ConnectionState;
  error: string | null;
  onConnect: (code: string) => void;
  onDisconnect: () => void;
}

export function ConnectionPanel({ connectionState, error, onConnect, onDisconnect }: Props) {
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length === 6) onConnect(code.trim());
  };

  if (connectionState === 'CONNECTED') {
    return (
      <button
        onClick={onDisconnect}
        className="flex items-center gap-2 px-3 py-1.5 bg-red-900/40 hover:bg-red-900/60 border border-red-700/50 rounded text-red-400 text-sm transition-colors"
        aria-label="Disconnect from device"
      >
        <WifiOff size={14} /> Disconnect
      </button>
    );
  }

  if (connectionState === 'CONNECTING' || connectionState === 'PAIRING') {
    return (
      <div className="flex items-center gap-2 text-yellow-400 text-sm">
        <Loader2 size={14} className="animate-spin" />
        {connectionState === 'PAIRING' ? 'Waiting for device approval...' : 'Connecting...'}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="6-digit pairing code"
        maxLength={6}
        className="w-40 px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        aria-label="Pairing code"
      />
      <button
        type="submit"
        disabled={code.length !== 6}
        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded text-sm text-white transition-colors"
      >
        <Wifi size={14} /> Connect
      </button>
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </form>
  );
}
