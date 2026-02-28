import { useState } from 'react';
import { Download, Share2, Trash2, Loader2, Link2, Check } from 'lucide-react';
import type { File } from '../backend';
import { getFileIconInfo, formatFileSize, formatDate } from '../utils/fileIcons';
import { useDeleteFile, useGenerateShareLink } from '../hooks/useQueries';
import { useStreamingDownload } from '../hooks/useStreamingDownload';
import { getSessionToken } from '../hooks/useAuth';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface FileListProps {
  files: File[];
}

export default function FileList({ files }: FileListProps) {
  const token = getSessionToken();
  const deleteMutation = useDeleteFile();
  const shareMutation = useGenerateShareLink();
  const { download, progress: dlProgress, isDownloading } = useStreamingDownload();
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<number | null>(null);

  const handleDownload = async (file: File) => {
    setDownloadingFileId(file.fileId);
    try {
      await download({
        fileId: file.fileId,
        token: token ?? undefined,
        filename: file.filename,
        mimeType: file.mimeType,
        totalChunks: Number(file.totalChunks),
      });
    } finally {
      setDownloadingFileId(null);
    }
  };

  const handleShare = async (file: File) => {
    if (!token) return;
    try {
      const shareToken = await shareMutation.mutateAsync({ token, fileId: file.fileId });
      const shareUrl = `${window.location.origin}/share/${file.fileId}_${shareToken}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(file.fileId);
      toast.success('Link copiado para a área de transferência!');
      setTimeout(() => setCopiedId(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate link';
      toast.error(msg);
    }
  };

  const handleDelete = async (file: File) => {
    if (!token) return;
    if (!confirm(`Tem certeza que deseja excluir "${file.filename}"?`)) return;
    try {
      await deleteMutation.mutateAsync({ token, fileId: file.fileId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete file';
      toast.error(msg);
    }
  };

  if (files.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <Download className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-muted-foreground mb-1">Nenhum arquivo ainda</h3>
        <p className="text-muted-foreground text-sm">Faça upload do seu primeiro arquivo para começar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file) => {
        const iconInfo = getFileIconInfo(file.mimeType);
        const IconComponent = iconInfo.icon;
        const isDeleting = deleteMutation.isPending && deleteMutation.variables?.fileId === file.fileId;
        const isSharing = shareMutation.isPending && shareMutation.variables?.fileId === file.fileId;
        const isThisDownloading = isDownloading && downloadingFileId === file.fileId;
        const dlPct = isThisDownloading && dlProgress ? dlProgress.percentage : 0;

        return (
          <div
            key={file.fileId}
            className="group flex flex-col gap-2 p-3 sm:p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/30 transition-all duration-200"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              {/* File icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${iconInfo.color}20` }}
              >
                <IconComponent className="w-5 h-5" style={{ color: iconInfo.color }} />
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{file.filename}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-muted-foreground text-xs">{formatFileSize(file.totalSize)}</span>
                  <span className="text-muted-foreground/50 text-xs">•</span>
                  <span className="text-muted-foreground text-xs">{formatDate(file.created)}</span>
                  {file.shareToken && (
                    <>
                      <span className="text-muted-foreground/50 text-xs">•</span>
                      <span className="text-primary text-xs flex items-center gap-1">
                        <Link2 className="w-3 h-3" />
                        Compartilhado
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDownload(file)}
                  disabled={isThisDownloading || isDownloading}
                  title="Download"
                  className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
                >
                  {isThisDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </button>

                <button
                  onClick={() => handleShare(file)}
                  disabled={isSharing}
                  title="Gerar link público"
                  className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
                >
                  {isSharing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : copiedId === file.fileId ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                </button>

                <button
                  onClick={() => handleDelete(file)}
                  disabled={isDeleting}
                  title="Excluir"
                  className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Per-file download progress bar */}
            {isThisDownloading && dlProgress && (
              <div className="space-y-1 px-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Baixando...</span>
                  <span>{dlProgress.percentage}%</span>
                </div>
                <Progress value={dlProgress.percentage} className="h-1.5" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
