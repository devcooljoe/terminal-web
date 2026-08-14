import type { ConnectionState, TransportInfo } from '../types/protocol';

interface Props {
  connectionState: ConnectionState;
  signalingState: string;
  deviceName?: string;
  transport: TransportInfo;
}

function Indicator({ label, active, text }: { label: string; active: boolean; text: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-400' : 'bg-gray-600'}`} />
      <span className="text-gray-500">{label}:</span>
      <span className={active ? 'text-green-400' : 'text-gray-500'}>{text}</span>
    </div>
  );
}

function TransportBadge({ transport }: { transport: TransportInfo }) {
  if (transport.mode === 'UNKNOWN') return null;

  const isLocal = transport.mode === 'LOCAL_LAN';
  const isRelay = transport.mode === 'RELAY';

  const color = isLocal
    ? 'text-green-400 bg-green-900/30 border-green-700/40'
    : isRelay
    ? 'text-orange-400 bg-orange-900/30 border-orange-700/40'
    : 'text-blue-400 bg-blue-900/30 border-blue-700/40';

  const label = isLocal ? '⚡ LOCAL LAN' : isRelay ? '☁ RELAY' : '🌐 INTERNET';

  return (
    <div className={`flex items-center gap-2 px-2 py-0.5 rounded border text-xs font-medium ${color}`}>
      {label}
      {transport.localIp && <span className="text-gray-400 font-normal">{transport.localIp}</span>}
      {transport.latencyMs != null && (
        <span className="text-gray-500 font-normal">{transport.latencyMs} ms</span>
      )}
    </div>
  );
}

export function StatusBar({ connectionState, signalingState, deviceName, transport }: Props) {
  const connected = connectionState === 'CONNECTED';
  const pairing = connectionState === 'PAIRING';
  const connecting = connectionState === 'CONNECTING';

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-gray-950 border-b border-gray-800 text-xs">
      <Indicator label="Signaling" active={signalingState === 'connected'} text={signalingState} />
      <Indicator
        label="WebRTC"
        active={connected}
        text={connected ? 'connected' : pairing ? 'pairing' : connecting ? 'connecting' : 'disconnected'}
      />
      {deviceName && <Indicator label="Device" active={connected} text={deviceName} />}
      {connected && <TransportBadge transport={transport} />}
    </div>
  );
}
