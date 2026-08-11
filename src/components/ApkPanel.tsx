import { useCallback, useState, useRef } from 'react';
import { Upload, FileCode, X, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { ApkMetadata, TransferState, TransferProgress } from '../types/protocol';
import { extractApkMetadata, formatBytes, formatSpeed } from '../lib/apkParser';

interface Props {
  connected: boolean;
  transferState: TransferState;
  transferProgress: TransferProgress | null;
  onSend: (file: File, meta: ApkMetadata) => void;
  onCancel: () => void;
}

export function ApkPanel({ connected, transferState, transferProgress, onSend, onCancel }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<ApkMetadata | null>(null);
  const [parsing, setParsing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (f: File) => {
    if (!f.name.endsWith('.apk')) return;
    setFile(f);
    setMeta(null);
    setParsing(true);
    try {
      const m = await extractApkMetadata(f);
      setMeta(m);
    } finally {
      setParsing(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, [processFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  }, [processFile]);

  const handleSend = () => {
    if (file && meta) onSend(file, meta);
  };

  const handleClear = () => {
    setFile(null);
    setMeta(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const isTransferring = transferState === 'TRANSFERRING';
  const pct = transferProgress
    ? Math.round((transferProgress.bytesTransferred / transferProgress.totalBytes) * 100)
    : 0;

  return (
    <div className="bg-gray-900 border border-gray-700/50 rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
        <FileCode size={14} /> APK Deployment
      </h2>

      {!file ? (
        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-blue-500 bg-blue-900/10' : 'border-gray-700 hover:border-gray-500'
          }`}
          role="button"
          tabIndex={0}
          aria-label="Drop APK file here or click to select"
          onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
        >
          <Upload size={24} className="mx-auto mb-2 text-gray-500" />
          <p className="text-gray-400 text-sm">Drop APK here</p>
          <p className="text-gray-600 text-xs mt-1">or click to select</p>
          <input ref={inputRef} type="file" accept=".apk" onChange={onFileChange} className="hidden" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-gray-800 rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <FileCode size={16} className="text-blue-400 shrink-0 mt-0.5" />
                <span className="text-sm text-white font-medium break-all">{file.name}</span>
              </div>
              {!isTransferring && (
                <button onClick={handleClear} className="text-gray-500 hover:text-gray-300 ml-2 shrink-0" aria-label="Remove file">
                  <X size={14} />
                </button>
              )}
            </div>

            {parsing ? (
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <Loader2 size={12} className="animate-spin" /> Parsing APK metadata...
              </div>
            ) : meta && (
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs mt-2">
                <MetaRow label="Size" value={formatBytes(meta.size)} />
                {meta.packageName && <MetaRow label="Package" value={meta.packageName} />}
                {meta.versionName && <MetaRow label="Version" value={meta.versionName} />}
                {meta.versionCode !== undefined && <MetaRow label="Version Code" value={String(meta.versionCode)} />}
                <MetaRow label="SHA-256" value={`${meta.sha256.slice(0, 16)}...`} title={meta.sha256} />
              </div>
            )}
          </div>

          {isTransferring && transferProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-400">
                <span>{formatBytes(transferProgress.bytesTransferred)} / {formatBytes(transferProgress.totalBytes)}</span>
                <span>{formatSpeed(transferProgress.speedBps)}</span>
                <span>~{Math.ceil(transferProgress.estimatedSecondsRemaining)}s</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-blue-400">{pct}% transferred</span>
                <button onClick={onCancel} className="text-xs text-red-400 hover:text-red-300">Cancel</button>
              </div>
            </div>
          )}

          {transferState === 'COMPLETE' && (
            <div className="flex items-center gap-2 text-green-400 text-xs">
              <CheckCircle size={12} /> Transfer complete — verifying on device...
            </div>
          )}

          {transferState === 'ERROR' && (
            <div className="flex items-center gap-2 text-red-400 text-xs">
              <AlertCircle size={12} /> Transfer failed
            </div>
          )}

          {!isTransferring && transferState !== 'COMPLETE' && (
            <button
              onClick={handleSend}
              disabled={!connected || !meta || parsing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded text-sm text-white transition-colors"
            >
              <Send size={14} />
              {!connected ? 'Connect device first' : 'Send to POS'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function MetaRow({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <>
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-300 font-mono" title={title}>{value}</span>
    </>
  );
}
