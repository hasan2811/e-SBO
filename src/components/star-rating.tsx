
'use client';

import * as React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
    rating: number;
    totalStars?: number;
    className?: string;
    starClassName?: string;
}

export const StarRating = ({ rating, totalStars = 5, className, starClassName }: StarRatingProps) => {
    const colorClass = 
        rating <= 2 ? 'text-destructive fill-destructive/80' :
        rating <= 4 ? 'text-chart-4 fill-chart-4/80' :
        'text-chart-2 fill-chart-2/80';
    
    return (
        <div className={cn("flex items-center gap-0.5", className)}>
            {Array.from({ length: totalStars }).map((_, index) => {
                const star = index + 1;
                return (
                    <Star
                        key={star}
                        className={cn(
                            'h-5 w-5',
                            rating >= star ? colorClass : 'text-muted-foreground/30 fill-muted-foreground/20',
                            starClassName
                        )}
                    />
                );
            })}
        </div>
    );
};
