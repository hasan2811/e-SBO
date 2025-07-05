'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface CustomListInputProps {
  title: string;
  description: string;
  placeholder: string;
  items: string[];
  setItems: React.Dispatch<React.SetStateAction<string[]>>;
  inputId: string;
}

export function CustomListInput({ title, description, placeholder, items, setItems, inputId }: CustomListInputProps) {
  const [inputValue, setInputValue] = React.useState("");

  const handleAddItem = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !items.includes(trimmedValue)) {
      setItems([...items, trimmedValue]);
      setInputValue("");
    }
  };

  const handleRemoveItem = (itemToRemove: string) => {
    setItems(items.filter(item => item !== itemToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId} className="font-semibold">{title}</Label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="flex gap-2">
        <Input
          id={inputId}
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button type="button" onClick={handleAddItem}>Add</Button>
      </div>
      <div className="flex flex-wrap gap-2 rounded-md border p-3 min-h-[48px] bg-muted/50">
        {items.length > 0 ? items.map(item => (
          <Badge key={item} variant="secondary" className="text-sm py-1 pl-3 pr-2">
            {item}
            <button onClick={() => handleRemoveItem(item)} className="ml-2 rounded-full hover:bg-muted-foreground/20 p-0.5">
              <X className="h-3 w-3" />
              <span className="sr-only">Remove {item}</span>
            </button>
          </Badge>
        )) : <span className="text-xs text-muted-foreground px-2">No custom items added yet.</span>}
      </div>
    </div>
  );
}
