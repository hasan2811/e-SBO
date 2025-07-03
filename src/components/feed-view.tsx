
'use client';

import * as React from 'react';
import Image from 'next/image';
import { useObservations } from '@/contexts/observation-context';
import type { AllItems, Observation, Inspection, Ptw, RiskLevel, ObservationCategory, ObservationStatus, Scope } from '@/lib/types';
import { RISK_LEVELS, OBSERVATION_STATUSES, OBSERVATION_CATEGORIES } from '@/lib/types';
import { InspectionStatusBadge, PtwStatusBadge } from '@/components/status-badges';
import { format } from 'date-fns';
import { FileText, ChevronRight, Download, Wrench, FileSignature as PtwIcon, ChevronDown, Sparkles, Loader2, FilterX, Search, Globe, Building, CheckCircle2, RefreshCw, CircleAlert, Home, Briefcase, User, Share2, ThumbsUp, MessageCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ObservationDetailSheet } from '@/components/observation-detail-sheet';
import { InspectionDetailSheet } from '@/components/inspection-detail-sheet';
import { PtwDetailSheet } from '@/components/ptw-detail-sheet';
import { StarRating } from '@/components/star-rating';
import { exportToExcel } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from '@/components/ui/popover';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { collection, query, orderBy, limit, startAfter, getDocs, QueryDocumentSnapshot, DocumentData, Query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';

const PAGE_SIZE = 10;

interface FeedViewProps {
  mode: Scope;
  projectId?: string;
}

const ObservationListItem = ({ observation, onSelect, mode }: { observation: Observation, onSelect: () => void, mode: FeedViewProps['mode'] }) => {
    const { toggleLikeObservation } = useObservations();
    const { user } = useAuth();
    const { toast } = useToast();

    const riskColorStyles: Record<RiskLevel, string> = {
        Low: 'border-l-chart-2',
        Medium: 'border-l-chart-4',
        High: 'border-l-chart-5',
        Critical: 'border-l-destructive',
    };
    
    const statusIcons: Record<ObservationStatus, { icon: React.ElementType, className: string, label: string }> = {
        'Pending': { icon: CircleAlert, className: 'text-chart-5', label: 'Pending' },
        'In Progress': { icon: RefreshCw, className: 'text-chart-4 animate-spin-slow', label: 'In Progress' },
        'Completed': { icon: CheckCircle2, className: 'text-chart-2', label: 'Completed' },
    };

    // Safeguard against invalid status values to prevent crashes
    const statusInfo = statusIcons[observation.status] || statusIcons['Pending'];
    const StatusIcon = statusInfo.icon;
    const statusClassName = statusInfo.className;
    const statusLabel = statusInfo.label;

    const hasLiked = user && observation.likes?.includes(user.uid);

    const handleLikeClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent opening the detail sheet
        if (!user) {
            toast({ variant: 'destructive', title: 'Anda harus masuk untuk menyukai.' });
            return;
        }
        toggleLikeObservation(observation);
    };

    return (
      <li>
        <div onClick={onSelect} className={cn(
            "bg-card p-3 rounded-lg shadow-sm hover:bg-muted/50 transition-colors cursor-pointer overflow-hidden border-l-4",
            riskColorStyles[observation.riskLevel] || 'border-l-muted'
        )}>
          <div className="flex items-start gap-3">
              <div className="relative h-16 w-16 flex-shrink-0 rounded-md overflow-hidden border bg-muted/20 flex items-center justify-center">
                {observation.photoUrl ? (
                    <Image src={observation.photoUrl} alt={observation.findings} fill sizes="64px" className="object-cover" data-ai-hint="site observation" />
                ) : (
                    <FileText className="h-8 w-8 text-muted-foreground/50" />
                )}
                {observation.aiStatus === 'processing' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </div>
                )}
                {observation.aiStatus === 'completed' && (
                    <div className="absolute bottom-1 right-1 bg-primary/80 backdrop-blur-sm rounded-full p-1">
                        <Sparkles className="h-3 w-3 text-primary-foreground" />
                    </div>
                )}
              </div>
      
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <p className="text-xs text-primary font-semibold truncate pr-2">{observation.category}</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {observation.aiStatus === 'completed' && typeof observation.aiObserverSkillRating === 'number' && (
                             <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <StarRating rating={observation.aiObserverSkillRating} starClassName="h-3 w-3" />
                                    </TooltipTrigger>
                                    <TooltipContent><p>Observer Rating: {observation.aiObserverSkillRating}/5</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <StatusIcon className={cn("h-4 w-4", statusClassName)} />
                                </TooltipTrigger>
                                <TooltipContent><p>{statusLabel}</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
                <p className="font-semibold leading-snug line-clamp-2 mt-0.5">{observation.findings}</p>
                 {mode === 'public' && observation.sharedBy ? (
                    <div className="text-xs text-muted-foreground mt-1.5 truncate">
                        <Share2 className="inline-block h-3 w-3 mr-1.5 align-middle text-primary"/>
                        <span className="align-middle">
                            Dibagikan oleh <strong>{observation.sharedBy.split(' ')[0]}</strong>
                            {observation.sharedByPosition && ` (${observation.sharedByPosition})`}
                        </span>
                    </div>
                 ) : null}
              </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs pt-2 mt-2 border-t border-border/50">
            {mode === 'public' ? (
              <>
                <button
                  onClick={handleLikeClick}
                  className={cn(
                    "flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors",
                    hasLiked && "text-primary font-semibold"
                  )}
                >
                  <ThumbsUp className={cn("h-3.5 w-3.5", hasLiked && "fill-current")} />
                  <span>{observation.likeCount || 0}</span>
                </button>
                <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>{observation.commentCount || 0}</span>
                </button>
                <div className="flex items-center gap-1.5 text-muted-foreground ml-auto">
                  <Eye className="h-3.5 w-3.5" />
                  <span>{observation.viewCount || 0}</span>
                </div>
              </>
            ) : (
                <div className="flex justify-between w-full">
                    <span className="font-medium text-muted-foreground truncate pr-2">{observation.company} &bull; {observation.location}</span>
                    <span className="text-muted-foreground flex-shrink-0">{format(new Date(observation.date), 'd MMM yy, HH:mm')}</span>
                </div>
            )}
          </div>
        </div>
      </li>
    );
  };

const InspectionListItem = ({ inspection, onSelect }: { inspection: Inspection, onSelect: () => void }) => {
  return (
    <li>
      <div onClick={onSelect} className="flex items-start gap-3 bg-card p-3 rounded-lg shadow-sm hover:bg-muted/50 transition-colors cursor-pointer overflow-hidden">
        <div className="relative h-20 w-20 flex-shrink-0 rounded-md overflow-hidden border bg-muted/20 flex items-center justify-center">
          {inspection.photoUrl ? (
            <Image src={inspection.photoUrl} alt={inspection.equipmentName} fill sizes="80px" className="object-cover" data-ai-hint="equipment inspection" />
          ) : (
            <Wrench className="h-8 w-8 text-muted-foreground/50" />
          )}
          {inspection.aiStatus === 'processing' && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
              </div>
          )}
          {inspection.aiStatus === 'completed' && (
              <div className="absolute bottom-1 right-1 bg-primary/80 backdrop-blur-sm rounded-full p-1">
                  <Sparkles className="h-3 w-3 text-primary-foreground" />
              </div>
          )}
        </div>
        
        <div className="flex-1 space-y-1 self-start">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{format(new Date(inspection.date), 'd MMM yyyy, HH:mm')}</span> - {inspection.equipmentType}
          </p>
          <p className="font-semibold leading-snug line-clamp-2">{inspection.equipmentName}</p>
          <p className="text-sm text-muted-foreground line-clamp-1">{inspection.findings}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <InspectionStatusBadge status={inspection.status} />
            <span className="text-xs text-muted-foreground">{inspection.location}</span>
          </div>
        </div>
      </div>
    </li>
  );
};

const PtwListItem = ({ ptw, onSelect }: { ptw: Ptw, onSelect: () => void }) => (
  <li>
    <div onClick={onSelect} className="relative flex items-center bg-card p-4 rounded-lg shadow-sm hover:bg-muted/50 transition-colors cursor-pointer overflow-hidden">
      <div className="flex-1 space-y-2 pr-4">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{format(new Date(ptw.date), 'd MMM yyyy, HH:mm')}</span> - {ptw.contractor}
        </p>
        <p className="font-semibold leading-snug line-clamp-2">{ptw.workDescription}</p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <PtwStatusBadge status={ptw.status} />
          <span className="text-xs text-muted-foreground">{ptw.location}</span>
        </div>
      </div>
      <div className="ml-auto flex items-center pl-2">
        <ChevronRight className="h-6 w-6 text-muted-foreground" />
      </div>
    </div>
  </li>
);

const viewConfig = {
  observations: { label: 'Observasi', icon: Briefcase, itemType: 'observation' },
  inspections: { label: 'Inspeksi', icon: Wrench, itemType: 'inspection' },
  ptws: { label: 'PTW', icon: PtwIcon, itemType: 'ptw' },
};

export function FeedView({ mode, projectId }: FeedViewProps) {
  const { privateItems, projectItems, loading: myItemsLoading } = useObservations();
  const { user } = useAuth();
  
  const [publicItems, setPublicItems] = React.useState<AllItems[]>([]);
  const [loadingPublic, setLoadingPublic] = React.useState(true);
  const [lastVisible, setLastVisible] = React.useState<QueryDocumentSnapshot | null>(null);
  const [hasMorePublic, setHasMorePublic] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  const [selectedObservationId, setSelectedObservationId] = React.useState<string | null>(null);
  const [selectedInspectionId, setSelectedInspectionId] = React.useState<string | null>(null);
  const [selectedPtwId, setSelectedPtwId] = React.useState<string | null>(null);
  
  const [viewType, setViewType] = React.useState<'observations' | 'inspections' | 'ptws'>('observations');
  
  const [searchTerm, setSearchTerm] = React.useState('');

  const [displayedItemsCount, setDisplayedItemsCount] = React.useState(PAGE_SIZE);
  
  const { toast } = useToast();
  
  const fetchPublicItems = React.useCallback(async (reset = false) => {
    setLoadingPublic(true);
    setFetchError(null);
    if (reset) {
        setLastVisible(null);
    }

    try {
        let q: Query<DocumentData> = query(
            collection(db, 'observations'),
            where('scope', '==', 'public'),
            orderBy('date', 'desc'),
            limit(PAGE_SIZE)
        );

        if (lastVisible && !reset) {
            q = query(q, startAfter(lastVisible));
        }

        const documentSnapshots = await getDocs(q);
        const newItems = documentSnapshots.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            itemType: 'observation'
        })) as AllItems[];

        setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1] || null);
        setHasMorePublic(documentSnapshots.docs.length === PAGE_SIZE);

        if (reset) {
            setPublicItems(newItems);
        } else {
            setPublicItems(prevItems => {
                const combined = [...prevItems, ...newItems];
                const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
                return unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            });
        }
    } catch (error: any) {
        console.error('Error fetching public items:', error);
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
            setFetchError('Database memerlukan konfigurasi (indeks) untuk menampilkan data ini. Klik link di konsol browser untuk membuatnya.');
        } else {
            setFetchError(`Gagal memuat data. Periksa koneksi internet Anda. Error: ${error.message}`);
        }
        setHasMorePublic(false);
    } finally {
        setLoadingPublic(false);
    }
  }, [lastVisible]);


  React.useEffect(() => {
    if (mode === 'public') {
      fetchPublicItems(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]); 

  React.useEffect(() => {
    setDisplayedItemsCount(PAGE_SIZE);
  }, [viewType, mode, projectId]);
  
  const data = React.useMemo(() => {
      if (mode === 'public') return publicItems;
      if (mode === 'private') return privateItems;
      if (mode === 'project') return projectItems;
      return [];
  }, [mode, publicItems, privateItems, projectItems]);

  const isLoading = mode === 'public' ? loadingPublic && data.length === 0 : myItemsLoading;

  const filteredData = React.useMemo(() => {
    let baseData = [...data];
    
    // Logic for private and project feeds
    let dataToFilter: AllItems[] = baseData;
    if (mode === 'project' && projectId) {
        dataToFilter = dataToFilter.filter(item => item.projectId === projectId);
    } else if (mode === 'private') {
        dataToFilter = dataToFilter.filter(item => item.scope === 'private');
    }
    
    dataToFilter = dataToFilter.filter(item => item.itemType === viewConfig[viewType].itemType);
    
    if (searchTerm && mode !== 'public') {
        const lowercasedSearch = searchTerm.toLowerCase();
        dataToFilter = dataToFilter.filter(item => {
            if (item.itemType === 'observation') {
                return item.findings.toLowerCase().includes(lowercasedSearch) || item.recommendation.toLowerCase().includes(lowercasedSearch);
            }
            if (item.itemType === 'inspection') {
                return item.findings.toLowerCase().includes(lowercasedSearch) || item.equipmentName.toLowerCase().includes(lowercasedSearch);
            }
            if (item.itemType === 'ptw') {
                return item.workDescription.toLowerCase().includes(lowercasedSearch) || item.contractor.toLowerCase().includes(lowercasedSearch);
            }
            return false;
        });
    }

    return dataToFilter;
  }, [data, mode, projectId, viewType, searchTerm]);

  const itemsToDisplay = mode === 'public' ? filteredData : filteredData.slice(0, displayedItemsCount);
  
  const displayObservation = React.useMemo(() => 
    selectedObservationId ? data.find(o => o.id === selectedObservationId) as Observation : null,
    [selectedObservationId, data]
  );
  
  const displayInspection = React.useMemo(() =>
    selectedInspectionId ? data.find(i => i.id === selectedInspectionId) as Inspection : null,
    [selectedInspectionId, data]
  );
  
  const displayPtw = React.useMemo(() =>
    selectedPtwId ? data.find(p => p.id === selectedPtwId) as Ptw : null,
    [selectedPtwId, data]
  );

  const handleExport = () => {
    const dataToExport = filteredData as Observation[];
    if (dataToExport.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Tidak Ada Data untuk Diekspor',
        description: `Tidak ada data observasi untuk diekspor.`,
      });
      return;
    }
    const fileName = `Export_${mode}_${projectId || ''}_${format(new Date(), 'yyyy-MM-dd')}`;
    exportToExcel(dataToExport, fileName);
  };
  
  const isExportDisabled = viewType !== 'observations' || isLoading;

  function EmptyState() {
    if (mode === 'public') {
        const publicEmptyText = "Feed publik masih kosong. Bagikan observasi dari feed pribadi atau proyek Anda agar muncul di sini.";
        const publicSearchEmptyText = "Tidak ada hasil yang cocok dengan pencarian Anda.";
        return (
            <div className="text-center py-16 text-muted-foreground bg-card rounded-lg">
                {searchTerm ? <FilterX className="mx-auto h-12 w-12" /> : <Globe className="mx-auto h-12 w-12" />}
                <h3 className="mt-4 text-xl font-semibold">{searchTerm ? 'Tidak Ada Hasil' : 'Feed Publik Kosong'}</h3>
                <p className="mt-2 text-sm max-w-xs mx-auto">{searchTerm ? publicSearchEmptyText : publicEmptyText}</p>
            </div>
        );
    }
    
    const config = viewConfig[viewType];
    let emptyText = `Tidak ada ${config.label.toLowerCase()} yang tersedia.`;
    let Icon = Home;

    if(mode === 'project') {
        emptyText = `Belum ada ${config.label.toLowerCase()} untuk proyek ini.`;
        Icon = Briefcase;
    } else if (mode === 'private') {
        emptyText = `Anda belum membuat ${config.label.toLowerCase()} pribadi.`;
        Icon = User;
    }

    return (
      <div className="text-center py-16 text-muted-foreground bg-card rounded-lg">
        <Icon className="mx-auto h-12 w-12" />
        <h3 className="mt-4 text-xl font-semibold">Tidak Ada Data</h3>
        <p className="mt-2 text-sm max-w-xs mx-auto">{emptyText}</p>
      </div>
    );
  }

  return (
    <>
     <div className="space-y-4">
        <div className="flex justify-between items-center gap-4">
            <h2 className="text-2xl font-bold tracking-tight">
                {mode === 'public' ? 'Feed Publik' : mode === 'private' ? 'Pribadi' : viewConfig[viewType].label}
            </h2>
            <div className="flex items-center gap-2">
                {mode !== 'public' && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Search className="h-5 w-5" />
                                <span className="sr-only">Cari</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="p-2 w-80">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari di feed ini..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9"
                                    autoFocus
                                />
                            </div>
                        </PopoverContent>
                    </Popover>
                )}

                {mode !== 'public' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-[140px] justify-between">
                          {viewConfig[viewType].label}
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setViewType('observations')}>Observasi</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setViewType('inspections')}>Inspeksi</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setViewType('ptws')}>PTW</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                )}

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={handleExport} disabled={isExportDisabled}>
                        <Download className="h-4 w-4" />
                        <span className="sr-only">Export</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{viewType === 'observations' ? "Export Observasi" : "Hanya tersedia untuk Observasi"}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
            </div>
        </div>

      <main>
        {fetchError && mode === 'public' && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Gagal Memuat Data Publik</AlertTitle>
            <AlertDescription>
                <p>
                {fetchError}
                </p>
                <p className="mt-2 text-xs">Setelah membuat indeks, mungkin perlu beberapa menit untuk aktif. Coba muat ulang halaman setelahnya.</p>
            </AlertDescription>
          </Alert>
        )}
        {isLoading ? (
          <ul className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i}>
                <div className="flex items-start bg-card p-3 rounded-lg shadow-sm h-[124px]">
                  <Skeleton className="h-16 w-16 rounded-md" />
                  <div className="flex-1 space-y-2 ml-3"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-5 w-full" /><Skeleton className="h-4 w-2/3" /></div>
                </div>
              </li>
            ))}
          </ul>
        ) : itemsToDisplay.length > 0 ? (
          <ul className="space-y-3">
             {itemsToDisplay.map(item => {
                switch(item.itemType) {
                  case 'observation':
                    return <ObservationListItem key={item.id} observation={item} onSelect={() => setSelectedObservationId(item.id)} mode={mode} />;
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
          !fetchError && <EmptyState />
        )}
        
        {mode === 'public' && itemsToDisplay.length > 0 && (
          <div className="mt-6 flex justify-center">
            {hasMorePublic ? (
              <Button
                onClick={() => fetchPublicItems(false)}
                disabled={loadingPublic}
              >
                {loadingPublic && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tampilkan Lebih Banyak
              </Button>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                You have reached the end.
              </p>
            )}
          </div>
        )}

        {mode !== 'public' && displayedItemsCount < filteredData.length && (
            <div className="mt-6 flex justify-center">
                <Button onClick={() => setDisplayedItemsCount(prev => prev + PAGE_SIZE)}>
                    Tampilkan Lebih Banyak
                </Button>
            </div>
        )}

      </main>
    </div>

    {displayObservation && (
        <ObservationDetailSheet 
            observation={displayObservation}
            isOpen={!!displayObservation}
            onOpenChange={(isOpen) => { if (!isOpen) setSelectedObservationId(null); }}
            mode={mode}
        />
    )}
    {displayInspection && (
        <InspectionDetailSheet 
            inspection={displayInspection}
            isOpen={!!displayInspection}
            onOpenChange={(isOpen) => { if (!isOpen) setSelectedInspectionId(null); }}
        />
    )}
    {displayPtw && (
        <PtwDetailSheet 
            ptw={displayPtw}
            isOpen={!!displayPtw}
            onOpenChange={(isOpen) => { if (!isOpen) setSelectedPtwId(null); }}
        />
    )}
   </>
  );
}
