import { useEffect, useRef, useState, useMemo } from 'react';
import { Terminal, Pause, Play, Trash2, Download, Search, X } from 'lucide-react';
import type { LogEntry, LogLevel, DebugSessionState } from '../types/protocol';

interface Props {
  logs: LogEntry[];
  debugState: DebugSessionState;
  connected: boolean;
  currentPackage: string | undefined;
  onStartDebug: () => void;
  onStopDebug: () => void;
  onClear: () => void;
  onExport: () => void;
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  DEBUG: 'text-gray-400',
  INFO: 'text-blue-400',
  WARN: 'text-yellow-400',
  ERROR: 'text-red-400',
};

const LEVEL_BG: Record<LogLevel, string> = {
  DEBUG: 'bg-gray-800 text-gray-400',
  INFO: 'bg-blue-900/40 text-blue-400',
  WARN: 'bg-yellow-900/40 text-yellow-400',
  ERROR: 'bg-red-900/40 text-red-400',
};

export function DebugConsole({ logs, debugState, connected, currentPackage, onStartDebug, onStopDebug, onClear, onExport }: Props) {
  const [paused, setPaused] = useState(false);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<Set<LogLevel>>(new Set(['DEBUG', 'INFO', 'WARN', 'ERROR']));
  const [tagFilter, setTagFilter] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const isRunning = debugState === 'RUNNING';

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (!levelFilter.has(l.level)) return false;
      if (tagFilter && !l.tag.toLowerCase().includes(tagFilter.toLowerCase())) return false;
      if (search && !l.message.toLowerCase().includes(search.toLowerCase()) && !l.tag.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [logs, levelFilter, search, tagFilter]);

  useEffect(() => {
    if (!paused && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, paused]);

  const toggleLevel = (level: LogLevel) => {
    setLevelFilter(prev => {
      const next = new Set(prev);
      next.has(level) ? next.delete(level) : next.add(level);
      return next;
    });
  };

  const copyLog = (entry: LogEntry) => {
    navigator.clipboard.writeText(
      `${entry.timestamp} [${entry.level}] ${entry.tag}: ${entry.message}${entry.stackTrace ? '\n' + entry.stackTrace : ''}`
    );
  };

  return (
    <div className="bg-gray-900 border border-gray-700/50 rounded-lg flex flex-col h-full min-h-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-purple-400" />
          <span className="text-sm font-semibold text-gray-300">Debug Console</span>
          {isRunning && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              LIVE
            </span>
          )}
          {debugState === 'STARTING' && <span className="text-xs text-yellow-400">Starting...</span>}
          {debugState === 'STOPPING' && <span className="text-xs text-yellow-400">Stopping...</span>}
        </div>
        <div className="flex items-center gap-1">
          {isRunning ? (
            <ToolBtn onClick={onStopDebug} icon={<X size={12} />} label="Stop debug" title="Stop Debug" />
          ) : (
            <button
              onClick={onStartDebug}
              disabled={!connected || !currentPackage}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-600/40 text-purple-400 text-xs rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Terminal size={12} /> Start Debug
            </button>
          )}
          <ToolBtn onClick={() => setPaused(p => !p)} icon={paused ? <Play size={12} /> : <Pause size={12} />} label={paused ? 'Resume scroll' : 'Pause scroll'} />
          <ToolBtn onClick={onClear} icon={<Trash2 size={12} />} label="Clear logs" />
          <ToolBtn onClick={onExport} icon={<Download size={12} />} label="Export logs" disabled={logs.length === 0} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-700/30 flex-wrap">
        {(['DEBUG', 'INFO', 'WARN', 'ERROR'] as LogLevel[]).map(level => (
          <button
            key={level}
            onClick={() => toggleLevel(level)}
            className={`text-xs px-2 py-0.5 rounded border transition-colors ${
              levelFilter.has(level) ? LEVEL_BG[level] + ' border-current/30' : 'bg-transparent text-gray-600 border-gray-700'
            }`}
            aria-pressed={levelFilter.has(level)}
          >
            {level}
          </button>
        ))}
        <div className="flex items-center gap-1 ml-auto">
          <Search size={11} className="text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-28 bg-transparent text-xs text-gray-300 placeholder-gray-600 focus:outline-none border-b border-gray-700 focus:border-gray-500 pb-0.5"
            aria-label="Search logs"
          />
          <input
            type="text"
            value={tagFilter}
            onChange={e => setTagFilter(e.target.value)}
            placeholder="Tag..."
            className="w-20 bg-transparent text-xs text-gray-300 placeholder-gray-600 focus:outline-none border-b border-gray-700 focus:border-gray-500 pb-0.5"
            aria-label="Filter by tag"
          />
        </div>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto scrollbar-thin font-mono text-xs p-2 space-y-0.5">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2">
            <Terminal size={24} />
            {isRunning ? 'Waiting for logs...' : 'Start a debug session to see logs'}
          </div>
        ) : (
          filteredLogs.map(entry => (
            <LogLine key={entry.id} entry={entry} onCopy={copyLog} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-1.5 border-t border-gray-700/30 text-xs text-gray-600 flex justify-between">
        <span>{filteredLogs.length} / {logs.length} entries</span>
        {paused && <span className="text-yellow-500">⏸ Scroll paused</span>}
      </div>
    </div>
  );
}

function LogLine({ entry, onCopy }: { entry: LogEntry; onCopy: (e: LogEntry) => void }) {
  const [expanded, setExpanded] = useState(false);
  const time = entry.timestamp.slice(11, 23); // HH:MM:SS.mmm

  return (
    <div
      className="group flex gap-2 px-2 py-0.5 rounded hover:bg-gray-800/50 cursor-pointer"
      onClick={() => entry.stackTrace && setExpanded(e => !e)}
      role={entry.stackTrace ? 'button' : undefined}
      tabIndex={entry.stackTrace ? 0 : undefined}
      onKeyDown={e => e.key === 'Enter' && entry.stackTrace && setExpanded(x => !x)}
    >
      <span className="text-gray-600 shrink-0 w-28">{time}</span>
      <span className={`shrink-0 w-12 font-semibold ${LEVEL_COLORS[entry.level]}`}>{entry.level}</span>
      <span className="text-cyan-600 shrink-0 w-24 truncate">{entry.tag}</span>
      <span className={`flex-1 break-all ${LEVEL_COLORS[entry.level]}`}>
        {entry.message}
        {expanded && entry.stackTrace && (
          <pre className="mt-1 text-red-300/70 whitespace-pre-wrap text-xs">{entry.stackTrace}</pre>
        )}
      </span>
      <button
        onClick={e => { e.stopPropagation(); onCopy(entry); }}
        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-gray-400 shrink-0"
        aria-label="Copy log entry"
      >
        ⎘
      </button>
    </div>
  );
}

function ToolBtn({ onClick, icon, label, title, disabled }: { onClick: () => void; icon: React.ReactNode; label: string; title?: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      aria-label={label}
      className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {icon}
    </button>
  );
}
