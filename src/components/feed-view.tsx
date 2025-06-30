
'use client';

import * as React from 'react';
import Image from 'next/image';
import { useObservations } from '@/contexts/observation-context';
import type { AllItems, Observation, Inspection, Ptw, RiskLevel, ObservationCategory, ObservationStatus } from '@/lib/types';
import { RISK_LEVELS, OBSERVATION_STATUSES, OBSERVATION_CATEGORIES } from '@/lib/types';
import { InspectionStatusBadge, PtwStatusBadge } from '@/components/status-badges';
import { format } from 'date-fns';
import { FileText, ChevronRight, Download, Wrench, FileSignature as PtwIcon, ChevronDown, Sparkles, Loader2, FilterX, Filter, CheckCircle2, RefreshCw, CircleAlert, Home, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ObservationDetailSheet } from '@/components/observation-detail-sheet';
import { InspectionDetailSheet } from '@/components/inspection-detail-sheet';
import { PtwDetailSheet } from '@/components/ptw-detail-sheet';
import { StarRating } from '@/components/star-rating';
import { exportToExcel } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { collection, query, where, orderBy, limit, startAfter, getDocs, QueryDocumentSnapshot, DocumentData, Query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const PAGE_SIZE = 10;

const ObservationListItem = ({ observation, onSelect }: { observation: Observation, onSelect: () => void }) => {
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
    const StatusIcon = statusIcons[observation.status].icon;
    const statusClassName = statusIcons[observation.status].className;
    const statusLabel = statusIcons[observation.status].label;


    return (
      <li>
        <div onClick={onSelect} className={cn(
            "flex items-start gap-3 bg-card p-3 rounded-lg shadow-sm hover:bg-muted/50 transition-colors cursor-pointer overflow-hidden border-l-4",
            riskColorStyles[observation.riskLevel]
        )}>
          <div className="relative h-20 w-20 flex-shrink-0 rounded-md overflow-hidden border bg-muted/20 flex items-center justify-center">
            {observation.photoUrl ? (
                <Image src={observation.photoUrl} alt={observation.findings} fill sizes="80px" className="object-cover" data-ai-hint="site observation" />
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
  
            <div className="flex-1 space-y-1 self-start">
                <div className="flex justify-between items-start">
                    <p className="text-xs text-muted-foreground font-semibold">{observation.location}</p>
                    <div className="flex items-center gap-2">
                        {observation.aiStatus === 'completed' && typeof observation.aiObserverSkillRating === 'number' && (
                            <div title={`Observer Rating: ${observation.aiObserverSkillRating}/5`}>
                                <StarRating rating={observation.aiObserverSkillRating} starClassName="h-3 w-3" />
                            </div>
                        )}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <StatusIcon className={cn("h-4 w-4", statusClassName)} />
                                </TooltipTrigger>
                                <TooltipContent><p>{statusLabel}</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
                <p className="font-semibold leading-snug line-clamp-2">{observation.findings}</p>
                <div className="flex flex-wrap items-center gap-x-2 pt-1">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(observation.date), 'd MMM yyyy, HH:mm')} &bull; {observation.category} &bull; {observation.company}
                  </p>
                </div>
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

interface FeedViewProps {
  mode: 'public' | 'personal';
}

export function FeedView({ mode }: FeedViewProps) {
  const { myItems, loading: myItemsLoading } = useObservations();
  
  const [items, setItems] = React.useState<AllItems[]>([]);
  const [loading, setLoading] = React.useState(true);
  const lastVisibleRef = React.useRef<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = React.useState(true);

  const [selectedObservationId, setSelectedObservationId] = React.useState<string | null>(null);
  const [selectedInspectionId, setSelectedInspectionId] = React.useState<string | null>(null);
  const [selectedPtwId, setSelectedPtwId] = React.useState<string | null>(null);
  
  const [viewType, setViewType] = React.useState<'observations' | 'inspections' | 'ptws'>('observations');
  
  // Filters for observations
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [riskFilter, setRiskFilter] = React.useState('all');
  const [categoryFilter, setCategoryFilter] = React.useState('all');
  
  const { toast } = useToast();

  const viewConfig = {
    observations: { label: 'Observasi', icon: Briefcase, itemType: 'observation' },
    inspections: { label: 'Inspeksi', icon: Wrench, itemType: 'inspection' },
    ptws: { label: 'PTW', icon: PtwIcon, itemType: 'ptw' },
  };

  const pageTitle = mode === 'public' ? 'Publik' : 'Project';
  
  const clearFilters = () => {
    setStatusFilter('all');
    setRiskFilter('all');
    setCategoryFilter('all');
  };

  const fetchPublicItems = React.useCallback(async (reset = false) => {
    setLoading(true);

    try {
        let q: Query<DocumentData> = query(collection(db, viewType));

        // Note: The `where('scope', '==', 'public')` has been removed to align with new rules.
        // Public access is now default unless scope is 'private' or 'project'.
        // The firestore.rules will handle enforcement.

        if (viewType === 'observations') {
            if (statusFilter !== 'all') {
                q = query(q, where('status', '==', statusFilter));
            }
            if (riskFilter !== 'all') {
                q = query(q, where('riskLevel', '==', riskFilter));
            }
            if (categoryFilter !== 'all') {
                q = query(q, where('category', '==', categoryFilter));
            }
        }

        q = query(q, orderBy('date', 'desc'), limit(PAGE_SIZE));

        if (lastVisibleRef.current && !reset) {
            q = query(q, startAfter(lastVisibleRef.current));
        }

        const documentSnapshots = await getDocs(q);
        const newItems = documentSnapshots.docs
            .filter(doc => doc.data().scope !== 'private' && doc.data().scope !== 'project') // Client-side filter for documents that have no scope or are public
            .map(doc => ({
                ...doc.data(),
                id: doc.id,
                itemType: viewConfig[viewType].itemType,
            })) as AllItems[];

        const lastDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1];
        lastVisibleRef.current = lastDoc || null;
        setHasMore(documentSnapshots.docs.length === PAGE_SIZE);
        setItems(prevItems => (reset ? newItems : [...prevItems, ...newItems]));

    } catch (error) {
        console.error("Error fetching public items:", error);
        toast({
            variant: "destructive",
            title: "Gagal Memuat Data",
            description: "Tidak dapat mengambil data publik. Coba lagi nanti."
        });
        setHasMore(false);
    } finally {
        setLoading(false);
    }
  }, [viewType, statusFilter, riskFilter, categoryFilter, toast]);


  React.useEffect(() => {
    if (mode === 'public') {
      lastVisibleRef.current = null;
      fetchPublicItems(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, viewType, statusFilter, riskFilter, categoryFilter]);


  const data = mode === 'public' ? items : myItems;
  const isLoading = mode === 'public' ? loading && !items.length : myItemsLoading;


  const filteredData = React.useMemo(() => {
    if (mode === 'public') {
        return data;
    }
    // Personal mode filtering logic remains client-side as it's a smaller dataset
    let dataToFilter: AllItems[] = [...data];
    dataToFilter = dataToFilter.filter(item => item.itemType === viewType.slice(0, -1));

    if (viewType === 'observations') {
        let observationData = dataToFilter as Observation[];
        if (statusFilter !== 'all') {
            observationData = observationData.filter(obs => obs.status === statusFilter);
        }
        if (riskFilter !== 'all') {
            observationData = observationData.filter(obs => obs.riskLevel === riskFilter);
        }
        if (categoryFilter !== 'all') {
            observationData = observationData.filter(obs => obs.category === categoryFilter);
        }
        return observationData;
    }
    
    return dataToFilter;
  }, [data, mode, viewType, statusFilter, riskFilter, categoryFilter]);
  
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
    const fileName = `${pageTitle.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}`;
    exportToExcel(dataToExport, fileName);
  };
  
  const areFiltersActive = statusFilter !== 'all' || riskFilter !== 'all' || categoryFilter !== 'all';
  const isExportDisabled = viewType !== 'observations' || isLoading;

  function EmptyState() {
    const config = viewConfig[viewType];
    const emptyText = mode === 'personal' 
        ? `Anda belum membuat ${config.label.toLowerCase()} atau belum ada laporan di proyek Anda.`
        : `Tidak ada ${config.label.toLowerCase()} publik yang tersedia.`
    
    const filterText = `Tidak ada ${config.label.toLowerCase()} yang cocok dengan filter Anda.`;

    return (
      <div className="text-center py-16 text-muted-foreground bg-card rounded-lg">
        {areFiltersActive ? <FilterX className="mx-auto h-12 w-12" /> : mode === 'public' ? <Home className="mx-auto h-12 w-12" /> : <Briefcase className="mx-auto h-12 w-12" />}
        <h3 className="mt-4 text-xl font-semibold">{areFiltersActive ? 'Tidak Ada Hasil' : 'Tidak Ada Laporan'}</h3>
        <p className="mt-2 text-sm max-w-xs mx-auto">{areFiltersActive ? filterText : emptyText}</p>
         {areFiltersActive && <Button variant="default" className="mt-6" onClick={clearFilters}><FilterX className="mr-2 h-4 w-4"/>Hapus Filter</Button>}
      </div>
    );
  }

  return (
    <>
     <div className="space-y-4">
        <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-2">
               <h2 className="text-2xl font-bold tracking-tight">{pageTitle}</h2>
            </div>
            <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-[140px] justify-between">
                      {viewConfig[viewType].label}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setViewType('observations')}>{viewConfig.observations.label}</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setViewType('inspections')}>{viewConfig.inspections.label}</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setViewType('ptws')}>{viewConfig.ptws.label}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <TooltipProvider>
                  {viewType === 'observations' && (
                     <Popover>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="icon" className="relative">
                                <Filter className="h-4 w-4" />
                                {areFiltersActive && (
                                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                                  </span>
                                )}
                                <span className="sr-only">Filter</span>
                              </Button>
                            </PopoverTrigger>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Filter Observasi</p>
                          </TooltipContent>
                        </Tooltip>
                        <PopoverContent className="w-80" align="end">
                          <div className="grid gap-4">
                            <div className="space-y-1">
                              <h4 className="font-medium leading-none">Filter Observasi</h4>
                              <p className="text-sm text-muted-foreground">
                                Persempit hasil berdasarkan kriteria.
                              </p>
                            </div>
                            <div className="grid gap-4">
                              <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                  <SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">Semua Status</SelectItem>
                                    {(OBSERVATION_STATUSES as readonly ObservationStatus[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Tingkat Risiko</Label>
                                <Select value={riskFilter} onValueChange={setRiskFilter}>
                                  <SelectTrigger><SelectValue placeholder="Pilih risiko" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">Semua Risiko</SelectItem>
                                    {(RISK_LEVELS as readonly RiskLevel[]).map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Kategori</Label>
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                  <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">Semua Kategori</SelectItem>
                                    {(OBSERVATION_CATEGORIES as readonly ObservationCategory[]).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t -mx-4 px-4 pb-0">
                              <Button variant="ghost" onClick={clearFilters} disabled={!areFiltersActive}>
                                <FilterX className="mr-2 h-4 w-4" />
                                Hapus Filter
                              </Button>
                              <PopoverClose asChild>
                                <Button>Selesai</Button>
                              </PopoverClose>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                  )}
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
        {isLoading ? (
          <ul className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i}>
                <div className="flex items-start bg-card p-3 rounded-lg shadow-sm h-[104px]">
                  <Skeleton className="h-20 w-20 rounded-md" />
                  <div className="flex-1 space-y-2 ml-3"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-2/3" /></div>
                </div>
              </li>
            ))}
          </ul>
        ) : filteredData.length > 0 ? (
          <ul className="space-y-3">
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
        
        {mode === 'public' && filteredData.length > 0 && (
          <div className="mt-6 flex justify-center">
            {hasMore ? (
              <Button
                onClick={() => fetchPublicItems(false)}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tampilkan Lebih Banyak
              </Button>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                You have reached the end.
              </p>
            )}
          </div>
        )}

      </main>
    </div>

    {displayObservation && (
        <ObservationDetailSheet 
            observation={displayObservation}
            isOpen={!!displayObservation}
            onOpenChange={(isOpen) => { if (!isOpen) setSelectedObservationId(null); }}
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
