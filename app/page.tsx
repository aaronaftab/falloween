'use client';

import { useState } from 'react';
import Image from 'next/image';
import { fal } from '@fal-ai/client';
import { UploadPhoto } from '@/components/upload-photo';
import { ClothingInput } from '@/components/clothing-input';
import { CostumeEditor } from '@/components/costume-editor';
import { ApiKeyModal } from '@/components/api-key-modal';
import { ClothingItem, EditHistoryItem } from '@/lib/types';
import { downloadImage } from '@/lib/utils';
import { useFalApi } from '@/lib/use-fal-api';

export default function Home() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [clothingItems, setClothingItems] = useState<ClothingItem[]>([
    { id: '1', type: 'upload', url: null },
    { id: '2', type: 'upload', url: null },
    { id: '3', type: 'upload', url: null },
  ]);
  const [generatedCostume, setGeneratedCostume] = useState<string | null>(null);
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const [editHistory, setEditHistory] = useState<EditHistoryItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  
  const { apiKey, hasApiKey, setApiKey, clearApiKey } = useFalApi();

  const filledClothingCount = clothingItems.filter((item) => item.url).length;
  const canProceedToGenerate = userPhoto && filledClothingCount > 0;

  const handlePhotoUpload = (url: string) => {
    setUserPhoto(url);
  };

  const handlePhotoConfirm = () => {
    if (userPhoto && step === 1) {
      setStep(2);
    }
  };

  const handleContinueToGenerate = async () => {
    if (!canProceedToGenerate) return;
    
    if (!hasApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }
    
    setStep(3);
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const startTime = Date.now();
      const prompt = `Create a do-it-yourself style Halloween costume using the given clothing items and dress the person with it. Make sure the person's face is still recognizable and you add some extra elements beyond the given clothing items to make it into a costume`;
      const image_urls = [
        userPhoto!,
        ...clothingItems.filter((item) => item.url).map((item) => item.url!)
      ];

      const result = await fal.subscribe('fal-ai/reve/remix', {
        input: {
          prompt,
          image_urls,
        },
        logs: true,
      });

      const imageUrl = result.data.images?.[0]?.url;
      if (!imageUrl) {
        throw new Error('No image generated');
      }

      const generationTime = Date.now() - startTime;
      setGeneratedCostume(imageUrl);
      setGenerationTime(generationTime);
      
      // Add original generation to edit history
      setEditHistory([{
        prompt: 'Original generation',
        url: imageUrl,
        timestamp: Date.now(),
      }]);
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Failed to generate costume');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = (newImageUrl: string, prompt: string) => {
    setGeneratedCostume(newImageUrl);
    setEditHistory([
      ...editHistory,
      {
        prompt,
        url: newImageUrl,
        timestamp: Date.now(),
      },
    ]);
  };

  const handleStartOver = () => {
    setStep(1);
    setUserPhoto(null);
    setClothingItems([
      { id: '1', type: 'upload', url: null },
      { id: '2', type: 'upload', url: null },
      { id: '3', type: 'upload', url: null },
    ]);
    setGeneratedCostume(null);
    setGenerationTime(null);
    setEditHistory([]);
    setIsGenerating(false);
    setGenerationError(null);
    setIsApiKeyModalOpen(false);
  };

  const handleDownload = () => {
    if (generatedCostume) {
      try {
        downloadImage(generatedCostume, 'my-halloween-costume.png');
      } catch (err) {
        console.error('Download failed:', err);
        alert('Failed to download image. Please try again.');
      }
    }
  };

  const handleCopyLink = async () => {
    if (!generatedCostume) return;
    try {
      await navigator.clipboard.writeText(generatedCostume);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
      <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <a 
              href="https://fal.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 shrink-0"
            >
              <div className="h-12 w-48 relative">
                <Image
                  src="/falloween_logo_white.png"
                  alt="Falloween"
                  fill
                  sizes="192px"
                  className="object-contain object-left"
                />
              </div>
            </a>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
              <button
                onClick={() => setIsApiKeyModalOpen(true)}
                className="relative p-2 text-secondary-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                aria-label="API Key Settings"
                title={hasApiKey ? 'API Key Set' : 'Set API Key'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
                </svg>
                {/* Status indicator */}
                <span 
                  className={`absolute top-1/2 -translate-y-1/2 -left-1 w-2.5 h-2.5 rounded-full border-2 border-background ${
                    hasApiKey ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  aria-hidden="true"
                />
              </button>
              {!hasApiKey && (
                <span className="text-xs sm:text-sm text-red-400">
                  Add your API key!
                </span>
              )}
              {step > 1 && (
                <button
                  onClick={handleStartOver}
                  className="px-3 py-2 text-xs sm:text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Start over
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Title & Subtitle */}
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              DIY Costume Creator
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Turn items from your closet into a Halloween costume
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-6">
            <div className="flex items-center justify-center">
              {[
                { num: 1, label: 'Photo' },
                { num: 2, label: 'Clothing' },
                { num: 3, label: 'Costume' },
              ].map((s, index) => (
                <div key={s.num} className="flex items-center">
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                        step >= s.num
                          ? 'bg-primary text-primary-foreground scale-110'
                          : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {s.num}
                    </div>
                    <span
                      className={`text-sm transition-colors ${
                        step === s.num
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {index < 2 && (
                    <div
                      className={`w-16 h-1 mx-4 -mt-7 transition-all ${
                        step > s.num ? 'bg-primary' : 'bg-secondary'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="bg-background rounded-2xl p-6 md:p-8">
            {/* Step 1: Upload Photo */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Upload a photo of yourself
                  </h2>
                </div>
                <UploadPhoto 
                  onUpload={handlePhotoUpload} 
                  onConfirm={handlePhotoConfirm}
                  currentPhoto={userPhoto} 
                />
              </div>
            )}

            {/* Step 2: Add Clothing Items */}
            {step === 2 && (
              <div className="space-y-6">
                <ClothingInput items={clothingItems} onUpdateItems={setClothingItems} />
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors cursor-pointer"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleContinueToGenerate}
                    disabled={!canProceedToGenerate}
                    className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:bg-secondary disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Generate costume →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Result */}
            {step === 3 && (
              <div className="space-y-8">
                {isGenerating ? (
                  /* Generating State */
                  <div className="w-full max-w-2xl mx-auto text-center space-y-4 py-8">
                    <div className="w-16 h-16 mx-auto relative animate-bounce-slow">
                      <Image
                        src="/falloween_icon_white.png"
                        alt="Generating"
                        fill
                        sizes="64px"
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground mb-2">
                        Generating your costume...
                      </h3>
                    </div>
                  </div>
                ) : generationError ? (
                  /* Error State */
                  <div className="w-full max-w-2xl mx-auto text-center space-y-6">
                    <div className="p-6 bg-muted border-2 border-border rounded-lg">
                      <h3 className="text-xl font-bold text-foreground mb-2">Generation Failed</h3>
                      <p className="text-red-400 mb-4">{generationError}</p>
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => setStep(2)}
                          className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors cursor-pointer"
                        >
                          ← Back
                        </button>
                        <button
                          onClick={handleContinueToGenerate}
                          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors cursor-pointer"
                        >
                          Try again
                        </button>
                      </div>
                    </div>
                  </div>
                ) : generatedCostume ? (
                  /* Result Display */
                  <>
                    {/* Image */}
                    <div className="w-full max-w-md mx-auto space-y-4">
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-foreground mb-2">
                          Your costume is ready! Edit or share it below
                        </h2>
                        {generationTime && (
                          <p className="text-sm text-muted-foreground">
                            Generated in {(generationTime / 1000).toFixed(1)}s
                          </p>
                        )}
                      </div>
                      <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-2xl border-4 border-ring">
                        <Image
                          src={generatedCostume}
                          alt="Generated Halloween costume"
                          fill
                          className="object-contain bg-background"
                          priority
                        />
                      </div>
                    </div>

                    {/* Editor */}
                    <div className="mt-4">
                      <CostumeEditor
                        currentImage={generatedCostume}
                        onEdit={handleEdit}
                        editHistory={editHistory}
                      />
                    </div>

                    {/* Share Buttons */}
                    <div className="mt-4">
                      <div className="w-full max-w-md mx-auto">
                        <div className="flex flex-col gap-3">
                          <button
                            onClick={handleDownload}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg cursor-pointer"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                          </button>
                          <button
                            onClick={handleCopyLink}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors shadow-lg cursor-pointer"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            {copied ? 'Copied!' : 'Copy link'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        currentKey={apiKey}
        onSave={setApiKey}
        onClear={clearApiKey}
      />
    </div>
  );
}

