// Protocol message types — keep in sync with Android MessageType.java

export type MessageType =
  | 'PAIR_REQUEST' | 'PAIR_RESPONSE' | 'PAIR_ACCEPTED' | 'PAIR_REJECTED' | 'PAIR_ERROR'
  | 'DEVICE_INFO' | 'DEVICE_STATUS' | 'HEARTBEAT' | 'HEARTBEAT_ACK'
  | 'TRANSFER_START' | 'TRANSFER_CHUNK' | 'TRANSFER_PAUSE' | 'TRANSFER_RESUME'
  | 'TRANSFER_CANCEL' | 'TRANSFER_COMPLETE' | 'TRANSFER_ERROR' | 'TRANSFER_PROGRESS'
  | 'INSTALL_START' | 'INSTALL_PROGRESS' | 'INSTALL_SUCCESS' | 'INSTALL_ERROR'
  | 'LAUNCH_APP' | 'STOP_APP' | 'RESTART_APP' | 'APP_STARTED' | 'APP_STOPPED' | 'APP_CRASHED'
  | 'GET_APP_STATUS' | 'APP_STATUS'
  | 'DEBUG_START' | 'DEBUG_STARTED' | 'DEBUG_STOP' | 'DEBUG_STOPPED'
  | 'LOG_ENTRY' | 'LOG_BATCH'
  | 'APP_LIST' | 'GET_APP_LIST' | 'ADD_APP'
  | 'ERROR' | 'PEER_DISCONNECTED'
  | 'SDP_OFFER' | 'SDP_ANSWER' | 'ICE_CANDIDATE'
  | 'DEVICE_REGISTER' | 'BROWSER_PAIR' | 'PAIRING_CODE' | 'RELAY';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
export type AppStatus = 'RUNNING' | 'STOPPED' | 'CRASHED' | 'UNKNOWN';
export type DebugSessionState = 'IDLE' | 'STARTING' | 'RUNNING' | 'STOPPING' | 'STOPPED' | 'ERROR';
export type TransferState = 'IDLE' | 'TRANSFERRING' | 'PAUSED' | 'COMPLETE' | 'ERROR' | 'CANCELLED';
export type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'PAIRING' | 'CONNECTED';

export interface InstalledApp {
  packageName: string;
  appName?: string;
  fileName: string;
  versionName: string;
  versionCode?: number;
  installedAt: number;
  installed: boolean;
}

export type TransportMode = 'LOCAL_LAN' | 'INTERNET' | 'RELAY' | 'UNKNOWN';

export interface TransportInfo {
  mode: TransportMode;
  localIp?: string;       // Android LAN IP
  peerIp?: string;        // browser-side candidate IP
  candidateType?: string; // host / srflx / relay
  latencyMs?: number;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  manufacturer: string;
  model: string;
  androidVersion: string;
  agentVersion: string;
  isDeviceOwner: boolean;
  canSilentInstall: boolean;
  lanIp?: string;         // Android LAN IP address
  wifiSsid?: string;      // Android Wi-Fi SSID
  currentApp?: string;
  currentAppVersion?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  tag: string;
  message: string;
  stackTrace?: string;
}

export interface ApkMetadata {
  fileName: string;
  size: number;
  sha256: string;
  packageName?: string;
  versionName?: string;
  versionCode?: number;
}

export interface TransferProgress {
  transferId: string;
  bytesTransferred: number;
  totalBytes: number;
  speedBps: number;
  estimatedSecondsRemaining: number;
}

export interface Message {
  type: MessageType;
  [key: string]: unknown;
}
