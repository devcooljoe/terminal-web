import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ConnectionState, DeviceInfo, Message, ApkMetadata,
  TransferProgress, TransferState, LogEntry, DebugSessionState, AppStatus,
} from '../types/protocol';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || 'ws://localhost:8080';
const CHUNK_SIZE = 64 * 1024; // 64 KB chunks
const BUFFER_HIGH = 4 * 1024 * 1024; // 4 MB — pause sending
const HEARTBEAT_INTERVAL = 15_000;

export interface PosConnection {
  connectionState: ConnectionState;
  signalingState: string;
  deviceInfo: DeviceInfo | null;
  appStatus: AppStatus;
  transferState: TransferState;
  transferProgress: TransferProgress | null;
  debugState: DebugSessionState;
  logs: LogEntry[];
  installMessage: string;
  error: string | null;

  // Actions
  connect: (pairingCode: string) => void;
  disconnect: () => void;
  sendApk: (file: File, meta: ApkMetadata) => void;
  cancelTransfer: () => void;
  launchApp: (packageName: string) => void;
  stopApp: (packageName: string) => void;
  startDebug: (packageName: string) => void;
  stopDebug: () => void;
  clearLogs: () => void;
  exportLogs: () => void;
}

export function usePosConnection(): PosConnection {
  const [connectionState, setConnectionState] = useState<ConnectionState>('DISCONNECTED');
  const [signalingState, setSignalingState] = useState('disconnected');
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [appStatus, setAppStatus] = useState<AppStatus>('UNKNOWN');
  const [transferState, setTransferState] = useState<TransferState>('IDLE');
  const [transferProgress, setTransferProgress] = useState<TransferProgress | null>(null);
  const [debugState, setDebugState] = useState<DebugSessionState>('IDLE');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [installMessage, setInstallMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transferRef = useRef<{ file: File; meta: ApkMetadata; cancelled: boolean; paused: boolean } | null>(null);
  const logIdRef = useRef(0);

  const sendDC = useCallback((msg: object) => {
    if (dcRef.current?.readyState === 'open') {
      dcRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const handleDCMessage = useCallback((msg: Message) => {
    switch (msg.type) {
      case 'DEVICE_INFO':
        setDeviceInfo(msg.deviceInfo as DeviceInfo);
        break;
      case 'DEVICE_STATUS':
        setAppStatus((msg.appStatus as AppStatus) || 'UNKNOWN');
        break;
      case 'TRANSFER_PROGRESS':
        setTransferProgress(msg.progress as TransferProgress);
        break;
      case 'TRANSFER_COMPLETE':
        setTransferState('COMPLETE');
        setTransferProgress(null);
        break;
      case 'TRANSFER_ERROR':
        setTransferState('ERROR');
        setError(`Transfer error: ${msg.reason}`);
        break;
      case 'INSTALL_START':
        setInstallMessage('Installing APK...');
        break;
      case 'INSTALL_PROGRESS':
        setInstallMessage(`Installing: ${msg.progress}%`);
        break;
      case 'INSTALL_SUCCESS':
        setInstallMessage(`✓ Installed: ${msg.packageName}`);
        setAppStatus('STOPPED');
        break;
      case 'INSTALL_ERROR':
        setInstallMessage(`✗ Installation failed: ${msg.reason}`);
        setError(`Installation failed: ${msg.reason}`);
        break;
      case 'APP_STARTED':
        setAppStatus('RUNNING');
        break;
      case 'APP_STOPPED':
        setAppStatus('STOPPED');
        break;
      case 'APP_CRASHED':
        setAppStatus('CRASHED');
        break;
      case 'APP_STATUS':
        setAppStatus((msg.status as AppStatus) || 'UNKNOWN');
        break;
      case 'DEBUG_STARTED':
        setDebugState('RUNNING');
        break;
      case 'DEBUG_STOPPED':
        setDebugState('STOPPED');
        setTimeout(() => setDebugState('IDLE'), 1000);
        break;
      case 'LOG_ENTRY': {
        const entry = msg.entry as LogEntry;
        entry.id = String(++logIdRef.current);
        setLogs(prev => [...prev.slice(-4999), entry]);
        break;
      }
      case 'LOG_BATCH': {
        const entries = (msg.entries as LogEntry[]).map(e => ({ ...e, id: String(++logIdRef.current) }));
        setLogs(prev => [...prev.slice(-4999 + entries.length), ...entries]);
        break;
      }
      case 'ERROR':
        setError(msg.reason as string);
        break;
    }
  }, []);

  const setupDataChannel = useCallback((dc: RTCDataChannel) => {
    dcRef.current = dc;
    dc.binaryType = 'arraybuffer';

    dc.onopen = () => {
      setConnectionState('CONNECTED');
      sendDC({ type: 'DEVICE_INFO' }); // request device info
    };

    dc.onclose = () => {
      setConnectionState('DISCONNECTED');
      setSignalingState('disconnected');
    };

    dc.onmessage = (e) => {
      if (typeof e.data === 'string') {
        try { handleDCMessage(JSON.parse(e.data)); } catch { /* ignore */ }
      }
    };
  }, [sendDC, handleDCMessage]);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ICE_CANDIDATE', candidate: e.candidate }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setConnectionState('DISCONNECTED');
      }
    };

    return pc;
  }, []);

  const connect = useCallback((pairingCode: string) => {
    setError(null);
    setConnectionState('CONNECTING');

    const ws = new WebSocket(SIGNALING_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setSignalingState('connected');
      setConnectionState('PAIRING');
      ws.send(JSON.stringify({
        type: 'BROWSER_PAIR',
        code: pairingCode,
        browserInfo: { userAgent: navigator.userAgent, platform: navigator.platform },
      }));
    };

    ws.onerror = () => {
      setError('Cannot connect to signaling server');
      setConnectionState('DISCONNECTED');
    };

    ws.onclose = () => {
      setSignalingState('disconnected');
      if (connectionState !== 'CONNECTED') setConnectionState('DISCONNECTED');
    };

    ws.onmessage = async (e) => {
      let msg: Message;
      try { msg = JSON.parse(e.data); } catch { return; }

      switch (msg.type) {
        case 'PAIR_ERROR':
        case 'PAIR_REJECTED':
          setError(msg.reason as string || 'Pairing rejected');
          setConnectionState('DISCONNECTED');
          ws.close();
          break;

        case 'PAIR_ACCEPTED': {
          setDeviceInfo(msg.deviceInfo as DeviceInfo || null);
          const pc = createPeerConnection();
          const dc = pc.createDataChannel('pos-control', { ordered: true });
          setupDataChannel(dc);

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          ws.send(JSON.stringify({ type: 'SDP_OFFER', sdp: pc.localDescription }));
          break;
        }

        case 'SDP_ANSWER': {
          const pc = pcRef.current;
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp as RTCSessionDescriptionInit));
          break;
        }

        case 'ICE_CANDIDATE': {
          const pc = pcRef.current;
          if (pc && msg.candidate) {
            try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate as RTCIceCandidateInit)); } catch { /* ignore */ }
          }
          break;
        }

        case 'PEER_DISCONNECTED':
          setConnectionState('DISCONNECTED');
          setDeviceInfo(null);
          break;
      }
    };

    // Signaling heartbeat
    heartbeatRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'HEARTBEAT' }));
    }, HEARTBEAT_INTERVAL);
  }, [connectionState, createPeerConnection, setupDataChannel]);

  const disconnect = useCallback(() => {
    heartbeatRef.current && clearInterval(heartbeatRef.current);
    dcRef.current?.close();
    pcRef.current?.close();
    wsRef.current?.close();
    dcRef.current = null;
    pcRef.current = null;
    wsRef.current = null;
    setConnectionState('DISCONNECTED');
    setDeviceInfo(null);
    setDebugState('IDLE');
    setTransferState('IDLE');
    setTransferProgress(null);
  }, []);

  const sendApk = useCallback(async (file: File, meta: ApkMetadata) => {
    if (!dcRef.current || dcRef.current.readyState !== 'open') {
      setError('Not connected');
      return;
    }
    const transferId = crypto.randomUUID();
    transferRef.current = { file, meta, cancelled: false, paused: false };
    setTransferState('TRANSFERRING');
    setError(null);

    sendDC({ type: 'TRANSFER_START', transferId, ...meta });

    const startTime = Date.now();
    let bytesSent = 0;

    const sendChunks = async () => {
      const dc = dcRef.current!;
      let offset = 0;

      while (offset < file.size) {
        if (transferRef.current?.cancelled) {
          sendDC({ type: 'TRANSFER_CANCEL', transferId });
          setTransferState('CANCELLED');
          return;
        }

        // Backpressure: wait if buffer is full
        while (dc.bufferedAmount > BUFFER_HIGH) {
          await new Promise(r => setTimeout(r, 50));
          if (transferRef.current?.cancelled) {
            sendDC({ type: 'TRANSFER_CANCEL', transferId });
            setTransferState('CANCELLED');
            return;
          }
        }

        const chunk = file.slice(offset, offset + CHUNK_SIZE);
        const buffer = await chunk.arrayBuffer();

        // Send chunk header as JSON, then binary data
        sendDC({ type: 'TRANSFER_CHUNK', transferId, offset, size: buffer.byteLength });
        dc.send(buffer);

        offset += buffer.byteLength;
        bytesSent += buffer.byteLength;

        const elapsed = (Date.now() - startTime) / 1000;
        const speedBps = bytesSent / elapsed;
        const remaining = (file.size - bytesSent) / speedBps;

        setTransferProgress({
          transferId,
          bytesTransferred: bytesSent,
          totalBytes: file.size,
          speedBps,
          estimatedSecondsRemaining: remaining,
        });
      }

      sendDC({ type: 'TRANSFER_COMPLETE', transferId, sha256: meta.sha256 });
    };

    try {
      await sendChunks();
    } catch (err) {
      setTransferState('ERROR');
      setError(`Transfer failed: ${err}`);
      sendDC({ type: 'TRANSFER_ERROR', transferId, reason: String(err) });
    }
  }, [sendDC]);

  const cancelTransfer = useCallback(() => {
    if (transferRef.current) transferRef.current.cancelled = true;
  }, []);

  const launchApp = useCallback((packageName: string) => {
    sendDC({ type: 'LAUNCH_APP', packageName });
  }, [sendDC]);

  const stopApp = useCallback((packageName: string) => {
    sendDC({ type: 'STOP_APP', packageName });
  }, [sendDC]);

  const startDebug = useCallback((packageName: string) => {
    setDebugState('STARTING');
    setLogs([]);
    sendDC({ type: 'DEBUG_START', packageName });
  }, [sendDC]);

  const stopDebug = useCallback(() => {
    setDebugState('STOPPING');
    sendDC({ type: 'DEBUG_STOP' });
  }, [sendDC]);

  const clearLogs = useCallback(() => setLogs([]), []);

  const exportLogs = useCallback(() => {
    const content = logs.map(l =>
      `${l.timestamp} [${l.level}] ${l.tag}: ${l.message}${l.stackTrace ? '\n' + l.stackTrace : ''}`
    ).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }, [logs]);

  useEffect(() => () => disconnect(), [disconnect]);

  return {
    connectionState, signalingState, deviceInfo, appStatus,
    transferState, transferProgress, debugState, logs,
    installMessage, error,
    connect, disconnect, sendApk, cancelTransfer,
    launchApp, stopApp, startDebug, stopDebug, clearLogs, exportLogs,
  };
}
