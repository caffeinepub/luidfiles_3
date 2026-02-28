# Specification

## Summary
**Goal:** Optimize LuidFiles storage and delivery performance by implementing stable memory-backed chunked uploads, streaming downloads, and frontend caching for instant load times.

**Planned changes:**
- Refactor backend blob/chunk storage to use Stable Memory so data persists across canister upgrades without heap overflow
- Add `uploadChunk(fileId, chunkIndex, totalChunks, data)` and `finalizeUpload(fileId)` backend endpoints supporting out-of-order chunk receipt
- Add `getFileChunk(fileId, chunkIndex)` query and `getFileMetadata(fileId)` backend endpoints for streaming file delivery
- Update the `useChunkedUpload` hook to pipeline chunk uploads (2–3 concurrent chunks), displaying per-chunk progress percentage and estimated time remaining
- Implement a frontend caching layer using React Query stale-while-revalidate (staleTime ≥ 60s), in-memory Map for chunk blobs, and sessionStorage for file metadata
- Add a streaming download utility that fetches chunks sequentially, assembles them client-side into a Blob, and triggers a browser download with progress indicator

**User-visible outcome:** Users can upload and download large files reliably without timeouts, see real-time upload/download progress, and experience instant dashboard loads thanks to frontend caching.
