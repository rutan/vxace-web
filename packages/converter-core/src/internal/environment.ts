export interface SourceFileList {
  files: string[];
  ignoredFiles: string[];
}

export interface ConversionSource {
  listFiles(): Promise<SourceFileList>;
  readFile(relativePath: string): Promise<Uint8Array>;
  fileExists(relativePath: string): Promise<boolean>;
}

export interface ConversionOutput {
  writeFile(relativePath: string, content: string | Uint8Array): Promise<void>;
  removeDirectory(relativePath: string): Promise<void>;
}

export interface ConversionRuntime {
  sha256Hex(parts: readonly (string | Uint8Array)[]): Promise<string>;
  inflate(bytes: Uint8Array): Promise<Uint8Array>;
  concatBytes(chunks: readonly Uint8Array[], byteLength: number): Uint8Array;
}
