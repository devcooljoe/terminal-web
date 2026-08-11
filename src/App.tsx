import { useState } from 'react';
import { usePosConnection } from './hooks/usePosConnection';
import { ConnectionPanel } from './components/ConnectionPanel';
import { DeviceCard } from './components/DeviceCard';
import { ApkPanel } from './components/ApkPanel';
import { DebugConsole } from './components/DebugConsole';
import { StatusBar } from './components/StatusBar';
import { InstalledAppsPanel } from './components/InstalledAppsPanel';
import { Cpu } from 'lucide-react';

export default function App() {
  const pos = usePosConnection();
  const connected = pos.connectionState === 'CONNECTED';
  const [activePackage, setActivePackage] = useState<string | undefined>();

  const handleLaunch = (pkg: string) => { setActivePackage(pkg); pos.launchApp(pkg); };
  const handleStop  = (pkg: string) => { setActivePackage(pkg); pos.stopApp(pkg); };
  const handleDebug = (pkg: string) => { setActivePackage(pkg); pos.startDebug(pkg); };

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">
      <header className="flex items-center justify-between px-6 py-3 bg-gray-950 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Cpu size={18} className="text-blue-400" />
          <span className="font-semibold text-white text-sm">POS Developer Console</span>
        </div>
        <ConnectionPanel
          connectionState={pos.connectionState}
          error={pos.error}
          onConnect={pos.connect}
          onDisconnect={pos.disconnect}
        />
      </header>

      <StatusBar
        connectionState={pos.connectionState}
        signalingState={pos.signalingState}
        deviceName={pos.deviceInfo?.deviceName}
      />

      <main className="flex-1 grid grid-cols-[320px_1fr] gap-4 p-4 overflow-hidden">
        {/* Left column */}
        <div className="flex flex-col gap-4 overflow-y-auto scrollbar-thin">
          <DeviceCard
            deviceInfo={pos.deviceInfo}
            connectionState={pos.connectionState}
            appStatus={pos.appStatus}
            installMessage={pos.installMessage}
          />
          <InstalledAppsPanel
            apps={pos.installedApps}
            connected={connected}
            activePackage={activePackage}
            onLaunch={handleLaunch}
            onStop={handleStop}
            onDebug={handleDebug}
            onRefresh={pos.refreshApps}
            onAddApp={pos.addApp}
          />
          <ApkPanel
            connected={connected}
            transferState={pos.transferState}
            transferProgress={pos.transferProgress}
            onSend={pos.sendApk}
            onCancel={pos.cancelTransfer}
          />
        </div>

        {/* Right column — debug console */}
        <DebugConsole
          logs={pos.logs}
          debugState={pos.debugState}
          connected={connected}
          currentPackage={activePackage}
          onStartDebug={() => activePackage && pos.startDebug(activePackage)}
          onStopDebug={pos.stopDebug}
          onClear={pos.clearLogs}
          onExport={pos.exportLogs}
        />
      </main>
    </div>
  );
}
