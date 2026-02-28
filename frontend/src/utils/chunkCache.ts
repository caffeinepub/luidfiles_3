/**
 * Module-level in-memory cache for downloaded file chunks.
 * Keys are `${fileId}_${chunkIndex}` strings.
 */
const chunkMap = new Map<string, Blob>();

export function getCachedChunk(fileId: number, chunkIndex: number): Blob | undefined {
  return chunkMap.get(`${fileId}_${chunkIndex}`);
}

export function setCachedChunk(fileId: number, chunkIndex: number, blob: Blob): void {
  chunkMap.set(`${fileId}_${chunkIndex}`, blob);
}

export function clearChunkCache(): void {
  chunkMap.clear();
}

// ── SessionStorage file metadata persistence ──────────────────────────────────

const SESSION_KEY = 'luidfiles_metadata_cache';

export interface CachedFileMeta {
  fileId: number;
  filename: string;
  mimeType: string;
  totalSize: number;
  totalChunks: number;
  created: number;
  shareToken?: string;
  owner: number;
}

export function persistFileMetadata(files: CachedFileMeta[]): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(files));
  } catch {
    // sessionStorage may be unavailable in some environments
  }
}

export function loadFileMetadata(): CachedFileMeta[] | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedFileMeta[];
  } catch {
    return null;
  }
}

export function clearFileMetadataCache(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
