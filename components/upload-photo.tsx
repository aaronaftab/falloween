'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { validateFile } from '@/lib/utils';

interface UploadPhotoProps {
  onUpload: (url: string) => void;
  onConfirm: () => void;
  currentPhoto: string | null;
}

export function UploadPhoto({ onUpload, onConfirm, currentPhoto }: UploadPhotoProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/fal/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const { url } = await response.json();
      setTempPhoto(url);
      onUpload(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload');
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const displayPhoto = currentPhoto || tempPhoto;

  return (
    <div className="w-full max-w-sm mx-auto space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          displayPhoto ? 'border-ring' : 'border-border hover:border-ring'
        }`}
      >
        {displayPhoto ? (
          <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-background">
            <Image
              src={displayPhoto}
              alt="Your photo"
              fill
              className="object-contain"
            />
          </div>
        ) : (
          <div className="w-full aspect-square flex flex-col items-center justify-center space-y-4">
            {uploading ? (
              <>
                <div className="w-16 h-16 relative animate-bounce-slow">
                  <Image
                    src="/falloween_icon_white.png"
                    alt="Loading"
                    fill
                    className="object-contain"
                  />
                </div>
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </>
            ) : (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  Upload
                </button>
                <p className="text-xs text-muted-foreground">
                  Stand against a plain background for best results
                </p>
                <p className="text-xs text-muted-foreground/70">
                  JPG, PNG or WebP • Max 10MB
                </p>
              </>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleChange}
          className="hidden"
        />
      </div>

      {error && (
        <p className="mt-2 text-sm text-muted-foreground text-center">{error}</p>
      )}

      {displayPhoto && !uploading && (
        <>
          <button
            onClick={() => {
              setTempPhoto(null);
              fileInputRef.current?.click();
            }}
            className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Change Photo
          </button>
          <button
            onClick={onConfirm}
            className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-lg"
          >
            Continue →
          </button>
        </>
      )}
    </div>
  );
}

