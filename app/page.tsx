'use client';

import { useState } from 'react';
import Image from 'next/image';
import { UploadPhoto } from '@/components/upload-photo';
import { ClothingInput } from '@/components/clothing-input';
import { CostumeEditor } from '@/components/costume-editor';
import { ClothingItem, EditHistoryItem } from '@/lib/types';
import { downloadImage, shareToTwitter, shareToReddit } from '@/lib/utils';

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
    
    setStep(3);
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const prompt = `Create a do-it-yourself style Halloween costume using the given clothing items and dress the person with it. Make sure the person's face is still recognizable and you add some extra elements beyond the given clothen items to make it into a costume`;
      const image_urls = [
        userPhoto!,
        ...clothingItems.filter((item) => item.url).map((item) => item.url!)
      ];

      // Step 1: Submit to queue
      const submitResponse = await fetch('/api/fal/remix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, image_urls }),
      });

      if (!submitResponse.ok) {
        const data = await submitResponse.json();
        throw new Error(data.error || 'Failed to submit generation');
      }

      const { request_id, submittedAt } = await submitResponse.json();

      // Step 2: Poll for status
      const pollStatus = async (): Promise<void> => {
        return new Promise((resolve, reject) => {
          const pollInterval = setInterval(async () => {
            try {
              const statusResponse = await fetch(
                `/api/fal/remix?request_id=${request_id}&submitted_at=${submittedAt}`
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
                
                // Extract image URL and generation time from response
                // The fal client returns the actual response data in the status object when completed
                const imageUrl = status.data?.images?.[0]?.url || status.response?.images?.[0]?.url || status.images?.[0]?.url;
                const time = status.generationTime || 0;

                if (!imageUrl) {
                  console.error('Queue status response:', status);
                  reject(new Error('No image generated'));
                  return;
                }

                setGeneratedCostume(imageUrl);
                setGenerationTime(time);
                resolve();
              } else if (status.status === 'FAILED') {
                clearInterval(pollInterval);
                reject(new Error('Generation failed'));
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

      await pollStatus();
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
  };

  const handleDownload = () => {
    if (generatedCostume) {
      downloadImage(generatedCostume, 'my-halloween-costume.png');
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

  const handleShareTwitter = () => {
    if (generatedCostume) {
      shareToTwitter(
        'Check out my AI-generated Halloween costume! 🎃 Created with @FalAI',
        generatedCostume
      );
    }
  };

  const handleShareReddit = () => {
    if (generatedCostume) {
      shareToReddit(
        'My AI-Generated Halloween Costume 🎃',
        generatedCostume
      );
    }
  };

  return (
      <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-48 relative">
                <Image
                  src="/falloween_logo_white.png"
                  alt="Falloween"
                  fill
                  className="object-contain object-left"
                />
              </div>
            </div>
            {step > 1 && (
              <button
                onClick={handleStartOver}
                className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
              >
                Start Over
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
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
                      className={`w-16 h-1 mx-4 transition-all ${
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
                    className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleContinueToGenerate}
                    disabled={!canProceedToGenerate}
                    className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:bg-secondary disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
                  >
                    Generate Costume →
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
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground mb-2">
                        Generating Your Costume...
                      </h3>
                    </div>
                  </div>
                ) : generationError ? (
                  /* Error State */
                  <div className="w-full max-w-2xl mx-auto text-center space-y-6">
                    <div className="p-6 bg-muted border-2 border-border rounded-lg">
                      <h3 className="text-xl font-bold text-foreground mb-2">Generation Failed</h3>
                      <p className="text-muted-foreground mb-4">{generationError}</p>
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => setStep(2)}
                          className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
                        >
                          ← Back to Clothing
                        </button>
                        <button
                          onClick={handleContinueToGenerate}
                          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                        >
                          Try Again
                        </button>
                      </div>
                    </div>
                  </div>
                ) : generatedCostume ? (
                  /* Result Display */
                  <>
                    {/* Image */}
                    <div className="w-full max-w-3xl mx-auto space-y-4">
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-foreground mb-2">
                          Your Halloween Costume
                        </h2>
                        {generationTime && (
                          <p className="text-sm text-muted-foreground">
                            Generated in {(generationTime / 1000).toFixed(1)}s
                          </p>
                        )}
                      </div>
                      <div className="relative w-full aspect-square max-w-md mx-auto rounded-xl overflow-hidden shadow-2xl border-4 border-ring">
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
                    <div className="border-t-2 border-border py-8">
                      <CostumeEditor
                        currentImage={generatedCostume}
                        onEdit={handleEdit}
                        editHistory={editHistory}
                      />
                    </div>

                    {/* Share Buttons */}
                    <div className="border-t-2 border-border pt-8">
                      <div className="w-full max-w-4xl mx-auto">
                        <div className="flex flex-wrap gap-3 justify-center">
                          <button
                            onClick={handleDownload}
                            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                          </button>
                          <button
                            onClick={handleShareTwitter}
                            className="flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors shadow-lg"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                            Share on X
                          </button>
                          <button
                            onClick={handleShareReddit}
                            className="flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors shadow-lg"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                            </svg>
                            Share on Reddit
                          </button>
                          <button
                            onClick={handleCopyLink}
                            className="flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors shadow-lg"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            {copied ? 'Copied!' : 'Copy Link'}
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
    </div>
  );
}

