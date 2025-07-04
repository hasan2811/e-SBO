
'use client';

import * as React from 'react';
import Image from 'next/image';
import type { AllItems, Observation, Inspection, Ptw, RiskLevel, ObservationStatus, Scope } from '@/lib/types';
import { InspectionStatusBadge, PtwStatusBadge } from '@/components/status-badges';
import { format } from 'date-fns';
import { FileText, ChevronRight, Download, Wrench, FileSignature as PtwIcon, ChevronDown, Sparkles, Loader2, FilterX, Search, Globe, Building, CheckCircle2, RefreshCw, CircleAlert, Home, Briefcase, User, Share2, ThumbsUp, MessageCircle, Eye, Trash2, MoreVertical } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { collection, query, orderBy, limit, startAfter, getDocs, QueryDocumentSnapshot, DocumentData, Query, where, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Checkbox } from '@/components/ui/checkbox';
import { DeleteMultipleDialog } from './delete-multiple-dialog';
import { usePathname, useRouter } from 'next/navigation';
import { toggleLike } from '@/lib/actions/interaction-actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


const PAGE_SIZE = 10;

interface FeedViewProps {
  mode: Scope;
  projectId?: string;
  observationIdToOpen?: string | null;
}

const viewTypeInfo = {
    observations: { label: 'Observasi', icon: Briefcase, collection: 'observations' },
    inspections: { label: 'Inspeksi', icon: Wrench, collection: 'inspections' },
    ptws: { label: 'PTW', icon: PtwIcon, collection: 'ptws' },
};

const ObservationListItem = ({ observation, onSelect, mode, isSelectionMode, isSelected, onToggleSelect, onLikeToggle }: { observation: Observation, onSelect: () => void, mode: FeedViewProps['mode'], isSelectionMode: boolean, isSelected: boolean, onToggleSelect: () => void, onLikeToggle: (obs: Observation) => void }) => {
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

    const statusInfo = statusIcons[observation.status] || statusIcons['Pending'];
    const StatusIcon = statusInfo.icon;
    const statusClassName = statusInfo.className;
    const statusLabel = statusInfo.label;

    const hasLiked = user && observation.likes?.includes(user.uid);

    const handleLikeClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onLikeToggle(observation);
    };
    
    const handleItemClick = (e: React.MouseEvent<HTMLLIElement>) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, a')) return;

        if (isSelectionMode) {
            onToggleSelect();
        } else {
            onSelect();
        }
    };

    return (
      <li onClick={handleItemClick} className={cn("flex items-center gap-3 bg-card p-3 rounded-lg shadow-sm transition-all cursor-pointer", isSelectionMode && 'pr-4')}>
        {isSelectionMode && (
             <Checkbox
                checked={isSelected}
                onCheckedChange={onToggleSelect}
                aria-label={`Select observation ${observation.referenceId}`}
                className="h-5 w-5 ml-1"
              />
        )}
        <div className={cn(
            "flex-1 p-3 -m-3 rounded-lg overflow-hidden border-l-4 transition-colors",
            riskColorStyles[observation.riskLevel] || 'border-l-muted',
            isSelected ? 'bg-primary/10 hover:bg-primary/20' : 'hover:bg-muted/50'
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
                <div className="flex items-center gap-1.5 text-muted-foreground cursor-pointer hover:text-primary">
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>{observation.commentCount || 0}</span>
                </div>
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

const InspectionListItem = ({ inspection, onSelect, isSelectionMode, isSelected, onToggleSelect }: { inspection: Inspection, onSelect: () => void, isSelectionMode: boolean, isSelected: boolean, onToggleSelect: () => void }) => {
    const handleItemClick = (e: React.MouseEvent<HTMLLIElement>) => {
        if (isSelectionMode) onToggleSelect(); else onSelect();
    };

  return (
    <li onClick={handleItemClick} className={cn("flex items-center gap-3 bg-card p-3 rounded-lg shadow-sm transition-all cursor-pointer", isSelectionMode && 'pr-4')}>
        {isSelectionMode && <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} className="h-5 w-5 ml-1"/>}
        <div className={cn("flex-1 p-3 -m-3 flex items-start gap-3 rounded-lg overflow-hidden transition-colors", isSelected ? 'bg-primary/10 hover:bg-primary/20' : 'hover:bg-muted/50')}>
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

const PtwListItem = ({ ptw, onSelect, isSelectionMode, isSelected, onToggleSelect }: { ptw: Ptw, onSelect: () => void, isSelectionMode: boolean, isSelected: boolean, onToggleSelect: () => void }) => {
    const handleItemClick = (e: React.MouseEvent<HTMLLIElement>) => {
        if (isSelectionMode) onToggleSelect(); else onSelect();
    };
    return (
        <li onClick={handleItemClick} className={cn("flex items-center gap-3 bg-card p-3 rounded-lg shadow-sm transition-all cursor-pointer", isSelectionMode && 'pr-4')}>
            {isSelectionMode && <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} className="h-5 w-5 ml-1"/>}
            <div className={cn("flex-1 p-3 -m-3 relative flex items-center rounded-lg overflow-hidden transition-colors", isSelected ? 'bg-primary/10 hover:bg-primary/20' : 'hover:bg-muted/50')}>
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
    )
};

export function FeedView({ mode, projectId, observationIdToOpen }: FeedViewProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [items, setItems] = React.useState<AllItems[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [lastVisible, setLastVisible] = React.useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = React.useState(true);
  
  const [selectedObservationId, setSelectedObservationId] = React.useState<string | null>(null);
  const [selectedInspectionId, setSelectedInspectionId] = React.useState<string | null>(null);
  const [selectedPtwId, setSelectedPtwId] = React.useState<string | null>(null);
  
  const [viewType, setViewType] = React.useState<'observations' | 'inspections' | 'ptws'>('observations');
  const [searchTerm, setSearchTerm] = React.useState('');
  
  const [isSelectionMode, setIsSelectionMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isDeleteMultiOpen, setDeleteMultiOpen] = React.useState(false);

  const fetchItems = React.useCallback(async (reset: boolean = false) => {
    if (!user && (mode === 'private' || mode === 'project')) return;
    setIsLoading(true);
    setError(null);
    const lastDoc = reset ? null : lastVisible;

    try {
        let q: Query;
        const collectionName = viewTypeInfo[viewType].collection;
        let baseQuery = query(collection(db, collectionName), orderBy('date', 'desc'), limit(PAGE_SIZE));

        if (mode === 'public') {
            q = query(baseQuery, where('scope', '==', 'public'));
        } else if (mode === 'project' && projectId) {
            q = query(baseQuery, where('scope', '==', 'project'), where('projectId', '==', projectId));
        } else if (mode === 'private') {
            q = query(baseQuery, where('scope', '==', 'private'), where('userId', '==', user?.uid));
        } else {
            // Should not happen, but as a safeguard
            setItems([]);
            setIsLoading(false);
            return;
        }

        if (lastDoc) {
            q = query(q, startAfter(lastDoc));
        }

        const docSnap = await getDocs(q);
        const newItems: AllItems[] = docSnap.docs.map(d => ({ ...d.data(), id: d.id, itemType: viewType.slice(0, -1) as any }));
        
        setHasMore(newItems.length === PAGE_SIZE);
        setLastVisible(docSnap.docs[docSnap.docs.length - 1] || null);
        setItems(prev => reset ? newItems : [...prev, ...newItems]);

    } catch (e) {
        console.error("Error fetching items:", e);
        setError("Failed to load feed data.");
    } finally {
        setIsLoading(false);
    }
  }, [mode, projectId, user, viewType, lastVisible]);
  
  // Initial fetch and reset on filter changes
  React.useEffect(() => {
    fetchItems(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, projectId, viewType, user]);


  const triggeredOpen = React.useRef(false);
  React.useEffect(() => {
    const openItemFromNotification = async () => {
        if (observationIdToOpen && !isLoading && !triggeredOpen.current) {
            triggeredOpen.current = true;
            try {
                const itemDoc = await getDoc(doc(db, 'observations', observationIdToOpen));
                if (itemDoc.exists()) {
                    const itemData = itemDoc.data();
                    if (itemData.projectId === projectId) {
                        setViewType('observations');
                        setSelectedObservationId(observationIdToOpen);
                    }
                } else {
                     toast({ variant: 'destructive', title: 'Laporan Tidak Ditemukan' });
                }
            } catch (e) {
                toast({ variant: 'destructive', title: 'Gagal Membuka Laporan' });
            }
            router.replace(pathname, { scroll: false });
        }
    };
    openItemFromNotification();
  }, [observationIdToOpen, isLoading, projectId, pathname, router, toast]);

  const filteredData = React.useMemo(() => {
    if (!searchTerm) return items;
    const lowercasedSearch = searchTerm.toLowerCase();
    return items.filter(item => {
        if (item.itemType === 'observation') return item.findings.toLowerCase().includes(lowercasedSearch) || item.recommendation.toLowerCase().includes(lowercasedSearch);
        if (item.itemType === 'inspection') return item.findings.toLowerCase().includes(lowercasedSearch) || item.equipmentName.toLowerCase().includes(lowercasedSearch);
        if (item.itemType === 'ptw') return item.workDescription.toLowerCase().includes(lowercasedSearch) || item.contractor.toLowerCase().includes(lowercasedSearch);
        return false;
    });
  }, [items, searchTerm]);
  
  const displayObservation = React.useMemo(() => 
    selectedObservationId ? items.find(o => o.id === selectedObservationId) as Observation : null,
    [selectedObservationId, items]
  );
  
  const displayInspection = React.useMemo(() =>
    selectedInspectionId ? items.find(i => i.id === selectedInspectionId) as Inspection : null,
    [selectedInspectionId, items]
  );
  
  const displayPtw = React.useMemo(() =>
    selectedPtwId ? items.find(p => p.id === selectedPtwId) as Ptw : null,
    [selectedPtwId, items]
  );

  const handleExport = () => {
    const dataToExport = filteredData.filter(item => item.itemType === 'observation') as Observation[];
    if (dataToExport.length === 0) {
      toast({ variant: 'destructive', title: 'Tidak Ada Data untuk Diekspor' });
      return;
    }
    const fileName = `Export_${mode}_${projectId || ''}_${format(new Date(), 'yyyy-MM-dd')}`;
    exportToExcel(dataToExport, fileName);
  };
  
  const handleToggleSelection = (id: string) => {
    setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        return newSet;
    });
  };

  const handleLikeToggle = async (observation: Observation) => {
      if (!user) {
        toast({ variant: 'destructive', title: 'Anda harus masuk untuk menyukai.' });
        return;
      }

      const originalLikes = observation.likes || [];
      const hasLiked = originalLikes.includes(user.uid);
      
      const optimisticUpdate = (item: AllItems): AllItems => {
        if (item.id === observation.id && item.itemType === 'observation') {
            const newLikes = hasLiked
                ? originalLikes.filter(uid => uid !== user.uid)
                : [...originalLikes, user.uid];
            return { ...item, likes: newLikes, likeCount: newLikes.length };
        }
        return item;
      };
      
      setItems(currentItems => currentItems.map(optimisticUpdate));

      try {
          await toggleLike({ docId: observation.id, userId: user.uid, collectionName: 'observations' });
      } catch (error) {
          console.error('Failed to toggle like:', error);
          toast({ variant: 'destructive', title: 'Gagal', description: 'Tidak dapat memproses suka.'});
          // Revert UI on failure
          setItems(currentItems => currentItems.map(item => item.id === observation.id ? observation : item));
      }
  };

  const isExportDisabled = viewType !== 'observations';
  const canSelect = !isLoading && filteredData.length > 0 && mode !== 'public';

  function EmptyState() {
    let Icon = Home;
    let title = 'Feed Kosong';
    let text = 'Tidak ada laporan yang tersedia.';
  
    if (mode === 'public') {
      Icon = Globe;
      title = searchTerm ? 'Tidak Ada Hasil' : 'Feed Publik Kosong';
      text = searchTerm ? 'Tidak ada hasil yang cocok dengan pencarian Anda.' : 'Bagikan observasi dari feed pribadi atau proyek Anda agar muncul di sini.';
    } else if (mode === 'project') {
      Icon = Briefcase;
      title = 'Proyek Kosong';
      text = `Belum ada ${viewTypeInfo[viewType].label.toLowerCase()} untuk proyek ini.`;
    } else if (mode === 'private') {
      Icon = User;
      title = 'Feed Pribadi Kosong';
      text = `Anda belum membuat ${viewTypeInfo[viewType].label.toLowerCase()} pribadi.`;
    }
  
    return (
      <div className="text-center py-16 text-muted-foreground bg-card rounded-lg">
        <Icon className="mx-auto h-12 w-12" />
        <h3 className="mt-4 text-xl font-semibold">{title}</h3>
        <p className="mt-2 text-sm max-w-xs mx-auto">{text}</p>
      </div>
    );
  }

  return (
    <>
     <div className="space-y-4">
        <div className="flex justify-between items-center gap-4 min-h-[40px]">
          {isSelectionMode ? (
            <>
              <Button variant="ghost" onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }}>Batal</Button>
              <p className="font-semibold">{selectedIds.size} dipilih</p>
              <Button variant="destructive" size="icon" onClick={() => setDeleteMultiOpen(true)} disabled={selectedIds.size === 0}>
                <Trash2 className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
                <h2 className="text-2xl font-bold tracking-tight">
                    {mode === 'public' ? 'Feed Publik' : 'Feed'}
                </h2>
                <div className="flex items-center gap-2">
                    {mode !== 'public' && (
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-[140px] justify-between">
                                    <span>{viewTypeInfo[viewType].label}</span>
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[140px]">
                                {Object.entries(viewTypeInfo).map(([key, { label, icon: Icon }]) => (
                                    <DropdownMenuItem key={key} onSelect={() => setViewType(key as 'observations' | 'inspections' | 'ptws')}>
                                        <Icon className="mr-2 h-4 w-4" />
                                        <span>{label}</span>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    <Popover>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-5 w-5" />
                                    <span className="sr-only">Opsi</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {mode !== 'public' && (
                                    <PopoverTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); }}>
                                            <Search className="mr-2 h-4 w-4" />
                                            <span>Cari</span>
                                        </DropdownMenuItem>
                                    </PopoverTrigger>
                                )}
                                {canSelect && (
                                    <DropdownMenuItem onSelect={() => setIsSelectionMode(true)}>
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        <span>Pilih</span>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onSelect={handleExport} disabled={isExportDisabled}>
                                    <Download className="mr-2 h-4 w-4" />
                                    <span>Export</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <PopoverContent align="end" className="p-2 w-80">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Cari di feed ini..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" autoFocus />
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </>
          )}
        </div>

      <main>
        {isLoading && filteredData.length === 0 ? (
          <ul className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i}><div className="flex items-start bg-card p-3 rounded-lg shadow-sm h-[124px]"><Skeleton className="h-16 w-16 rounded-md" /><div className="flex-1 space-y-2 ml-3"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-5 w-full" /><Skeleton className="h-4 w-2/3" /></div></div></li>
            ))}
          </ul>
        ) : error ? (
            <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        ) : filteredData.length > 0 ? (
          <ul className="space-y-3">
             {filteredData.map(item => {
                switch(item.itemType) {
                  case 'observation':
                    return <ObservationListItem key={item.id} observation={item} onSelect={() => setSelectedObservationId(item.id)} mode={mode} isSelectionMode={isSelectionMode} isSelected={selectedIds.has(item.id)} onToggleSelect={() => handleToggleSelection(item.id)} onLikeToggle={handleLikeToggle} />;
                  case 'inspection':
                    return <InspectionListItem key={item.id} inspection={item} onSelect={() => setSelectedInspectionId(item.id)} isSelectionMode={isSelectionMode} isSelected={selectedIds.has(item.id)} onToggleSelect={() => handleToggleSelection(item.id)} />;
                  case 'ptw':
                    return <PtwListItem key={item.id} ptw={item} onSelect={() => setSelectedPtwId(item.id)} isSelectionMode={isSelectionMode} isSelected={selectedIds.has(item.id)} onToggleSelect={() => handleToggleSelection(item.id)} />;
                  default:
                    return null;
                }
             })}
          </ul>
        ) : (
          <EmptyState />
        )}
        
        {hasMore && !isLoading && (
          <div className="mt-6 flex justify-center">
            <Button onClick={() => fetchItems(false)} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Tampilkan Lebih Banyak
            </Button>
          </div>
        )}
      </main>
    </div>

    {displayObservation && (<ObservationDetailSheet observation={displayObservation} isOpen={!!displayObservation} onOpenChange={(isOpen) => { if (!isOpen) setSelectedObservationId(null); }} mode={mode} onItemUpdate={(updatedItem) => setItems(items => items.map(i => i.id === updatedItem.id ? updatedItem : i))} />)}
    {displayInspection && (<InspectionDetailSheet inspection={displayInspection} isOpen={!!displayInspection} onOpenChange={(isOpen) => { if (!isOpen) setSelectedInspectionId(null); }} onItemUpdate={(updatedItem) => setItems(items => items.map(i => i.id === updatedItem.id ? updatedItem : i))} />)}
    {displayPtw && (<PtwDetailSheet ptw={displayPtw} isOpen={!!displayPtw} onOpenChange={(isOpen) => { if (!isOpen) setSelectedPtwId(null); }} onItemUpdate={(updatedItem) => setItems(items => items.map(i => i.id === updatedItem.id ? updatedItem : i))} />)}
    
    <DeleteMultipleDialog isOpen={isDeleteMultiOpen} onOpenChange={setDeleteMultiOpen} itemsToDelete={items.filter(item => selectedIds.has(item.id))} onSuccess={() => {
        setItems(items.filter(item => !selectedIds.has(item.id)));
        setIsSelectionMode(false);
        setSelectedIds(new Set());
    }} />
   </>
  );
}
