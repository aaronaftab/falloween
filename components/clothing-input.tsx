'use client';

import { Dispatch, SetStateAction } from 'react';
import { ClothingItem } from '@/lib/types';
import { ClothingSlot } from './clothing-slot';

interface ClothingInputProps {
  items: ClothingItem[];
  onUpdateItems: Dispatch<SetStateAction<ClothingItem[]>>;
}

export function ClothingInput({ items, onUpdateItems }: ClothingInputProps) {
  const filledCount = items.filter((item) => item.url).length;

  const handleUpdateItem = (index: number, updatedItem: ClothingItem) => {
    // Use functional update to avoid race conditions with concurrent updates
    onUpdateItems((prevItems: ClothingItem[]) => {
      const newItems = [...prevItems];
      newItems[index] = updatedItem;
      return newItems;
    });
  };

  const handleRemoveItem = (index: number) => {
    // Use functional update to avoid race conditions
    onUpdateItems((prevItems: ClothingItem[]) => {
      const newItems = [...prevItems];
      newItems[index] = {
        id: newItems[index].id,
        type: 'upload',
        url: null,
      };
      return newItems;
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground mb-2">
        Upload photos from your closet or describe 1-3 clothing items you want to use
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((item, index) => (
          <ClothingSlot
            key={item.id}
            item={item}
            onUpdate={(updatedItem) => handleUpdateItem(index, updatedItem)}
            onRemove={() => handleRemoveItem(index)}
          />
        ))}
      </div>

      <div className="text-center">
        <p className="text-xs font-medium text-foreground">
          {filledCount} of 3 items added
          {filledCount === 0 && ' (minimum 1 required)'}
        </p>
      </div>
    </div>
  );
}

