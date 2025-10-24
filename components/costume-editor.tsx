'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { fal } from '@fal-ai/client';
import { EditHistoryItem } from '@/lib/types';
import { useFalApi } from '@/lib/use-fal-api';

interface CostumeEditorProps {
  currentImage: string;
  onEdit: (newImageUrl: string, prompt: string) => void;
  editHistory: EditHistoryItem[];
}

const EXAMPLE_PROMPTS = [
  'add fake blood',
  'make it spookier',
];

export function CostumeEditor({
  currentImage,
  onEdit,
  editHistory,
}: CostumeEditorProps) {
  const [prompt, setPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { hasApiKey } = useFalApi();

  // Clear API key errors when key is set
  useEffect(() => {
    if (hasApiKey && error === 'Please set your fal API key first') {
      setError(null);
    }
  }, [hasApiKey, error]);

  const handleApplyChanges = async () => {
    if (!prompt.trim()) return;

    if (!hasApiKey) {
      setError('Please set your fal API key first');
      return;
    }

    setIsEditing(true);
    setError(null);

    try {
      const currentPrompt = prompt.trim();

      const result = await fal.subscribe('fal-ai/reve/edit', {
        input: {
          prompt: currentPrompt,
          image_url: currentImage,
        },
        logs: true,
      });

      const newImageUrl = result.data.images?.[0]?.url;
      if (!newImageUrl) {
        throw new Error('No image generated');
      }

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
    <div className="w-full max-w-md mx-auto space-y-4">

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
            placeholder="e.g. add fake blood, make it spookier..."
            className="flex-1 px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={isEditing}
          />
          <button
            onClick={handleApplyChanges}
            disabled={!prompt.trim() || isEditing}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:bg-secondary disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {isEditing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Editing...
              </span>
            ) : (
              'Edit'
            )}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground self-center">Quick ideas:</span>
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              key={example}
              onClick={() => handleQuickPrompt(example)}
              className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-full hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
              disabled={isEditing}
            >
              {example}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-3 bg-muted border border-border rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>

      {editHistory.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Edit history (last {Math.min(editHistory.length, 3)}):
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

