
'use client';

import * as React from 'react';
import Image from 'next/image';
import { useObservations } from '@/contexts/observation-context';
import type { AllItems, Observation, Inspection, Ptw, RiskLevel, ObservationCategory, ObservationStatus, Scope } from '@/lib/types';
import { RISK_LEVELS, OBSERVATION_STATUSES, OBSERVATION_CATEGORIES } from '@/lib/types';
import { InspectionStatusBadge, PtwStatusBadge } from '@/components/status-badges';
import { format } from 'date-fns';
import { FileText, ChevronRight, Download, Wrench, FileSignature as PtwIcon, ChevronDown, Sparkles, Loader2, FilterX, Filter, CheckCircle2, RefreshCw, CircleAlert, Home, Briefcase, User, Share2, ThumbsUp, MessageCircle, Eye, Search, Globe } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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

    const hasLiked = user && observation.likes?.includes(user.uid);

    const handleLikeClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent opening the detail sheet
        toggleLikeObservation(observation);
    };

    return (
      <li>
        <div onClick={onSelect} className={cn(
            "bg-card p-3 rounded-lg shadow-sm hover:bg-muted/50 transition-colors cursor-pointer overflow-hidden border-l-4",
            riskColorStyles[observation.riskLevel]
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
      
              <div className="flex-1 flex flex-col justify-between self-stretch">
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        {mode === 'public' ? (
                            <p className="text-xs text-primary font-semibold">{observation.category}</p>
                        ) : (
                             <p className="text-xs text-muted-foreground font-semibold">{observation.location} • {observation.category}</p>
                        )}
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
                    <p className="font-semibold leading-snug line-clamp-2 mt-0.5">{observation.findings}</p>
                </div>
                
                <div className="flex justify-between items-end text-xs text-muted-foreground mt-1">
                    {mode === 'public' && observation.sharedBy ? (
                        <div className="flex items-center gap-1.5">
                          <Share2 className="h-3 w-3 flex-shrink-0"/>
                          <span>
                              Oleh <strong>{observation.sharedBy.split(' ')[0]}</strong>
                          </span>
                        </div>
                    ) : (
                        <span>{observation.company}</span>
                    )}
                    <span>{format(new Date(observation.date), 'd MMM yy, HH:mm')}</span>
                </div>
              </div>
          </div>
          
          {mode !== 'private' && (
            <div className="flex items-center gap-4 text-xs pt-2 mt-2 border-t border-border/50">
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
            </div>
          )}
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
  
  const [publicItems, setPublicItems] = React.useState<AllItems[]>([]);
  const [loadingPublic, setLoadingPublic] = React.useState(true);
  const [lastVisible, setLastVisible] = React.useState<QueryDocumentSnapshot | null>(null);
  const [hasMorePublic, setHasMorePublic] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  const [selectedObservationId, setSelectedObservationId] = React.useState<string | null>(null);
  const [selectedInspectionId, setSelectedInspectionId] = React.useState<string | null>(null);
  const [selectedPtwId, setSelectedPtwId] = React.useState<string | null>(null);
  
  const [viewType, setViewType] = React.useState<'observations' | 'inspections' | 'ptws'>('observations');
  
  const [filterType, setFilterType] = React.useState<'status' | 'risk' | 'category' | 'all'>('all');
  const [filterValue, setFilterValue] = React.useState('all');
  const [searchTerm, setSearchTerm] = React.useState('');

  const [displayedItemsCount, setDisplayedItemsCount] = React.useState(PAGE_SIZE);
  
  const { toast } = useToast();
  
  const filterOptions = {
    status: OBSERVATION_STATUSES,
    risk: RISK_LEVELS,
    category: OBSERVATION_CATEGORIES,
  };
  
  const clearFilters = () => {
    setFilterType('all');
    setFilterValue('all');
  };
  
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
    // Reset pagination when filters change for private/project views
    setDisplayedItemsCount(PAGE_SIZE);
  }, [filterType, filterValue, viewType, mode]);
  
  const data = React.useMemo(() => {
      if (mode === 'public') return publicItems;
      if (mode === 'private') return privateItems;
      if (mode === 'project') return projectItems;
      return [];
  }, [mode, publicItems, privateItems, projectItems]);

  const isLoading = mode === 'public' ? loadingPublic && data.length === 0 : myItemsLoading;

  const filteredData = React.useMemo(() => {
    if (mode === 'public') {
        let items = [...data];
        if (searchTerm) {
            const lowercasedSearch = searchTerm.toLowerCase();
            items = items.filter(item => {
                if (item.itemType !== 'observation') return false;
                const obs = item as Observation;
                return (
                    obs.findings.toLowerCase().includes(lowercasedSearch) ||
                    obs.recommendation.toLowerCase().includes(lowercasedSearch) ||
                    obs.location.toLowerCase().includes(lowercasedSearch) ||
                    (obs.sharedBy && obs.sharedBy.toLowerCase().includes(lowercasedSearch)) ||
                    (obs.sharedByPosition && obs.sharedByPosition.toLowerCase().includes(lowercasedSearch))
                );
            });
        }
        return items;
    }
    
    // Logic for private and project feeds
    let dataToFilter: AllItems[] = [...data];
    if (mode === 'project' && projectId) {
        dataToFilter = dataToFilter.filter(item => item.projectId === projectId);
    }
    dataToFilter = dataToFilter.filter(item => item.itemType === viewConfig[viewType].itemType);

    if (viewType === 'observations') {
        if (filterType !== 'all' && filterValue !== 'all') {
            const fieldMap = { status: 'status', risk: 'riskLevel', category: 'category' };
            const key = fieldMap[filterType as 'status' | 'risk' | 'category'];
            dataToFilter = (dataToFilter as Observation[]).filter(obs => obs[key as keyof Observation] === filterValue);
        }
    }
    
    return dataToFilter;
  }, [data, mode, projectId, viewType, filterType, filterValue, searchTerm]);

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
  
  const areFiltersActive = filterType !== 'all' && filterValue !== 'all';
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
        emptyText = `Belum ada laporan ${config.label.toLowerCase()} untuk proyek ini.`;
        Icon = Briefcase;
    } else if (mode === 'private') {
        emptyText = `Anda belum membuat ${config.label.toLowerCase()} pribadi.`;
        Icon = User;
    }
    
    const filterText = `Tidak ada ${config.label.toLowerCase()} yang cocok dengan filter Anda.`;

    return (
      <div className="text-center py-16 text-muted-foreground bg-card rounded-lg">
        {areFiltersActive ? <FilterX className="mx-auto h-12 w-12" /> : <Icon className="mx-auto h-12 w-12" />}
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
            <h2 className="text-2xl font-bold tracking-tight">
                {mode === 'public' ? 'Feed Publik' : `Laporan ${viewConfig[viewType].label}`}
            </h2>
            {mode === 'public' ? (
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
                                placeholder="Cari di feed..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                                autoFocus
                            />
                        </div>
                    </PopoverContent>
                </Popover>
            ) : (
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
                                    Pilih satu jenis filter untuk diterapkan.
                                  </p>
                                </div>
                                <div className="grid gap-4">
                                   <RadioGroup value={filterType} onValueChange={(value) => {
                                       setFilterType(value as 'status' | 'risk' | 'category' | 'all');
                                       setFilterValue('all');
                                   }}>
                                     <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="all" id="r-all" />
                                        <Label htmlFor="r-all">Semua</Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="status" id="r-status" />
                                        <Label htmlFor="r-status">Status</Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="risk" id="r-risk" />
                                        <Label htmlFor="r-risk">Tingkat Risiko</Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="category" id="r-category" />
                                        <Label htmlFor="r-category">Kategori</Label>
                                      </div>
                                   </RadioGroup>

                                   {filterType !== 'all' && (
                                     <div className="space-y-2">
                                        <Label>Pilih Nilai</Label>
                                         <Select value={filterValue} onValueChange={setFilterValue}>
                                           <SelectTrigger><SelectValue placeholder="Pilih nilai..." /></SelectTrigger>
                                           <SelectContent>
                                             <SelectItem value="all">Semua</SelectItem>
                                             {(filterOptions[filterType as keyof typeof filterOptions]).map((option) => (
                                                <SelectItem key={option} value={option}>{option}</SelectItem>
                                             ))}
                                           </SelectContent>
                                         </Select>
                                     </div>
                                   )}
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
            )}
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
                <div className="flex items-start bg-card p-3 rounded-lg shadow-sm h-[104px]">
                  <Skeleton className="h-20 w-20 rounded-md" />
                  <div className="flex-1 space-y-2 ml-3"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-2/3" /></div>
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
