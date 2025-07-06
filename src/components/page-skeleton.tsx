
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ListItemSkeleton } from './list-item-skeleton';

interface PageSkeletonProps {
  withHeader?: boolean;
}

export function PageSkeleton({ withHeader = false }: PageSkeletonProps) {
  return (
     <div className="flex flex-col min-h-screen bg-secondary/50">
        {withHeader && (
           <header className="bg-card border-b sticky top-0 z-30">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex items-center justify-between h-16">
                      <div className="flex items-center gap-2 sm:gap-4">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="border-l pl-2 sm:pl-4">
                            <Skeleton className="h-6 w-32" />
                          </div>
                      </div>
                      <div className="flex items-center gap-2">
                           <Skeleton className="h-9 w-9 rounded-full" />
                           <Skeleton className="h-8 w-8 rounded-full" />
                      </div>
                  </div>
              </div>
          </header>
        )}
        <div className={cn(withHeader && "flex-1 md:grid md:grid-cols-[220px_1fr]")}>
            {withHeader && (
                <aside className="hidden md:flex flex-col bg-card border-r w-[220px] p-4">
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </aside>
            )}
             <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-72" />
                  </div>
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <ListItemSkeleton key={i} />
                    ))}
                  </div>
                </div>
            </main>
        </div>
    </div>
  );
}
