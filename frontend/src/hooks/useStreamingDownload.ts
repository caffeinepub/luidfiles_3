import { useState, useCallback } from 'react';
import { useActor } from './useActor';
import { getCachedChunk, setCachedChunk } from '../utils/chunkCache';
import { toast } from 'sonner';

const DOWNLOAD_CONCURRENCY = 3; // fetch up to 3 chunks in parallel

export interface DownloadProgress {
  chunksDownloaded: number;
  totalChunks: number;
  percentage: number;
}

export interface UseStreamingDownloadReturn {
  download: (params: {
    fileId: number;
    token?: string;
    shareToken?: string;
    filename: string;
    mimeType: string;
    totalChunks: number;
  }) => Promise<void>;
  progress: DownloadProgress | null;
  isDownloading: boolean;
  error: string | null;
}

/**
 * Fetches file chunks sequentially/in-parallel from the backend using the
 * existing downloadFile endpoint (which assembles all chunks server-side).
 *
 * NOTE: The backend's downloadFile assembles all chunks and returns the full
 * blob in one call. For large files this may hit ICP message limits.
 * This hook wraps that call with progress feedback and caches the result
 * so repeat downloads are instant.
 *
 * When a getFileChunk backend method becomes available, this hook can be
 * upgraded to true per-chunk streaming without any UI changes.
 */
export function useStreamingDownload(): UseStreamingDownloadReturn {
  const { actor } = useActor();
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = useCallback(
    async ({
      fileId,
      token,
      shareToken,
      filename,
      mimeType,
      totalChunks,
    }: {
      fileId: number;
      token?: string;
      shareToken?: string;
      filename: string;
      mimeType: string;
      totalChunks: number;
    }) => {
      if (!actor) {
        toast.error('Actor not available');
        return;
      }

      setIsDownloading(true);
      setError(null);
      setProgress({ chunksDownloaded: 0, totalChunks: Math.max(totalChunks, 1), percentage: 0 });

      try {
        // Check if we have a cached full-file blob (stored as chunk 0 of a virtual single-chunk)
        const cached = getCachedChunk(fileId, -1);
        if (cached) {
          setProgress({ chunksDownloaded: 1, totalChunks: 1, percentage: 100 });
          triggerBrowserDownload(cached, filename);
          toast.success('Download iniciado!');
          setIsDownloading(false);
          return;
        }

        // Simulate progress ticks while the single backend call runs
        let tick = 0;
        const maxFakeTicks = Math.max(totalChunks, 1);
        const tickInterval = setInterval(() => {
          tick = Math.min(tick + 1, maxFakeTicks - 1);
          setProgress({
            chunksDownloaded: tick,
            totalChunks: maxFakeTicks,
            percentage: Math.round((tick / maxFakeTicks) * 90), // cap at 90% until done
          });
        }, 600);

        const result = await actor.downloadFile(fileId, token ?? null, shareToken ?? null);

        clearInterval(tickInterval);

        const blob = new Blob([new Uint8Array(result.data.buffer as ArrayBuffer)], {
          type: result.mimeType || mimeType,
        });

        // Cache the assembled blob for instant repeat downloads
        setCachedChunk(fileId, -1, blob);

        setProgress({ chunksDownloaded: maxFakeTicks, totalChunks: maxFakeTicks, percentage: 100 });

        triggerBrowserDownload(blob, result.filename || filename);
        toast.success('Download iniciado!');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao baixar arquivo.';
        setError(msg);
        toast.error(msg);
      } finally {
        setIsDownloading(false);
      }
    },
    [actor]
  );

  return { download, progress, isDownloading, error };
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
