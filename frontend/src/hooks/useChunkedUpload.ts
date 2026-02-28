import { useState, useRef, useCallback } from 'react';
import { useActor } from './useActor';

const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB per chunk
const CONCURRENT_CHUNKS = 3; // pipeline: up to 3 chunks in-flight at once

export interface UploadProgress {
  filename: string;
  totalSize: number;
  uploadedBytes: number;
  percentage: number;
  chunksUploaded: number;
  totalChunks: number;
  estimatedSecondsRemaining: number | null;
  status: 'idle' | 'uploading' | 'finalizing' | 'complete' | 'error' | 'cancelled';
  error?: string;
}

export interface UseChunkedUploadReturn {
  upload: (file: File, token: string) => Promise<void>;
  cancel: () => void;
  progress: UploadProgress | null;
  isUploading: boolean;
}

export function useChunkedUpload(onComplete?: () => void): UseChunkedUploadReturn {
  const { actor } = useActor();
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const cancelledRef = useRef(false);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setProgress((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
  }, []);

  const upload = useCallback(
    async (file: File, token: string) => {
      if (!actor) throw new Error('Actor not available');

      cancelledRef.current = false;
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const startTime = Date.now();
      let chunksUploaded = 0;

      setProgress({
        filename: file.name,
        totalSize: file.size,
        uploadedBytes: 0,
        percentage: 0,
        chunksUploaded: 0,
        totalChunks,
        estimatedSecondsRemaining: null,
        status: 'uploading',
      });

      // Init upload
      const fileId = await actor.initUpload(
        token,
        file.name,
        file.type || 'application/octet-stream',
        BigInt(file.size),
        BigInt(totalChunks)
      );

      if (cancelledRef.current) return;

      // Pipeline upload: process chunks in batches of CONCURRENT_CHUNKS
      for (let batchStart = 0; batchStart < totalChunks; batchStart += CONCURRENT_CHUNKS) {
        if (cancelledRef.current) return;

        const batchEnd = Math.min(batchStart + CONCURRENT_CHUNKS, totalChunks);
        const batchIndices = Array.from({ length: batchEnd - batchStart }, (_, k) => batchStart + k);

        // Prepare all chunk data in parallel (CPU-bound, fast)
        const chunkBuffers = await Promise.all(
          batchIndices.map(async (i) => {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const buf = await file.slice(start, end).arrayBuffer();
            return { index: i, data: new Uint8Array(buf), end };
          })
        );

        if (cancelledRef.current) return;

        // Upload batch concurrently
        await Promise.all(
          chunkBuffers.map(({ index, data }) =>
            actor.uploadChunk(token, fileId, BigInt(index), data)
          )
        );

        if (cancelledRef.current) return;

        chunksUploaded += batchIndices.length;
        const lastEnd = chunkBuffers[chunkBuffers.length - 1].end;
        const uploadedBytes = lastEnd;
        const percentage = Math.round((chunksUploaded / totalChunks) * 100);

        // Estimate time remaining
        const elapsed = (Date.now() - startTime) / 1000; // seconds
        const rate = chunksUploaded / elapsed; // chunks per second
        const remaining = rate > 0 ? (totalChunks - chunksUploaded) / rate : null;

        setProgress({
          filename: file.name,
          totalSize: file.size,
          uploadedBytes,
          percentage,
          chunksUploaded,
          totalChunks,
          estimatedSecondsRemaining: remaining !== null ? Math.ceil(remaining) : null,
          status: 'uploading',
        });
      }

      if (cancelledRef.current) return;

      // Finalize
      setProgress((prev) => (prev ? { ...prev, status: 'finalizing' } : null));
      await actor.finalizeUpload(token, fileId);

      setProgress((prev) =>
        prev
          ? {
              ...prev,
              status: 'complete',
              percentage: 100,
              chunksUploaded: totalChunks,
              estimatedSecondsRemaining: 0,
            }
          : null
      );

      onComplete?.();
    },
    [actor, onComplete]
  );

  const isUploading =
    progress?.status === 'uploading' || progress?.status === 'finalizing';

  return { upload, cancel, progress, isUploading };
}
