import { useState } from 'react';
import { RefreshCw, Play, Square, Bug, PackageOpen, Plus } from 'lucide-react';
import type { InstalledApp } from '../types/protocol';

interface Props {
  apps: InstalledApp[];
  connected: boolean;
  activePackage: string | undefined;
  onLaunch: (pkg: string) => void;
  onStop: (pkg: string) => void;
  onDebug: (pkg: string) => void;
  onRefresh: () => void;
  onAddApp: (pkg: string) => void;
}

export function InstalledAppsPanel({ apps, connected, activePackage, onLaunch, onStop, onDebug, onRefresh, onAddApp }: Props) {
  const [adding, setAdding] = useState(false);
  const [pkg, setPkg] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = pkg.trim();
    if (!trimmed) return;
    onAddApp(trimmed);
    setPkg('');
    setAdding(false);
  };

  return (
    <div className="bg-gray-900 border border-gray-700/50 rounded-lg p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <PackageOpen size={14} /> Deployed Apps
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAdding(a => !a)}
            disabled={!connected}
            className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors disabled:opacity-30"
            title="Add existing app by package name"
            aria-label="Add existing app"
          >
            <Plus size={12} />
          </button>
          <button
            onClick={onRefresh}
            disabled={!connected}
            className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors disabled:opacity-30"
            aria-label="Refresh app list"
            title="Refresh"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={pkg}
            onChange={e => setPkg(e.target.value)}
            placeholder="com.example.app"
            autoFocus
            className="flex-1 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono"
            aria-label="Package name"
          />
          <button
            type="submit"
            disabled={!pkg.trim()}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded text-xs text-white transition-colors"
          >
            Add
          </button>
        </form>
      )}

      {apps.length === 0 ? (
        <p className="text-gray-600 text-xs text-center py-4">
          No apps deployed yet.<br />
          Send an APK or click <span className="text-gray-400">+</span> to add an existing app.
        </p>
      ) : (
        <div className="space-y-2">
          {apps.map(app => (
            <AppRow
              key={app.packageName}
              app={app}
              connected={connected}
              active={app.packageName === activePackage}
              onLaunch={() => onLaunch(app.packageName)}
              onStop={() => onStop(app.packageName)}
              onDebug={() => onDebug(app.packageName)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AppRow({ app, connected, active, onLaunch, onStop, onDebug }: {
  app: InstalledApp; connected: boolean; active: boolean;
  onLaunch: () => void; onStop: () => void; onDebug: () => void;
}) {
  return (
    <div className={`rounded-lg p-3 border ${
      !app.installed
        ? 'bg-gray-900 border-gray-800/30 opacity-50'
        : active
        ? 'bg-blue-900/20 border-blue-700/40'
        : 'bg-gray-800/50 border-gray-700/30'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-white font-medium truncate">
            {app.appName || app.packageName}
          </p>
          <p className="text-xs text-gray-500 font-mono truncate">{app.packageName}</p>
          <p className="text-xs text-gray-600 mt-0.5">
            {app.versionName ? `v${app.versionName}` : ''}
            {!app.installed && <span className="text-red-500 ml-2">uninstalled</span>}
          </p>
        </div>
        {app.installed && (
          <div className="flex gap-1 shrink-0">
            <IconBtn onClick={onLaunch} disabled={!connected} icon={<Play size={11} />}   label="Launch" color="blue" />
            <IconBtn onClick={onDebug}  disabled={!connected} icon={<Bug size={11} />}    label="Debug"  color="purple" />
            <IconBtn onClick={onStop}   disabled={!connected} icon={<Square size={11} />} label="Stop"   color="red" />
          </div>
        )}
      </div>
    </div>
  );
}

function IconBtn({ onClick, disabled, icon, label, color }: {
  onClick: () => void; disabled: boolean; icon: React.ReactNode; label: string; color: string;
}) {
  const colors: Record<string, string> = {
    blue:   'text-blue-400 hover:bg-blue-900/40',
    purple: 'text-purple-400 hover:bg-purple-900/40',
    red:    'text-red-400 hover:bg-red-900/40',
  };
  return (
    <button onClick={onClick} disabled={disabled} title={label} aria-label={label}
      className={`p-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${colors[color]}`}>
      {icon}
    </button>
  );
}
