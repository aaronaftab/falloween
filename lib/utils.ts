import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPG, PNG, or WebP image.',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size exceeds 10MB. Please upload a smaller image.',
    };
  }

  return { valid: true };
}

export function downloadImage(url: string, filename: string) {
  // Validate URL is from allowed domain (fal.media)
  try {
    const urlObj = new URL(url);
    if (!urlObj.hostname.endsWith('.fal.media') && urlObj.hostname !== 'fal.media') {
      console.error('Download blocked: URL must be from fal.media domain');
      throw new Error('Invalid download URL');
    }
  } catch (err) {
    console.error('Download blocked: Invalid URL', err);
    throw new Error('Invalid download URL');
  }

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function shareToTwitter(text: string, url?: string) {
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}${url ? `&url=${encodeURIComponent(url)}` : ''}`;
  window.open(twitterUrl, '_blank');
}

export function shareToReddit(title: string, url?: string) {
  const redditUrl = `https://reddit.com/submit?title=${encodeURIComponent(title)}${url ? `&url=${encodeURIComponent(url)}` : ''}`;
  window.open(redditUrl, '_blank');
}

