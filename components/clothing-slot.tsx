'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { ClothingItem } from '@/lib/types';
import { validateFile } from '@/lib/utils';

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
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleFileUpload = async (file: File) => {
    setError(null);
    
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setLoadingType('upload');
    onUpdate({ ...item, loading: true });

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
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setError(null);
    setLoadingType(null);
    onUpdate({ ...item, loading: false, url: null, text: textInput });
  };

  const handleTextGenerate = async () => {
    if (!textInput.trim()) return;

    setError(null);
    setLoadingType('generate');
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    // Capture current values to avoid stale closures
    const currentText = textInput;
    const itemId = item.id;
    const itemType = item.type;
    
    // Create updated item with loading state
    const loadingItem = { ...item, loading: true, text: currentText, url: null };
    onUpdate(loadingItem);

    try {
      // Step 1: Submit to queue
      const enhancedPrompt = `${currentText}, front facing view of full item with plain solid color background`;
      const submitResponse = await fetch('/api/fal/text-to-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: enhancedPrompt }),
        signal: abortControllerRef.current.signal,
      });

      if (!submitResponse.ok) {
        const data = await submitResponse.json();
        throw new Error(data.error || 'Failed to submit generation');
      }

      const { request_id } = await submitResponse.json();

      // Step 2: Poll for status
      const pollStatus = async (): Promise<void> => {
        return new Promise((resolve, reject) => {
          // Clear any existing intervals/timeouts
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          const pollInterval = setInterval(async () => {
            try {
              const statusResponse = await fetch(
                `/api/fal/text-to-image?request_id=${request_id}`,
                { signal: abortControllerRef.current?.signal }
              );

              if (!statusResponse.ok) {
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                const data = await statusResponse.json();
                reject(new Error(data.error || 'Failed to check status'));
                return;
              }

              const status = await statusResponse.json();

              if (status.status === 'COMPLETED') {
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                
                // Extract image URL from response
                // The fal client returns the actual response data in the status object when completed
                const url = status.data?.images?.[0]?.url || status.response?.images?.[0]?.url || status.images?.[0]?.url;
                if (!url) {
                  console.error('Queue status response:', status);
                  reject(new Error('No image generated'));
                  return;
                }

                // Update with final successful state using captured values
                onUpdate({ id: itemId, type: 'text', url, text: currentText, loading: false });
                resolve();
              } else if (status.status === 'FAILED') {
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                reject(new Error('Generation failed'));
              }
              // Continue polling if IN_QUEUE or IN_PROGRESS
            } catch (err) {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
              reject(err);
            }
          }, 5000); // Poll every 5 seconds

          // Store ref for cleanup
          pollIntervalRef.current = pollInterval;

          // Set a 120-second timeout for the entire polling process
          timeoutRef.current = setTimeout(() => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (abortControllerRef.current) {
              abortControllerRef.current.abort();
            }
            reject(new Error('Generation timed out. Please try again.'));
          }, 120000);
        });
      };

      await pollStatus();

      // Clear timeout on success
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setLoadingType(null);
    } catch (err) {
      // Clear timeout on error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Don't show error if it was aborted by user
      if (err instanceof Error && err.name === 'AbortError') {
        setLoadingType(null);
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to generate';
      setError(errorMessage);
      setLoadingType(null);
      // Ensure loading is false and url is null on error, use captured values
      onUpdate({ id: itemId, type: itemType, loading: false, url: null, text: currentText });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  if (item.url && !item.loading) {
    return (
      <div className="relative border-2 border-ring rounded-lg p-4 bg-background">
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full hover:bg-primary/80 transition-colors flex items-center justify-center text-sm font-bold z-10"
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
            className="object-contain"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {loadingType === 'upload' ? 'Uploading...' : 'Generating...'}
        </p>
        <button
          onClick={handleCancel}
          className="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
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
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
            mode === 'upload'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          Upload
        </button>
        <button
          onClick={() => setMode('text')}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
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
            className="w-full py-8 border-2 border-dashed border-border rounded-lg hover:border-ring transition-colors"
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
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:bg-secondary disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
          >
            {error ? 'Retry Generation' : 'Generate'}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-2 p-2 bg-muted border border-border rounded">
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      )}
    </div>
  );
}

