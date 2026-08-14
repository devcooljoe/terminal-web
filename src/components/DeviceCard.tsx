import { Monitor, CheckCircle, AlertCircle } from 'lucide-react';
import type { DeviceInfo, ConnectionState, AppStatus, TransportInfo } from '../types/protocol';

interface Props {
  deviceInfo: DeviceInfo | null;
  connectionState: ConnectionState;
  appStatus: AppStatus;
  installMessage: string;
  transport: TransportInfo;
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${active ? 'bg-green-400 shadow-[0_0_6px_#4ade80]' : 'bg-gray-600'}`} />
  );
}

export function DeviceCard({ deviceInfo, connectionState, appStatus, installMessage, transport }: Props) {
  const connected = connectionState === 'CONNECTED';

  if (!connected || !deviceInfo) {
    return (
      <div className="bg-gray-900 border border-gray-700/50 rounded-lg p-6 flex flex-col items-center justify-center gap-3 min-h-[200px]">
        <Monitor size={32} className="text-gray-600" />
        <p className="text-gray-500 text-sm">No device connected</p>
        <p className="text-gray-600 text-xs">Enter a pairing code to connect</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700/50 rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusDot active={true} />
          <span className="font-semibold text-white">{deviceInfo.deviceName}</span>
        </div>
        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">Agent {deviceInfo.agentVersion}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
        <Row label="Manufacturer" value={deviceInfo.manufacturer} />
        <Row label="Model" value={deviceInfo.model} />
        <Row label="Android" value={deviceInfo.androidVersion} />
        <Row label="Silent Install" value={deviceInfo.canSilentInstall ? '✓ Available' : '✗ Requires confirmation'} />
        {deviceInfo.wifiSsid && <Row label="Wi-Fi" value={deviceInfo.wifiSsid} />}
        {deviceInfo.lanIp && <Row label="LAN IP" value={deviceInfo.lanIp} />}
        {transport.latencyMs != null && <Row label="Latency" value={`${transport.latencyMs} ms`} />}
        {deviceInfo.currentApp && <Row label="Current App" value={deviceInfo.currentApp} />}
        {deviceInfo.currentAppVersion && <Row label="Version" value={deviceInfo.currentAppVersion} />}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <AppStatusBadge status={appStatus} />
      </div>

      {installMessage && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded ${
          installMessage.startsWith('✓') ? 'bg-green-900/30 text-green-400 border border-green-700/30' :
          installMessage.startsWith('✗') ? 'bg-red-900/30 text-red-400 border border-red-700/30' :
          'bg-blue-900/30 text-blue-400 border border-blue-700/30'
        }`}>
          {installMessage.startsWith('✓') ? <CheckCircle size={12} /> : installMessage.startsWith('✗') ? <AlertCircle size={12} /> : null}
          {installMessage}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200">{value}</span>
    </>
  );
}

function AppStatusBadge({ status }: { status: AppStatus }) {
  const colors: Record<AppStatus, string> = {
    RUNNING: 'text-green-400 bg-green-900/30 border-green-700/30',
    STOPPED: 'text-gray-400 bg-gray-800 border-gray-700/30',
    CRASHED: 'text-red-400 bg-red-900/30 border-red-700/30',
    UNKNOWN: 'text-gray-500 bg-gray-800 border-gray-700/30',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${colors[status]}`}>
      App: {status}
    </span>
  );
}

