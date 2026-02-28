import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useGetMe, useListFiles, useGetMyStorageStats } from '../hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { Role } from '../backend';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload, HardDrive, LogOut, Settings, Zap } from 'lucide-react';
import FileList from '../components/FileList';
import ChunkedUpload from '../components/ChunkedUpload';
import {
  loadFileMetadata,
  persistFileMetadata,
  type CachedFileMeta,
} from '../utils/chunkCache';

interface DashboardPageProps {
  token: string;
  onLogout: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function DashboardPage({ token, onLogout }: DashboardPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me, isLoading: meLoading } = useGetMe(token);
  const { data: files, isLoading: filesLoading } = useListFiles(token);
  const { data: storageStats, isLoading: storageLoading } = useGetMyStorageStats(token);
  const [showUpload, setShowUpload] = useState(false);

  // Rehydrate file metadata from sessionStorage into React Query cache on mount
  // so the file list renders instantly before the network response arrives.
  useEffect(() => {
    const cached = loadFileMetadata();
    if (cached && cached.length > 0) {
      queryClient.setQueryData(['files', token], (existing: unknown) => {
        // Only seed if React Query has no data yet (avoid overwriting fresh data)
        if (existing) return existing;
        return cached.map((m) => ({
          fileId: m.fileId,
          filename: m.filename,
          mimeType: m.mimeType,
          totalSize: BigInt(m.totalSize),
          totalChunks: BigInt(m.totalChunks),
          created: BigInt(m.created),
          shareToken: m.shareToken ?? null,
          owner: m.owner,
          status: 'Complete' as const,
        }));
      });
    }
  }, [token, queryClient]);

  // Persist file metadata to sessionStorage whenever the file list updates
  useEffect(() => {
    if (!files || files.length === 0) return;
    const meta: CachedFileMeta[] = files.map((f) => ({
      fileId: f.fileId,
      filename: f.filename,
      mimeType: f.mimeType,
      totalSize: Number(f.totalSize),
      totalChunks: Number(f.totalChunks),
      created: Number(f.created),
      shareToken: f.shareToken ?? undefined,
      owner: f.owner,
    }));
    persistFileMetadata(meta);
  }, [files]);

  // Use real storage stats from dedicated endpoint, fall back to me data
  const usedBytes = storageStats
    ? Number(storageStats.usedBytes)
    : me
    ? Number(me.usedBytes)
    : 0;
  const gbAllocation = storageStats
    ? Number(storageStats.gbAllocation)
    : me
    ? Number(me.gbAllocation)
    : 0;
  const quota = gbAllocation > 0 ? gbAllocation * 1024 * 1024 * 1024 : 0;
  const usagePercent = quota > 0 ? Math.min(100, (usedBytes / quota) * 100) : 0;

  const isAdminRole = me?.role === Role.Master || me?.role === Role.Staff;
  const isStorageLoading = storageLoading && meLoading;

  const handleUploadComplete = () => {
    setShowUpload(false);
    queryClient.invalidateQueries({ queryKey: ['myStorageStats', token] });
    queryClient.invalidateQueries({ queryKey: ['files', token] });
    queryClient.invalidateQueries({ queryKey: ['me', token] });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/generated/luidfiles-logo.dim_400x120.png"
              alt="LuidFiles"
              className="h-8 object-contain"
            />
            <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              <Zap className="w-3 h-3 text-primary" />
              ICP Optimized
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isAdminRole && (
              <Button variant="outline" size="sm" onClick={() => navigate({ to: '/admin' })} className="gap-2">
                <Settings className="h-4 w-4" />
                Admin Panel
              </Button>
            )}
            {meLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Badge variant={me?.role === Role.Master ? 'default' : 'secondary'}>
                  {me?.role ?? ''}
                </Badge>
                <span className="text-sm font-medium text-foreground">{me?.username}</span>
              </>
            )}
            <Button variant="ghost" size="icon" onClick={onLogout} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Storage Usage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <HardDrive className="h-4 w-4" />
              Uso de Armazenamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isStorageLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Armazenamento Usado</span>
                  <span className="font-medium">
                    {formatFileSize(usedBytes)} / {gbAllocation > 0 ? `${gbAllocation} GB` : '—'}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{usagePercent.toFixed(1)}% do seu armazenamento usado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload Section */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Meus Arquivos</h2>
          <Button onClick={() => setShowUpload(!showUpload)} className="gap-2">
            <Upload className="h-4 w-4" />
            {showUpload ? 'Ocultar Upload' : 'Enviar Arquivo'}
          </Button>
        </div>

        {showUpload && (
          <ChunkedUpload token={token} onUploadComplete={handleUploadComplete} />
        )}

        {/* File List — renders from cache instantly, revalidates in background */}
        {filesLoading && !files ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <FileList files={files ?? []} />
        )}
      </main>

      <footer className="border-t border-border mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>
            Feito com <span className="text-red-500">♥</span> usando{' '}
            <a
              href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
          <p className="mt-1">© {new Date().getFullYear()} LuidFiles. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
