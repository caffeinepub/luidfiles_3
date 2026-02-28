import {
  FileText,
  Image,
  Video,
  Music,
  Archive,
  File,
  FileCode,
  FileSpreadsheet,
  Presentation,
  type LucideIcon,
} from 'lucide-react';

export interface FileIconInfo {
  icon: LucideIcon;
  color: string;
  label: string;
}

export function getFileIconInfo(mimeType: string): FileIconInfo {
  if (!mimeType) return { icon: File, color: '#6b7280', label: 'File' };

  if (mimeType.startsWith('image/')) {
    return { icon: Image, color: '#39FF14', label: 'Image' };
  }
  if (mimeType.startsWith('video/')) {
    return { icon: Video, color: '#a855f7', label: 'Video' };
  }
  if (mimeType.startsWith('audio/')) {
    return { icon: Music, color: '#f59e0b', label: 'Audio' };
  }
  if (mimeType === 'application/pdf') {
    return { icon: FileText, color: '#ef4444', label: 'PDF' };
  }
  if (
    mimeType === 'application/zip' ||
    mimeType === 'application/x-rar-compressed' ||
    mimeType === 'application/x-7z-compressed' ||
    mimeType === 'application/x-tar' ||
    mimeType === 'application/gzip'
  ) {
    return { icon: Archive, color: '#f97316', label: 'Archive' };
  }
  if (
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'text/csv'
  ) {
    return { icon: FileSpreadsheet, color: '#22c55e', label: 'Spreadsheet' };
  }
  if (
    mimeType === 'application/vnd.ms-powerpoint' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return { icon: Presentation, color: '#f97316', label: 'Presentation' };
  }
  if (
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/xml'
  ) {
    return { icon: FileCode, color: '#3b82f6', label: 'Text' };
  }

  return { icon: File, color: '#6b7280', label: 'File' };
}

export function formatFileSize(bytes: bigint | number): string {
  const n = typeof bytes === 'bigint' ? Number(bytes) : bytes;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDate(timestamp: bigint): string {
  const ms = Number(timestamp) / 1_000_000;
  return new Date(ms).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
