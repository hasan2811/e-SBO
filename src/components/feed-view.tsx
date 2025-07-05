
'use client';

import * as React from 'react';
import Image from 'next/image';
import type { AllItems, Observation, Inspection, Ptw } from '@/lib/types';
import { InspectionStatusBadge, PtwStatusBadge, StatusBadge, RiskBadge } from '@/components/status-badges';
import { format } from 'date-fns';
import { ChevronRight, Download, FileSignature, Sparkles, Loader2, Filter, Search, Globe, CheckCircle2, RefreshCw, CircleAlert, Home, Briefcase, User, Share2, ThumbsUp, MessageCircle, Eye, Trash2, MoreVertical, UserCheck, X, ArrowLeft, Building, MapPin, Calendar, SearchCheck, Folder } from 'lucide-react';
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
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { DeleteMultipleDialog } from './delete-multiple-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useObservations } from '@/hooks/use-observations';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

const ListItemWrapper = ({ children, onSelect, isSelectionMode, isSelected, onToggleSelect }: { children: React.ReactNode, onSelect: () => void, isSelectionMode: boolean, isSelected: boolean, onToggleSelect: () => void }) => {
    const handleItemClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, a, [data-prevent-item-click]')) return;

        if (isSelectionMode) {
            onToggleSelect();
        } else {
            onSelect();
        }
    };

    return (
        <Card 
          onClick={handleItemClick}
          className={cn(
            "transition-all cursor-pointer", 
            isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:border-primary/50'
          )}
        >
            <CardContent className="p-3 flex items-start gap-3">
                {isSelectionMode && (
                    <div className="flex items-center h-full pt-1">
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={onToggleSelect}
                            aria-label="Select item"
                            className="h-5 w-5"
                        />
                    </div>
                )}
                {children}
            </CardContent>
        </Card>
    )
};

const ObservationListItem = ({ observation, onSelect, isSelectionMode, isSelected, onToggleSelect }: { observation: Observation, onSelect: () => void, isSelectionMode: boolean, isSelected: boolean, onToggleSelect: () => void }) => {
    return (
        <ListItemWrapper onSelect={onSelect} isSelectionMode={isSelectionMode} isSelected={isSelected} onToggleSelect={onToggleSelect}>
            <div className="relative h-24 w-24 flex-shrink-0 rounded-md overflow-hidden border bg-muted/20 flex items-center justify-center">
                {observation.photoUrl ? (
                    <Image src={observation.photoUrl} alt={observation.findings} fill sizes="96px" className="object-cover" data-ai-hint="site observation" />
                ) : (
                    <Eye className="h-10 w-10 text-muted-foreground/50" />
                )}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
                <div className="flex justify-between items-start gap-2">
                    <p className="text-xs text-primary font-semibold truncate pr-2">{observation.category}</p>
                    {observation.aiStatus === 'completed' && typeof observation.aiObserverSkillRating === 'number' && (
                        <StarRating rating={observation.aiObserverSkillRating} starClassName="h-3 w-3" />
                    )}
                </div>
                <p className="font-semibold leading-snug line-clamp-2">{observation.findings}</p>
                <div className="flex flex-wrap items-center gap-2">
                    <RiskBadge riskLevel={observation.riskLevel} />
                    <StatusBadge status={observation.status} />
                </div>
                <div className="text-xs text-muted-foreground pt-1 truncate">
                    {observation.company} &bull; {observation.location} &bull; {format(new Date(observation.date), 'd MMM yy')}
                </div>
            </div>
        </ListItemWrapper>
    );
};

const InspectionListItem = ({ inspection, onSelect, isSelectionMode, isSelected, onToggleSelect }: { inspection: Inspection, onSelect: () => void, isSelectionMode: boolean, isSelected: boolean, onToggleSelect: () => void }) => {
    return (
        <ListItemWrapper onSelect={onSelect} isSelectionMode={isSelectionMode} isSelected={isSelected} onToggleSelect={onToggleSelect}>
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

const PtwListItem = ({ ptw, onSelect, isSelectionMode, isSelected, onToggleSelect }: { ptw: Ptw, onSelect: () => void, isSelectionMode: boolean, isSelected: boolean, onToggleSelect: () => void }) => {
    return (
        <ListItemWrapper onSelect={onSelect} isSelectionMode={isSelectionMode} isSelected={isSelected} onToggleSelect={onToggleSelect}>
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
                      <PtwStatusBadge status={ptw.status} />
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
  mode: 'private' | 'project';
  projectId?: string;
  observationIdToOpen?: string | null;
  title: string;
  description: string;
  showBackButton?: boolean;
}

export function FeedView({ mode, projectId, observationIdToOpen, title, description, showBackButton }: FeedViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  
  const { items, isLoading, getObservationById, getInspectionById, getPtwById } = useObservations();
  
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
    if (!searchTerm) return items;
    const lowercasedSearch = searchTerm.toLowerCase();
    return items.filter(item => {
        if (item.itemType === 'observation') return item.findings.toLowerCase().includes(lowercasedSearch) || item.recommendation.toLowerCase().includes(lowercasedSearch) || item.company.toLowerCase().includes(lowercasedSearch) || item.location.toLowerCase().includes(lowercasedSearch);
        if (item.itemType === 'inspection') return item.findings.toLowerCase().includes(lowercasedSearch) || item.equipmentName.toLowerCase().includes(lowercasedSearch) || item.location.toLowerCase().includes(lowercasedSearch);
        if (item.itemType === 'ptw') return item.workDescription.toLowerCase().includes(lowercasedSearch) || item.contractor.toLowerCase().includes(lowercasedSearch) || item.location.toLowerCase().includes(lowercasedSearch);
        return false;
    });
  }, [items, searchTerm]);
  
  const handleExport = () => {
    const dataToExport = filteredData.filter(item => item.itemType === 'observation') as Observation[];
    if (dataToExport.length === 0) {
      toast({ variant: 'destructive', title: 'Tidak Ada Data Observasi untuk Diekspor' });
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
  
  const handleDeleteSuccess = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    setItemsToDelete([]);
  };

  const canSelect = !isLoading && filteredData.length > 0;

  function EmptyState() {
    let Icon = mode === 'project' ? Briefcase : User;
    let titleText = searchTerm ? 'Tidak Ada Hasil' : (mode === 'project' ? 'Proyek Kosong' : 'Feed Pribadi Kosong');
    let text = searchTerm ? 'Tidak ada laporan yang cocok dengan pencarian Anda.' : (mode === 'project' ? 'Belum ada laporan untuk proyek ini.' : 'Anda belum membuat laporan pribadi.');
  
    return (
      <div className="text-center py-16 text-muted-foreground bg-card rounded-lg border-dashed">
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
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 self-start">
                    <div className="relative hidden sm:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Cari di feed ini..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 w-48 lg:w-64" />
                        {searchTerm && (
                          <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchTerm('')}>
                            <X className="h-4 w-4"/>
                          </Button>
                        )}
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="h-5 w-5" />
                                <span className="sr-only">Opsi</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {canSelect && (
                                <DropdownMenuItem onSelect={() => setIsSelectionMode(true)}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    <span>Pilih Item</span>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onSelect={handleExport}>
                                <Download className="mr-2 h-4 w-4" />
                                <span>Export (Observasi)</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </>
          )}
        </div>
        
        <div className="relative sm:hidden">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari di feed ini..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 w-full" />
            {searchTerm && (
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchTerm('')}>
                <X className="h-4 w-4"/>
              </Button>
            )}
        </div>

      <main className="mt-6">
        {isLoading && items.length === 0 ? (
          <ul className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
               <Card key={i} className="p-3">
                    <div className="flex items-start gap-3">
                        <Skeleton className="h-24 w-24 rounded-md" />
                        <div className="flex-1 space-y-3 pt-1">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-5 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                        </div>
                    </div>
               </Card>
            ))}
          </ul>
        ) : filteredData.length > 0 ? (
          <ul className="space-y-3">
             {filteredData.map(item => {
                switch(item.itemType) {
                  case 'observation':
                    return <ObservationListItem key={item.id} observation={item} onSelect={() => setSelectedObservationId(item.id)} isSelectionMode={isSelectionMode} isSelected={selectedIds.has(item.id)} onToggleSelect={() => handleToggleSelection(item.id)} />;
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
