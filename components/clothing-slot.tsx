'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { fal } from '@fal-ai/client';
import { ClothingItem } from '@/lib/types';
import { validateFile } from '@/lib/utils';
import { useFalApi } from '@/lib/use-fal-api';

interface ClothingSlotProps {
  item: ClothingItem;
  onUpdate: (item: ClothingItem) => void;
  onRemove: () => void;
}

export function ClothingSlot({ item, onUpdate, onRemove }: ClothingSlotProps) {
  const [mode, setMode] = useState<'upload' | 'text'>(item.type);
  const [textInput, setTextInput] = useState(item.text || '');
  const [error, setError] = useState<string | null>(null);
  const [loadingType, setLoadingType] = useState<'upload' | 'generate' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { hasApiKey } = useFalApi();

  // Clear API key errors when key is set
  useEffect(() => {
    if (hasApiKey && error === 'Please set your FAL API key first') {
      setError(null);
    }
  }, [hasApiKey, error]);

  // Clear errors when switching modes
  useEffect(() => {
    setError(null);
  }, [mode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleFileUpload = async (file: File) => {
    setError(null);
    
    if (!hasApiKey) {
      setError('Please set your FAL API key first');
      return;
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setLoadingType('upload');
    onUpdate({ ...item, loading: true });

    try {
      const url = await fal.storage.upload(file);
      onUpdate({ ...item, type: 'upload', url, loading: false });
      setLoadingType(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload');
      onUpdate({ ...item, loading: false });
      setLoadingType(null);
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setError(null);
    setLoadingType(null);
    onUpdate({ ...item, loading: false, url: null, text: textInput });
  };

  const handleTextGenerate = async () => {
    if (!textInput.trim()) return;

    if (!hasApiKey) {
      setError('Please set your FAL API key first');
      return;
    }

    setError(null);
    setLoadingType('generate');
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    // Capture current values to avoid stale closures
    const currentText = textInput;
    const itemId = item.id;
    
    // Create updated item with loading state
    const loadingItem = { ...item, loading: true, text: currentText, url: null };
    onUpdate(loadingItem);

    try {
      const enhancedPrompt = `${currentText}, front facing view of full item with plain solid color background`;
      
      const result = await fal.subscribe('fal-ai/reve/text-to-image', {
        input: {
          prompt: enhancedPrompt,
          aspect_ratio: '1:1',
        },
        logs: true,
        onQueueUpdate: (update: any) => {
          if (abortControllerRef.current?.signal.aborted) {
            throw new Error('AbortError');
          }
        },
      });

      const url = result.data.images?.[0]?.url;
      if (!url) {
        throw new Error('No image generated');
      }

      onUpdate({ id: itemId, type: 'text', url, text: currentText, loading: false });
      setLoadingType(null);
    } catch (err) {
      // Don't show error if it was aborted by user
      if (err instanceof Error && (err.name === 'AbortError' || err.message === 'AbortError')) {
        setLoadingType(null);
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to generate';
      setError(errorMessage);
      setLoadingType(null);
      onUpdate({ id: itemId, type: 'text', loading: false, url: null, text: currentText });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    // Reset file input so the same file can be selected again
    e.target.value = '';
  };

  if (item.url && !item.loading) {
    return (
      <div className="relative border-2 border-ring rounded-lg p-4 bg-background">
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full hover:bg-primary/80 transition-colors flex items-center justify-center text-sm font-bold z-10 cursor-pointer"
          aria-label="Remove item"
        >
          ×
        </button>
        <div className="relative w-full h-32 rounded-lg overflow-hidden mb-2 bg-background">
          <Image
            src={item.url}
            alt={item.text || 'Clothing item'}
            fill
            className="object-contain"
          />
        </div>
        {item.text && (
          <p className="text-xs text-muted-foreground truncate">{item.text}</p>
        )}
      </div>
    );
  }

  if (item.loading) {
    return (
      <div className="border-2 border-ring rounded-lg p-4 bg-background flex flex-col items-center justify-center h-48 space-y-3">
        <div className="w-16 h-16 relative animate-pulse-slow">
          <Image
            src="/falloween_icon_white.png"
            alt="Loading"
            fill
            sizes="64px"
            className="object-contain"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {loadingType === 'upload' ? 'Uploading...' : 'Generating...'}
        </p>
        <button
          onClick={handleCancel}
          className="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="border-2 border-dashed border-border rounded-lg p-4 bg-background">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('upload')}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors cursor-pointer ${
            mode === 'upload'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          Upload
        </button>
        <button
          onClick={() => setMode('text')}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors cursor-pointer ${
            mode === 'text'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          Describe
        </button>
      </div>

      {mode === 'upload' ? (
        <div className="text-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-8 border-2 border-dashed border-border rounded-lg hover:border-ring transition-colors cursor-pointer"
          >
            <div className="w-12 h-12 mx-auto text-muted-foreground/70 mb-2">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">Upload photo</p>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !error) {
                handleTextGenerate();
              }
            }}
            placeholder="e.g. white t-shirt"
            className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleTextGenerate}
            disabled={!textInput.trim()}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:bg-secondary disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {error ? 'Retry Generation' : 'Generate'}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-2 p-2 bg-muted border border-border rounded">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}

