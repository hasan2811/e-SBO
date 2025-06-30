
'use client';

import * as React from 'react';
import Image from 'next/image';
import { useObservations } from '@/contexts/observation-context';
import type { AllItems, Observation, Inspection, Ptw, RiskLevel, ObservationCategory, ObservationStatus } from '@/lib/types';
import { RISK_LEVELS, OBSERVATION_STATUSES, OBSERVATION_CATEGORIES } from '@/lib/types';
import { InspectionStatusBadge, PtwStatusBadge } from '@/components/status-badges';
import { format } from 'date-fns';
import { FileText, ChevronRight, Download, Wrench, FileSignature as PtwIcon, ChevronDown, Sparkles, Loader2, FilterX, Filter, CheckCircle2, RefreshCw, CircleAlert, Home, FolderKanban, ClipboardList } from 'lucide-react';
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
          {observation.photoUrl && (
            <div className="relative h-20 w-20 flex-shrink-0 rounded-md overflow-hidden border">
              <Image src={observation.photoUrl} alt={observation.findings} fill sizes="80px" className="object-cover" data-ai-hint="site observation" />
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
          )}
  
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
        {inspection.photoUrl && (
          <div className="relative h-20 w-20 flex-shrink-0 rounded-md overflow-hidden border">
            <Image src={inspection.photoUrl} alt={inspection.equipmentName} fill sizes="80px" className="object-cover" data-ai-hint="equipment inspection" />
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
        )}
        
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
  const { publicItems, myItems, loading } = useObservations();
  
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
    observations: { label: 'Observasi', icon: ClipboardList },
    inspections: { label: 'Inspeksi', icon: Wrench },
    ptws: { label: 'PTW', icon: PtwIcon },
  };

  const pageTitle = mode === 'public' 
    ? 'Jurnal Publik' 
    : 'Proyek Saya';
  
  const clearFilters = () => {
    setStatusFilter('all');
    setRiskFilter('all');
    setCategoryFilter('all');
  };

  const filteredData = React.useMemo(() => {
    const sourceData = mode === 'public' ? publicItems : myItems;
    let dataToFilter: AllItems[] = [...sourceData];

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
  }, [publicItems, myItems, mode, viewType, statusFilter, riskFilter, categoryFilter]);

  const displayObservation = React.useMemo(() => 
    selectedObservationId ? [...publicItems, ...myItems].find(o => o.id === selectedObservationId) as Observation : null,
    [selectedObservationId, publicItems, myItems]
  );
  
  const displayInspection = React.useMemo(() =>
    selectedInspectionId ? [...publicItems, ...myItems].find(i => i.id === selectedInspectionId) as Inspection : null,
    [selectedInspectionId, publicItems, myItems]
  );
  
  const displayPtw = React.useMemo(() =>
    selectedPtwId ? [...publicItems, ...myItems].find(p => p.id === selectedPtwId) as Ptw : null,
    [selectedPtwId, publicItems, myItems]
  );

  const handleExport = () => {
    if (viewType !== 'observations') {
      toast({ title: 'Fitur Dalam Pengembangan', description: 'Ekspor untuk tipe data ini akan segera hadir.' });
      return;
    }
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

  const EmptyState = () => {
    const config = viewConfig[viewType];
    const emptyText = mode === 'personal' 
        ? `Anda belum membuat ${config.label.toLowerCase()} atau belum ada laporan di proyek Anda.`
        : `Tidak ada ${config.label.toLowerCase()} publik yang tersedia.`
    
    const filterText = `Tidak ada ${config.label.toLowerCase()} yang cocok dengan filter Anda.`;

    return (
      <div className="text-center py-16 text-muted-foreground bg-card rounded-lg">
        {areFiltersActive ? <FilterX className="mx-auto h-12 w-12" /> : mode === 'public' ? <ClipboardList className="mx-auto h-12 w-12" /> : <FolderKanban className="mx-auto h-12 w-12" />}
        <h3 className="mt-4 text-xl font-semibold">{areFiltersActive ? 'Tidak Ada Hasil' : 'Tidak Ada Laporan'}</h3>
        <p className="mt-2 text-sm max-w-xs mx-auto">{areFiltersActive ? filterText : emptyText}</p>
         {areFiltersActive && <Button variant="default" className="mt-6" onClick={clearFilters}><FilterX className="mr-2 h-4 w-4"/>Hapus Filter</Button>}
      </div>
    );
  };

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
                        <p>Filter</p>
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
                    <Button variant="outline" size="icon" onClick={handleExport} disabled={filteredData.length === 0 || loading}>
                      <Download className="h-4 w-4" />
                      <span className="sr-only">Export</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Export</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
        </div>

      <main>
        {loading ? (
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
