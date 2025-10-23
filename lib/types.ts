export type ClothingItemType = 'upload' | 'text';

export interface ClothingItem {
  id: string;
  type: ClothingItemType;
  url: string | null;
  text?: string;
  loading?: boolean;
}

export interface EditHistoryItem {
  prompt: string;
  url: string;
  timestamp: number;
}

export interface AppState {
  userPhoto: string | null;
  clothingItems: ClothingItem[];
  generatedCostume: string | null;
  editHistory: EditHistoryItem[];
  isGenerating: boolean;
  generationTime: number | null;
}

export interface FalImageResponse {
  images: Array<{
    url: string;
    width?: number;
    height?: number;
    content_type?: string;
  }>;
}

