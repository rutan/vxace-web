export interface ZipFileEntry {
  path: string;
  content: Uint8Array;
}

const textEncoder = new TextEncoder();
const crcTable = new Uint32Array(256);

for (let index = 0; index < crcTable.length; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crcTable[index] = value >>> 0;
}

export const createZip = (entries: ZipFileEntry[]) => {
  const normalizedEntries = entries
    .map((entry) => ({
      path: normalizeZipPath(entry.path),
      content: entry.content,
    }))
    .filter((entry) => entry.path.length > 0)
    .sort((left, right) => left.path.localeCompare(right.path));
  const chunks: Uint8Array[] = [];
  const centralDirectory: Uint8Array[] = [];
  let offset = 0;

  for (const entry of normalizedEntries) {
    const encodedPath = textEncoder.encode(entry.path);
    const crc = crc32(entry.content);
    const localHeader = createLocalHeader({
      compressedSize: entry.content.byteLength,
      crc,
      filename: encodedPath,
      offset,
      uncompressedSize: entry.content.byteLength,
    });

    chunks.push(localHeader, entry.content);
    centralDirectory.push(
      createCentralDirectoryHeader({
        compressedSize: entry.content.byteLength,
        crc,
        filename: encodedPath,
        offset,
        uncompressedSize: entry.content.byteLength,
      }),
    );
    offset += localHeader.byteLength + entry.content.byteLength;
  }

  const centralDirectoryOffset = offset;
  const centralDirectorySize = byteLength(centralDirectory);
  chunks.push(...centralDirectory);
  chunks.push(
    createEndOfCentralDirectory({
      centralDirectoryOffset,
      centralDirectorySize,
      entryCount: normalizedEntries.length,
    }),
  );

  return new Blob(chunks.map(toBlobPart), { type: 'application/zip' });
};

const createLocalHeader = (input: ZipHeaderInput) => {
  const bytes = new Uint8Array(30 + input.filename.byteLength);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, input.crc, true);
  view.setUint32(18, input.compressedSize, true);
  view.setUint32(22, input.uncompressedSize, true);
  view.setUint16(26, input.filename.byteLength, true);
  view.setUint16(28, 0, true);
  bytes.set(input.filename, 30);
  return bytes;
};

const createCentralDirectoryHeader = (input: ZipHeaderInput) => {
  const bytes = new Uint8Array(46 + input.filename.byteLength);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, 0, true);
  view.setUint32(16, input.crc, true);
  view.setUint32(20, input.compressedSize, true);
  view.setUint32(24, input.uncompressedSize, true);
  view.setUint16(28, input.filename.byteLength, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, input.offset, true);
  bytes.set(input.filename, 46);
  return bytes;
};

const createEndOfCentralDirectory = (input: {
  centralDirectoryOffset: number;
  centralDirectorySize: number;
  entryCount: number;
}) => {
  const bytes = new Uint8Array(22);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, input.entryCount, true);
  view.setUint16(10, input.entryCount, true);
  view.setUint32(12, input.centralDirectorySize, true);
  view.setUint32(16, input.centralDirectoryOffset, true);
  view.setUint16(20, 0, true);
  return bytes;
};

interface ZipHeaderInput {
  compressedSize: number;
  crc: number;
  filename: Uint8Array;
  offset: number;
  uncompressedSize: number;
}

const crc32 = (content: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of content) {
    crc = (crc >>> 8) ^ (crcTable[(crc ^ byte) & 0xff] ?? 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const byteLength = (chunks: Uint8Array[]) => {
  return chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
};

const normalizeZipPath = (path: string) => {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/');
};

const toBlobPart = (bytes: Uint8Array): ArrayBuffer => {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
};
