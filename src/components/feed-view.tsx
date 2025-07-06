
'use client';

import * as React from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import type { AllItems, Observation, Inspection, Ptw, RiskLevel } from '@/lib/types';
import { PtwStatusBadge, InspectionStatusBadge } from '@/components/status-badges';
import { format } from 'date-fns';
import { Sparkles, Loader2, Search, Eye, X, ClipboardList, Wrench, FileSignature, SearchCheck, Clock, CheckCircle2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { usePathname, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { useObservations } from '@/hooks/use-observations';
import { AnimatePresence, motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from './ui/badge';
import { ListItemSkeleton } from './list-item-skeleton';
import { usePerformance } from '@/contexts/performance-context';

const ITEMS_PER_PAGE = 10;

// Lazy load detail sheets to reduce initial bundle size
const ObservationDetailSheet = dynamic(() => import('@/components/observation-detail-sheet').then(mod => mod.ObservationDetailSheet), { ssr: false });
const InspectionDetailSheet = dynamic(() => import('@/components/inspection-detail-sheet').then(mod => mod.InspectionDetailSheet), { ssr: false });
const PtwDetailSheet = dynamic(() => import('@/components/ptw-detail-sheet').then(mod => mod.PtwDetailSheet), { ssr: false });


const riskColorMap: Record<RiskLevel, string> = {
    Low: 'bg-chart-2',
    Medium: 'bg-chart-4',
    High: 'bg-chart-5',
    Critical: 'bg-destructive',
};

// Memoize list items to prevent unnecessary re-renders
const ObservationListItem = React.memo(function ObservationListItem({ observation, onSelect, isPriority }: { observation: Observation, onSelect: () => void, isPriority?: boolean }) {
    if (observation.optimisticState === 'uploading') {
        return <ListItemSkeleton key={observation.id} />;
    }

    const isCompleted = observation.status === 'Completed';
    const isPending = !isCompleted;

    return (
        <Card onClick={onSelect} className="transition-all cursor-pointer hover:border-primary/50 relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${riskColorMap[observation.riskLevel]}`} />
            
            {(isPending || isCompleted) && (
              <div className="absolute top-2 right-2">
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger>
                      {isPending && <Clock className="h-4 w-4 text-chart-5" />}
                      {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Status: {observation.status}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
            
            <CardContent className="p-4 pl-6">
                <div className="flex gap-4 items-start">
                    {observation.photoUrl ? (
                        <div className="relative h-16 w-16 flex-shrink-0 rounded-md overflow-hidden border">
                            <Image src={observation.photoUrl} alt={observation.findings} fill sizes="64px" className="object-cover" priority={isPriority} data-ai-hint="site observation" />
                        </div>
                    ) : (
                         <div className="relative h-16 w-16 flex-shrink-0 rounded-md bg-muted flex items-center justify-center">
                             <ClipboardList className="h-8 w-8 text-muted-foreground" />
                         </div>
                    )}
                    <div className="flex-1 space-y-1 overflow-hidden">
                        <Badge variant="outline" className="text-primary border-primary py-0.5 px-2 text-xs">{observation.category}</Badge>
                        <p className="font-semibold leading-snug truncate pr-8">{observation.findings}</p>
                        <div className="text-xs text-muted-foreground pt-1">
                            {observation.company} &bull; {observation.location} &bull; {format(new Date(observation.date), 'd MMM yy')}
                        </div>
                         {observation.responsiblePersonName && (
                            <div className="text-xs text-muted-foreground pt-1 flex items-center gap-1.5">
                                <User className="h-3 w-3" />
                                <span>{observation.responsiblePersonName}</span>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});


const InspectionListItem = React.memo(function InspectionListItem({ inspection, onSelect, isPriority }: { inspection: Inspection, onSelect: () => void, isPriority?: boolean }) {
    if (inspection.optimisticState === 'uploading') {
        return <ListItemSkeleton key={inspection.id} />;
    }

    const isCompleted = inspection.status === 'Pass';
    const isPending = !isCompleted;
    
    return (
        <Card onClick={onSelect} className="transition-all cursor-pointer hover:border-primary/50 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-muted-foreground" />
            
            {(isPending || isCompleted) && (
              <div className="absolute top-2 right-2">
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger>
                      {isPending && <Clock className="h-4 w-4 text-chart-5" />}
                      {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Status: {inspection.status}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
            
            <CardContent className="p-4 pl-6">
                 <div className="flex gap-4 items-start">
                    {inspection.photoUrl ? (
                        <div className="relative h-16 w-16 flex-shrink-0 rounded-md overflow-hidden border">
                            <Image src={inspection.photoUrl} alt={inspection.equipmentName} fill sizes="64px" className="object-cover" priority={isPriority} data-ai-hint="equipment inspection" />
                        </div>
                    ) : (
                         <div className="relative h-16 w-16 flex-shrink-0 rounded-md bg-muted flex items-center justify-center">
                             <Wrench className="h-8 w-8 text-muted-foreground" />
                         </div>
                    )}
                    <div className="flex-1 space-y-1 overflow-hidden">
                        <p className="font-semibold leading-snug truncate pr-8">{inspection.equipmentName}</p>
                        <p className="text-sm text-muted-foreground truncate pr-8">{inspection.findings}</p>
                         <div className="flex flex-wrap items-center gap-2 pt-1">
                            <InspectionStatusBadge status={inspection.status} />
                            <span className="text-xs text-muted-foreground">{inspection.location} &bull; {format(new Date(inspection.date), 'd MMM yy')}</span>
                        </div>
                        {inspection.responsiblePersonName && (
                            <div className="text-xs text-muted-foreground pt-1 flex items-center gap-1.5">
                                <User className="h-3 w-3" />
                                <span>{inspection.responsiblePersonName}</span>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});

const PtwListItem = React.memo(function PtwListItem({ ptw, onSelect }: { ptw: Ptw, onSelect: () => void }) {
    if (ptw.optimisticState === 'uploading') {
        return <ListItemSkeleton key={ptw.id} />;
    }

    const isCompleted = ptw.status === 'Approved' || ptw.status === 'Closed';
    const isPending = !isCompleted && ptw.status !== 'Rejected';
    
    return (
       <Card onClick={onSelect} className="transition-all cursor-pointer hover:border-primary/50 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-muted-foreground" />

             {(isPending || isCompleted) && (
              <div className="absolute top-2 right-2">
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger>
                      {isPending && <Clock className="h-4 w-4 text-chart-5" />}
                      {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Status: {ptw.status}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}

             <CardContent className="p-4 pl-6">
                 <div className="flex gap-4 items-start">
                     <div className="relative h-16 w-16 flex-shrink-0 rounded-md bg-muted flex items-center justify-center">
                         <FileSignature className="h-8 w-8 text-muted-foreground" />
                     </div>
                    <div className="flex-1 space-y-1 overflow-hidden">
                        <p className="font-semibold leading-snug truncate pr-8">{ptw.workDescription}</p>
                         <div className="flex flex-wrap items-center gap-2 pt-2">
                            <PtwStatusBadge status={ptw.status} />
                            <span className="text-xs text-muted-foreground">{ptw.location}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {ptw.contractor} &bull; {format(new Date(ptw.date), 'd MMM yy')}
                        </div>
                        {ptw.responsiblePersonName && (
                            <div className="text-xs text-muted-foreground pt-1 flex items-center gap-1.5">
                                <User className="h-3 w-3" />
                                <span>Approver: {ptw.responsiblePersonName}</span>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
});

interface FeedViewProps {
  projectId: string;
  itemTypeFilter: 'observation' | 'inspection' | 'ptw';
  itemIdToOpen?: string | null;
  title: string;
}

export function FeedView({ projectId, itemTypeFilter, itemIdToOpen, title }: FeedViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { isFastConnection } = usePerformance();
  
  const { items, isLoading, getObservationById, getInspectionById, getPtwById } = useObservations(projectId, itemTypeFilter);
  
  const [selectedObservationId, setSelectedObservationId] = React.useState<string | null>(null);
  const [selectedInspectionId, setSelectedInspectionId] = React.useState<string | null>(null);
  const [selectedPtwId, setSelectedPtwId] = React.useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isSearchVisible, setIsSearchVisible] = React.useState(false);
  
  // Client-side pagination state
  const [visibleCount, setVisibleCount] = React.useState(ITEMS_PER_PAGE);

  const triggeredOpen = React.useRef(false);
  
  React.useEffect(() => {
    const openItemFromUrl = async () => {
        if (itemIdToOpen && !isLoading && !triggeredOpen.current) {
            triggeredOpen.current = true;
            let itemExists = false;
            
            switch (itemTypeFilter) {
                case 'observation':
                    if (getObservationById(itemIdToOpen)) {
                        setSelectedObservationId(itemIdToOpen);
                        itemExists = true;
                    }
                    break;
                case 'inspection':
                    if (getInspectionById(itemIdToOpen)) {
                        setSelectedInspectionId(itemIdToOpen);
                        itemExists = true;
                    }
                    break;
                case 'ptw':
                    if (getPtwById(itemIdToOpen)) {
                        setSelectedPtwId(itemIdToOpen);
                        itemExists = true;
                    }
                    break;
            }

            if (!itemExists) {
                 toast({ variant: 'destructive', title: 'Laporan Tidak Ditemukan' });
            }
            router.replace(pathname, { scroll: false }); // Clear URL param
        }
    };
    openItemFromUrl();
  }, [itemIdToOpen, isLoading, itemTypeFilter, getObservationById, getInspectionById, getPtwById, pathname, router, toast]);

  const filteredData = React.useMemo(() => {
    if (!searchTerm) return items;
    
    const lowercasedSearch = searchTerm.toLowerCase();
    return items.filter(item => {
        if (item.itemType === 'observation') return item.findings.toLowerCase().includes(lowercasedSearch) || item.recommendation.toLowerCase().includes(lowercasedSearch) || item.company.toLowerCase().includes(lowercasedSearch) || item.location.toLowerCase().includes(lowercasedSearch);
        if (item.itemType === 'inspection') return item.findings.toLowerCase().includes(lowercasedSearch) || item.equipmentName.toLowerCase().includes(lowercasedSearch) || item.location.toLowerCase().includes(lowercasedSearch);
        if (item.itemType === 'ptw') return item.workDescription.toLowerCase().includes(lowercasedSearch) || item.contractor.toLowerCase().includes(lowercasedSearch) || item.location.toLowerCase().includes(lowercasedSearch);
        return false;
    });
  }, [items, searchTerm]);

  const itemsToDisplay = React.useMemo(() => {
      return filteredData.slice(0, visibleCount);
  }, [filteredData, visibleCount]);

  const hasMore = visibleCount < filteredData.length;

  const loadMore = () => {
      setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  function EmptyState() {
    const messages = {
        observation: { icon: ClipboardList, title: 'Belum Ada Observasi', text: 'Belum ada laporan observasi untuk proyek ini.' },
        inspection: { icon: Wrench, title: 'Belum Ada Inspeksi', text: 'Belum ada laporan inspeksi untuk proyek ini.' },
        ptw: { icon: FileSignature, title: 'Belum Ada Izin Kerja', text: 'Belum ada izin kerja untuk proyek ini.' },
    };

    if (searchTerm) {
      return (
         <div className="text-center py-16 text-muted-foreground bg-card rounded-lg border-dashed">
            <Search className="mx-auto h-12 w-12" />
            <h3 className="mt-4 text-xl font-semibold">Tidak Ada Hasil</h3>
            <p className="mt-2 text-sm max-w-xs mx-auto">Tidak ada laporan yang cocok dengan pencarian Anda.</p>
        </div>
      )
    }

    const currentType = itemTypeFilter ? messages[itemTypeFilter] : messages.observation;
    const Icon = currentType.icon;
  
    return (
      <div className="text-center py-16 text-muted-foreground bg-card rounded-lg border-dashed">
        <Icon className="mx-auto h-12 w-12" />
        <h3 className="mt-4 text-xl font-semibold">{currentType.title}</h3>
        <p className="mt-2 text-sm max-w-xs mx-auto">{currentType.text}</p>
      </div>
    );
  }

  const FeedSkeleton = () => (
    <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
            <ListItemSkeleton key={i} />
        ))}
    </div>
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: isFastConnection ? 0.05 : 0
      }
    }
  };
  const itemVariants = {
    hidden: { y: isFastConnection ? 20 : 0, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };


  return (
    <>
     <div className="space-y-4">
        <div className="flex flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <Button variant="ghost" size="icon" onClick={() => setIsSearchVisible(prev => !prev)}>
            <Search className="h-5 w-5"/>
            <span className="sr-only">Cari</span>
          </Button>
        </div>
        
        <AnimatePresence>
        {isSearchVisible && (
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: isFastConnection ? 0.2 : 0 }}
                className="overflow-hidden"
            >
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Cari berdasarkan temuan, lokasi, perusahaan..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="pl-9 w-full" 
                        autoFocus
                    />
                    {searchTerm && (
                    <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchTerm('')}>
                        <X className="h-4 w-4"/>
                    </Button>
                    )}
                </div>
            </motion.div>
        )}
        </AnimatePresence>

      <main className="mt-6">
        {isLoading && items.length === 0 ? (
          <FeedSkeleton />
        ) : itemsToDisplay.length > 0 ? (
          <motion.div 
            className="space-y-3"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
             {itemsToDisplay.map((item, index) => (
                <motion.div key={item.id} variants={itemVariants}>
                    {(() => {
                        const isPriority = index < 3;
                        switch(item.itemType) {
                            case 'observation':
                                return <ObservationListItem observation={item} onSelect={() => setSelectedObservationId(item.id)} isPriority={isPriority} />;
                            case 'inspection':
                                return <InspectionListItem inspection={item} onSelect={() => setSelectedInspectionId(item.id)} isPriority={isPriority} />;
                            case 'ptw':
                                return <PtwListItem ptw={item} onSelect={() => setSelectedPtwId(item.id)} />;
                            default:
                                return null;
                        }
                    })()}
                </motion.div>
             ))}
          </motion.div>
        ) : (
          <EmptyState />
        )}

        {hasMore && (
            <div className="flex justify-center mt-6">
                <Button onClick={loadMore} variant="outline">
                    Load More
                </Button>
            </div>
        )}
      </main>
    </div>

    {selectedObservationId && <ObservationDetailSheet isOpen={!!selectedObservationId} onOpenChange={(isOpen) => { if (!isOpen) setSelectedObservationId(null); }} observationId={selectedObservationId} />}
    {selectedInspectionId && <InspectionDetailSheet isOpen={!!selectedInspectionId} onOpenChange={(isOpen) => { if(!isOpen) setSelectedInspectionId(null); }} inspectionId={selectedInspectionId} />}
    {selectedPtwId && <PtwDetailSheet isOpen={!!selectedPtwId} onOpenChange={(isOpen) => { if(!isOpen) setSelectedPtwId(null); }} ptwId={selectedPtwId} />}
   </>
  );
}
