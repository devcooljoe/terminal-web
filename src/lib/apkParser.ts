import type { ApkMetadata } from '../types/protocol';

// APK is a ZIP file. AndroidManifest.xml inside is binary-encoded (AXML).
// We extract package name and version by parsing the binary AXML format.

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Minimal ZIP central directory parser to find AndroidManifest.xml offset
function findFileInZip(data: Uint8Array, filename: string): Uint8Array | null {
  // Search for local file header signature 0x04034b50
  const sig = [0x50, 0x4b, 0x03, 0x04];
  for (let i = 0; i < data.length - 30; i++) {
    if (data[i] === sig[0] && data[i+1] === sig[1] && data[i+2] === sig[2] && data[i+3] === sig[3]) {
      const compression = data[i+8] | (data[i+9] << 8);
      const compressedSize = data[i+18] | (data[i+19] << 8) | (data[i+20] << 16) | (data[i+21] << 24);
      const filenameLen = data[i+26] | (data[i+27] << 8);
      const extraLen = data[i+28] | (data[i+29] << 8);
      const fileNameBytes = data.slice(i+30, i+30+filenameLen);
      const entryName = new TextDecoder().decode(fileNameBytes);
      if (entryName === filename && compression === 0) {
        const dataStart = i + 30 + filenameLen + extraLen;
        return data.slice(dataStart, dataStart + compressedSize);
      }
    }
  }
  return null;
}

// Parse binary Android XML (AXML) to extract package, versionName, versionCode
function parseAXML(data: Uint8Array): { packageName?: string; versionName?: string; versionCode?: number } {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const result: { packageName?: string; versionName?: string; versionCode?: number } = {};

  try {
    // String pool starts at offset 8
    if (view.getUint32(0, true) !== 0x00080003) return result; // AXML magic

    const stringPoolOffset = 8;
    const stringPoolSize = view.getUint32(stringPoolOffset + 4, true);
    const stringCount = view.getUint32(stringPoolOffset + 8, true);
    const stringsStart = view.getUint32(stringPoolOffset + 20, true);

    const strings: string[] = [];
    for (let i = 0; i < stringCount; i++) {
      const offsetIdx = stringPoolOffset + 28 + i * 4;
      if (offsetIdx + 4 > data.length) break;
      const strOffset = view.getUint32(offsetIdx, true);
      const absOffset = stringPoolOffset + stringsStart + strOffset;
      if (absOffset + 2 > data.length) { strings.push(''); continue; }
      const len = view.getUint16(absOffset, true);
      if (absOffset + 2 + len * 2 > data.length) { strings.push(''); continue; }
      let str = '';
      for (let j = 0; j < len; j++) {
        str += String.fromCharCode(view.getUint16(absOffset + 2 + j * 2, true));
      }
      strings.push(str);
    }

    // Walk XML nodes after string pool
    let pos = stringPoolOffset + stringPoolSize;
    while (pos < data.length - 16) {
      const chunkType = view.getUint16(pos, true);
      const chunkSize = view.getUint32(pos + 4, true);
      if (chunkSize === 0 || chunkSize > data.length) break;

      if (chunkType === 0x0102) { // START_ELEMENT
        const attrCount = view.getUint16(pos + 20, true);
        const attrStart = pos + 28;
        for (let a = 0; a < attrCount; a++) {
          const attrOff = attrStart + a * 20;
          if (attrOff + 20 > data.length) break;
          const nameIdx = view.getUint32(attrOff + 4, true);
          const valueType = view.getUint8(attrOff + 15);
          const valueData = view.getInt32(attrOff + 16, true);
          const strIdx = view.getUint32(attrOff + 8, true);
          const name = nameIdx < strings.length ? strings[nameIdx] : '';

          if (name === 'package' && valueType === 0x03 && strIdx < strings.length) {
            result.packageName = strings[strIdx];
          } else if (name === 'versionName' && valueType === 0x03 && strIdx < strings.length) {
            result.versionName = strings[strIdx];
          } else if (name === 'versionCode' && valueType === 0x10) {
            result.versionCode = valueData;
          }
        }
      }
      pos += chunkSize;
    }
  } catch {
    // Parsing failed — return partial results
  }
  return result;
}

export async function extractApkMetadata(file: File): Promise<ApkMetadata> {
  // Read only first 5MB for metadata extraction (manifest is near the start)
  const sliceSize = Math.min(file.size, 5 * 1024 * 1024);
  const slice = await file.slice(0, sliceSize).arrayBuffer();
  const data = new Uint8Array(slice);

  // SHA-256 of full file
  const fullBuffer = await file.arrayBuffer();
  const sha256 = await sha256Hex(fullBuffer);

  const meta: ApkMetadata = { fileName: file.name, size: file.size, sha256 };

  const manifest = findFileInZip(data, 'AndroidManifest.xml');
  if (manifest) {
    const parsed = parseAXML(manifest);
    meta.packageName = parsed.packageName;
    meta.versionName = parsed.versionName;
    meta.versionCode = parsed.versionCode;
  }

  return meta;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatSpeed(bps: number): string {
  if (bps < 1024) return `${bps.toFixed(0)} B/s`;
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
  return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
}
