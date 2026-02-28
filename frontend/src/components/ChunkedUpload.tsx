import { useRef, useState } from 'react';
import { Upload, X, FileIcon, Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useChunkedUpload } from '../hooks/useChunkedUpload';
import { formatFileSize } from '../utils/fileIcons';
import { Progress } from '@/components/ui/progress';

interface ChunkedUploadProps {
  token: string;
  onUploadComplete: () => void;
}

function formatEta(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return '';
  if (seconds < 60) return `~${seconds}s restantes`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `~${m}m ${s}s restantes`;
}

export default function ChunkedUpload({ token, onUploadComplete }: ChunkedUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { upload, cancel, progress, isUploading } = useChunkedUpload(onUploadComplete);

  const isDone = progress?.status === 'complete';
  const isCancelled = progress?.status === 'cancelled';
  const error = progress?.status === 'error' ? (progress.error ?? 'Upload failed') : null;
  const progressPercent = progress?.percentage ?? 0;
  const eta = progress?.estimatedSecondsRemaining ?? null;

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = () => {
    if (selectedFile) upload(selectedFile, token);
  };

  const handleCancel = () => {
    cancel();
  };

  const handleReset = () => {
    setSelectedFile(null);
  };

  return (
    <div className="border border-border rounded-xl bg-card p-6 space-y-4">
      {/* Drop zone */}
      {!isUploading && !isDone && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !selectedFile && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-primary bg-primary/5'
              : selectedFile
              ? 'border-primary/40 bg-primary/5'
              : 'border-muted-foreground/30 hover:border-primary/40 hover:bg-muted/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleInputChange}
          />

          {selectedFile ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm truncate max-w-xs">{selectedFile.name}</p>
                <p className="text-muted-foreground text-xs mt-1">{formatFileSize(selectedFile.size)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleReset(); }}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Remover arquivo
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <Upload className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Arraste um arquivo aqui</p>
                <p className="text-muted-foreground text-sm mt-1">ou clique para selecionar</p>
              </div>
              <p className="text-muted-foreground text-xs">Qualquer tipo e tamanho de arquivo</p>
            </div>
          )}
        </div>
      )}

      {/* Upload button (when file selected, not uploading) */}
      {selectedFile && !isUploading && !isDone && (
        <button
          onClick={handleUpload}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Iniciar Upload
        </button>
      )}

      {/* Upload progress */}
      {isUploading && progress && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm truncate">{progress.filename}</p>
              <p className="text-muted-foreground text-xs">
                {formatFileSize(progress.uploadedBytes)} / {formatFileSize(progress.totalSize)}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground">{progressPercent}%</span>
              <span className="text-xs text-muted-foreground">
                {progress.status === 'finalizing'
                  ? 'Finalizando...'
                  : `Chunk ${progress.chunksUploaded} / ${progress.totalChunks}`}
              </span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            {/* ETA row */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {progress.status === 'finalizing'
                  ? 'Salvando no servidor...'
                  : `${progress.chunksUploaded} de ${progress.totalChunks} fragmentos enviados`}
              </span>
              {eta !== null && eta > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatEta(eta)}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleCancel}
            className="w-full py-2.5 rounded-xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/5 transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancelar Upload
          </button>
        </div>
      )}

      {/* Cancelled state */}
      {isCancelled && (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <X className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm mb-3">Upload cancelado.</p>
          <button
            onClick={handleReset}
            className="text-primary text-sm font-medium hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <p className="text-destructive text-sm mb-3">{error}</p>
          <button
            onClick={handleReset}
            className="text-primary text-sm font-medium hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Success state */}
      {isDone && (
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Upload concluído!</h3>
          <p className="text-muted-foreground text-sm mb-4">Seu arquivo foi enviado com sucesso.</p>
          <button
            onClick={handleReset}
            className="text-primary text-sm font-medium hover:underline"
          >
            Enviar outro arquivo
          </button>
        </div>
      )}
    </div>
  );
}
