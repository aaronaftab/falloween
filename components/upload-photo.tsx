'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { fal } from '@fal-ai/client';
import { validateFile } from '@/lib/utils';
import { useFalApi } from '@/lib/use-fal-api';

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
  const { hasApiKey } = useFalApi();

  // Clear API key errors when key is set
  useEffect(() => {
    if (hasApiKey && error === 'Please set your fal API key first') {
      setError(null);
    }
  }, [hasApiKey, error]);

  const handleFile = async (file: File) => {
    setError(null);
    
    if (!hasApiKey) {
      setError('Please set your fal API key first');
      return;
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setUploading(true);

    try {
      const url = await fal.storage.upload(file);
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
    // Reset file input so the same file can be selected again
    e.target.value = '';
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
                    sizes="64px"
                    className="object-contain"
                  />
                </div>
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </>
            ) : (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium cursor-pointer"
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
        <p className="mt-2 text-sm text-red-400 text-center">{error}</p>
      )}

      {displayPhoto && !uploading && (
        <>
          <button
            onClick={() => {
              setTempPhoto(null);
              setError(null);
              fileInputRef.current?.click();
            }}
            className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors cursor-pointer"
          >
            Change photo
          </button>
          <button
            onClick={onConfirm}
            className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-lg cursor-pointer"
          >
            Continue →
          </button>
        </>
      )}
    </div>
  );
}

