'use client';

import { useState } from 'react';
import Image from 'next/image';
import { EditHistoryItem } from '@/lib/types';

interface CostumeEditorProps {
  currentImage: string;
  onEdit: (newImageUrl: string, prompt: string) => void;
  editHistory: EditHistoryItem[];
}

const EXAMPLE_PROMPTS = [
  'add fake blood',
  'make it spookier',
  'change background to haunted house',
  'add a witch hat',
];

export function CostumeEditor({
  currentImage,
  onEdit,
  editHistory,
}: CostumeEditorProps) {
  const [prompt, setPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApplyChanges = async () => {
    if (!prompt.trim()) return;

    setIsEditing(true);
    setError(null);

    try {
      const currentPrompt = prompt.trim();

      // Step 1: Submit to queue
      const submitResponse = await fetch('/api/fal/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentPrompt,
          image_url: currentImage,
        }),
      });

      if (!submitResponse.ok) {
        const data = await submitResponse.json();
        throw new Error(data.error || 'Failed to submit edit');
      }

      const { request_id } = await submitResponse.json();

      // Step 2: Poll for status
      const pollStatus = async (): Promise<string> => {
        return new Promise((resolve, reject) => {
          const pollInterval = setInterval(async () => {
            try {
              const statusResponse = await fetch(
                `/api/fal/edit?request_id=${request_id}`
              );

              if (!statusResponse.ok) {
                clearInterval(pollInterval);
                const data = await statusResponse.json();
                reject(new Error(data.error || 'Failed to check status'));
                return;
              }

              const status = await statusResponse.json();

              if (status.status === 'COMPLETED') {
                clearInterval(pollInterval);
                
                // Extract image URL from response
                // The fal client returns the actual response data in the status object when completed
                const newImageUrl = status.data?.images?.[0]?.url || status.response?.images?.[0]?.url || status.images?.[0]?.url;
                if (!newImageUrl) {
                  console.error('Queue status response:', status);
                  reject(new Error('No image generated'));
                  return;
                }

                resolve(newImageUrl);
              } else if (status.status === 'FAILED') {
                clearInterval(pollInterval);
                reject(new Error('Edit failed'));
              }
              // Continue polling if IN_QUEUE or IN_PROGRESS
            } catch (err) {
              clearInterval(pollInterval);
              reject(err);
            }
          }, 2000); // Poll every 2 seconds

          // Set a 60-second timeout for the entire polling process
          setTimeout(() => {
            clearInterval(pollInterval);
            reject(new Error('Generation timed out. Please try again.'));
          }, 60000);
        });
      };

      const newImageUrl = await pollStatus();
      onEdit(newImageUrl, currentPrompt);
      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to edit costume');
    } finally {
      setIsEditing(false);
    }
  };

  const handleQuickPrompt = (examplePrompt: string) => {
    setPrompt(examplePrompt);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground mb-2">
          Refine Your Costume
        </h2>
        <p className="text-sm text-muted-foreground">
          Add details or make changes to perfect your Halloween look
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isEditing) {
                handleApplyChanges();
              }
            }}
            placeholder="e.g., add fake blood, make it spookier..."
            className="flex-1 px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={isEditing}
          />
          <button
            onClick={handleApplyChanges}
            disabled={!prompt.trim() || isEditing}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:bg-secondary disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
          >
            {isEditing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Editing...
              </span>
            ) : (
              'Apply Changes'
            )}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground self-center">Quick ideas:</span>
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              key={example}
              onClick={() => handleQuickPrompt(example)}
              className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
              disabled={isEditing}
            >
              {example}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-3 bg-muted border border-border rounded-lg">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}
      </div>

      {editHistory.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Edit History (last {Math.min(editHistory.length, 3)}):
          </h3>
          <div className="space-y-2">
            {editHistory.slice(-3).reverse().map((edit, index) => (
              <div
                key={edit.timestamp}
                className="flex items-center gap-3 p-2 bg-muted rounded-lg"
              >
                <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-background border border-border">
                  <Image
                    src={edit.url}
                    alt={`Edit ${index + 1}`}
                    fill
                    className="object-contain"
                  />
                </div>
                <p className="text-sm text-muted-foreground flex-1">"{edit.prompt}"</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

