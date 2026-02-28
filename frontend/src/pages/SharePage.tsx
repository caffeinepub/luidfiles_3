import { useEffect, useState } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { Cloud, Download, AlertCircle, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { useActor } from '../hooks/useActor';
import { getFileIconInfo, formatFileSize } from '../utils/fileIcons';
import { useStreamingDownload } from '../hooks/useStreamingDownload';
import { Progress } from '@/components/ui/progress';

interface ResolvedFile {
  filename: string;
  mimeType: string;
  size: number;
  fileId: number;
  shareToken: string;
  totalChunks: number;
}

export default function SharePage() {
  const params = useParams({ from: '/share/$shareToken' });
  const { actor, isFetching } = useActor();
  const { download, progress: dlProgress, isDownloading } = useStreamingDownload();

  const [resolvedFile, setResolvedFile] = useState<ResolvedFile | null>(null);
  const [isResolving, setIsResolving] = useState(true);
  const [downloadDone, setDownloadDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!actor || isFetching) return;

    const raw = params.shareToken;

    // Expected format: "<fileId>_<actualShareToken>"
    const underscoreIdx = raw.indexOf('_');
    let fileId: number | null = null;
    let shareToken = raw;

    if (underscoreIdx > 0) {
      const maybeId = parseInt(raw.substring(0, underscoreIdx), 10);
      if (!isNaN(maybeId)) {
        fileId = maybeId;
        shareToken = raw.substring(underscoreIdx + 1);
      }
    }

    const resolve = async () => {
      setIsResolving(true);
      setError('');

      try {
        if (fileId !== null) {
          // Probe download to get metadata (small overhead, returns full file)
          const result = await actor.downloadFile(fileId, null, shareToken);
          setResolvedFile({
            filename: result.filename,
            mimeType: result.mimeType,
            size: result.data.length,
            fileId,
            shareToken,
            totalChunks: 1, // backend assembles server-side; treat as 1 logical chunk
          });
          setIsResolving(false);
          return;
        }

        // Fallback: scan fileIds 1–500 to find a match
        for (let i = 1; i <= 500; i++) {
          try {
            const result = await actor.downloadFile(i, null, shareToken);
            setResolvedFile({
              filename: result.filename,
              mimeType: result.mimeType,
              size: result.data.length,
              fileId: i,
              shareToken,
              totalChunks: 1,
            });
            setIsResolving(false);
            return;
          } catch {
            // not this one, continue
          }
        }

        setError('Link inválido ou expirado. O arquivo pode ter sido removido.');
        setIsResolving(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao carregar arquivo.';
        setError(msg);
        setIsResolving(false);
      }
    };

    resolve();
  }, [actor, isFetching, params.shareToken]);

  const handleDownload = async () => {
    if (!resolvedFile) return;
    await download({
      fileId: resolvedFile.fileId,
      shareToken: resolvedFile.shareToken,
      filename: resolvedFile.filename,
      mimeType: resolvedFile.mimeType,
      totalChunks: resolvedFile.totalChunks,
    });
    setDownloadDone(true);
  };

  const iconInfo = resolvedFile ? getFileIconInfo(resolvedFile.mimeType) : null;
  const IconComponent = iconInfo?.icon;
  const dlPct = dlProgress?.percentage ?? 0;

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(oklch(0.88 0.32 142) 1px, transparent 1px), linear-gradient(90deg, oklch(0.88 0.32 142) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
      </div>
      <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-neon/5 blur-3xl" />
      <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full bg-neon/5 blur-3xl" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-neon/10 border border-neon/30 flex items-center justify-center">
            <Cloud className="w-5 h-5 text-neon" />
          </div>
          <span className="font-display font-bold text-white">LuidFiles</span>
        </div>
        <Link
          to="/"
          className="flex items-center gap-1.5 text-gray-400 hover:text-neon transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Início
        </Link>
      </div>

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md mt-16">
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-8">
          {/* Loading state */}
          {isResolving && (
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 text-neon animate-spin mx-auto mb-4" />
              <p className="text-gray-400 text-sm">Carregando arquivo...</p>
            </div>
          )}

          {/* Error state */}
          {!isResolving && error && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="font-display font-semibold text-white mb-2">Link inválido</h2>
              <p className="text-gray-400 text-sm mb-6">{error}</p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 bg-neon text-black font-semibold px-6 py-2.5 rounded-xl hover:shadow-neon transition-all"
              >
                Ir para o início
              </Link>
            </div>
          )}

          {/* File found state */}
          {!isResolving && !error && resolvedFile && (
            <div className="text-center">
              {/* File icon */}
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ backgroundColor: iconInfo ? `${iconInfo.color}20` : '#39FF1420' }}
              >
                {IconComponent ? (
                  <IconComponent
                    className="w-10 h-10"
                    style={{ color: iconInfo?.color ?? '#39FF14' }}
                  />
                ) : (
                  <Download className="w-10 h-10 text-neon" />
                )}
              </div>

              {/* File info */}
              <h2 className="font-display font-bold text-white text-xl mb-1 break-all">
                {resolvedFile.filename}
              </h2>
              <p className="text-gray-400 text-sm mb-1">{formatFileSize(resolvedFile.size)}</p>
              <p className="text-gray-600 text-xs mb-8">
                Compartilhado via{' '}
                <span className="text-neon font-medium">LuidFiles</span>
              </p>

              {/* Download progress */}
              {isDownloading && dlProgress && (
                <div className="mb-6 space-y-2">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Baixando...</span>
                    <span>{dlPct}%</span>
                  </div>
                  <Progress value={dlPct} className="h-2 bg-gray-800" />
                </div>
              )}

              {/* Download button */}
              {!downloadDone ? (
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="w-full flex items-center justify-center gap-2 bg-neon text-black font-bold py-4 rounded-xl hover:shadow-neon transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Baixando... {dlPct > 0 ? `${dlPct}%` : ''}
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Baixar Arquivo
                    </>
                  )}
                </button>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-neon/10 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-neon" />
                  </div>
                  <p className="text-neon font-medium text-sm">Download iniciado!</p>
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="text-gray-400 hover:text-neon text-sm transition-colors disabled:opacity-50"
                  >
                    Baixar novamente
                  </button>
                </div>
              )}

              <p className="text-gray-600 text-xs mt-4">
                Não precisa de conta para baixar.
              </p>
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="text-center text-gray-600 text-xs mt-6">
          Powered by{' '}
          <span className="text-neon font-medium">LuidCorporation</span>
          {' · '}
          <Link to="/register" className="text-gray-500 hover:text-neon transition-colors">
            Criar conta grátis
          </Link>
        </p>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 text-gray-700 text-xs">
        Feito com{' '}
        <span className="text-neon">♥</span>{' '}
        usando{' '}
        <a
          href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
            window.location.hostname || 'luidfiles'
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-neon hover:underline"
        >
          caffeine.ai
        </a>
      </div>
    </div>
  );
}
