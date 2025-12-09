'use client';

import { useState, useEffect } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentKey: string | null;
  onSave: (key: string) => void;
  onClear: () => void;
}

export function ApiKeyModal({ isOpen, onClose, currentKey, onSave, onClear }: ApiKeyModalProps) {
  const [key, setKey] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen && currentKey) {
      setKey(currentKey);
    }
  }, [isOpen, currentKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (key.trim()) {
      onSave(key.trim());
      onClose();
    }
  };

  const handleClear = () => {
    onClear();
    setKey('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-background border-2 border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">fal API Key</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter your fal API key to use this app. Your key is stored locally in your browser and sent directly to fal's API, never to our servers.
          </p>

          {/* Security Warning */}
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-xs text-yellow-200">
              <strong>Warning:</strong> Only use on trusted devices and networks. Clear your key here when you're done using it and revoke it from the fal dashboard if compromised.
            </p>
          </div>

          <div>
            <div className="relative">
              <input
                type={isVisible ? 'text' : 'password'}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && key.trim()) {
                    handleSave();
                  }
                }}
                placeholder="Enter your API key"
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring pr-20"
              />
              <button
                type="button"
                onClick={() => setIsVisible(!isVisible)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs px-2 py-1 cursor-pointer"
              >
                {isVisible ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <a
            href="https://fal.ai/dashboard/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-primary hover:underline"
          >
            Get your API key →
          </a>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={!key.trim()}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:bg-secondary disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors font-medium cursor-pointer"
            >
              Save key
            </button>
            {currentKey && (
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

