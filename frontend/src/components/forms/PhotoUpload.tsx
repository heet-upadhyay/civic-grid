import React, { useState, useRef } from 'react';
import { Camera, X } from 'lucide-react';
import { useI18n } from '../../i18n/useI18n';

interface PhotoUploadProps {
  onPhotoSelected: (base64Image: string | null) => void;
  disabled?: boolean;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({ onPhotoSelected, disabled }) => {
  const { t } = useI18n();
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(t.photo.errorFileType);
      return;
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert(t.photo.errorFileSize);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setPreview(b64);
      onPhotoSelected(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setPreview(null);
    onPhotoSelected(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        disabled={disabled}
        onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
        className="hidden"
        id="photo-upload-input"
      />

      {preview ? (
        <div
          className="relative flex items-center justify-between rounded-xl border p-3"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)',
          }}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src={preview}
              alt={t.photo.evidenceAlt}
              className="h-14 w-14 rounded-lg object-cover border"
              style={{ borderColor: 'var(--color-border)' }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                {t.photo.evidenceAttached}
              </p>
              <p className="text-[11px] truncate" style={{ color: 'var(--color-muted)' }}>
                {t.photo.visionAnalyze}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="flex h-7 w-7 items-center justify-center rounded-full border transition-colors hover:bg-red-500/10 hover:border-red-500/30"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
            aria-label={t.photo.removePhoto}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition-all hover:border-[var(--color-primary)]"
          style={{
            borderColor: isDragging ? 'var(--color-primary)' : 'var(--color-border)',
            backgroundColor: isDragging
              ? 'color-mix(in srgb, var(--color-primary) 6%, transparent)'
              : 'var(--color-background)',
          }}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' }}
          >
            <Camera className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
              {t.photo.attachTitle} <span className="font-normal text-[11px]" style={{ color: 'var(--color-muted)' }}>{t.photo.optionalTag}</span>
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-muted)' }}>
              {t.photo.dropzoneDesc}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
