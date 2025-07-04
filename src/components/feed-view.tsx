
'use client';

import * as React from 'react';
import Image from 'next/image';
import type { AllItems, Observation, Inspection, Ptw, RiskLevel, ObservationStatus } from '@/lib/types';
import { InspectionStatusBadge, PtwStatusBadge } from '@/components/status-badges';
import { format } from 'date-fns';
import { ChevronRight, Download, FileSignature as PtwIcon, Sparkles, Loader2, Filter, Search, Globe, CheckCircle2, RefreshCw, CircleAlert, Home, Briefcase, User, Share2, ThumbsUp, MessageCircle, Eye, Trash2, MoreVertical, UserCheck, X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ObservationDetailSheet } from '@/components/observation-detail-sheet';
import { InspectionDetailSheet } from '@/components/inspection-detail-sheet';
import { PtwDetailSheet } from '@/components/ptw-detail-sheet';
import { StarRating } from '@/components/star-rating';
import { exportToExcel } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger, 
    DropdownMenuSub, 
    DropdownMenuSubTrigger, 
    DropdownMenuSubContent, 
    DropdownMenuPortal 
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { DeleteMultipleDialog } from './delete-multiple-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useObservations } from '@/hooks/use-observations';
import { useAuth } from '@/hooks/use-auth';

const viewTypeInfo = {
    observations: { label: 'Observasi', icon: Briefcase, collection: 'observations' },
    inspections: { label: 'Inspeksi', icon: CheckCircle2, collection: 'inspections' },
    ptws: { label: 'PTW', icon: PtwIcon, collection: 'ptws' },
};

const ObservationListItem = ({ observation, onSelect, isSelectionMode, isSelected, onToggleSelect, onLikeToggle, mode }: { observation: Observation, onSelect: () => void, isSelectionMode: boolean, isSelected: boolean, onToggleSelect: () => void, onLikeToggle: (observationId: string) => void, mode: 'public' | 'private' | 'project' }) => {
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
        onLikeToggle(observation.id);
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
                    <Image src="/logo.svg" alt="Default observation image" width={40} height={40} className="opacity-50" />
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
                        {mode !== 'public' && observation.isSharedPublicly && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Globe className="h-4 w-4 text-primary" />
                                    </TooltipTrigger>
                                    <TooltipContent><p>Dibagikan ke Publik</p></TooltipContent>
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
                <Image src="/logo.svg" alt="Default inspection image" width={48} height={48} className="opacity-50" />
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

interface FeedViewProps {
  mode: 'public' | 'private' | 'project';
  projectId?: string;
  observationIdToOpen?: string | null;
  title?: string;
  description?: string;
  showBackButton?: boolean;
}

export function FeedView({ mode, projectId, observationIdToOpen, title, description, showBackButton }: FeedViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const { items, isLoading, error, hasMore, fetchItems, viewType, setViewType, handleLikeToggle, getObservationById, removeItems, removeItems: removeItemsFromContext } = useObservations();
  
  const [selectedObservationId, setSelectedObservationId] = React.useState<string | null>(null);
  const [selectedInspectionId, setSelectedInspectionId] = React.useState<string | null>(null);
  const [selectedPtwId, setSelectedPtwId] = React.useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = React.useState('');
  
  const [isSelectionMode, setIsSelectionMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isDeleteMultiOpen, setDeleteMultiOpen] = React.useState(false);
  const [itemsToDelete, setItemsToDelete] = React.useState<AllItems[]>([]);


  const triggeredOpen = React.useRef(false);
  React.useEffect(() => {
    const openItemFromNotification = async () => {
        if (observationIdToOpen && !isLoading && !triggeredOpen.current) {
            triggeredOpen.current = true;
            
            const item = getObservationById(observationIdToOpen);
            if (item) {
                if (viewType !== 'observations') setViewType('observations');
                setSelectedObservationId(observationIdToOpen);
            } else {
                 toast({ variant: 'destructive', title: 'Laporan Tidak Ditemukan' });
            }
            router.replace(pathname, { scroll: false });
        }
    };
    openItemFromNotification();
  }, [observationIdToOpen, isLoading, getObservationById, pathname, router, toast, setViewType, viewType]);

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
  
  const handleExport = () => {
    const dataToExport = filteredData.filter(item => item.itemType === 'observation') as Observation[];
    if (dataToExport.length === 0) {
      toast({ variant: 'destructive', title: 'Tidak Ada Data untuk Diekspor' });
      return;
    }
    const fileName = `Export_${mode}_${new Date().toISOString()}`;
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

  const handleDeleteClick = () => {
    const toDelete = items.filter(item => selectedIds.has(item.id));
    setItemsToDelete(toDelete);
    setDeleteMultiOpen(true);
  }
  
  const handleDeleteSuccess = (deletedIds: string[]) => {
    removeItemsFromContext(deletedIds);
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    setItemsToDelete([]);
  };

  
  const isExportDisabled = viewType !== 'observations';
  const canSelect = !isLoading && filteredData.length > 0 && mode !== 'public';

  const getPageTitle = () => {
      if (title) return title;
      if (mode === 'public') return 'Feed Publik';
      if (mode === 'private') return 'Feed Pribadi';
      return 'Feed';
  };
  
  function EmptyState() {
    let Icon = Home;
    let titleText = 'Feed Kosong';
    let text = 'Tidak ada laporan yang tersedia.';
  
    if (mode === 'public') {
      Icon = Globe;
      titleText = searchTerm ? 'Tidak Ada Hasil' : 'Feed Publik Kosong';
      text = searchTerm ? 'Tidak ada hasil yang cocok dengan pencarian Anda.' : 'Bagikan observasi dari feed pribadi atau proyek Anda agar muncul di sini.';
    } else if (mode === 'project') {
      Icon = Briefcase;
      titleText = 'Proyek Kosong';
      text = `Belum ada ${viewTypeInfo[viewType].label.toLowerCase()} untuk proyek ini.`;
    } else if (mode === 'private') {
      Icon = User;
      titleText = 'Feed Pribadi Kosong';
      text = `Anda belum membuat ${viewTypeInfo[viewType].label.toLowerCase()} pribadi.`;
    }
  
    return (
      <div className="text-center py-16 text-muted-foreground bg-card rounded-lg">
        <Icon className="mx-auto h-12 w-12" />
        <h3 className="mt-4 text-xl font-semibold">{titleText}</h3>
        <p className="mt-2 text-sm max-w-xs mx-auto">{text}</p>
      </div>
    );
  }

  return (
    <>
     <div className="space-y-4">
        <div className="flex justify-between items-start gap-4 min-h-[40px]">
          {isSelectionMode ? (
            <>
              <Button variant="ghost" onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }}>Batal</Button>
              <p className="font-semibold self-center">{selectedIds.size} dipilih</p>
              <Button variant="destructive" size="icon" onClick={handleDeleteClick} disabled={selectedIds.size === 0}>
                <Trash2 className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
                <div className="flex-1">
                  {showBackButton && (
                    <Button variant="ghost" size="sm" className="mb-2 -ml-3" onClick={() => router.push('/beranda')}>
                      <ArrowLeft className="mr-2" />
                      Kembali ke Hub
                    </Button>
                  )}
                  <h2 className="text-3xl font-bold tracking-tight">{getPageTitle()}</h2>
                  {description && <p className="text-muted-foreground mt-1">{description}</p>}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 self-start">
                    {mode !== 'public' && (
                        <div className="relative hidden sm:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Cari di feed ini..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 w-48 lg:w-64" />
                            {searchTerm && (
                              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchTerm('')}>
                                <X className="h-4 w-4"/>
                              </Button>
                            )}
                        </div>
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="h-5 w-5" />
                                <span className="sr-only">Opsi</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {mode !== 'public' && (
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                        <Filter className="mr-2 h-4 w-4" />
                                        <span>Filter Jenis Laporan</span>
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                        <DropdownMenuSubContent>
                                            {Object.entries(viewTypeInfo).map(([key, { label, icon: Icon }]) => (
                                                <DropdownMenuItem key={key} onSelect={() => setViewType(key as 'observations' | 'inspections' | 'ptws')}>
                                                    <Icon className="mr-2 h-4 w-4" />
                                                    <span>{label}</span>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>
                            )}
                            {canSelect && (
                                <DropdownMenuItem onSelect={() => setIsSelectionMode(true)}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    <span>Pilih Item</span>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onSelect={handleExport} disabled={isExportDisabled}>
                                <Download className="mr-2 h-4 w-4" />
                                <span>Export ke Excel</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </>
          )}
        </div>
        
        {mode !== 'public' && (
             <div className="relative sm:hidden">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Cari di feed ini..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 w-full" />
                {searchTerm && (
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchTerm('')}>
                    <X className="h-4 w-4"/>
                  </Button>
                )}
            </div>
        )}

      <main className="mt-6">
        {isLoading && filteredData.length === 0 ? (
          <ul className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i}><div className="flex items-start bg-card p-3 rounded-lg shadow-sm h-[124px]"><Skeleton className="h-16 w-16 rounded-md" /><div className="flex-1 space-y-2 ml-3"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-5 w-full" /><Skeleton className="h-4 w-2/3" /></div></div></li>
            ))}
          </ul>
        ) : error ? (
            <Alert variant="destructive">
                <AlertTitle>Gagal Memuat Data</AlertTitle>
                <AlertDescription>
                    {error} 
                    <Button variant="link" className="p-0 h-auto ml-2 text-destructive-foreground" onClick={() => fetchItems(true)}>Coba lagi</Button>
                </AlertDescription>
            </Alert>
        ) : filteredData.length > 0 ? (
          <ul className="space-y-3">
             {filteredData.map(item => {
                switch(item.itemType) {
                  case 'observation':
                    return <ObservationListItem key={item.id} observation={item} mode={mode} onSelect={() => setSelectedObservationId(item.id)} isSelectionMode={isSelectionMode} isSelected={selectedIds.has(item.id)} onToggleSelect={() => handleToggleSelection(item.id)} onLikeToggle={handleLikeToggle} />;
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

    <ObservationDetailSheet isOpen={!!selectedObservationId} onOpenChange={(isOpen) => { if (!isOpen) setSelectedObservationId(null); }} observationId={selectedObservationId} />
    <InspectionDetailSheet isOpen={!!selectedInspectionId} onOpenChange={(isOpen) => { if(!isOpen) setSelectedInspectionId(null); }} inspectionId={selectedInspectionId} />
    <PtwDetailSheet isOpen={!!selectedPtwId} onOpenChange={(isOpen) => { if(!isOpen) setSelectedPtwId(null); }} ptwId={selectedPtwId} />
    
    <DeleteMultipleDialog 
        isOpen={isDeleteMultiOpen} 
        onOpenChange={setDeleteMultiOpen} 
        itemsToDelete={itemsToDelete}
        onSuccess={handleDeleteSuccess}
    />
   </>
  );
}
