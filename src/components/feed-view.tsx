
'use client';

import * as React from 'react';
import Image from 'next/image';
import type { AllItems, Observation, Inspection, Ptw, RiskLevel } from '@/lib/types';
import { InspectionStatusBadge, PtwStatusBadge, StatusBadge, ObservationCategoryBadge } from '@/components/status-badges';
import { format } from 'date-fns';
import { Sparkles, Loader2, Search, Eye, X, ClipboardList, Wrench, FileSignature, SearchCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ObservationDetailSheet } from '@/components/observation-detail-sheet';
import { InspectionDetailSheet } from '@/components/inspection-detail-sheet';
import { PtwDetailSheet } from '@/components/ptw-detail-sheet';
import { StarRating } from '@/components/star-rating';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { usePathname, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { useObservations } from '@/hooks/use-observations';
import { AnimatePresence, motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const riskColorMap: Record<RiskLevel, string> = {
    Low: 'bg-chart-2',
    Medium: 'bg-chart-4',
    High: 'bg-chart-5',
    Critical: 'bg-destructive',
};

const ListItemWrapper = ({ children, onSelect, item }: { children: React.ReactNode, onSelect: () => void, item: AllItems }) => {
    const preventBubble = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const isPending = item.status === 'Pending' || item.status === 'Pending Approval';
    const riskLevel = item.itemType === 'observation' ? item.riskLevel : undefined;
    const riskColor = riskLevel ? riskColorMap[riskLevel] : 'bg-transparent';

    return (
        <Card 
          onClick={onSelect}
          className="transition-all cursor-pointer hover:border-primary/50 relative overflow-hidden"
        >
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${riskColor}`} />
            
            {isPending && (
                <div className="absolute top-2 right-2 text-muted-foreground" onClick={preventBubble}>
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger>
                          <Clock className="h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Status: {item.status}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                </div>
            )}
            
            <CardContent className="p-4 pl-6 flex items-start gap-4">
                {children}
            </CardContent>
        </Card>
    );
};

const ObservationListItem = ({ observation, onSelect }: { observation: Observation, onSelect: () => void }) => {
    return (
        <ListItemWrapper onSelect={onSelect} item={observation}>
            <div className="relative h-24 w-24 flex-shrink-0 rounded-md overflow-hidden border bg-muted/20 flex items-center justify-center">
                {observation.photoUrl ? (
                    <Image src={observation.photoUrl} alt={observation.findings} fill sizes="96px" className="object-cover" data-ai-hint="site observation" />
                ) : (
                    <Eye className="h-10 w-10 text-muted-foreground/50" />
                )}
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex justify-between items-start gap-2">
                    <ObservationCategoryBadge category={observation.category} />
                    {observation.aiStatus === 'completed' && typeof observation.aiObserverSkillRating === 'number' && (
                        <StarRating rating={observation.aiObserverSkillRating} starClassName="h-3 w-3" />
                    )}
                </div>
                <p className="font-semibold leading-snug line-clamp-2">{observation.findings}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
                    <StatusBadge status={observation.status} />
                    <div className="text-xs text-muted-foreground truncate">
                        {observation.company} &bull; {observation.location} &bull; {format(new Date(observation.date), 'd MMM yy')}
                    </div>
                </div>
            </div>
        </ListItemWrapper>
    );
};

const InspectionListItem = ({ inspection, onSelect }: { inspection: Inspection, onSelect: () => void }) => {
    return (
        <ListItemWrapper onSelect={onSelect} item={inspection}>
            <div className="relative h-24 w-24 flex-shrink-0 rounded-md overflow-hidden border bg-muted/20 flex items-center justify-center">
                {inspection.photoUrl ? (
                    <Image src={inspection.photoUrl} alt={inspection.equipmentName} fill sizes="96px" className="object-cover" data-ai-hint="equipment inspection" />
                ) : (
                    <SearchCheck className="h-10 w-10 text-muted-foreground/50" />
                )}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
                <p className="text-xs text-primary font-semibold truncate pr-2">{inspection.equipmentType}</p>
                <p className="font-semibold leading-snug line-clamp-2">{inspection.equipmentName}</p>
                <p className="text-sm text-muted-foreground line-clamp-1">{inspection.findings}</p>
                <div className="flex flex-wrap items-center gap-2">
                    <InspectionStatusBadge status={inspection.status} />
                    <span className="text-xs text-muted-foreground">{inspection.location} &bull; {format(new Date(inspection.date), 'd MMM yy')}</span>
                </div>
            </div>
        </ListItemWrapper>
    );
};

const PtwListItem = ({ ptw, onSelect }: { ptw: Ptw, onSelect: () => void }) => {
    return (
        <ListItemWrapper onSelect={onSelect} item={ptw}>
            <div className="flex-shrink-0 rounded-md bg-muted flex items-center justify-center h-24 w-24">
                <FileSignature className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <div className="flex-1 min-w-0 space-y-2 self-stretch flex flex-col justify-between">
                <div>
                    <p className="text-xs text-primary font-semibold truncate pr-2">Permit to Work</p>
                    <p className="font-semibold leading-snug line-clamp-2 mt-1">{ptw.workDescription}</p>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                      {ptw.status !== 'Pending Approval' && <PtwStatusBadge status={ptw.status} />}
                      <span className="text-xs text-muted-foreground">{ptw.location}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {ptw.contractor} &bull; {format(new Date(ptw.date), 'd MMM yy')}
                  </div>
                </div>
            </div>
        </ListItemWrapper>
    )
};

interface FeedViewProps {
  projectId: string;
  itemTypeFilter?: 'observation' | 'inspection' | 'ptw';
  observationIdToOpen?: string | null;
  title: string;
}

export function FeedView({ projectId, itemTypeFilter, observationIdToOpen, title }: FeedViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  
  const { items, isLoading, getObservationById, getInspectionById, getPtwById } = useObservations(projectId);
  
  const [selectedObservationId, setSelectedObservationId] = React.useState<string | null>(null);
  const [selectedInspectionId, setSelectedInspectionId] = React.useState<string | null>(null);
  const [selectedPtwId, setSelectedPtwId] = React.useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isSearchVisible, setIsSearchVisible] = React.useState(false);

  const triggeredOpen = React.useRef(false);
  React.useEffect(() => {
    const openItemFromNotification = async () => {
        if (observationIdToOpen && !isLoading && !triggeredOpen.current) {
            triggeredOpen.current = true;
            
            const item = getObservationById(observationIdToOpen);
            if (item) {
                setSelectedObservationId(observationIdToOpen);
            } else {
                 toast({ variant: 'destructive', title: 'Laporan Tidak Ditemukan' });
            }
            router.replace(pathname, { scroll: false });
        }
    };
    openItemFromNotification();
  }, [observationIdToOpen, isLoading, getObservationById, pathname, router, toast]);

  const filteredData = React.useMemo(() => {
    let data = items;

    if (itemTypeFilter) {
      data = data.filter(item => item.itemType === itemTypeFilter);
    }
    
    if (!searchTerm) return data;
    
    const lowercasedSearch = searchTerm.toLowerCase();
    return data.filter(item => {
        if (item.itemType === 'observation') return item.findings.toLowerCase().includes(lowercasedSearch) || item.recommendation.toLowerCase().includes(lowercasedSearch) || item.company.toLowerCase().includes(lowercasedSearch) || item.location.toLowerCase().includes(lowercasedSearch);
        if (item.itemType === 'inspection') return item.findings.toLowerCase().includes(lowercasedSearch) || item.equipmentName.toLowerCase().includes(lowercasedSearch) || item.location.toLowerCase().includes(lowercasedSearch);
        if (item.itemType === 'ptw') return item.workDescription.toLowerCase().includes(lowercasedSearch) || item.contractor.toLowerCase().includes(lowercasedSearch) || item.location.toLowerCase().includes(lowercasedSearch);
        return false;
    });
  }, [items, searchTerm, itemTypeFilter]);

  function EmptyState() {
    const messages = {
        observation: { icon: ClipboardList, title: 'Belum Ada Observasi', text: 'Belum ada laporan observasi untuk proyek ini.' },
        inspection: { icon: Wrench, title: 'Belum Ada Inspeksi', text: 'Belum ada laporan inspeksi untuk proyek ini.' },
        ptw: { icon: FileSignature, title: 'Belum Ada PTW', text: 'Belum ada izin kerja untuk proyek ini.' },
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

  return (
    <>
     <div className="space-y-4">
        <div className="flex justify-between items-center gap-4">
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
                transition={{ duration: 0.2 }}
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
          <ul className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
               <Card key={i}>
                    <CardContent className="p-4 flex items-start gap-4">
                        <Skeleton className="h-24 w-24 rounded-md" />
                        <div className="flex-1 space-y-3 pt-1">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-5 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                        </div>
                    </CardContent>
               </Card>
            ))}
          </ul>
        ) : filteredData.length > 0 ? (
          <ul className="space-y-4">
             {filteredData.map(item => {
                switch(item.itemType) {
                  case 'observation':
                    return <ObservationListItem key={item.id} observation={item} onSelect={() => setSelectedObservationId(item.id)} />;
                  case 'inspection':
                    return <InspectionListItem key={item.id} inspection={item} onSelect={() => setSelectedInspectionId(item.id)} />;
                  case 'ptw':
                    return <PtwListItem key={item.id} ptw={item} onSelect={() => setSelectedPtwId(item.id)} />;
                  default:
                    return null;
                }
             })}
          </ul>
        ) : (
          <EmptyState />
        )}
      </main>
    </div>

    <ObservationDetailSheet isOpen={!!selectedObservationId} onOpenChange={(isOpen) => { if (!isOpen) setSelectedObservationId(null); }} observationId={selectedObservationId} />
    <InspectionDetailSheet isOpen={!!selectedInspectionId} onOpenChange={(isOpen) => { if(!isOpen) setSelectedInspectionId(null); }} inspectionId={selectedInspectionId} />
    <PtwDetailSheet isOpen={!!selectedPtwId} onOpenChange={(isOpen) => { if(!isOpen) setSelectedPtwId(null); }} ptwId={selectedPtwId} />
   </>
  );
}
