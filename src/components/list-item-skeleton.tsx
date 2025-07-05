'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export function ListItemSkeleton() {
  return (
    <Card className="relative overflow-hidden">
      <Skeleton className="absolute left-0 top-0 bottom-0 w-1.5" />
      <CardContent className="p-4 pl-6">
        <div className="flex gap-4 items-start">
          <Skeleton className="h-16 w-16 rounded-md flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-5 w-full rounded" />
            <Skeleton className="h-4 w-2/3 rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
